"""Hybrid retrieval: vector top-20 ∪ full-text top-20 → reciprocal rank
fusion → bge-reranker-base cross-encoder → top 6."""

import asyncio
from dataclasses import dataclass, field
from functools import lru_cache
from typing import Any

from ..db import anon_client
from ..llm import embed_one

VECTOR_K = 20
KEYWORD_K = 20
FINAL_K = 6
RRF_K = 60  # standard reciprocal-rank-fusion constant

# rerank score (sigmoid of bge logit) thresholds for the confidence label
HIGH_THRESHOLD = 0.5
FLOOR = 0.05


@dataclass
class Retrieved:
    id: int
    content: str
    source_url: str
    title: str
    page: int | None
    section_path: str | None
    rerank_score: float = 0.0
    rrf_score: float = 0.0
    citation_n: int | None = field(default=None)


@lru_cache
def _reranker():
    # lazy: ~1 GB model, loaded once per process, CPU is fine for top-20
    from sentence_transformers import CrossEncoder

    return CrossEncoder("BAAI/bge-reranker-base", max_length=512)


def _to_retrieved(rows: list[dict[str, Any]]) -> list[Retrieved]:
    return [
        Retrieved(
            id=r["id"],
            content=r["content"],
            source_url=r["source_url"],
            title=r["title"],
            page=r.get("page"),
            section_path=r.get("section_path"),
        )
        for r in rows
    ]


async def hybrid_retrieve(question: str) -> list[Retrieved]:
    db = anon_client()
    embedding = await embed_one(question)

    def vector_search() -> list[dict[str, Any]]:
        return db.rpc(
            "match_chunks", {"query_embedding": embedding, "match_count": VECTOR_K}
        ).execute().data

    def keyword_search() -> list[dict[str, Any]]:
        resp = db.rpc("keyword_chunks", {"query": question, "match_count": KEYWORD_K}).execute()
        return resp.data

    vec_rows, kw_rows = await asyncio.gather(
        asyncio.to_thread(vector_search), asyncio.to_thread(keyword_search)
    )

    # reciprocal rank fusion over the two ranked lists
    fused: dict[int, Retrieved] = {}
    for rows in (vec_rows, kw_rows):
        for rank, item in enumerate(_to_retrieved(rows)):
            if item.id not in fused:
                fused[item.id] = item
            fused[item.id].rrf_score += 1.0 / (RRF_K + rank + 1)

    candidates = sorted(fused.values(), key=lambda c: c.rrf_score, reverse=True)
    if not candidates:
        return []

    def rerank(cands: list[Retrieved]) -> list[Retrieved]:
        import numpy as np

        model = _reranker()
        logits = model.predict([(question, c.content) for c in cands])
        scores = 1.0 / (1.0 + np.exp(-np.asarray(logits, dtype=float)))
        for c, s in zip(cands, scores, strict=True):
            c.rerank_score = float(s)
        return sorted(cands, key=lambda c: c.rerank_score, reverse=True)

    ranked = await asyncio.to_thread(rerank, candidates)
    top = ranked[:FINAL_K]
    for i, c in enumerate(top):
        c.citation_n = i + 1
    return top
