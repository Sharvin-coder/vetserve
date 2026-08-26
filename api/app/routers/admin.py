from fastapi import APIRouter, Depends
from pydantic import BaseModel

from ..db import service_client
from ..deps import AuthedUser, current_admin

router = APIRouter(prefix="/admin")


class VerifyRequest(BaseModel):
    user_id: str
    verified: bool


@router.get("/users")
async def list_users(admin: AuthedUser = Depends(current_admin)):
    rows = admin.client.rpc("admin_list_profiles", {}).execute().data
    return {"users": rows}


@router.post("/verify")
async def set_verified(req: VerifyRequest, admin: AuthedUser = Depends(current_admin)):
    admin.client.rpc(
        "admin_set_verified", {"p_user": req.user_id, "p_verified": req.verified}
    ).execute()
    return {"ok": True}


@router.get("/tasks")
async def all_tasks(admin: AuthedUser = Depends(current_admin)):
    rows = (
        admin.client.table("tasks").select("*").order("updated_at", desc=True).limit(200)
        .execute().data
    )
    return {"tasks": rows}


@router.get("/dropped")
async def dropped_sentences(admin: AuthedUser = Depends(current_admin)):
    # service client: table is service-write/admin-read; the admin identity
    # was already enforced by current_admin above
    rows = (
        service_client().table("vetguide_dropped").select("*")
        .order("created_at", desc=True).limit(200).execute().data
    )
    return {"dropped": rows}


@router.get("/feedback")
async def feedback_log(admin: AuthedUser = Depends(current_admin)):
    rows = (
        service_client().table("feedback").select("*")
        .order("created_at", desc=True).limit(200).execute().data
    )
    return {"feedback": rows}
