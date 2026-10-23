"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { getNotifications, type AppNotification } from "@/lib/tasks";

const NAV = [
  { href: "/guide", label: "VetGuide", show: () => true },
  { href: "/board", label: "Task board", show: (role?: string) => role !== "veteran" },
  { href: "/post", label: "Post a task", show: (role?: string) => role === "veteran" },
  { href: "/hours", label: "My hours", show: (role?: string) => role === "student" },
  { href: "/admin", label: "Admin", show: (role?: string) => role === "admin" },
];

export function SiteHeader() {
  const { session, profile, signOut } = useAuth();
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);

  // poll notifications every 20s while signed in
  useEffect(() => {
    if (!session) return;
    let alive = true;
    const tick = async () => {
      try {
        const { notifications } = await getNotifications(session.access_token);
        if (!alive) return;
        setUnread(notifications.filter((n) => !n.read).length);
      } catch {
        /* transient; next poll retries */
      }
    };
    tick();
    const t = window.setInterval(tick, 20000);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, [session]);

  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-board flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3">
        <Link href="/" className="font-display text-md font-semibold text-ink">
          VetServe
        </Link>
        <nav aria-label="Main" className="flex flex-wrap items-center gap-1">
          {NAV.filter((n) => n.show(profile?.role)).map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={pathname === n.href ? "page" : undefined}
              className={[
                "rounded-control px-3 py-2 text-ui",
                pathname === n.href
                  ? "font-semibold text-primary"
                  : "text-ink-muted hover:text-ink",
              ].join(" ")}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          {session && unread > 0 && (
            <Link
              href="/notifications"
              className="rounded-control bg-primary-tint px-3 py-2 text-sm font-semibold text-primary"
            >
              {unread} new {unread === 1 ? "update" : "updates"}
            </Link>
          )}
          {session ? (
            <>
              <span className="hidden text-sm text-ink-muted sm:inline">
                {profile?.display_name}
                {profile && !profile.verified ? " · awaiting approval" : ""}
              </span>
              <button
                type="button"
                onClick={() => signOut()}
                className="rounded-control px-3 py-2 text-ui text-ink-muted hover:text-ink"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              href="/account"
              className="rounded-control border border-primary px-4 py-2 text-ui font-medium text-primary"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

export function useNotificationList() {
  const { session } = useAuth();
  const [notes, setNotes] = useState<AppNotification[]>([]);
  useEffect(() => {
    if (!session) return;
    getNotifications(session.access_token)
      .then((r) => setNotes(r.notifications))
      .catch(() => {});
  }, [session]);
  return notes;
}
