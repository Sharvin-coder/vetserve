import json

from fastapi import APIRouter
from pydantic import BaseModel, Field
from sse_starlette.sse import EventSourceResponse

from ..rag.ask import answer_question, stream_answer

router = APIRouter()


class AskRequest(BaseModel):
    question: str = Field(min_length=3, max_length=1000)
    stream: bool = False


@router.post("/ask")
async def ask(req: AskRequest):
    if not req.stream:
        return await answer_question(req.question)

    async def event_source():
        async for evt in stream_answer(req.question):
            yield {"event": evt["event"], "data": json.dumps(evt["data"])}

    return EventSourceResponse(event_source())
