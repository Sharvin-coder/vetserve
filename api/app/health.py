"""Health checks: is Ollama up (and which models are pulled), is Supabase reachable."""

import asyncio
from typing import Any

import httpx

from .config import Settings


async def check_ollama(settings: Settings) -> dict[str, Any]:
    # OLLAMA_BASE_URL points at the OpenAI-compatible endpoint (…/v1);
    # the native API that lists pulled models lives at the server root.
    root = settings.ollama_base_url.rstrip("/").removesuffix("/v1")
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(f"{root}/api/tags")
            resp.raise_for_status()
            models = [m.get("name", "") for m in resp.json().get("models", [])]
    except (httpx.HTTPError, ValueError) as exc:
        return {"reachable": False, "models": [], "error": type(exc).__name__}

    def pulled(name: str) -> bool:
        # "qwen2.5:7b-instruct" should match "qwen2.5:7b-instruct-q4_K_M" style tags too
        return any(m == name or m.startswith(name) for m in models)

    return {
        "reachable": True,
        "models": models,
        "generation_model_loaded": pulled(settings.generation_model),
        "embedding_model_loaded": pulled(settings.embedding_model),
    }


async def check_supabase(settings: Settings) -> dict[str, Any]:
    if not settings.supabase_url or not settings.supabase_anon_key:
        return {"reachable": False, "error": "not_configured"}
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                f"{settings.supabase_url.rstrip('/')}/rest/v1/",
                headers={"apikey": settings.supabase_anon_key},
            )
            resp.raise_for_status()
    except httpx.HTTPError as exc:
        return {"reachable": False, "error": type(exc).__name__}
    return {"reachable": True}


async def full_health(settings: Settings) -> dict[str, Any]:
    ollama, supabase = await asyncio.gather(check_ollama(settings), check_supabase(settings))
    ok = ollama["reachable"] and supabase["reachable"]
    return {
        "status": "ok" if ok else "degraded",
        "llm_provider": settings.llm_provider,
        "ollama": ollama,
        "supabase": supabase,
    }
