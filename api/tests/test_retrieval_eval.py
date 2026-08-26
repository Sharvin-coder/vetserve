"""Retrieval hit-rate eval: for each question, the expected source document
must appear in the top-3 after reranking. Target ≥ 80%.

Needs live Ollama (embeddings) + Supabase with the corpus ingested; skips
cleanly otherwise so `pytest` stays green on a cold checkout.

Run directly for the full table:  uv run python -m tests.test_retrieval_eval
"""

import asyncio
import json
from pathlib import Path

import httpx
import pytest

from app.config import get_settings

QUESTIONS = json.loads((Path(__file__).parent / "eval_questions.json").read_text(encoding="utf-8"))
TOP_N = 3
TARGET = 0.80


def _services_up() -> bool:
    s = get_settings()
    try:
        root = s.ollama_base_url.rstrip("/").removesuffix("/v1")
        httpx.get(f"{root}/api/tags", timeout=2)
        if not s.supabase_url:
            return False
        httpx.get(
            f"{s.supabase_url.rstrip('/')}/rest/v1/chunks?select=id&limit=1",
            headers={"apikey": s.supabase_anon_key},
            timeout=4,
        ).raise_for_status()
        return True
    except Exception:  # noqa: BLE001
        return False


async def run_eval() -> tuple[list[dict], float]:
    from app.rag.retrieve import hybrid_retrieve

    rows = []
    hits = 0
    for item in QUESTIONS:
        chunks = await hybrid_retrieve(item["question"])
        top_urls = [c.source_url for c in chunks[:TOP_N]]
        hit = item["expected_url"] in top_urls
        hits += hit
        rows.append(
            {
                "question": item["question"],
                "hit": hit,
                "top1": chunks[0].title if chunks else "(nothing)",
                "top1_score": round(chunks[0].rerank_score, 3) if chunks else 0.0,
            }
        )
    return rows, hits / len(QUESTIONS)


@pytest.mark.skipif(not _services_up(), reason="needs Ollama + ingested Supabase corpus")
def test_retrieval_hit_rate():
    rows, rate = asyncio.run(run_eval())
    for r in rows:
        print(f"{'HIT ' if r['hit'] else 'MISS'} {r['top1_score']:.3f}  {r['question']}")
    print(f"\nhit rate: {rate:.0%} (target ≥ {TARGET:.0%})")
    msg = f"hit rate {rate:.0%} below {TARGET:.0%} — tune chunking before moving on"
    assert rate >= TARGET, msg


if __name__ == "__main__":
    table, rate = asyncio.run(run_eval())
    width = max(len(r["question"]) for r in table)
    print(f"\n{'':4} {'score':>6}  question")
    for r in table:
        mark = "HIT " if r["hit"] else "MISS"
        print(f"{mark:4} {r['top1_score']:>6.3f}  {r['question']:<{width}}  → {r['top1']}")
    print(f"\nhit rate: {rate:.0%} of {len(table)} (target ≥ {TARGET:.0%})")
