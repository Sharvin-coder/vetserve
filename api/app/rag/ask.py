"""VetGuide orchestration: crisis gate → retrieve → generate → validate."""

import asyncio
import logging
import time
from collections.abc import AsyncIterator
from typing import Any

from ..llm import GENERATION_OPTS, generation_client, generation_model
from .crisis import CRISIS_RESPONSE, keyword_crisis, model_crisis
from .offices import pick_office
from .prompt import build_messages
from .retrieve import FLOOR, HIGH_THRESHOLD, Retrieved, hybrid_retrieve
from .validate import validate_answer

log = logging.getLogger("vetguide")


def _log_dropped(question: str, dropped: list[dict[str, str]]) -> None:
    """Persist validator-removed sentences for the admin screen. Best-effort:
    a logging failure must never break an answer."""
    if not dropped:
        return
    for d in dropped:
        log.warning("dropped sentence: %s | %s", d["reason"], d["sentence"])
    try:
        from ..db import service_client

        service_client().table("vetguide_dropped").insert(
            [{"question": question, **d} for d in dropped]
        ).execute()
    except Exception:  # noqa: BLE001
        log.exception("could not persist dropped sentences")

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
    # keyword gate is instant; the model check runs concurrently with
    # retrieval so it costs no wall-clock on the common (non-crisis) path
    if keyword_crisis(question):
        return dict(CRISIS_RESPONSE)
    crisis_check = asyncio.create_task(model_crisis(question))

    t0 = time.perf_counter()
    chunks = await hybrid_retrieve(question)
    t_retrieval = time.perf_counter() - t0
    if await crisis_check:
        return dict(CRISIS_RESPONSE)
    if not chunks or chunks[0].rerank_score < FLOOR:
        return _no_answer(question, chunks)

    t0 = time.perf_counter()
    raw = await _generate(question, chunks)
    t_generation = time.perf_counter() - t0
    validation = await validate_answer(raw, chunks) if raw and raw != "NO_ANSWER" else None

    # small-model discipline: one retry if the format collapsed entirely
    if raw != "NO_ANSWER" and (validation is None or not validation.answer):
        raw = await _generate(question, chunks, FORMAT_RETRY_HINT)
        validation = await validate_answer(raw, chunks) if raw and raw != "NO_ANSWER" else None

    if raw == "NO_ANSWER" or validation is None or not validation.answer:
        return _no_answer(question, chunks)

    _log_dropped(question, validation.dropped)

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
        "timings": {
            "retrieval_s": round(t_retrieval, 2),
            "generation_s": round(t_generation, 2),
        },
    }


async def stream_answer(question: str) -> AsyncIterator[dict[str, Any]]:
    """SSE event stream: crisis|retrieval → tokens → validated final payload.

    The client renders streamed tokens immediately, then REPLACES the text with
    the validated answer from the `final` event — so nothing unverified ever
    persists on screen.
    """
    if keyword_crisis(question):
        yield {"event": "final", "data": dict(CRISIS_RESPONSE)}
        return
    crisis_check = asyncio.create_task(model_crisis(question))

    chunks = await hybrid_retrieve(question)
    if await crisis_check:
        yield {"event": "final", "data": dict(CRISIS_RESPONSE)}
        return
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

    _log_dropped(question, validation.dropped)
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
