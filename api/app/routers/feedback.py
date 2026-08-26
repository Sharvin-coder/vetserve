import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ..config import get_settings

router = APIRouter()


class FeedbackRequest(BaseModel):
    question: str = Field(min_length=1, max_length=1000)
    answer: str = Field(min_length=1, max_length=4000)
    helpful: bool


@router.post("/feedback")
async def leave_feedback(req: FeedbackRequest):
    # deliberate anon-role, return=minimal insert straight at PostgREST: the
    # feedback role can WRITE a row but can never read one back, and the
    # supabase-py client doesn't reliably send the minimal-return preference
    s = get_settings()
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            f"{s.supabase_url.rstrip('/')}/rest/v1/feedback",
            headers={
                "apikey": s.supabase_anon_key,
                "Authorization": f"Bearer {s.supabase_anon_key}",
                "Content-Type": "application/json",
                "Prefer": "return=minimal",
            },
            json={"question": req.question, "answer": req.answer, "helpful": req.helpful},
        )
    if resp.status_code != 201:
        raise HTTPException(status_code=502, detail="Couldn't save the feedback.")
    return {"ok": True}
