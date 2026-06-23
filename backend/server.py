from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone

from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Aangan API")
api_router = APIRouter(prefix="/api")


# ---------- Models ----------
class WaitlistEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: EmailStr
    family_role: Optional[str] = None
    note: Optional[str] = None
    source: Optional[str] = "landing"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class WaitlistCreate(BaseModel):
    name: str
    email: EmailStr
    family_role: Optional[str] = None
    note: Optional[str] = None
    source: Optional[str] = "landing"


class AskRequest(BaseModel):
    question: str
    session_id: Optional[str] = None


# ---------- Routes ----------
@api_router.get("/")
async def root():
    return {"message": "Aangan API", "status": "ok"}


@api_router.post("/waitlist", response_model=WaitlistEntry)
async def create_waitlist(payload: WaitlistCreate):
    # idempotent on email
    existing = await db.waitlist.find_one({"email": payload.email}, {"_id": 0})
    if existing:
        if isinstance(existing.get("created_at"), str):
            existing["created_at"] = datetime.fromisoformat(existing["created_at"])
        return WaitlistEntry(**existing)

    entry = WaitlistEntry(**payload.model_dump())
    doc = entry.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.waitlist.insert_one(doc)
    return entry


@api_router.get("/waitlist", response_model=List[WaitlistEntry])
async def list_waitlist():
    entries = await db.waitlist.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    for e in entries:
        if isinstance(e.get('created_at'), str):
            e['created_at'] = datetime.fromisoformat(e['created_at'])
    return entries


ASK_AANGAN_SYSTEM = """You are Aangan — a warm, intelligent, gentle AI guide for a private family
culture and legacy archive. You speak softly, like an older relative who has read many books.

Tone:
- Warm, poetic, intimate, never preachy, never religious, never corporate.
- Short, layered sentences. Use plain English with occasional gentle Indian-family vocabulary
  (Nani, Dadi, Aangan, Diwali, Holi, Eid, Pongal, Onam, etc.) only when contextually natural.
- Never lecture. Honour the family's way of doing things.

Behaviour in this demo:
- You are answering FROM a sample family's archive (Sharma family, Jaipur roots).
- Always frame answers as coming from the family's own memories — not the internet.
- Cite the family source naturally: "From Nani's voice note, 2024" or "Recorded by Papa, 2023".
- If asked something the family hasn't recorded, gently say: "Your family hasn't shared that yet —
  would you like to record it now?"
- Offer to create a short Tradition Card, a 20-minute version of a ritual, or a child-friendly
  explanation when relevant.
- Keep responses to 3-6 short paragraphs. Use line breaks generously.
- Never decide what is "right" for a family. Always preserve their way.

Never say: "As an AI", "I cannot", "disrupt", "leverage", "ecosystem", "seamless", "revolutionise"."""


@api_router.post("/ask/stream")
async def ask_aangan_stream(payload: AskRequest):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="LLM key not configured")

    session_id = payload.session_id or str(uuid.uuid4())

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=ASK_AANGAN_SYSTEM,
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")

    user_msg = UserMessage(text=payload.question)

    async def event_gen():
        try:
            async for ev in chat.stream_message(user_msg):
                if isinstance(ev, TextDelta):
                    # SSE format
                    content = ev.content.replace("\n", "\\n")
                    yield f"data: {content}\n\n"
                elif isinstance(ev, StreamDone):
                    yield "data: [DONE]\n\n"
                    break
        except Exception as e:  # noqa: BLE001
            logger.exception("Ask Aangan stream failed")
            yield f"data: [ERROR] {str(e)}\n\n"

    return StreamingResponse(
        event_gen(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@api_router.post("/ask")
async def ask_aangan_simple(payload: AskRequest):
    """Non-streaming fallback that returns a single JSON response."""
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="LLM key not configured")

    session_id = payload.session_id or str(uuid.uuid4())
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=ASK_AANGAN_SYSTEM,
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")

    user_msg = UserMessage(text=payload.question)
    chunks = []
    try:
        async for ev in chat.stream_message(user_msg):
            if isinstance(ev, TextDelta):
                chunks.append(ev.content)
            elif isinstance(ev, StreamDone):
                break
    except Exception as e:  # noqa: BLE001
        logger.exception("Ask Aangan failed")
        raise HTTPException(status_code=500, detail=str(e))

    return {"answer": "".join(chunks), "session_id": session_id}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
