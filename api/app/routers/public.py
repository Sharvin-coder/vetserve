"""Public, unauthenticated reads for the landing page: a few open tasks with
only the fields any signed-in user could see (never addresses or names)."""

from fastapi import APIRouter

from ..db import service_client

router = APIRouter()


@router.get("/public/tasks")
async def landing_tasks():
    rows = (
        service_client().table("tasks")
        .select("id, title, category, zip, est_hours, created_at")
        .eq("status", "open").order("created_at", desc=True).limit(3).execute().data
    )
    return {"tasks": rows}
