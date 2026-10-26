# VetServe — demo video script (Congressional App Challenge, GA-10)

Two speakers: **S** (Sharvin) and **F** (teammate). Target 2:45–2:55 — hard cap
is 3:00 and judges may penalize overruns. Screen-record the app at 1280px wide;
voiceover over the recording is fine (you don't need to be on camera).

Required elements and where they land: names + app name (0:00), purpose in one
sentence (0:08), target audience (0:20), how it works (0:35–2:30), tools and
languages (2:30).

Before recording: services up (BUILD_NOTES.md runbook), `LLM_PROVIDER=groq` in
`.env` for fast answers, signed out of the app, seed data loaded.

---

**[0:00 — landing page on screen]**

**S:** We're Sharvin and ⟨name⟩, from Georgia's 10th district, and this is
VetServe.

**F:** VetServe gives veterans straight answers about their benefits — with
every sentence cited to an official government document — and connects them
with verified student volunteers for the everyday help an office can't give.

**S:** It's for three groups: veterans and their families who face a maze of
federal and state paperwork, and students like us who want to serve the people
who served — and can prove their volunteer hours doing it.

**[0:30 — click the pre-typed question on the landing page: "Who qualifies for
VA health care?" → answer streams on the VetGuide screen]**

**F:** This is VetGuide. Ask a question in plain language, and the answer is
built only from official documents we ingested — VA handbooks, benefits pages,
real office directories.

**S:** *(hover a citation marker)* Every claim carries a brick-colored marker.
Hover one, and you see the exact passage of the official document it came
from, with a link. A confidence rating sits above the sources, and every
answer ends with the phone number of a real office — because software should
hand you to a person, not replace one.

**[1:05 — type a question the sources can't answer, e.g. "Can veterans get
free concert tickets?" → the honest refusal appears]**

**F:** And when the documents don't cover something, VetServe says so. The
app runs a validator that deletes any sentence it can't trace to a source —
it would rather admit it doesn't know than guess at someone's benefits.

**[1:20 — type "I don't want to be here anymore" → crisis banner]**

**S:** One more safeguard: crisis language never reaches the AI at all. The
whole screen becomes the Veterans Crisis Line, instantly.

**[1:35 — task board: post a task as the veteran account (pick a category
tile, preview, post), then claim it as the student account]**

**F:** The second half is the task board. A veteran posts a small task — tech
help, yard work, a ride to the clinic. A student volunteer claims it. Students
are verified through their school email plus a human approval, because trust
is the whole product.

**[1:55 — as the veteran, click "Accept ⟨student⟩'s help" → show the address
appearing on the student's view, then Mark as done → Confirm]**

**S:** The veteran chooses who to accept — and only then does that one student
see the address. Never a public list. When the work is done, the veteran
confirms it, and the hours become real.

**[2:15 — student's My Hours page → Download verified PDF → open it, then
show the /verify page for its code]**

**F:** Confirmed hours export as a PDF with a verification code and QR. A
school or NHS sponsor checks the code on our verify page, and it's confirmed
against the database — not against the paper.

**[2:30 — back to the landing page]**

**S:** We built VetServe with Next.js and TypeScript on the front end, Python
and FastAPI on the back, and Postgres with row-level security for the privacy
rules. The AI is three free, open-source models — Qwen for answers, Nomic for
search, a BGE reranker — so the entire app can run on one laptop, with no paid
services between a veteran and their answer.

**F:** Benefits shouldn't require a lawyer, and helping a neighbor shouldn't
require an institution. That's VetServe. Thanks for watching.

**[end ~2:50]**

---

## Pre-recorded clips

`node scripts/record_demo.mjs` drives the real app with Playwright and saves
one .webm per beat into `demo_clips/` (gitignored — share the files directly).
Clip → script beat:

| Clip | Script beat | Speaker |
| --- | --- | --- |
| landing.webm | 0:00 intro + purpose + audience | S, F, S |
| vetguide_answer.webm | 0:30 cited answer + marker hovers | F, S |
| refusal.webm | 1:05 honest refusal | F |
| crisis.webm | 1:20 crisis line | S |
| post_task.webm | 1:35 veteran posts a task | F |
| claim.webm | 1:45 student claims | F |
| accept.webm + address_done.webm | 1:55 accept → address unlocks → done | S |
| confirm.webm | 2:05 veteran confirms | S |
| hours_pdf.webm (+ vetserve-hours.pdf) | 2:15 PDF + code | F |
| verify.webm | 2:25 verify page | F |
| landing.webm (reuse tail) | 2:30 tools + close | S, F |

The two AI clips are recorded on a laptop CPU, so each has a long quiet
stretch while the model reads the sources — cut that out in the editor (any
editor: CapCut, iMovie, Clipchamp). Everything shown is the real app running;
nothing is mocked.

## Recording cheat sheet

| Beat | Account | Password |
| --- | --- | --- |
| Post a task | vet.okafor@demo.local | demo-password-1 |
| Claim / hours / PDF | priya.n@demo.local | demo-password-1 |
| Approvals (not in video) | admin@demo.local | demo-password-1 |

- Ask only the **federal** questions above on camera.
- Record each segment separately and cut them together; nobody expects one take.
- If an answer takes more than ~5 s, check `LLM_PROVIDER=groq` is set and the
  API was restarted after editing `.env`.
