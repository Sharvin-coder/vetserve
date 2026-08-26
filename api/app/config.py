from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# .env lives at the repo root, one level above api/
_ENV_FILE = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=_ENV_FILE, env_file_encoding="utf-8", extra="ignore")

    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""

    llm_provider: str = "ollama"  # "ollama" | "groq"
    ollama_base_url: str = "http://localhost:11434/v1"
    generation_model: str = "qwen2.5:7b-instruct"
    embedding_model: str = "nomic-embed-text"

    groq_api_key: str = ""
    groq_base_url: str = "https://api.groq.com/openai/v1"
    groq_model: str = "llama-3.1-8b-instant"

    student_email_domain: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()
