from contextlib import asynccontextmanager
from typing import Literal

from fastapi import FastAPI, HTTPException, Response
from pydantic import BaseModel, Field, field_validator

from .db import init_db, pool

NoteColor = Literal["yellow", "pink", "blue", "green", "orange"]


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield
    await pool.close()


app = FastAPI(title="Notice Board", lifespan=lifespan)


class PlayerIn(BaseModel):
    name: str = Field(min_length=1, max_length=40)
    seconds: int = Field(ge=0, le=100 * 60 * 60)

    @field_validator("name")
    @classmethod
    def strip_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Name is required")
        return v


class NoteIn(BaseModel):
    text: str = Field(min_length=1, max_length=280)
    color: NoteColor = "yellow"
    x: int = Field(default=0, ge=0, le=5000)
    y: int = Field(default=0, ge=0, le=5000)


class NoteMove(BaseModel):
    x: int = Field(ge=0, le=5000)
    y: int = Field(ge=0, le=5000)


async def fetch_one(sql: str, params: tuple):
    async with pool.connection() as conn:
        row = await (await conn.execute(sql, params)).fetchone()
    if row is None:
        raise HTTPException(404, "Not found")
    return row


@app.get("/api/health")
async def health():
    async with pool.connection() as conn:
        await conn.execute("SELECT 1")
    return {"ok": True}


# --- Leaderboard -------------------------------------------------------------

@app.get("/api/leaderboard")
async def list_players():
    async with pool.connection() as conn:
        cur = await conn.execute(
            "SELECT id, name, seconds FROM players ORDER BY seconds ASC, name ASC"
        )
        return await cur.fetchall()


@app.post("/api/leaderboard", status_code=201)
async def submit_time(player: PlayerIn):
    """Add a time. If the name is already on the board, keep whichever time is faster."""
    return await fetch_one(
        """INSERT INTO players (name, seconds) VALUES (%s, %s)
           ON CONFLICT (name) DO UPDATE SET seconds = LEAST(players.seconds, EXCLUDED.seconds)
           RETURNING id, name, seconds""",
        (player.name, player.seconds),
    )


@app.delete("/api/leaderboard/{player_id}", status_code=204)
async def remove_player(player_id: int):
    await fetch_one("DELETE FROM players WHERE id = %s RETURNING id", (player_id,))
    return Response(status_code=204)


# --- Post-it notes -----------------------------------------------------------

NOTE_COLS = "id, text, color, x, y, created_at"


@app.get("/api/notes")
async def list_notes():
    async with pool.connection() as conn:
        cur = await conn.execute(f"SELECT {NOTE_COLS} FROM notes ORDER BY id")
        return await cur.fetchall()


@app.post("/api/notes", status_code=201)
async def add_note(note: NoteIn):
    return await fetch_one(
        f"INSERT INTO notes (text, color, x, y) VALUES (%s, %s, %s, %s) RETURNING {NOTE_COLS}",
        (note.text.strip(), note.color, note.x, note.y),
    )


@app.patch("/api/notes/{note_id}")
async def move_note(note_id: int, move: NoteMove):
    return await fetch_one(
        f"UPDATE notes SET x = %s, y = %s WHERE id = %s RETURNING {NOTE_COLS}",
        (move.x, move.y, note_id),
    )


@app.delete("/api/notes/{note_id}", status_code=204)
async def remove_note(note_id: int):
    await fetch_one("DELETE FROM notes WHERE id = %s RETURNING id", (note_id,))
    return Response(status_code=204)
