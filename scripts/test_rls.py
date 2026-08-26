"""Two-role RLS test: proves the privacy rules hold at the DATABASE, with a
veteran client and a student client each carrying their own JWT.

    cd api && uv run python ../scripts/test_rls.py

Creates throwaway users (rls_vet@test.local / rls_stu@test.local /
rls_stu2@test.local), walks a task through the state machine, and asserts at
every step what each role can and cannot see or do. Requires a running
Supabase with migrations applied and SUPABASE_SERVICE_ROLE_KEY in .env.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "api"))

from app.config import get_settings  # noqa: E402
from supabase import create_client  # noqa: E402

PASSWORD = "rls-test-password-1"
CHECKS: list[tuple[str, bool]] = []


def check(desc: str, ok: bool) -> None:
    CHECKS.append((desc, ok))
    print(f"{'PASS' if ok else 'FAIL'}  {desc}")


def ensure_user(admin, email: str, role: str, verified: bool):
    """Create (or reset) a test user; returns (user_id, user_client)."""
    s = get_settings()
    existing = [u for u in admin.auth.admin.list_users() if u.email == email]
    if existing:
        uid = existing[0].id
    else:
        uid = admin.auth.admin.create_user(
            {
                "email": email,
                "password": PASSWORD,
                "email_confirm": True,
                "user_metadata": {"role": role, "display_name": email.split("@")[0], "zip": "77494"},
            }
        ).user.id
    admin.table("profiles").update({"verified": verified, "role": role}).eq("id", uid).execute()

    client = create_client(s.supabase_url, s.supabase_anon_key)
    session = client.auth.sign_in_with_password({"email": email, "password": PASSWORD}).session
    client.postgrest.auth(session.access_token)
    return uid, client


def expect_error(fn, desc: str) -> None:
    try:
        fn()
        check(desc, False)
    except Exception:  # noqa: BLE001 — any refusal is a pass
        check(desc, True)


def main() -> int:
    s = get_settings()
    admin = create_client(s.supabase_url, s.supabase_service_role_key)

    vet_id, vet = ensure_user(admin, "rls_vet@test.local", "veteran", verified=True)
    stu_id, stu = ensure_user(admin, "rls_stu@test.local", "student", verified=True)
    _, stu2 = ensure_user(admin, "rls_stu2@test.local", "student", verified=True)
    _, unverified = ensure_user(admin, "rls_unv@test.local", "student", verified=False)

    # --- posting ---
    expect_error(
        lambda: stu.rpc(
            "post_task",
            {
                "p_title": "students cannot post",
                "p_category": "yard",
                "p_description": "",
                "p_zip": "77494",
                "p_address": "",
                "p_est_hours": 1,
            },
        ).execute(),
        "student cannot post a task",
    )
    task_id = vet.rpc(
        "post_task",
        {
            "p_title": "RLS test task",
            "p_category": "tech_help",
            "p_description": "help with a printer",
            "p_zip": "77494",
            "p_address": "123 Private Lane",
            "p_est_hours": 2,
        },
    ).execute().data
    check("verified veteran posts a task", isinstance(task_id, int))

    # --- direct writes are blocked ---
    expect_error(
        lambda: stu.table("tasks").update({"status": "confirmed"}).eq("id", task_id).execute(),
        "student cannot UPDATE tasks directly (state machine only)",
    )

    # --- address privacy before acceptance ---
    rows = stu.table("task_addresses").select("*").eq("task_id", task_id).execute().data
    check("student cannot see address before acceptance", rows == [])
    rows = vet.table("task_addresses").select("*").eq("task_id", task_id).execute().data
    check("veteran sees their own address", len(rows) == 1)

    # --- claiming ---
    expect_error(
        lambda: unverified.rpc("claim_task", {"p_task": task_id}).execute(),
        "unverified student cannot claim",
    )
    stu.rpc("claim_task", {"p_task": task_id}).execute()
    check("verified student claims the open task", True)
    expect_error(
        lambda: stu2.rpc("claim_task", {"p_task": task_id}).execute(),
        "second student cannot claim a claimed task",
    )

    # address still hidden while merely claimed
    rows = stu.table("task_addresses").select("*").eq("task_id", task_id).execute().data
    check("claimant cannot see address before acceptance", rows == [])

    # --- acceptance and the accepted-only address rule ---
    expect_error(
        lambda: stu.rpc("accept_claim", {"p_task": task_id}).execute(),
        "student cannot accept their own claim",
    )
    vet.rpc("accept_claim", {"p_task": task_id}).execute()
    rows = stu.table("task_addresses").select("*").eq("task_id", task_id).execute().data
    check("accepted student NOW sees the address", len(rows) == 1)
    rows = stu2.table("task_addresses").select("*").eq("task_id", task_id).execute().data
    check("other student still cannot see the address", rows == [])

    # --- done / confirm and hours ---
    expect_error(
        lambda: vet.rpc("mark_done", {"p_task": task_id}).execute(),
        "veteran cannot mark done (student's move)",
    )
    stu.rpc("mark_done", {"p_task": task_id}).execute()
    expect_error(
        lambda: stu.rpc("confirm_done", {"p_task": task_id}).execute(),
        "student cannot confirm their own hours",
    )
    vet.rpc("confirm_done", {"p_task": task_id}).execute()
    rows = stu.table("hours_log").select("*").eq("task_id", task_id).execute().data
    check("student sees their confirmed hours", len(rows) == 1 and float(rows[0]["hours"]) == 2.0)
    rows = stu2.table("hours_log").select("*").eq("task_id", task_id).execute().data
    check("other student cannot see those hours", rows == [])

    # --- profiles ---
    rows = stu.table("profiles").select("id").neq("id", stu_id).execute().data
    check("student cannot enumerate other profiles", rows == [])
    expect_error(
        lambda: stu.table("profiles").update({"verified": True}).eq("id", stu_id).execute()
        if stu.table("profiles").update({"role": "admin"}).eq("id", stu_id).execute()
        else None,
        "student cannot change own role",
    )

    # cleanup: cancel nothing (task is confirmed); remove test task rows
    admin.table("hours_log").delete().eq("task_id", task_id).execute()
    admin.table("notifications").delete().eq("task_id", task_id).execute()
    admin.table("task_addresses").delete().eq("task_id", task_id).execute()
    admin.table("tasks").delete().eq("id", task_id).execute()

    failed = [d for d, ok in CHECKS if not ok]
    print(f"\n{len(CHECKS) - len(failed)}/{len(CHECKS)} passed")
    if failed:
        print("FAILURES:")
        for d in failed:
            print(f"  - {d}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
