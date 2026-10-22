import logging
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

logger = logging.getLogger(__name__)

class Database:
    client: AsyncIOMotorClient = None
    db = None

db_instance = Database()

async def connect_to_mongo():
    logger.info("Connecting to MongoDB at %s", settings.MONGO_URI)
    db_instance.client = AsyncIOMotorClient(settings.MONGO_URI)
    db_instance.db = db_instance.client[settings.MONGO_DB]
    
    # Ensure indexes
    try:
        await db_instance.db.gps_pings.create_index([("eventId", 1)], unique=True)
        await db_instance.db.gps_pings.create_index([("shipmentId", 1), ("timestamp", -1)])
        await db_instance.db.latest_locations.create_index([("shipmentId", 1)], unique=True)
        logger.info("MongoDB connection and indexes initialized successfully")
    except Exception as e:
        logger.warning("Could not complete MongoDB index creation immediately: %s", str(e))

async def close_mongo_connection():
    if db_instance.client:
        logger.info("Closing MongoDB connection")
        db_instance.client.close()

def get_database():
    return db_instance.db
