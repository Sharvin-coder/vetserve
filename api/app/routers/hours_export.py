"""Verified service-hours PDF + the public verification endpoint.

The PDF carries a random code; anyone (a school, NHS) can check it at
/verify/<code>. Export rows are stored server-side, so the code proves the
document against the database, not against the PDF's own contents.
"""

import io
import secrets
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from ..config import get_settings
from ..db import service_client
from ..deps import AuthedUser, current_user
from ..pdf import build_hours_pdf

router = APIRouter()


def _code() -> str:
    # short, unambiguous, easy to read over the phone
    alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
    return "-".join(
        "".join(secrets.choice(alphabet) for _ in range(4)) for _ in range(3)
    )


@router.get("/hours/export")
async def export_hours(user: AuthedUser = Depends(current_user)):
    if user.profile.get("role") != "student":
        raise HTTPException(status_code=403, detail="Hours export is for student accounts.")

    rows = (
        user.client.table("hours_log").select("*, tasks(title, category)")
        .eq("student_id", user.id).order("confirmed_at").execute().data
    )
    if not rows:
        raise HTTPException(status_code=409, detail="No confirmed hours to export yet.")

    total = float(sum(float(r["hours"]) for r in rows))
    code = _code()
    entries = [
        {
            "date": r["confirmed_at"][:10],
            "task": (r.get("tasks") or {}).get("title", f"Task #{r['task_id']}"),
            "hours": float(r["hours"]),
        }
        for r in rows
    ]

    service_client().table("hour_exports").insert(
        {
            "code": code,
            "student_id": user.id,
            "student_name": user.profile.get("display_name", ""),
            "school": user.profile.get("school") or "",
            "total_hours": total,
            "payload": entries,
        }
    ).execute()

    verify_url = f"{get_settings().public_web_url.rstrip('/')}/verify/{code}"
    pdf = build_hours_pdf(
        student_name=user.profile.get("display_name", ""),
        school=user.profile.get("school") or "—",
        entries=entries,
        total=total,
        code=code,
        verify_url=verify_url,
        generated=datetime.now(UTC).strftime("%B %d, %Y"),
    )
    return StreamingResponse(
        io.BytesIO(pdf),
        media_type="application/pdf",
        headers={
            "Content-Disposition": 'attachment; filename="vetserve-hours.pdf"',
            "X-Verification-Code": code,
            "Access-Control-Expose-Headers": "X-Verification-Code",
        },
    )


@router.get("/verify/{code}")
async def verify_code(code: str):
    rows = (
        service_client().table("hour_exports").select("*").eq("code", code.strip().upper())
        .limit(1).execute().data
    )
    if not rows:
        raise HTTPException(status_code=404, detail="That code doesn't match any export.")
    r = rows[0]
    return {
        "student_name": r["student_name"],
        "school": r["school"],
        "total_hours": float(r["total_hours"]),
        "entries": r["payload"],
        "generated_at": r["created_at"],
    }
