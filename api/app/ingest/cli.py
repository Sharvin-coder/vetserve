"""Ingest every source in sources.json.

    uv run python -m app.ingest.cli            # ingest all
    uv run python -m app.ingest.cli --only tvc # substring filter on url/title

Updates sources.json in place with sha256 + fetched_at for each success;
failures are reported and recorded, never substituted.
"""

import argparse
import asyncio
import json
import sys
from pathlib import Path

from .pipeline import ingest_source

SOURCES_PATH = Path(__file__).resolve().parents[3] / "sources.json"


async def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", default="", help="substring filter on url or title")
    args = parser.parse_args()

    sources = json.loads(SOURCES_PATH.read_text(encoding="utf-8"))
    failures: list[tuple[str, str]] = []

    for src in sources:
        needle = args.only.lower()
        if needle and needle not in src["url"].lower() and needle not in src["title"].lower():
            continue
        print(f"→ {src['title']}")
        try:
            result = await ingest_source(src["url"], src["title"], src.get("local_path"))
        except Exception as exc:  # noqa: BLE001 — report every failure, keep going
            print(f"  FAILED: {type(exc).__name__}: {exc}")
            failures.append((src["url"], f"{type(exc).__name__}: {exc}"))
            src["last_error"] = f"{type(exc).__name__}: {exc}"
            continue
        src["sha256"] = result["sha256"]
        src["fetched_at"] = result["fetched_at"]
        src.pop("last_error", None)
        print(f"  {result['kind']}: {result['total']} chunks, {result['inserted']} new")

    SOURCES_PATH.write_text(json.dumps(sources, indent=2) + "\n", encoding="utf-8")

    if failures:
        print("\nFetch failures (NOT substituted — needs a human decision):")
        for url, err in failures:
            print(f"  {url}\n    {err}")
        return 1
    print("\nAll sources ingested.")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
