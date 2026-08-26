"use client";

// Hours & export — Screen 6 (student). Table with tabular numerals, total in
// Fraunces. The PDF download + verification code arrive with Phase 4's API.

import Link from "next/link";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Table, Td, Th } from "@/components/ui/Table";
import { useAuth } from "@/lib/auth";
import { CATEGORY_LABELS, myHours, type HoursRow } from "@/lib/tasks";

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;
}

export default function HoursPage() {
  const { session, profile, loading } = useAuth();
  const [rows, setRows] = useState<HoursRow[] | null>(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!session) return;
    myHours(session.access_token)
      .then((r) => {
        setRows(r.hours);
        setTotal(r.total);
      })
      .catch(() => setRows([]));
  }, [session]);

  if (!loading && (!session || profile?.role !== "student")) {
    return (
      <main className="mx-auto max-w-[720px] px-5 py-10">
        <EmptyState
          title="Hours tracking is for student volunteers."
          body="Sign in with a student account to see confirmed service hours."
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
    <main className="mx-auto max-w-[820px] px-5 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-medium">Your service hours</h1>
          <p className="mt-1 text-ui text-ink-muted">
            Only hours a veteran confirmed appear here.
          </p>
        </div>
        <p className="font-display text-2xl font-medium tnum">
          {total.toFixed(1)}
          <span className="ml-2 text-md text-ink-muted">hours</span>
        </p>
      </div>

      {rows === null ? (
        <Skeleton className="h-48" />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No confirmed hours yet."
          body="Claim a task on the board; once the veteran confirms it, the hours land here."
          action={
            <Link
              href="/board"
              className="inline-flex min-h-[44px] items-center rounded-control border border-primary px-5 font-medium text-primary"
            >
              Go to the task board
            </Link>
          }
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Date confirmed</Th>
              <Th>Task</Th>
              <Th>Category</Th>
              <Th className="text-right">Hours</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <Td className="tnum">{fmtDate(r.confirmed_at)}</Td>
                <Td>{r.tasks?.title ?? `Task #${r.task_id}`}</Td>
                <Td>{r.tasks ? CATEGORY_LABELS[r.tasks.category] : ""}</Td>
                <Td className="tnum text-right">{r.hours.toFixed(1)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <p className="mt-5 text-sm text-ink-muted">
        The verified PDF export (with a verification code your school can check) is coming in the
        next build step.
      </p>
    </main>
  );
}
