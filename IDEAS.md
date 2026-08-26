# Ideas (out of scope for the challenge build)

Ideas that came up during the build but are outside the spec go here, not into the app.

- Spanish-language VetGuide (large veteran population in Fort Bend; the
  official sources exist in Spanish for many programs).
- SMS notifications for veterans who don't check the site (Twilio-class
  service — costs money, so out for now).
- Recurring tasks ("grocery run every other Saturday") as a first-class type
  instead of reposting.
- A "benefits checklist" generated from a short intake questionnaire, each
  item citing its source — same validator pipeline, different shape.
- School coordinator role: an NHS sponsor account that can see (only) their
  own students' confirmed hours, replacing per-PDF verification.
- Ingestion refresh job that re-fetches sources monthly and diffs the
  chunks, flagging changed passages for review.
- Embedding-based duplicate detection when a veteran posts a task very
  similar to one already open.
