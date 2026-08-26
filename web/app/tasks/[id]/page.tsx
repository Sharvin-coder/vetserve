"use client";

// Task detail + confirm flow — Screen 5. Vertical timeline of the five
// states; the actions each party sees depend on role + state.

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusPill } from "@/components/ui/StatusPill";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/lib/auth";
import { ApiError, CATEGORY_LABELS, taskDetail, transition, type Task } from "@/lib/tasks";

const STEPS = [
  { key: "open", label: "Posted", detail: "Waiting for a volunteer" },
  { key: "claimed", label: "Claimed", detail: "A student offered to help" },
  { key: "accepted", label: "Accepted", detail: "The veteran said yes" },
  { key: "done", label: "Marked done", detail: "The student finished the task" },
  { key: "confirmed", label: "Confirmed", detail: "The veteran confirmed — hours count" },
] as const;

function Timeline({ status }: { status: Task["status"] }) {
  if (status === "cancelled") {
    return (
      <Banner kind="warn" title="This task was cancelled.">
        Nothing further happens here.
      </Banner>
    );
  }
  const current = STEPS.findIndex((s) => s.key === status);
  return (
    <ol className="flex flex-col">
      {STEPS.map((s, i) => {
        const reached = i <= current;
        return (
          <li key={s.key} className="relative flex gap-3.5 pb-6 last:pb-0">
            {i < STEPS.length - 1 && (
              <span
                aria-hidden
                className={`absolute left-[11px] top-6 h-full w-0.5 ${
                  i < current ? "bg-primary" : "bg-line"
                }`}
              />
            )}
            <span
              aria-hidden
              className={`relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                reached ? "border-primary bg-primary" : "border-line bg-surface"
              }`}
            >
              {reached && <span className="h-2 w-2 rounded-full bg-primary-ink" />}
            </span>
            <div>
              <p className={`text-base font-medium ${reached ? "text-ink" : "text-ink-muted"}`}>
                {s.label}
                {i === current && <span className="sr-only"> (current step)</span>}
              </p>
              <p className="text-sm text-ink-muted">{s.detail}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default function TaskDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { session, profile } = useAuth();
  const toast = useToast();
  const [task, setTask] = useState<Task | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const load = useCallback(() => {
    if (!session || !Number.isFinite(id)) return;
    taskDetail(session.access_token, id)
      .then(setTask)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Couldn't load this task."));
  }, [session, id]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(action: Parameters<typeof transition>[2], message: string) {
    if (!session) return;
    setBusy(true);
    try {
      await transition(session.access_token, id, action);
      toast(message, "success");
      load();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "That didn't work. Try again.", "danger");
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <main className="mx-auto max-w-[720px] px-5 py-10">
        <Banner kind="warn" title="Couldn't load this task.">
          {error}
        </Banner>
      </main>
    );
  }
  if (!task) {
    return (
      <main className="mx-auto max-w-[720px] px-5 py-10">
        <Skeleton className="h-64" />
      </main>
    );
  }

  const isPoster = profile?.id === task.posted_by;
  const isClaimant = profile?.id === task.claimed_by;
  const helper = task.claimed_by_name ?? "the student";

  return (
    <main className="mx-auto grid max-w-[880px] gap-8 px-5 py-8 md:grid-cols-[1fr_280px]">
      <div className="flex flex-col gap-5">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-ink-muted">
            {CATEGORY_LABELS[task.category]}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="font-display text-xl font-medium">{task.title}</h1>
            <StatusPill status={task.status} />
          </div>
        </div>

        {task.description && <p className="max-w-measure text-base">{task.description}</p>}

        <p className="text-sm text-ink-muted tnum">
          {task.zip} · about {task.est_hours} {task.est_hours === 1 ? "hour" : "hours"}
          {task.posted_by_name ? ` · posted by ${task.posted_by_name}` : ""}
        </p>

        {task.address && (
          <Card className="border-l-2 border-l-primary">
            <p className="text-sm font-medium text-ink-muted">Address (visible to you)</p>
            <p className="mt-1 text-base">{task.address}</p>
          </Card>
        )}

        {/* actions by role + state */}
        <div className="flex flex-wrap gap-3">
          {isPoster && task.status === "claimed" && (
            <>
              <Button disabled={busy} onClick={() => act("accept", `${helper} can now see the address.`)}>
                Accept {helper}&rsquo;s help
              </Button>
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => act("decline", "Offer declined. The task is open again.")}
              >
                Decline
              </Button>
            </>
          )}
          {isPoster && task.status === "done" && (
            <Button disabled={busy} onClick={() => act("confirm", "Confirmed — thank you.")}>
              Confirm this was done
            </Button>
          )}
          {isPoster && ["open", "claimed", "accepted"].includes(task.status) && (
            <Button variant="quiet" disabled={busy} onClick={() => setCancelOpen(true)}>
              Cancel task
            </Button>
          )}
          {isClaimant && task.status === "accepted" && (
            <Button disabled={busy} onClick={() => act("done", "Marked done. The veteran will confirm.")}>
              Mark as done
            </Button>
          )}
          {isClaimant && task.status === "claimed" && (
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => act("withdraw", "Offer withdrawn.")}
            >
              Withdraw my offer
            </Button>
          )}
          {!isPoster &&
            !isClaimant &&
            task.status === "open" &&
            profile?.role === "student" &&
            profile.verified && (
              <Button disabled={busy} onClick={() => act("claim", "Task claimed. The veteran will review your offer.")}>
                Claim task
              </Button>
            )}
        </div>

        {isPoster && task.status === "done" && (
          <p className="max-w-measure text-sm text-ink-muted">
            Confirming adds this line to {helper}&rsquo;s record: &ldquo;{task.title} —{" "}
            {task.est_hours} {task.est_hours === 1 ? "hour" : "hours"}&rdquo;.
          </p>
        )}
      </div>

      <aside aria-label="Task progress">
        <h2 className="mb-4 font-display text-md font-medium">Progress</h2>
        <Timeline status={task.status} />
      </aside>

      <Dialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancel this task?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCancelOpen(false)}>
              Keep it
            </Button>
            <Button
              variant="danger"
              disabled={busy}
              onClick={async () => {
                setCancelOpen(false);
                await act("cancel", "Task cancelled.");
              }}
            >
              Cancel task
            </Button>
          </>
        }
      >
        <p>
          {task.claimed_by
            ? "The volunteer who claimed it will be notified."
            : "You can post it again any time."}
        </p>
      </Dialog>
    </main>
  );
}
