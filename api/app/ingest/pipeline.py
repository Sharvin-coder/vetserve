"""Fetch → extract → chunk → embed → upsert, idempotent by content hash."""

import hashlib
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import httpx

from ..db import service_client
from ..llm import embed_texts
from .chunk import Chunk, chunk_blocks
from .extract import extract_html, extract_pdf

UA = "VetServeKaty/0.1 (Congressional App Challenge project; contact via repo)"

EMBED_BATCH = 16


async def fetch(url: str) -> tuple[bytes, str]:
    """Return (body, kind) where kind is 'pdf' or 'html'."""
    async with httpx.AsyncClient(
        timeout=60.0, follow_redirects=True, headers={"User-Agent": UA}
    ) as client:
        resp = await client.get(url)
        resp.raise_for_status()
    ctype = resp.headers.get("content-type", "")
    kind = "pdf" if "pdf" in ctype or url.lower().endswith(".pdf") else "html"
    return resp.content, kind


def load_local(path: str) -> tuple[bytes, str]:
    p = Path(path)
    return p.read_bytes(), "pdf" if p.suffix.lower() == ".pdf" else "html"


def to_chunks(body: bytes, kind: str, url: str) -> list[Chunk]:
    if kind == "pdf":
        return chunk_blocks(extract_pdf(body))
    return chunk_blocks(extract_html(body.decode("utf-8", errors="replace"), url))


async def upsert_chunks(chunks: list[Chunk], source_url: str, title: str) -> dict[str, int]:
    """Embed and upsert; rows whose content hash already exists are skipped."""
    db = service_client()
    hashes = [hashlib.sha256(c.content.encode()).hexdigest() for c in chunks]

    existing: set[str] = set()
    for i in range(0, len(hashes), 100):
        resp = (
            db.table("chunks")
            .select("content_hash")
            .in_("content_hash", hashes[i : i + 100])
            .execute()
        )
        existing.update(row["content_hash"] for row in resp.data)

    new = [(c, h) for c, h in zip(chunks, hashes, strict=True) if h not in existing]
    inserted = 0
    for i in range(0, len(new), EMBED_BATCH):
        batch = new[i : i + EMBED_BATCH]
        embeddings = await embed_texts([c.content for c, _ in batch])
        rows: list[dict[str, Any]] = [
            {
                "content": c.content,
                "content_hash": h,
                "source_url": source_url,
                "title": title,
                "page": c.page,
                "section_path": c.section_path,
                "embedding": emb,
            }
            for (c, h), emb in zip(batch, embeddings, strict=True)
        ]
        db.table("chunks").upsert(rows, on_conflict="content_hash").execute()
        inserted += len(rows)
    return {"total": len(chunks), "inserted": inserted, "skipped": len(existing)}


async def ingest_source(url: str, title: str, local_path: str | None = None) -> dict[str, Any]:
    body, kind = load_local(local_path) if local_path else await fetch(url)
    chunks = to_chunks(body, kind, url)
    if not chunks:
        raise ValueError(f"no extractable content from {url}")
    stats = await upsert_chunks(chunks, url, title)
    return {
        "url": url,
        "title": title,
        "kind": kind,
        "sha256": hashlib.sha256(body).hexdigest(),
        "fetched_at": datetime.now(UTC).isoformat(),
        **stats,
    }
