import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

DATABASE_URL = "postgresql+asyncpg://continuum:covasant@localhost:5432/continuum_db"

async def main():
    engine = create_async_engine(DATABASE_URL)
    async with engine.begin() as conn:
        try:
            await conn.execute(text("ALTER TYPE artefacttype ADD VALUE 'api-spec';"))
            print("Added 'api-spec' to ArtefactType")
        except Exception as e:
            print(f"Error (maybe already exists?): {e}")

asyncio.run(main())
