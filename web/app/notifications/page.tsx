"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/lib/auth";
import { getNotifications, markNotificationsRead, type AppNotification } from "@/lib/tasks";

function ago(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"} ago`;
}

export default function NotificationsPage() {
  const { session } = useAuth();
  const [notes, setNotes] = useState<AppNotification[] | null>(null);

  useEffect(() => {
    if (!session) return;
    getNotifications(session.access_token)
      .then((r) => {
        setNotes(r.notifications);
        return markNotificationsRead(session.access_token);
      })
      .catch(() => setNotes([]));
  }, [session]);

  return (
    <main className="mx-auto max-w-[640px] px-5 py-8">
      <h1 className="mb-5 font-display text-xl font-medium">Updates</h1>
      {notes === null ? (
        <Skeleton className="h-40" />
      ) : notes.length === 0 ? (
        <EmptyState title="Nothing yet." body="Task updates land here as they happen." />
      ) : (
        <ul className="flex flex-col">
          {notes.map((n) => (
            <li
              key={n.id}
              className={`border-b border-line py-3.5 last:border-b-0 ${n.read ? "" : "font-medium"}`}
            >
              {n.task_id ? (
                <Link href={`/tasks/${n.task_id}`} className="text-base text-ink hover:text-primary">
                  {n.message}
                </Link>
              ) : (
                <p className="text-base">{n.message}</p>
              )}
              <p className="mt-0.5 text-sm font-normal text-ink-muted">{ago(n.created_at)}</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
