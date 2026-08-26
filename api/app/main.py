from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .health import full_health
from .routers.admin import router as admin_router
from .routers.ask import router as ask_router
from .routers.auth import router as auth_router
from .routers.feedback import router as feedback_router
from .routers.tasks import router as tasks_router

app = FastAPI(title="VetServe Katy API", version="0.1.0")
app.include_router(ask_router)
app.include_router(feedback_router)
app.include_router(auth_router)
app.include_router(tasks_router)
app.include_router(admin_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return await full_health(get_settings())
