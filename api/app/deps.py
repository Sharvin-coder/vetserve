"""Auth dependencies: resolve the caller's JWT into a user-bound Supabase
client (RLS applies as that user) plus their profile row."""

from dataclasses import dataclass
from typing import Any

from fastapi import Depends, HTTPException, Request
from supabase import Client, create_client

from .config import get_settings


@dataclass
class AuthedUser:
    id: str
    email: str
    profile: dict[str, Any]
    client: Client  # bound to the caller's JWT — every query runs under RLS


def _bearer_token(request: Request) -> str:
    auth = request.headers.get("authorization", "")
    if not auth.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Sign in to do this.")
    return auth[7:].strip()


def user_client(token: str) -> Client:
    s = get_settings()
    client = create_client(s.supabase_url, s.supabase_anon_key)
    client.postgrest.auth(token)
    return client


async def current_user(request: Request) -> AuthedUser:
    token = _bearer_token(request)
    client = user_client(token)
    try:
        user = client.auth.get_user(token).user
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=401, detail="Your session expired. Sign in again.") from exc
    if user is None:
        raise HTTPException(status_code=401, detail="Your session expired. Sign in again.")

    rows = client.table("profiles").select("*").eq("id", user.id).execute().data
    if not rows:
        raise HTTPException(status_code=403, detail="No profile found for this account.")
    return AuthedUser(id=user.id, email=user.email or "", profile=rows[0], client=client)


async def current_admin(user: AuthedUser = Depends(current_user)) -> AuthedUser:
    if user.profile.get("role") != "admin" or not user.profile.get("verified"):
        raise HTTPException(status_code=403, detail="Admins only.")
    return user
