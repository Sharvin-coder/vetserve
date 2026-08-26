from fastapi import APIRouter
from pydantic import BaseModel, Field

from ..db import anon_client

router = APIRouter()


class FeedbackRequest(BaseModel):
    question: str = Field(min_length=1, max_length=1000)
    answer: str = Field(min_length=1, max_length=4000)
    helpful: bool


@router.post("/feedback")
async def leave_feedback(req: FeedbackRequest):
    # anon client on purpose: the RLS policy only allows INSERT, so this path
    # can never read or modify anything even if the payload is hostile
    anon_client().table("feedback").insert(
        {"question": req.question, "answer": req.answer, "helpful": req.helpful}
    ).execute()
    return {"ok": True}
