import asyncio
import contextlib

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .health import full_health
from .routers.admin import router as admin_router
from .routers.ask import router as ask_router
from .routers.auth import router as auth_router
from .routers.feedback import router as feedback_router
from .routers.hours_export import router as hours_router
from .routers.public import router as public_router
from .routers.tasks import router as tasks_router

app = FastAPI(title="VetServe API", version="0.1.0")
app.include_router(ask_router)
app.include_router(feedback_router)
app.include_router(auth_router)
app.include_router(tasks_router)
app.include_router(admin_router)
app.include_router(hours_router)
app.include_router(public_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def warm_reranker() -> None:
    """Load the ~1 GB cross-encoder in the background at boot so the first
    question doesn't pay ~30 s of model loading."""

    def load() -> None:
        with contextlib.suppress(Exception):  # offline boot is fine; lazy path remains
            from .rag.retrieve import _reranker

            _reranker()

    asyncio.get_running_loop().run_in_executor(None, load)


@app.get("/health")
async def health():
    return await full_health(get_settings())
