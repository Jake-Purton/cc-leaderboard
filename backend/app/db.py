import asyncio
import logging
import os

from psycopg.rows import dict_row
from psycopg_pool import AsyncConnectionPool

log = logging.getLogger(__name__)

DATABASE_URL = os.environ.get(
    "DATABASE_URL", "postgresql://noticeboard:noticeboard@localhost:5432/noticeboard"
)

SCHEMA = """
CREATE TABLE IF NOT EXISTS players (
    id         SERIAL PRIMARY KEY,
    name       TEXT NOT NULL UNIQUE,
    seconds    INTEGER NOT NULL CHECK (seconds >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notes (
    id         SERIAL PRIMARY KEY,
    text       TEXT NOT NULL,
    color      TEXT NOT NULL DEFAULT 'yellow',
    x          INTEGER NOT NULL DEFAULT 0,
    y          INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
"""

pool = AsyncConnectionPool(
    DATABASE_URL, open=False, kwargs={"row_factory": dict_row, "autocommit": True}
)


async def init_db(attempts: int = 30) -> None:
    """Open the pool and create tables, waiting for Postgres to come up."""
    await pool.open(wait=False)
    for attempt in range(1, attempts + 1):
        try:
            async with pool.connection() as conn:
                await conn.execute(SCHEMA)
            return
        except Exception as exc:  # noqa: BLE001 - any connection error means "not ready yet"
            if attempt == attempts:
                raise
            log.warning("Database not ready (%s), retrying [%d/%d]", exc, attempt, attempts)
            await asyncio.sleep(2)
