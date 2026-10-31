"use client";

// Task board — Screen 3 (student view). Filter bar, 2-col grid, "Your tasks" tab.

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { TaskCard } from "@/components/board/TaskCard";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/lib/auth";
import {
  ApiError,
  browseTasks,
  CATEGORY_LABELS,
  myTasks,
  transition,
  type Task,
  type TaskCategory,
} from "@/lib/tasks";

const CATEGORIES = Object.keys(CATEGORY_LABELS) as TaskCategory[];

function OpenTasks() {
  const { session, profile } = useAuth();
  const toast = useToast();
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [category, setCategory] = useState<TaskCategory | "">("");
  const [zip, setZip] = useState("");
  const [claimBusy, setClaimBusy] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    try {
      const { tasks } = await browseTasks(session.access_token, {
        category: category || undefined,
        zipPrefix: zip || undefined,
        openOnly: true,
      });
      setTasks(tasks);
    } catch {
      setTasks([]);
    }
  }, [session, category, zip]);

  useEffect(() => {
    load();
  }, [load]);

  async function claim(id: number) {
    if (!session) return;
    setClaimBusy(id);
    try {
      await transition(session.access_token, id, "claim");
      toast("Task claimed. The veteran will review your offer.", "success");
      load();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Couldn't claim the task.", "danger");
    } finally {
      setClaimBusy(null);
    }
  }

  const canClaim = profile?.role === "student" && profile.verified;

  return (
    <div className="flex flex-col gap-5">
      {/* filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setCategory("")}
          aria-pressed={category === ""}
          className={`min-h-[44px] rounded-control border px-3.5 text-sm font-medium ${
            category === ""
              ? "border-primary bg-primary text-primary-ink"
              : "border-line bg-surface text-ink hover:border-primary"
          }`}
        >
          All
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(category === c ? "" : c)}
            aria-pressed={category === c}
            className={`min-h-[44px] rounded-control border px-3.5 text-sm font-medium ${
              category === c
                ? "border-primary bg-primary text-primary-ink"
                : "border-line bg-surface text-ink hover:border-primary"
            }`}
          >
            {CATEGORY_LABELS[c]}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-2 text-sm text-ink-muted">
          ZIP starts with
          <input
            value={zip}
            onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
            inputMode="numeric"
            className="min-h-[44px] w-24 rounded-control border border-line bg-surface px-3 text-base text-ink tnum"
          />
        </label>
      </div>

      {profile && !profile.verified && (
        <Banner kind="warn" title="Your account is awaiting approval.">
          You can browse now; claiming unlocks once an admin approves you.
        </Banner>
      )}

      {tasks === null ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState
          title={zip ? `No open tasks near ${zip} yet.` : "No open tasks right now."}
          body={zip ? "Widen the search to nearby ZIP codes?" : "Check back soon — new tasks appear here."}
          action={
            zip ? (
              <Button variant="secondary" onClick={() => setZip("")}>
                Show all open tasks
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {tasks.map((t) => (
            <TaskCard
              key={t.id}
              task={t}
              action={
                canClaim ? (
                  <Button
                    variant="secondary"
                    disabled={claimBusy === t.id}
                    onClick={() => claim(t.id)}
                  >
                    Claim task
                  </Button>
                ) : undefined
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function YourTasks() {
  const { session } = useAuth();
  const [claimed, setClaimed] = useState<Task[] | null>(null);

  useEffect(() => {
    if (!session) return;
    myTasks(session.access_token)
      .then((r) => setClaimed(r.claimed))
      .catch(() => setClaimed([]));
  }, [session]);

  if (claimed === null) return <Skeleton className="h-40 max-w-xl" />;
  if (claimed.length === 0)
    return (
      <EmptyState
        title="You haven't claimed a task yet."
        body="Anything you claim shows up here with its current status."
      />
    );
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {claimed.map((t) => (
        <TaskCard key={t.id} task={t} />
      ))}
    </div>
  );
}

export default function BoardPage() {
  const { session, loading } = useAuth();

  if (!loading && !session) {
    return (
      <main className="mx-auto max-w-board px-5 py-10">
        <EmptyState
          title="Sign in to see the task board."
          body="Veterans post small tasks; verified students claim them."
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

  return (
    <main className="mx-auto max-w-board px-5 py-8">
      <h1 className="mb-5 font-display text-xl font-medium">Task board</h1>
      <Tabs
        tabs={[
          { id: "open", label: "Open tasks", content: <OpenTasks /> },
          { id: "yours", label: "Your tasks", content: <YourTasks /> },
        ]}
      />
    </main>
  );
}
