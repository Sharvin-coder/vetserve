"""Demo seed: 1 admin, 3 veterans, 3 students, 10 tasks across every state.

    cd api && uv run python ../scripts/seed_demo.py

Idempotent: reuses existing accounts, tops tasks up to the target count.
All demo passwords are `demo-password-1` (documented in the README).
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "api"))

from app.config import get_settings  # noqa: E402
from supabase import create_client  # noqa: E402

PASSWORD = "demo-password-1"

VETERANS = [
    ("vet.alvarez@demo.local", "J. Alvarez", "77494"),
    ("vet.okafor@demo.local", "R. Okafor", "77450"),
    ("vet.nguyen@demo.local", "T. Nguyen", "77406"),
]
STUDENTS = [
    ("priya.n@demo.local", "Priya N.", "77494", "Katy High School"),
    ("marcus.j@demo.local", "Marcus J.", "77450", "Seven Lakes High School"),
    ("elena.r@demo.local", "Elena R.", "77406", "Tompkins High School"),
]
ADMIN = ("admin@demo.local", "VetServe Admin", "77494")

# (veteran idx, student idx or None, target status, title, category, zip, hours, description)
TASKS = [
    (0, None, "open", "Set up my new Android phone", "tech_help", "77494", 1.5,
     "New phone, old phone, and none of my contacts made the jump."),
    (0, None, "open", "Move boxes down from the attic", "yard", "77494", 2.0,
     "About ten boxes, nothing too heavy."),
    (1, None, "open", "Ride to the Katy VA clinic on Thursday", "ride", "77450", 2.0,
     "Appointment at 10:30, takes about an hour."),
    (2, None, "open", "Help filling out a property tax exemption form", "paperwork", "77406", 1.0,
     "I have my disability letter; the county form is confusing."),
    (1, 0, "claimed", "Printer won't connect to laptop", "tech_help", "77450", 1.0,
     "It worked before the last Windows update."),
    (2, 1, "claimed", "Trim the front hedges", "yard", "77406", 2.5, ""),
    (0, 1, "accepted", "Weekly grocery run", "errand", "77494", 1.5,
     "List is short — mostly the same staples every week."),
    (2, 2, "accepted", "Teach me video calls so I can see my grandkids", "tech_help", "77406", 1.5, ""),
    (1, 2, "done", "Rake and bag the back yard", "yard", "77450", 3.0, ""),
    (0, 0, "confirmed", "Set up tablet for VA telehealth", "tech_help", "77494", 2.0,
     "The clinic wants me to use video appointments."),
]


def ensure_user(admin_client, email, role, name, zip_code, school=None, verified=True):
    existing = [u for u in admin_client.auth.admin.list_users() if u.email == email]
    if existing:
        uid = existing[0].id
    else:
        uid = admin_client.auth.admin.create_user(
            {
                "email": email,
                "password": PASSWORD,
                "email_confirm": True,
                "user_metadata": {
                    "role": role if role != "admin" else "veteran",
                    "display_name": name,
                    "zip": zip_code,
                    "school": school or "",
                },
            }
        ).user.id
    admin_client.table("profiles").update(
        {"verified": verified, "role": role, "display_name": name, "zip": zip_code}
    ).eq("id", uid).execute()
    return uid


def signed_client(email):
    s = get_settings()
    c = create_client(s.supabase_url, s.supabase_anon_key)
    session = c.auth.sign_in_with_password({"email": email, "password": PASSWORD}).session
    c.postgrest.auth(session.access_token)
    return c


def main() -> int:
    s = get_settings()
    admin = create_client(s.supabase_url, s.supabase_service_role_key)

    ensure_user(admin, ADMIN[0], "admin", ADMIN[1], ADMIN[2])
    vet_ids = [ensure_user(admin, e, "veteran", n, z) for e, n, z in VETERANS]
    [ensure_user(admin, e, "student", n, z, school) for e, n, z, school in STUDENTS]

    vets = [signed_client(e) for e, _, _ in VETERANS]
    stus = [signed_client(e) for e, _, _, _ in STUDENTS]

    existing_titles = {
        r["title"]
        for r in admin.table("tasks").select("title").in_("posted_by", vet_ids).execute().data
    }

    made = 0
    for vet_i, stu_i, status, title, category, zip_code, hours, desc in TASKS:
        if title in existing_titles:
            continue
        tid = vets[vet_i].rpc(
            "post_task",
            {
                "p_title": title,
                "p_category": category,
                "p_description": desc,
                "p_zip": zip_code,
                "p_address": f"{100 + made} Demo Street, Katy TX",
                "p_est_hours": hours,
            },
        ).execute().data
        if status in ("claimed", "accepted", "done", "confirmed"):
            stus[stu_i].rpc("claim_task", {"p_task": tid}).execute()
        if status in ("accepted", "done", "confirmed"):
            vets[vet_i].rpc("accept_claim", {"p_task": tid}).execute()
        if status in ("done", "confirmed"):
            stus[stu_i].rpc("mark_done", {"p_task": tid}).execute()
        if status == "confirmed":
            vets[vet_i].rpc("confirm_done", {"p_task": tid}).execute()
        made += 1
        print(f"  {status:9} {title}")

    print(f"\nSeeded {made} new tasks (rest already existed).")
    print(f"Accounts (password {PASSWORD}):")
    print(f"  admin: {ADMIN[0]}")
    for e, n, _ in VETERANS:
        print(f"  veteran: {e} ({n})")
    for e, n, _, school in STUDENTS:
        print(f"  student: {e} ({n}, {school})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
