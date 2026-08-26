# VetServe Katy

Straight answers about veterans' benefits from official VA and Texas documents — with
sources — and a task board that connects local veterans with verified student
volunteers. Built in Katy, Texas for the 2026 Congressional App Challenge (TX-22).

Two halves, one audience:

- **VetGuide** — ask a question about benefits in plain language and get an answer
  built only from official VA / Texas Veterans Commission documents. Every claim
  carries an inline citation you can expand to the exact source passage. If the
  sources don't cover it, VetGuide says so and points you to a person who can help.
- **Task Board** — verified veterans post small tasks (tech help, yard work, a ride
  to the Katy VA clinic); verified student volunteers claim them, complete them, and
  export a verified PDF of service hours for NHS or school.

Everything runs locally and free: Ollama for the language model and embeddings,
Supabase for the database.

## Local setup

Prerequisites: [Node 20+](https://nodejs.org), [Python 3.11+](https://python.org),
[uv](https://docs.astral.sh/uv/), [Ollama](https://ollama.com), and Docker
(optional — steps 6–7 have a no-Docker alternative).

1. **Clone and configure.**

   ```
   cp .env.example .env
   ```

   You'll fill in the Supabase values in step 3 and the school email domain later.

2. **Create a free Supabase project** at [supabase.com](https://supabase.com).
   In the dashboard: Settings → API. Copy the project URL, the `anon` key, and the
   `service_role` key into `.env`.

3. **Run the migrations** (none yet in Phase 0 — this section activates in Phase 3):
   paste each file from `supabase/migrations/` into the Supabase SQL editor in
   filename order, or use `supabase db push` if you have the CLI.

4. **Pull the models** (one-time, ~5 GB total):

   ```
   ollama pull qwen2.5:7b-instruct
   ollama pull nomic-embed-text
   ```

   Ollama's server runs automatically on `http://localhost:11434` (if not:
   `ollama serve`).

5. **Start with Docker:**

   ```
   docker compose up --build
   ```

   Web on [http://localhost:3000](http://localhost:3000), API on
   [http://localhost:8000](http://localhost:8000). Ollama and Supabase run outside
   compose; the API container reaches Ollama through `host.docker.internal`.

6. **Or start without Docker** (two terminals):

   ```
   cd api
   uv sync
   uv run uvicorn app.main:app --reload
   ```

   ```
   cd web
   npm install
   npm run dev
   ```

7. **Verify.** Open [http://localhost:3000](http://localhost:3000) — the system
   check page shows whether the API, Ollama (and which models are pulled), and
   Supabase are all reachable. The raw report is at
   [http://localhost:8000/health](http://localhost:8000/health).

## Design system

Tokens live in `web/styles/tokens.css`; Tailwind reads only from them. Every
color pair used in the UI is checked against WCAG contrast thresholds by
`scripts/check_contrast.mjs`, which runs before every `npm run dev` and
`npm run build` and fails the build on a regression. All primitives, in all
states, render at [http://localhost:3000/styleguide](http://localhost:3000/styleguide).

## Hosted fallback (optional, demo day only)

If the demo laptop can't run Ollama, set in `.env`:

```
LLM_PROVIDER=groq
GROQ_API_KEY=...   # free tier at console.groq.com
```

Same OpenAI-compatible client, different base URL. The default — and the path
judges should use — is local Ollama.

## Repo layout

```
web/                  Next.js 14 (App Router) + Tailwind, own component library
api/                  FastAPI: VetGuide RAG, task board, hours export
supabase/migrations/  SQL migrations incl. row-level-security policies
scripts/              contrast gate, seed and eval scripts
```

Architecture diagram, retrieval/validation details, model rationale,
limitations, and the responsible-use section land in the Phase 4 README pass.
