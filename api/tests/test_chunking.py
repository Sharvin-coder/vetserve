"""Chunking invariants: size bounds, overlap, heading prefixes."""

from app.ingest.chunk import CHARS_PER_TOKEN, TARGET_TOKENS, chunk_blocks
from app.ingest.extract import Block


def test_small_section_stays_whole():
    blocks = [Block(text="Short paragraph about eligibility.", page=1, section_path="Eligibility")]
    chunks = chunk_blocks(blocks)
    assert len(chunks) == 1
    assert chunks[0].content.startswith("Eligibility")


def test_long_section_windows_with_overlap():
    sentence = "Veterans may qualify for this benefit under certain conditions. "
    blocks = [Block(text=sentence * 200, page=3, section_path="Benefits")]
    chunks = chunk_blocks(blocks)
    assert len(chunks) > 1
    limit = int(TARGET_TOKENS * CHARS_PER_TOKEN * 1.6)
    for c in chunks:
        assert len(c.content) <= limit
        assert c.section_path == "Benefits"
        assert c.page == 3
    # consecutive windows share text (the overlap); strip the heading prefix first
    a = chunks[0].content.removeprefix("Benefits").strip()
    b = chunks[1].content.removeprefix("Benefits").strip()
    assert a[-150:-50] in b[:500]


def test_tiny_fragments_merged():
    blocks = [
        Block(
            text="A benefit exists for qualified veterans of the armed forces.",
            page=None,
            section_path="S",
        ),
        Block(text="See below.", page=None, section_path="S"),
    ]
    chunks = chunk_blocks(blocks)
    assert len(chunks) == 1
