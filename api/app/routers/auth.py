"""Signup goes through the API so the verification rules live in one place:
students must use the school email domain; veterans self-attest. Everyone
starts unverified until an admin approves. Login happens client-side with
supabase-js against Supabase auth directly."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr, Field

from ..config import get_settings
from ..db import service_client

router = APIRouter()


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    role: str = Field(pattern="^(veteran|student)$")
    display_name: str = Field(min_length=2, max_length=60)
    zip: str = Field(pattern=r"^\d{5}$")
    school: str | None = Field(default=None, max_length=120)


@router.post("/auth/signup")
async def signup(req: SignupRequest):
    s = get_settings()
    if req.role == "student":
        domain = s.student_email_domain.strip().lstrip("@").lower()
        if not domain:
            raise HTTPException(
                status_code=503,
                detail="Student signups aren't configured yet (STUDENT_EMAIL_DOMAIN).",
            )
        if not req.email.lower().endswith(f"@{domain}"):
            raise HTTPException(
                status_code=422,
                detail=f"Students sign up with their @{domain} school email.",
            )
        if not req.school:
            raise HTTPException(status_code=422, detail="Add your school's name.")

    try:
        service_client().auth.admin.create_user(
            {
                "email": req.email,
                "password": req.password,
                "email_confirm": True,
                "user_metadata": {
                    "role": req.role,
                    "display_name": req.display_name,
                    "zip": req.zip,
                    "school": req.school or "",
                },
            }
        )
    except Exception as exc:  # noqa: BLE001
        msg = str(exc)
        if "already" in msg.lower():
            raise HTTPException(
                status_code=409, detail="An account with this email already exists."
            ) from exc
        raise HTTPException(status_code=500, detail="Couldn't create the account.") from exc

    return {
        "ok": True,
        "next": "An admin reviews new accounts before tasks unlock — usually within a day.",
    }
