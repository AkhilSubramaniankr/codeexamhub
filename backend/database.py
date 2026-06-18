from contextlib import asynccontextmanager
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from motor.motor_asyncio import AsyncIOMotorClient
import redis.asyncio as aioredis
from config import settings

# 1. PostgreSQL Configuration
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=True if settings.ENV == "development" else False,
    future=True
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

class Base(DeclarativeBase):
    pass

async def get_db():
    """Dependency for obtaining database session in FastAPI routes"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

# 2. MongoDB Configuration
mongo_client = AsyncIOMotorClient(settings.MONGODB_URI)
mongo_db = mongo_client.get_default_database()

def get_mongo_db():
    return mongo_db

# 3. Redis Configuration
redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)

def get_redis():
    return redis_client
