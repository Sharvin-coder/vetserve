"use client";

// Post a task — Screen 4 (veteran view). One column, big labels, six plain
// category tiles, preview before posting, then a three-step what-happens-next.

import Link from "next/link";
import { useState } from "react";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { useAuth } from "@/lib/auth";
import { CATEGORY_LABELS, postTask, type TaskCategory } from "@/lib/tasks";

const TILES = Object.entries(CATEGORY_LABELS) as [TaskCategory, string][];

type Draft = {
  title: string;
  category: TaskCategory | null;
  description: string;
  zip: string;
  address: string;
  est_hours: string;
};

const EMPTY: Draft = { title: "", category: null, description: "", zip: "", address: "", est_hours: "1" };

export default function PostTaskPage() {
  const { session, profile, loading } = useAuth();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [stage, setStage] = useState<"form" | "preview" | "posted">("form");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!loading && (!session || profile?.role !== "veteran")) {
    return (
      <main className="mx-auto max-w-[640px] px-5 py-10">
        <EmptyState
          title="Posting is for veterans and their families."
          body="Sign in with a veteran account to post a task."
          action={
            <Link
              href="/account"
              className="inline-flex min-h-[44px] items-center rounded-control bg-primary px-5 font-medium text-primary-ink"
            >
              Sign in
            </Link>
          }
        />
      </main>
    );
  }

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const hoursNum = parseFloat(draft.est_hours);
  const formOk =
    draft.title.trim().length >= 3 &&
    draft.category !== null &&
    /^\d{5}$/.test(draft.zip) &&
    hoursNum > 0 &&
    hoursNum <= 24;

  async function submit() {
    if (!session || !draft.category) return;
    setBusy(true);
    setError(null);
    try {
      await postTask(session.access_token, {
        title: draft.title.trim(),
        category: draft.category,
        description: draft.description.trim(),
        zip: draft.zip,
        address: draft.address.trim(),
        est_hours: hoursNum,
      });
      setStage("posted");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't post the task.");
      setStage("form");
    } finally {
      setBusy(false);
    }
  }

  if (stage === "posted") {
    return (
      <main className="mx-auto max-w-[640px] px-5 py-10">
        <Banner kind="info" title="Your task is posted.">
          Here&rsquo;s what happens next:
        </Banner>
        <ol className="mt-5 flex flex-col gap-4">
          {[
            "A verified student sees your task and offers to help.",
            "You accept the offer you like — only then can they see your address.",
            "After the task is done, you confirm it went well; that's it.",
          ].map((step, i) => (
            <li key={step} className="flex gap-3.5">
              <span
                aria-hidden
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-ui font-semibold text-primary-ink tnum"
              >
                {i + 1}
              </span>
              <p className="pt-1 text-base">{step}</p>
            </li>
          ))}
        </ol>
        <div className="mt-6 flex gap-3">
          <Button
            variant="secondary"
            onClick={() => {
              setDraft(EMPTY);
              setStage("form");
            }}
          >
            Post another task
          </Button>
        </div>
      </main>
    );
  }

  if (stage === "preview") {
    return (
      <main className="mx-auto max-w-[640px] px-5 py-10">
        <h1 className="mb-1 font-display text-xl font-medium">Check your task</h1>
        <p className="mb-5 text-base text-ink-muted">This is what students will see.</p>
        <Card>
          <p className="text-sm font-medium uppercase tracking-wide text-ink-muted">
            {draft.category ? CATEGORY_LABELS[draft.category] : ""}
          </p>
          <h2 className="mt-1 text-md font-semibold">{draft.title}</h2>
          {draft.description && <p className="mt-2 text-ui text-ink-muted">{draft.description}</p>}
          <p className="mt-3 text-sm text-ink-muted tnum">
            {draft.zip} · about {draft.est_hours} {hoursNum === 1 ? "hour" : "hours"}
          </p>
        </Card>
        <p className="mt-4 text-sm text-ink-muted">
          Your address {draft.address ? "is included but stays hidden" : "wasn't added"} — students
          only see the ZIP code until you accept someone.
        </p>
        <div className="mt-5 flex gap-3">
          <Button onClick={submit} disabled={busy}>
            Post this task
          </Button>
          <Button variant="secondary" onClick={() => setStage("form")}>
            Go back and edit
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[640px] px-5 py-10">
      <h1 className="mb-6 font-display text-xl font-medium">Post a task</h1>

      {profile && !profile.verified && (
        <div className="mb-5">
          <Banner kind="warn" title="Your account is awaiting approval.">
            You can fill this out now; posting unlocks once an admin approves you.
          </Banner>
        </div>
      )}

      <form
        className="flex flex-col gap-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (formOk) setStage("preview");
        }}
      >
        <fieldset>
          <legend className="mb-2.5 text-base font-medium">What kind of help?</legend>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {TILES.map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => set({ category: value })}
                aria-pressed={draft.category === value}
                className={`min-h-[64px] rounded-card border px-3 py-2.5 text-left text-ui font-medium ${
                  draft.category === value
                    ? "border-primary bg-primary-tint text-primary"
                    : "border-line bg-surface text-ink hover:border-primary"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        <Input
          label="What do you need?"
          hint="One line, like a headline."
          value={draft.title}
          onChange={(e) => set({ title: e.target.value })}
          maxLength={120}
          required
        />
        <Textarea
          label="Any details? (optional)"
          hint="A sentence or two is plenty."
          value={draft.description}
          onChange={(e) => set({ description: e.target.value })}
          maxLength={2000}
        />
        <div className="grid gap-6 sm:grid-cols-2">
          <Input
            label="ZIP code"
            inputMode="numeric"
            pattern="\d{5}"
            value={draft.zip}
            onChange={(e) => set({ zip: e.target.value.replace(/\D/g, "").slice(0, 5) })}
            required
          />
          <Input
            label="About how many hours?"
            inputMode="decimal"
            value={draft.est_hours}
            onChange={(e) => set({ est_hours: e.target.value })}
            error={
              draft.est_hours && !(hoursNum > 0 && hoursNum <= 24)
                ? "Between 0.5 and 24."
                : undefined
            }
            required
          />
        </div>
        <Input
          label="Address (optional)"
          hint="Only the student you accept can see this — never the public list."
          value={draft.address}
          onChange={(e) => set({ address: e.target.value })}
          maxLength={300}
        />

        {error && (
          <p role="alert" className="text-sm font-medium text-danger">
            {error}
          </p>
        )}

        <Button type="submit" disabled={!formOk}>
          Preview task
        </Button>
      </form>
    </main>
  );
}
