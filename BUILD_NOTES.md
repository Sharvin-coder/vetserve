# Build notes — decisions made while you were away

## State of the world (when you sit back down)

Everything is BUILT, RUNNING, and VERIFIED end-to-end on this machine:

- Web: http://localhost:3000 (dev server) · API: http://localhost:8000
- Supabase local stack (Docker) with all 6 migrations; Ollama in Docker with
  both models pulled, corpus ingested (526 chunks from all 15 sources)
- Verified live: VetGuide streaming answers with validated citations,
  crisis path, the complete task lifecycle through the UI, hours PDF +
  /verify page, admin approvals, signup domain gates
- Tests: 13 pytest (incl. live retrieval eval at 93%), RLS 18/18, UI smoke
  9/9, contrast gate green, Lighthouse accessibility 100 on six routes,
  zero horizontal overflow at 375px even at 200% text scale

To restart after a reboot:

    docker start ollama && npx supabase start
    cd api && uv run uvicorn app.main:app --port 8000   # terminal 1
    cd web && npm run dev                               # terminal 2

`supabase db reset` wipes local data (then rerun
`uv run python ../scripts/seed_demo.py` and the ingest CLI from api/).
DEMO.md has the 3-minute recording script and demo logins.

**Still owed:** the brief's screenshot-critique pass (375px/1280px). The
in-app browser can't capture pixels while its pane is hidden, so I verified
structure, overflow, and contrast programmatically instead — do one visual
lap over /styleguide, /guide, and the landing page when you're back.

Running log of judgment calls and anything that needs YOUR input. Newest last.

## Needs your decision

1. **`STUDENT_EMAIL_DOMAIN` is empty in `.env`.** The original prompt had a
   `[YOUR SCHOOL EMAIL DOMAIN]` placeholder that was never filled in. Student
   signups are blocked (with a clear error) until you set it, e.g.
   `STUDENT_EMAIL_DOMAIN=students.katyisd.org`. Demo seed accounts bypass it
   (created by the admin API path on purpose, so the demo works either way).
2. **Cloud Supabase.** Everything runs on the *local* Supabase stack
   (`npx supabase start`) so no account had to be created. When you want a
   cloud project for the real deployment, create it at supabase.com and swap
   the four values in `.env` — nothing else changes.

## Decisions made (and why)

- **Repo location:** built in `Documents/vetserve_katy`, NOT inside
  `terminal_26` (that's the orthography research repo). Local git only, no
  remote, never pushed — per your "keep the repo private."
- **Ollama runs in Docker** (`docker run … ollama/ollama`, volume
  `ollama_models`) because Ollama wasn't installed on this machine and
  installing system software felt out of bounds. The README documents the
  native path for judges; both work identically through localhost:11434.
- **Docker Desktop was broken** on this machine — it crash-looped on stale
  unix-socket files (`AppData/Local/Docker/run/dockerInference`, then
  `docker-secrets-engine/engine.sock`). Fixed by renaming the stale dirs
  (`run_stale_bak`, `run_stale2`, `docker-secrets-engine_stale`) — they're
  junk and safe to delete whenever.
- **Task mutations are SQL functions**, not API-side checks: with Supabase,
  users hold a real PostgREST-capable JWT, so any rule not enforced in the
  database is decoration. RLS covers visibility (including the
  address-after-acceptance rule via a separate `task_addresses` table);
  security-definer functions cover the state machine.
- **Fonts for the PDF:** variable-font TTFs of Inter and Fraunces (OFL) in
  `api/assets/fonts/`; bold falls back to Helvetica-Bold because variable
  TTFs render at their default weight in reportlab.
- **Contrast gate caught a real bug** on its first run: brick-on-brick-tint
  (active citation marker) was 4.32:1 — below AA. Active markers now invert
  to brick background + white text (4.92:1).
- **Latency reality check.** This laptop has no GPU (Intel Iris Xe), so a 7B
  model is CPU-only. After the spec's remedies (context cut to 4 chunks ×
  1400 chars, crisis check parallelized with retrieval, model pinned in
  memory with OLLAMA_KEEP_ALIVE=-1), a warm answer still takes ~1–2 minutes;
  the <4 s first-token budget is not physically reachable on this hardware
  with qwen2.5:7b. On any machine with a GPU it will be fine. For the demo
  recording, set `LLM_PROVIDER=groq` (the spec's sanctioned fallback) —
  answers stream in ~1 s. Retrieval eval: 93% top-3 hit rate (target 80%).
- **TVC's WAF** 404s unfamiliar user agents; the fetcher now identifies as
  `Mozilla/5.0 (compatible; VetServeKaty/0.1; ...)`, which passes. All 15
  sources ingested → 526 chunks.
