"""Citation validator — the guardrail that matters most with a small model.

For each sentence of a generated answer:
- with [n] markers: keep only markers that map to a retrieved chunk id;
  drop the sentence if none survive.
- without markers, if it asserts a fact: attach the best-matching chunk when
  its embedding cosine ≥ 0.75 against the sentence, else DELETE the sentence.

Returns the cleaned answer, the set of citation numbers actually used, and
the dropped sentences (logged, and shown in the admin screen later).
"""

import re
from dataclasses import dataclass

import numpy as np

from ..llm import embed_texts
from .retrieve import Retrieved

COSINE_ATTACH = 0.75

_MARKER = re.compile(r"\[(\d{1,2})\]")
# sentence split that tolerates markers sitting after the period: "text. [1]"
_SENTENCE = re.compile(r"[^.!?]+[.!?]+(?:\s*\[\d{1,2}\])*", re.S)

# sentences like these carry no factual claim and may stand uncited
_NON_ASSERTIVE = re.compile(
    r"^(please\b|you can contact\b|talk to\b|for more\b|if you have\b|i couldn'?t\b|"
    r"the sources\b|this depends\b)",
    re.I,
)


@dataclass
class Validation:
    answer: str
    used_citations: list[int]
    dropped: list[dict[str, str]]


def _sentences(text: str) -> list[str]:
    found = [s.strip() for s in _SENTENCE.findall(text)]
    if found:
        return [s for s in found if s]
    return [text.strip()] if text.strip() else []


def _cosine(a: np.ndarray, b: np.ndarray) -> float:
    denom = float(np.linalg.norm(a) * np.linalg.norm(b))
    return float(np.dot(a, b) / denom) if denom else 0.0


async def validate_answer(answer: str, chunks: list[Retrieved]) -> Validation:
    valid_ns = {c.citation_n for c in chunks if c.citation_n is not None}
    kept: list[str] = []
    dropped: list[dict[str, str]] = []
    used: set[int] = set()

    uncited: list[tuple[int, str]] = []  # (position in kept, sentence)

    for sent in _sentences(answer):
        markers = [int(m) for m in _MARKER.findall(sent)]
        if markers:
            good = [m for m in markers if m in valid_ns]
            if good:
                clean = _MARKER.sub(
                    lambda m: f"[{m.group(1)}]" if int(m.group(1)) in valid_ns else "", sent
                )
                kept.append(clean.strip())
                used.update(good)
            else:
                dropped.append(
                    {"sentence": sent, "reason": "citation markers match no retrieved source"}
                )
        elif _NON_ASSERTIVE.match(sent):
            kept.append(sent)
        else:
            kept.append(sent)  # placeholder; may be replaced or removed below
            uncited.append((len(kept) - 1, sent))

    if uncited:
        # one embedding call for all uncited sentences
        sent_embs = await embed_texts([s for _, s in uncited])
        chunk_embs = await embed_texts([c.content for c in chunks]) if chunks else []
        chunk_mat = [np.asarray(e) for e in chunk_embs]
        remove: list[int] = []
        for (pos, sent), emb in zip(uncited, sent_embs, strict=True):
            v = np.asarray(emb)
            best_i, best_s = -1, 0.0
            for i, ce in enumerate(chunk_mat):
                s = _cosine(v, ce)
                if s > best_s:
                    best_i, best_s = i, s
            if best_i >= 0 and best_s >= COSINE_ATTACH:
                n = chunks[best_i].citation_n
                kept[pos] = f"{sent} [{n}]"
                used.add(n)  # type: ignore[arg-type]
            else:
                remove.append(pos)
                reason = f"uncited factual sentence; best cosine {best_s:.2f} < {COSINE_ATTACH}"
                dropped.append({"sentence": sent, "reason": reason})
        kept = [s for i, s in enumerate(kept) if i not in set(remove)]

    return Validation(
        answer=" ".join(kept).strip(),
        used_citations=sorted(used),
        dropped=dropped,
    )
