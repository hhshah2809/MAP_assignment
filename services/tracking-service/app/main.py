from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.config import settings
from app.database import connect_to_mongo, close_mongo_connection
from app.rabbitmq import rabbitmq_publisher
from app.routes.tracking import router as tracking_router
from app.routes.health import router as health_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting up Tracking Service...")
    await connect_to_mongo()
    if settings.RABBITMQ_ENABLED:
        rabbitmq_publisher.connect()
    yield
    # Shutdown
    logger.info("Shutting down Tracking Service...")
    await close_mongo_connection()
    rabbitmq_publisher.close()


app = FastAPI(
    title="Logistics Tracking Service",
    description="High-throughput GPS telemetry ingestion and history",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root health endpoints
app.include_router(health_router)

# Versioned API routes
app.include_router(tracking_router, prefix=settings.API_PREFIX)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
