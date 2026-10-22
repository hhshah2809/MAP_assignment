import json
import logging
import pika
from app.config import settings

logger = logging.getLogger(__name__)

class RabbitMQPublisher:
    def __init__(self):
        self.connection = None
        self.channel = None

    def connect(self):
        if not settings.RABBITMQ_ENABLED:
            return
        try:
            params = pika.URLParameters(settings.RABBITMQ_URL)
            self.connection = pika.BlockingConnection(params)
            self.channel = self.connection.channel()
            self.channel.exchange_declare(
                exchange=settings.RABBITMQ_EXCHANGE,
                exchange_type="topic",
                durable=True
            )
            logger.info("Connected to RabbitMQ exchange: %s", settings.RABBITMQ_EXCHANGE)
        except Exception as e:
            logger.warning("Could not establish RabbitMQ connection: %s", str(e))
            self.connection = None
            self.channel = None

    def publish_location(self, event_data: dict):
        if not settings.RABBITMQ_ENABLED:
            logger.debug("[Tracking Publisher] Log-only event: %s", event_data.get("eventId"))
            return

        try:
            if not self.channel or self.channel.is_closed:
                self.connect()

            if self.channel and not self.channel.is_closed:
                payload = json.dumps(event_data, default=str)
                self.channel.basic_publish(
                    exchange=settings.RABBITMQ_EXCHANGE,
                    routing_key="tracking.location_received.v1",
                    body=payload.encode("utf-8"),
                    properties=pika.BasicProperties(
                        delivery_mode=2,  # make message persistent
                        content_type="application/json",
                        message_id=event_data.get("eventId")
                    )
                )
        except Exception as e:
            logger.warning("Failed to publish RabbitMQ tracking message: %s", str(e))
            self.channel = None
            self.connection = None

    def close(self):
        try:
            if self.connection and not self.connection.is_closed:
                self.connection.close()
        except Exception:
            pass

rabbitmq_publisher = RabbitMQPublisher()
