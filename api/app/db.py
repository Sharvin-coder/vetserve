from functools import lru_cache

from supabase import Client, create_client

from .config import get_settings


@lru_cache
def service_client() -> Client:
    """Service-role client: bypasses RLS. Ingestion and admin paths only."""
    s = get_settings()
    return create_client(s.supabase_url, s.supabase_service_role_key)


@lru_cache
def anon_client() -> Client:
    """Anon client: subject to RLS, used for public reads."""
    s = get_settings()
    return create_client(s.supabase_url, s.supabase_anon_key)
