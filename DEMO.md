# VetServe — demo video (Congressional App Challenge, GA-10)

The screen footage is DONE: `demo_clips/vetserve_demo_silent.mp4` — one
silent 2:24 reel of the real app, assembled from Playwright recordings
(`scripts/record_demo.mjs` records the beats, ffmpeg concatenates and cuts
the model's thinking time). Nothing is mocked; every frame is the live app.

**To finish the video:** record ONE voice track of the narration below while
watching the reel (phone voice memo is fine — start both at the same moment,
pass the phone or lean in for each other's lines), then either (a) drop video
+ audio into Clipchamp (preinstalled on Windows 11) and export, or (b) hand
the audio file back to Claude to merge.

## Narration — timed to the reel (2:24)

**T** = Tharun (intro only) · **S** = Sharvin (everything after)

**[0:00 landing page scrolls]**
**S:** I'm Sharvin Goyal —
**T:** — and I'm Tharun ⟨last name⟩, and this is VetServe. VetServe gives
veterans straight answers about their benefits — with every sentence cited to
an official government document — and connects them with verified student
volunteers for everyday help.
**S:** It's for veterans and their families lost in benefits paperwork, and
for students who want to serve the people who served.

**[0:16 question asked, "Searching official documents"]**
**S:** This is VetGuide. You ask in plain language, and it searches only
official documents we ingested — VA handbooks, benefits pages, real office
directories.

**[0:22 answer appears, citation markers hover one by one]**
**S:** Every claim carries a citation. Hover a marker and you see the exact
official passage it came from. There's a confidence rating, and every answer
ends with the phone number of a real office — software should hand you to a
person, not replace one.

**[0:35 typing the concert-tickets question]**
**S:** And when the documents don't cover something —

**[0:42 refusal appears]**
**S:** — it says so. A validator deletes any sentence it can't trace to a
source. It would rather admit it doesn't know than guess about someone's
benefits.

**[0:47 crisis message typed, banner takes over]**
**S:** Crisis language never reaches the AI at all. The screen becomes the
Veterans Crisis Line, instantly.

**[0:57 veteran posts a task: tiles, form, preview, posted]**
**S:** The second half is the task board. A veteran posts a small task — a
ride to the VA, tech help, yard work. Notice the address: it's collected but
hidden.

**[1:18 student claims it]**
**S:** A student volunteer — verified through their school email plus a human
approval — claims the task.

**[1:27 veteran accepts]**
**S:** The veteran decides who to accept.

**[1:36 address visible to the student, marks done]**
**S:** Only then does that one student see the address — never a public list.
The student finishes the task and marks it done.

**[1:45 veteran confirms]**
**S:** The veteran confirms it went well, and the hours become real — the
screen even shows the exact line that will appear on the student's record.

**[1:54 hours page, PDF downloads, verification code]**
**S:** Confirmed hours export as a PDF with a verification code and a QR.

**[2:04 public verify page]**
**S:** A school checks that code on our verify page, and it's confirmed
against the database — not against a piece of paper.

**[2:14 landing page again]**
**S:** We built VetServe with Next.js and TypeScript, Python and FastAPI, and
Postgres with row-level security. The AI is three free, open-source models —
Qwen, Nomic, and a BGE reranker — so it all runs on one laptop, with no paid
services between a veteran and their answer.
**S:** Veterans have served our country. Now it's our turn to serve them —
with VetServe. Thanks for watching.

**[2:24 end]**

## Rebuilding the footage

1. Stack up (see BUILD_NOTES.md), then `node scripts/record_demo.mjs` —
   records every beat as its own .webm in `demo_clips/`.
2. The assembly (trims + concat) is the ffmpeg command in git history /
   ask Claude to re-run it; output is `vetserve_demo_silent.mp4`.

Demo accounts (all `demo-password-1`): admin@demo.local,
vet.okafor@demo.local, priya.n@demo.local.

## CAC requirement checklist

- names + app name — 0:00 ✓   - purpose, one sentence — 0:03 ✓
- target audience — 0:10 ✓    - how it works — 0:16–2:14 ✓
- tools and languages — 2:14 ✓ - under 3 minutes — 2:24 total ✓
- public YouTube/Vimeo upload — on you after the voice track ✓
