from fastapi import APIRouter, Response, status
from datetime import datetime
from app.database import get_database

router = APIRouter(tags=["health"])


@router.get("/health")
async def health():
    return {
        "status": "UP",
        "service": "tracking-service",
        "timestamp": datetime.utcnow().isoformat()
    }


@router.get("/ready")
async def readiness(response: Response):
    try:
        db = get_database()
        if db is not None:
            # Ping MongoDB
            await db.command("ping")
            return {
                "status": "READY",
                "service": "tracking-service",
                "database": "CONNECTED",
                "timestamp": datetime.utcnow().isoformat()
            }
        else:
            response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
            return {
                "status": "NOT_READY",
                "service": "tracking-service",
                "database": "INITIALIZING",
                "timestamp": datetime.utcnow().isoformat()
            }
    except Exception as e:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {
            "status": "NOT_READY",
            "service": "tracking-service",
            "database": "ERROR",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }
