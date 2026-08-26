"""VetGuide orchestration: crisis gate → retrieve → generate → validate."""

import logging
from collections.abc import AsyncIterator
from typing import Any

from ..llm import GENERATION_OPTS, generation_client, generation_model
from .crisis import CRISIS_RESPONSE, is_crisis
from .offices import pick_office
from .prompt import build_messages
from .retrieve import FLOOR, HIGH_THRESHOLD, Retrieved, hybrid_retrieve
from .validate import validate_answer

log = logging.getLogger("vetguide")

NO_ANSWER_TEXT = (
    "I couldn't find this in the official sources I have. "
    "A person at the office below can help you directly."
)

FORMAT_RETRY_HINT = (
    "Your previous answer did not follow the required format. Remember: every "
    "factual sentence ends with a source marker like [1], or reply exactly NO_ANSWER."
)


def _citations_payload(chunks: list[Retrieved], used: list[int]) -> list[dict[str, Any]]:
    by_n = {c.citation_n: c for c in chunks}
    out = []
    for n in used:
        c = by_n.get(n)
        if not c:
            continue
        out.append(
            {
                "id": n,
                "title": c.title,
                "source_url": c.source_url,
                "page": c.page,
                "excerpt": c.content[:600],
            }
        )
    return out


def _no_answer(question: str, chunks: list[Retrieved]) -> dict[str, Any]:
    office = pick_office(question, [c.source_url for c in chunks])
    return {
        "answer": NO_ANSWER_TEXT,
        "citations": [],
        "confidence": "low",
        "handoff": office,
        "dropped_sentences": 0,
        "crisis": False,
    }


async def _generate(question: str, chunks: list[Retrieved], retry_hint: str | None = None) -> str:
    messages = build_messages(question, chunks)
    if retry_hint:
        messages.append({"role": "system", "content": retry_hint})
    resp = await generation_client().chat.completions.create(
        model=generation_model(), messages=messages, **GENERATION_OPTS
    )
    return (resp.choices[0].message.content or "").strip()


async def answer_question(question: str) -> dict[str, Any]:
    if await is_crisis(question):
        return dict(CRISIS_RESPONSE)

    chunks = await hybrid_retrieve(question)
    if not chunks or chunks[0].rerank_score < FLOOR:
        return _no_answer(question, chunks)

    raw = await _generate(question, chunks)
    validation = await validate_answer(raw, chunks) if raw and raw != "NO_ANSWER" else None

    # small-model discipline: one retry if the format collapsed entirely
    if raw != "NO_ANSWER" and (validation is None or not validation.answer):
        raw = await _generate(question, chunks, FORMAT_RETRY_HINT)
        validation = await validate_answer(raw, chunks) if raw and raw != "NO_ANSWER" else None

    if raw == "NO_ANSWER" or validation is None or not validation.answer:
        return _no_answer(question, chunks)

    if validation.dropped:
        for d in validation.dropped:
            log.warning("dropped sentence: %(reason)s | %(sentence)s", d)

    confidence = (
        "high"
        if chunks[0].rerank_score >= HIGH_THRESHOLD and len(validation.used_citations) >= 2
        else "medium"
    )
    office = pick_office(question, [c.source_url for c in chunks])
    return {
        "answer": validation.answer,
        "citations": _citations_payload(chunks, validation.used_citations),
        "confidence": confidence,
        "handoff": office,
        "dropped_sentences": len(validation.dropped),
        "dropped_detail": validation.dropped,
        "crisis": False,
    }


async def stream_answer(question: str) -> AsyncIterator[dict[str, Any]]:
    """SSE event stream: crisis|retrieval → tokens → validated final payload.

    The client renders streamed tokens immediately, then REPLACES the text with
    the validated answer from the `final` event — so nothing unverified ever
    persists on screen.
    """
    if await is_crisis(question):
        yield {"event": "final", "data": dict(CRISIS_RESPONSE)}
        return

    chunks = await hybrid_retrieve(question)
    if not chunks or chunks[0].rerank_score < FLOOR:
        yield {"event": "final", "data": _no_answer(question, chunks)}
        return

    yield {
        "event": "retrieval",
        "data": {
            "citations": _citations_payload(chunks, [c.citation_n for c in chunks]),
        },
    }

    messages = build_messages(question, chunks)
    stream = await generation_client().chat.completions.create(
        model=generation_model(), messages=messages, stream=True, **GENERATION_OPTS
    )
    parts: list[str] = []
    async for chunk in stream:
        delta = chunk.choices[0].delta.content if chunk.choices else None
        if delta:
            parts.append(delta)
            yield {"event": "token", "data": {"text": delta}}

    raw = "".join(parts).strip()
    validation = await validate_answer(raw, chunks) if raw and raw != "NO_ANSWER" else None
    if raw != "NO_ANSWER" and (validation is None or not validation.answer):
        raw = await _generate(question, chunks, FORMAT_RETRY_HINT)
        validation = await validate_answer(raw, chunks) if raw and raw != "NO_ANSWER" else None

    if raw == "NO_ANSWER" or validation is None or not validation.answer:
        yield {"event": "final", "data": _no_answer(question, chunks)}
        return

    confidence = (
        "high"
        if chunks[0].rerank_score >= HIGH_THRESHOLD and len(validation.used_citations) >= 2
        else "medium"
    )
    yield {
        "event": "final",
        "data": {
            "answer": validation.answer,
            "citations": _citations_payload(chunks, validation.used_citations),
            "confidence": confidence,
            "handoff": pick_office(question, [c.source_url for c in chunks]),
            "dropped_sentences": len(validation.dropped),
            "crisis": False,
        },
    }
