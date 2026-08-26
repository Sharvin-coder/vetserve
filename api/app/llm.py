"""One OpenAI-compatible client for both providers.

Default is local Ollama; LLM_PROVIDER=groq flips base URL + key for demo-day
fallback. Embeddings always come from Ollama (nomic-embed-text, 768-dim) —
they index the corpus, so they never switch providers.
"""

from functools import lru_cache

from openai import AsyncOpenAI

from .config import Settings, get_settings

GENERATION_OPTS = {
    # small-model discipline: low temperature, short output, strict format
    "temperature": 0.1,
    "max_tokens": 400,
}


@lru_cache
def generation_client() -> AsyncOpenAI:
    s = get_settings()
    if s.llm_provider == "groq":
        return AsyncOpenAI(base_url=s.groq_base_url, api_key=s.groq_api_key)
    return AsyncOpenAI(base_url=s.ollama_base_url, api_key="ollama")


def generation_model(s: Settings | None = None) -> str:
    s = s or get_settings()
    return s.groq_model if s.llm_provider == "groq" else s.generation_model


@lru_cache
def embedding_client() -> AsyncOpenAI:
    s = get_settings()
    return AsyncOpenAI(base_url=s.ollama_base_url, api_key="ollama")


async def embed_texts(texts: list[str]) -> list[list[float]]:
    s = get_settings()
    resp = await embedding_client().embeddings.create(model=s.embedding_model, input=texts)
    return [d.embedding for d in resp.data]


async def embed_one(text: str) -> list[float]:
    return (await embed_texts([text]))[0]
