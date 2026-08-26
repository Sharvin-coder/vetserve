"use client";

import Link from "next/link";
import { StatusPill } from "@/components/ui/StatusPill";
import { CATEGORY_LABELS, type Task } from "@/lib/tasks";

function daysAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

export function TaskCard({
  task,
  action,
}: {
  task: Task;
  action?: React.ReactNode;
}) {
  return (
    <article className="flex flex-col gap-2.5 rounded-card border border-line bg-surface p-5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-medium uppercase tracking-wide text-ink-muted">
          {CATEGORY_LABELS[task.category]}
        </p>
        <StatusPill status={task.status} />
      </div>
      <h3 className="text-md font-semibold text-ink">
        <Link href={`/tasks/${task.id}`} className="hover:text-primary">
          {task.title}
        </Link>
      </h3>
      {task.description ? (
        <p className="line-clamp-2 text-ui text-ink-muted">{task.description}</p>
      ) : null}
      <p className="text-sm text-ink-muted tnum">
        {task.zip} · about {task.est_hours} {task.est_hours === 1 ? "hour" : "hours"} · posted{" "}
        {daysAgo(task.created_at)}
      </p>
      {action ? <div className="mt-1">{action}</div> : null}
    </article>
  );
}
