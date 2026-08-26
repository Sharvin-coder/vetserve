"""Turn a fetched document (PDF bytes or HTML text) into extracted blocks.

A block is a paragraph-ish unit with the metadata chunking needs:
    {"text": str, "page": int | None, "section_path": str}
"""

import re
from dataclasses import dataclass

import fitz  # pymupdf
import trafilatura


@dataclass
class Block:
    text: str
    page: int | None
    section_path: str


def _clean(text: str) -> str:
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def extract_pdf(data: bytes) -> list[Block]:
    """Per-page text; larger-font lines become section headings."""
    blocks: list[Block] = []
    with fitz.open(stream=data, filetype="pdf") as doc:
        # median font size across the doc separates headings from body
        sizes: list[float] = []
        for pg in doc:
            for b in pg.get_text("dict")["blocks"]:
                for line in b.get("lines", []):
                    sizes.extend(span["size"] for span in line.get("spans", []))
        body_size = sorted(sizes)[len(sizes) // 2] if sizes else 11.0

        section = ""
        for pg in doc:
            for b in pg.get_text("dict")["blocks"]:
                lines = b.get("lines", [])
                if not lines:
                    continue
                text = _clean(
                    "\n".join(
                        " ".join(span["text"] for span in line.get("spans", [])) for line in lines
                    )
                )
                if not text:
                    continue
                max_size = max(
                    (span["size"] for line in lines for span in line.get("spans", [])),
                    default=body_size,
                )
                is_heading = max_size >= body_size * 1.25 and len(text) < 120
                if is_heading:
                    section = text
                    continue
                blocks.append(Block(text=text, page=pg.number + 1, section_path=section))
    return blocks


def extract_html(html: str, url: str) -> list[Block]:
    """Main-content extraction via trafilatura, headings preserved as sections."""
    text = trafilatura.extract(
        html, url=url, include_formatting=True, favor_recall=True, output_format="markdown"
    )
    if not text:
        return []
    blocks: list[Block] = []
    section_parts: list[str] = []
    for para in re.split(r"\n{2,}", text):
        para = _clean(para)
        if not para:
            continue
        m = re.match(r"^(#{1,6})\s+(.*)$", para)
        if m:
            level = len(m.group(1))
            section_parts = section_parts[: level - 1]
            section_parts.append(m.group(2).strip())
            continue
        blocks.append(
            Block(text=para, page=None, section_path=" > ".join(section_parts))
        )
    return blocks
