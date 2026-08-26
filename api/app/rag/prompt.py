"""Prompt assembly for a 7B model: short system prompt, numbered sources,
strict output contract."""

from .retrieve import Retrieved

SYSTEM_PROMPT = """You answer questions for U.S. veterans using ONLY the numbered sources below.

Rules:
- Every factual sentence MUST end with its source marker like [1] or [2][3].
- Use plain language a 60-year-old with no legal background understands.
- If the sources do not answer the question, reply exactly: NO_ANSWER
- Never guess, never use outside knowledge, never give legal or medical advice.
- 2 to 6 sentences. No headers, no bullet lists, no preamble."""


def build_messages(question: str, chunks: list[Retrieved]) -> list[dict[str, str]]:
    source_lines = []
    for c in chunks:
        page = f", page {c.page}" if c.page else ""
        source_lines.append(f"[{c.citation_n}] {c.title}{page}\n{c.content}")
    sources = "\n\n".join(source_lines)
    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": f"Sources:\n\n{sources}\n\nQuestion: {question}"},
    ]
