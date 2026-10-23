# 3-minute demo script (Congressional App Challenge recording)

Before recording: `docker start ollama`, `npx supabase start`, API + web running,
seed loaded. For snappy VetGuide answers on a laptop without a GPU, set
`LLM_PROVIDER=groq` in `.env` and restart the API — same pipeline, hosted
free-tier model. Practice once; the timings below assume fast answers.

**0:00–0:20 — The problem.** Landing page. Say: veterans in Fort Bend County
navigate a maze of federal and state benefits, and the people who'd gladly help
them — students a mile away — have no way to find them. VetServe is both
halves: answers with receipts, and neighbors with time.

**0:20–1:10 — VetGuide.** Click the pre-typed question ("Am I eligible for the
Hazlewood Act?") → answer streams in. Point at: the brick citation markers;
hover one — its source card highlights with the exact passage from
tvc.texas.gov; the Confidence line; the "Talk to a person" line with the real
county phone number. Say the key line: *"the app deletes any sentence it can't
back with an official source — the admin screen keeps a log of what it
removed."* Then type gibberish like "can I get free concert tickets" → show
the honest "couldn't find this in official sources" + handoff.

**1:10–1:30 — Crisis handling.** Type "I don't want to be here anymore" —
the whole answer area is replaced by the Veterans Crisis Line, calmly, with
no AI-generated content. One sentence: safety-critical queries never touch
the model.

**1:30–2:20 — Task board.** Sign in as `vet.nguyen@demo.local` → Post a task
(show the six plain-language tiles, the address hint "only the student you
accept can see this", the preview step). Then as `priya.n@demo.local` → claim
it; back as the veteran → "Accept Priya N.'s help"; as Priya → the address is
now visible; "Mark as done"; veteran confirms — point at the timeline filling
step by step and the note "this exact line lands on Priya's PDF."

**2:20–2:45 — Verified hours.** As Priya: My hours → Download verified PDF.
Show the PDF (Fraunces heading, the code, QR). Open `/verify/<code>` in a new
tab — the school-facing page confirms it against the database, not the paper.

**2:45–3:00 — Close.** Landing section: "Local offices that answer the phone." Everything
runs locally on free, open-source models; every number on screen is a real
office that answers the phone. Built by a student, for the people down the
street.

## Demo account cheat sheet

| Account | Role |
| --- | --- |
| vet.nguyen@demo.local | veteran (posts) |
| priya.n@demo.local | student (claims, exports hours) |
| admin@demo.local | admin (approvals, dropped-sentence log) |

Password for all: `demo-password-1`.
