"""Task board endpoints. Reads run under the caller's RLS; every mutation is
one of the SQL state-machine functions — the API adds nothing but transport,
so there is no path around the database's rules."""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from ..deps import AuthedUser, current_user

router = APIRouter()

TASK_COLUMNS = (
    "id, title, category, description, zip, est_hours, status, posted_by, claimed_by, "
    "created_at, updated_at"
)


class PostTaskRequest(BaseModel):
    title: str = Field(min_length=3, max_length=120)
    category: str = Field(pattern="^(tech_help|yard|ride|errand|paperwork|company)$")
    description: str = Field(default="", max_length=2000)
    zip: str = Field(pattern=r"^\d{5}$")
    address: str = Field(default="", max_length=300)
    est_hours: float = Field(gt=0, le=24)


def _rpc(user: AuthedUser, fn: str, args: dict[str, Any]) -> Any:
    try:
        return user.client.rpc(fn, args).execute().data
    except Exception as exc:  # noqa: BLE001
        # postgrest surfaces the RAISE EXCEPTION message; pass it through
        detail = getattr(exc, "message", None) or str(exc)
        raise HTTPException(status_code=409, detail=detail) from exc


@router.get("/me")
async def me(user: AuthedUser = Depends(current_user)):
    return {"id": user.id, "email": user.email, **user.profile}


@router.get("/tasks")
async def browse_tasks(
    category: str | None = None,
    zip_prefix: str | None = None,
    open_only: bool = True,
    user: AuthedUser = Depends(current_user),
):
    q = user.client.table("tasks").select(TASK_COLUMNS)
    if open_only:
        q = q.eq("status", "open")
    if category:
        q = q.eq("category", category)
    if zip_prefix:
        q = q.like("zip", f"{zip_prefix}%")
    rows = q.order("created_at", desc=True).limit(100).execute().data
    return {"tasks": rows}


@router.get("/tasks/mine")
async def my_tasks(user: AuthedUser = Depends(current_user)):
    posted = (
        user.client.table("tasks").select(TASK_COLUMNS).eq("posted_by", user.id)
        .order("updated_at", desc=True).execute().data
    )
    claimed = (
        user.client.table("tasks").select(TASK_COLUMNS).eq("claimed_by", user.id)
        .order("updated_at", desc=True).execute().data
    )
    return {"posted": posted, "claimed": claimed}


@router.get("/tasks/{task_id}")
async def task_detail(task_id: int, user: AuthedUser = Depends(current_user)):
    rows = user.client.table("tasks").select(TASK_COLUMNS).eq("id", task_id).execute().data
    if not rows:
        raise HTTPException(status_code=404, detail="Task not found.")
    task = rows[0]

    # address only resolves if this caller passes the task_addresses RLS
    addr_q = user.client.table("task_addresses").select("address").eq("task_id", task_id)
    addr = addr_q.execute().data
    task["address"] = addr[0]["address"] if addr else None

    # display names for the two parties this caller may see
    names: dict[str, str] = {}
    for uid in {task["posted_by"], task.get("claimed_by")} - {None}:
        prof = user.client.table("profiles").select("display_name").eq("id", uid).execute().data
        if prof:
            names[uid] = prof[0]["display_name"]
    task["posted_by_name"] = names.get(task["posted_by"])
    task["claimed_by_name"] = names.get(task.get("claimed_by"))
    return task


@router.post("/tasks")
async def post_task(req: PostTaskRequest, user: AuthedUser = Depends(current_user)):
    task_id = _rpc(
        user,
        "post_task",
        {
            "p_title": req.title,
            "p_category": req.category,
            "p_description": req.description,
            "p_zip": req.zip,
            "p_address": req.address,
            "p_est_hours": req.est_hours,
        },
    )
    return {"id": task_id}


_TRANSITIONS = {
    "claim": "claim_task",
    "accept": "accept_claim",
    "decline": "decline_claim",
    "done": "mark_done",
    "confirm": "confirm_done",
    "cancel": "cancel_task",
    "withdraw": "withdraw_claim",
}


@router.post("/tasks/{task_id}/{action}")
async def transition(task_id: int, action: str, user: AuthedUser = Depends(current_user)):
    fn = _TRANSITIONS.get(action)
    if not fn:
        raise HTTPException(status_code=404, detail="Unknown action.")
    _rpc(user, fn, {"p_task": task_id})
    return {"ok": True}


@router.get("/notifications")
async def notifications(user: AuthedUser = Depends(current_user)):
    rows = (
        user.client.table("notifications").select("*").eq("user_id", user.id)
        .order("created_at", desc=True).limit(30).execute().data
    )
    return {"notifications": rows}


@router.post("/notifications/read")
async def mark_read(user: AuthedUser = Depends(current_user)):
    user.client.table("notifications").update({"read": True}).eq("user_id", user.id).eq(
        "read", False
    ).execute()
    return {"ok": True}


@router.get("/hours")
async def my_hours(user: AuthedUser = Depends(current_user)):
    rows = (
        user.client.table("hours_log").select("*, tasks(title, category)")
        .eq("student_id", user.id).order("confirmed_at", desc=True).execute().data
    )
    total = float(sum(r["hours"] for r in rows))
    return {"hours": rows, "total": total}
