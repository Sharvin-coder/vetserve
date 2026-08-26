"use client";

// Landing — Screen 1. One sentence in Fraunces, a live VetGuide input on the
// left, three real task cards on the right. No gradients, no big numbers.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { API_URL } from "@/lib/api";
import { CATEGORY_LABELS, type TaskCategory } from "@/lib/tasks";

interface PublicTask {
  id: number;
  title: string;
  category: TaskCategory;
  zip: string;
  est_hours: number;
}

const OFFICES = [
  { org: "Fort Bend County Veterans Service Office", phone: "281-341-4550" },
  { org: "Texas Veterans Commission", phone: "800-252-8387" },
  { org: "Katy VA Clinic", phone: "281-578-4600" },
];

const SOURCES = [
  { label: "VA.gov — federal benefits, health care, education", url: "https://www.va.gov" },
  { label: "Texas Veterans Commission", url: "https://tvc.texas.gov" },
  { label: "Fort Bend County Veterans Service Office", url: "https://www.fortbendcountytx.gov/government/departments/commissioners-court/county-judge/veteran-service-office" },
];

export default function LandingPage() {
  const router = useRouter();
  const [question, setQuestion] = useState("Am I eligible for the Hazlewood Act?");
  const [tasks, setTasks] = useState<PublicTask[]>([]);

  useEffect(() => {
    fetch(`${API_URL}/public/tasks`)
      .then((r) => (r.ok ? r.json() : { tasks: [] }))
      .then((d) => setTasks(d.tasks ?? []))
      .catch(() => {});
  }, []);

  return (
    <main>
      {/* hero */}
      <section className="mx-auto max-w-board px-5 pb-14 pt-12">
        <h1 className="max-w-[26ch] font-display text-2xl font-medium leading-tight md:text-3xl">
          Straight answers about benefits, and neighbors who&rsquo;ll help with the rest.
        </h1>

        <div className="mt-10 grid gap-10 md:grid-cols-2">
          {/* live VetGuide input */}
          <div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                router.push(`/guide?q=${encodeURIComponent(question.trim())}`);
              }}
            >
              <label htmlFor="landing-q" className="mb-1.5 block text-base font-medium">
                Ask about your benefits
              </label>
              <div className="flex gap-2.5">
                <input
                  id="landing-q"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="min-h-[52px] w-full rounded-control border border-line bg-surface px-4 text-base text-ink"
                />
                <Button type="submit" className="min-h-[52px] shrink-0" disabled={!question.trim()}>
                  Ask
                </Button>
              </div>
            </form>
            <p className="mt-2 text-sm text-ink-muted">
              Answers come from official VA and Texas documents, with sources you can check.
            </p>
          </div>

          {/* three real task cards */}
          <div className="flex flex-col gap-3">
            {tasks.length === 0 ? (
              <Card>
                <p className="text-ui text-ink-muted">
                  Tasks from local veterans appear here — a ride to the clinic, help with a phone,
                  a hand in the yard.
                </p>
              </Card>
            ) : (
              tasks.map((t) => (
                <Card key={t.id} className="py-4">
                  <p className="text-sm font-medium uppercase tracking-wide text-ink-muted">
                    {CATEGORY_LABELS[t.category]}
                  </p>
                  <p className="mt-0.5 text-md font-semibold">{t.title}</p>
                  <p className="mt-1 text-sm text-ink-muted tnum">
                    {t.zip} · about {t.est_hours} {t.est_hours === 1 ? "hour" : "hours"}
                  </p>
                </Card>
              ))
            )}
            <Link
              href="/board"
              className="text-ui font-medium text-primary underline underline-offset-2"
            >
              See the task board
            </Link>
          </div>
        </div>
      </section>

      {/* the two halves */}
      <section className="border-t border-line bg-surface">
        <div className="mx-auto grid max-w-board gap-8 px-5 py-12 md:grid-cols-2">
          <div>
            <h2 className="font-display text-lg font-medium">VetGuide</h2>
            <p className="mt-2 max-w-measure text-base text-ink-muted">
              Ask a question in plain language — eligibility, disability claims, the Hazlewood Act,
              property taxes. Every sentence of the answer carries a citation to the exact official
              passage it came from, and when the documents don&rsquo;t cover it, VetGuide says so
              and hands you a real phone number instead of guessing.
            </p>
          </div>
          <div>
            <h2 className="font-display text-lg font-medium">The task board</h2>
            <p className="mt-2 max-w-measure text-base text-ink-muted">
              Veterans post small tasks — setting up a phone, yard work, a ride to the Katy VA
              clinic. Verified student volunteers claim them, the veteran approves, and confirmed
              help becomes service hours students can prove to their school with one code.
            </p>
          </div>
        </div>
      </section>

      {/* who this is for */}
      <section className="mx-auto max-w-board px-5 py-12">
        <h2 className="mb-6 font-display text-lg font-medium">Who this is for</h2>
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <h3 className="text-base font-semibold">Veterans</h3>
            <p className="mt-1.5 max-w-measure text-ui text-ink-muted">
              Answers you can trace to the source, and practical help from young people nearby who
              signed up to give it.
            </p>
          </div>
          <div>
            <h3 className="text-base font-semibold">Families</h3>
            <p className="mt-1.5 max-w-measure text-ui text-ink-muted">
              Post a task for a parent or grandparent, and check benefit questions on their behalf
              — survivor and dependent benefits included.
            </p>
          </div>
          <div>
            <h3 className="text-base font-semibold">Students</h3>
            <p className="mt-1.5 max-w-measure text-ui text-ink-muted">
              Real help for real neighbors, with confirmed hours you can export as a verified PDF
              for NHS or school.
            </p>
          </div>
        </div>
      </section>

      {/* local */}
      <section className="border-t border-line bg-surface">
        <div className="mx-auto max-w-board px-5 py-12">
          <h2 className="font-display text-lg font-medium">Built in Katy for TX-22</h2>
          <p className="mt-2 max-w-measure text-base text-ink-muted">
            These are the people to call when you want to talk it through with a person.
          </p>
          <ul className="mt-5 grid gap-4 sm:grid-cols-3">
            {OFFICES.map((o) => (
              <li key={o.org}>
                <p className="text-ui font-medium">{o.org}</p>
                <a
                  href={`tel:${o.phone.replace(/-/g, "")}`}
                  className="text-md font-semibold text-primary underline underline-offset-2 tnum"
                >
                  {o.phone}
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-ui">
            Veterans Crisis Line:{" "}
            <a href="tel:988" className="font-semibold text-primary underline underline-offset-2">
              988
            </a>{" "}
            then press 1, or text{" "}
            <a href="sms:838255" className="font-semibold text-primary underline underline-offset-2">
              838255
            </a>
            . Free and confidential, 24/7.
          </p>
        </div>
      </section>

      {/* footer */}
      <footer className="border-t border-line">
        <div className="mx-auto grid max-w-board gap-8 px-5 py-10 text-sm text-ink-muted md:grid-cols-3">
          <div>
            <h2 className="mb-2 font-medium text-ink">Sources</h2>
            <ul className="flex flex-col gap-1.5">
              {SOURCES.map((s) => (
                <li key={s.url}>
                  <a href={s.url} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-ink">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="mb-2 font-medium text-ink">Privacy</h2>
            <p className="max-w-[38ch]">
              Veterans post under a display name. Addresses are visible only to the one volunteer a
              veteran accepts — never on any public list.
            </p>
          </div>
          <div>
            <h2 className="mb-2 font-medium text-ink">About</h2>
            <p className="max-w-[38ch]">
              A student-built project for the 2026 Congressional App Challenge. Not a government
              service, and not official advice.{" "}
              <Link href="/status" className="underline underline-offset-2 hover:text-ink">
                System check
              </Link>
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
