"""Crisis detection: fast keyword/regex pass, plus a model check for phrasing
the list misses. Fails SAFE in both directions that matter — keywords alone
can trigger the crisis response, and a model error never blocks it."""

import re

from ..llm import generation_client, generation_model

_PATTERNS = [
    r"\bsuicid",
    r"\bkill(?:ing)? (?:myself|me)\b",
    r"\bend (?:my|it) (?:all|life)\b",
    r"\bwant(?:ing)? to die\b",
    r"\bdon'?t want to (?:be here|live|wake up)\b",
    r"\bno reason to (?:live|go on)\b",
    r"\bhurt(?:ing)? myself\b",
    r"\bharm(?:ing)? myself\b",
    r"\bself[- ]harm",
    r"\btake my (?:own )?life\b",
    r"\bbetter off without me\b",
    r"\bcan'?t (?:go on|do this anymore)\b",
]
_CRISIS_RE = re.compile("|".join(_PATTERNS), re.I)

_CLASSIFY_PROMPT = (
    "Does this message suggest the writer may be in emotional crisis or "
    "thinking about harming themselves? Reply with exactly one word: YES or NO.\n\n"
    "Message: {q}"
)


def keyword_crisis(question: str) -> bool:
    return bool(_CRISIS_RE.search(question))


async def model_crisis(question: str) -> bool:
    """LLM check for phrasings the regex misses. Any error → False (the
    keyword pass already ran; a broken model must not block answers)."""
    try:
        resp = await generation_client().chat.completions.create(
            model=generation_model(),
            messages=[{"role": "user", "content": _CLASSIFY_PROMPT.format(q=question[:500])}],
            temperature=0.0,
            max_tokens=3,
        )
        return (resp.choices[0].message.content or "").strip().upper().startswith("YES")
    except Exception:  # noqa: BLE001
        return False


async def is_crisis(question: str) -> bool:
    if keyword_crisis(question):
        return True
    return await model_crisis(question)


CRISIS_RESPONSE = {
    "crisis": True,
    "message": "You deserve support right now, from a person.",
    "contacts": [
        {"method": "call", "label": "Call 988, then press 1", "number": "988"},
        {"method": "text", "label": "Text 838255", "number": "838255"},
    ],
}
