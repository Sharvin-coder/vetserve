"""Chunking: group extracted blocks by section heading where possible,
else fall back to ~400-token windows with 80-token overlap.

Token counts are estimated at ~4 characters/token (close enough for window
sizing; the LM never sees these counts).
"""

from dataclasses import dataclass

from .extract import Block

TARGET_TOKENS = 400
OVERLAP_TOKENS = 80
CHARS_PER_TOKEN = 4
TARGET_CHARS = TARGET_TOKENS * CHARS_PER_TOKEN
OVERLAP_CHARS = OVERLAP_TOKENS * CHARS_PER_TOKEN
MIN_CHARS = 200  # merge fragments smaller than this into a neighbor


@dataclass
class Chunk:
    content: str
    page: int | None
    section_path: str


def _window(text: str, page: int | None, section: str) -> list[Chunk]:
    """Sliding window over one oversized section, breaking at sentence ends."""
    chunks: list[Chunk] = []
    start = 0
    while start < len(text):
        end = min(start + TARGET_CHARS, len(text))
        if end < len(text):
            # extend to the next sentence boundary within reason
            dot = text.rfind(". ", start, end)
            if dot > start + TARGET_CHARS // 2:
                end = dot + 1
        piece = text[start:end].strip()
        if piece:
            chunks.append(Chunk(content=piece, page=page, section_path=section))
        if end >= len(text):
            break
        start = max(end - OVERLAP_CHARS, start + 1)
    return chunks


def chunk_blocks(blocks: list[Block]) -> list[Chunk]:
    chunks: list[Chunk] = []

    # group consecutive blocks that share a section heading
    groups: list[list[Block]] = []
    for b in blocks:
        if groups and groups[-1][0].section_path == b.section_path:
            groups[-1].append(b)
        else:
            groups.append([b])

    for group in groups:
        section = group[0].section_path
        text = "\n\n".join(b.text for b in group)
        page = group[0].page
        prefix = f"{section}\n\n" if section else ""
        if len(prefix) + len(text) <= TARGET_CHARS:
            chunks.append(Chunk(content=(prefix + text).strip(), page=page, section_path=section))
        else:
            for c in _window(text, page, section):
                c.content = (prefix + c.content).strip()
                chunks.append(c)

    # merge tiny fragments forward so no chunk is a stray line
    merged: list[Chunk] = []
    for c in chunks:
        if (
            merged
            and len(c.content) < MIN_CHARS
            and merged[-1].section_path == c.section_path
            and len(merged[-1].content) + len(c.content) < TARGET_CHARS * 1.5
        ):
            merged[-1].content += "\n\n" + c.content
        else:
            merged.append(c)
    # drop only true noise; short real sections (hours, phone lines) survive
    return [c for c in merged if len(c.content) >= 40]
