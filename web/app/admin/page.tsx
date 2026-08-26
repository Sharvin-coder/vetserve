"use client";

// Admin — Screen 7. Dense, utilitarian, same tokens. Approvals, all tasks,
// the VetGuide dropped-sentences log, and feedback.

import { useCallback, useEffect, useState } from "react";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusPill } from "@/components/ui/StatusPill";
import { Table, Td, Th } from "@/components/ui/Table";
import { Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { useAuth, type Profile } from "@/lib/auth";
import { API_URL } from "@/lib/api";
import type { Task } from "@/lib/tasks";

async function adminGet<T>(token: string, path: string): Promise<T> {
  const resp = await fetch(`${API_URL}/admin${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) throw new Error(`Request failed (${resp.status}).`);
  return resp.json();
}

function Users() {
  const { session } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState<Profile[] | null>(null);

  const load = useCallback(() => {
    if (!session) return;
    adminGet<{ users: Profile[] }>(session.access_token, "/users")
      .then((r) => setUsers(r.users))
      .catch(() => setUsers([]));
  }, [session]);

  useEffect(load, [load]);

  async function setVerified(id: string, verified: boolean) {
    if (!session) return;
    const resp = await fetch(`${API_URL}/admin/verify`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ user_id: id, verified }),
    });
    if (resp.ok) {
      toast(verified ? "Account approved." : "Approval removed.", "success");
      load();
    } else {
      toast("Couldn't update the account.", "danger");
    }
  }

  if (users === null) return <Skeleton className="h-48" />;
  return (
    <Table sticky>
      <thead>
        <tr>
          <Th>Name</Th>
          <Th>Role</Th>
          <Th>ZIP</Th>
          <Th>School</Th>
          <Th>Status</Th>
          <Th>Action</Th>
        </tr>
      </thead>
      <tbody>
        {users.map((u) => (
          <tr key={u.id}>
            <Td>{u.display_name}</Td>
            <Td className="capitalize">{u.role}</Td>
            <Td className="tnum">{u.zip}</Td>
            <Td>{u.school ?? "—"}</Td>
            <Td>
              <span className={u.verified ? "font-medium text-success" : "text-warn"}>
                {u.verified ? "Approved" : "Pending"}
              </span>
            </Td>
            <Td>
              {u.role !== "admin" &&
                (u.verified ? (
                  <Button variant="quiet" onClick={() => setVerified(u.id, false)}>
                    Revoke
                  </Button>
                ) : (
                  <Button variant="secondary" onClick={() => setVerified(u.id, true)}>
                    Approve
                  </Button>
                ))}
            </Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

function AllTasks() {
  const { session } = useAuth();
  const [tasks, setTasks] = useState<Task[] | null>(null);

  useEffect(() => {
    if (!session) return;
    adminGet<{ tasks: Task[] }>(session.access_token, "/tasks")
      .then((r) => setTasks(r.tasks))
      .catch(() => setTasks([]));
  }, [session]);

  if (tasks === null) return <Skeleton className="h-48" />;
  return (
    <Table sticky>
      <thead>
        <tr>
          <Th>ID</Th>
          <Th>Title</Th>
          <Th>Category</Th>
          <Th>ZIP</Th>
          <Th>Status</Th>
          <Th className="text-right">Hours</Th>
        </tr>
      </thead>
      <tbody>
        {tasks.map((t) => (
          <tr key={t.id}>
            <Td className="tnum">{t.id}</Td>
            <Td>{t.title}</Td>
            <Td>{t.category}</Td>
            <Td className="tnum">{t.zip}</Td>
            <Td>
              <StatusPill status={t.status} />
            </Td>
            <Td className="tnum text-right">{t.est_hours}</Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

interface DroppedRow {
  id: number;
  question: string;
  sentence: string;
  reason: string;
  created_at: string;
}

function Dropped() {
  const { session } = useAuth();
  const [rows, setRows] = useState<DroppedRow[] | null>(null);

  useEffect(() => {
    if (!session) return;
    adminGet<{ dropped: DroppedRow[] }>(session.access_token, "/dropped")
      .then((r) => setRows(r.dropped))
      .catch(() => setRows([]));
  }, [session]);

  if (rows === null) return <Skeleton className="h-48" />;
  if (rows.length === 0)
    return (
      <p className="text-ui text-ink-muted">
        Nothing dropped yet — the validator removes any sentence it can&rsquo;t back with a source,
        and each one lands here.
      </p>
    );
  return (
    <Table sticky>
      <thead>
        <tr>
          <Th>Question</Th>
          <Th>Dropped sentence</Th>
          <Th>Why</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id}>
            <Td className="max-w-[220px]">{r.question}</Td>
            <Td className="max-w-[320px]">{r.sentence}</Td>
            <Td className="max-w-[220px] text-ink-muted">{r.reason}</Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

interface FeedbackRow {
  id: number;
  question: string;
  helpful: boolean;
  created_at: string;
}

function Feedback() {
  const { session } = useAuth();
  const [rows, setRows] = useState<FeedbackRow[] | null>(null);

  useEffect(() => {
    if (!session) return;
    adminGet<{ feedback: FeedbackRow[] }>(session.access_token, "/feedback")
      .then((r) => setRows(r.feedback))
      .catch(() => setRows([]));
  }, [session]);

  if (rows === null) return <Skeleton className="h-48" />;
  if (rows.length === 0) return <p className="text-ui text-ink-muted">No feedback yet.</p>;
  return (
    <Table sticky>
      <thead>
        <tr>
          <Th>Question</Th>
          <Th>Helpful?</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id}>
            <Td>{r.question}</Td>
            <Td>
              <span className={r.helpful ? "font-medium text-success" : "font-medium text-danger"}>
                {r.helpful ? "Yes" : "No"}
              </span>
            </Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

export default function AdminPage() {
  const { profile, loading } = useAuth();

  if (!loading && profile?.role !== "admin") {
    return (
      <main className="mx-auto max-w-[720px] px-5 py-10">
        <Banner kind="warn" title="Admins only.">
          Sign in with an admin account to review approvals and logs.
        </Banner>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-board px-5 py-8 text-ui">
      <h1 className="mb-5 font-display text-xl font-medium">Admin</h1>
      <Tabs
        tabs={[
          { id: "users", label: "Approvals", content: <Users /> },
          { id: "tasks", label: "All tasks", content: <AllTasks /> },
          { id: "dropped", label: "Dropped sentences", content: <Dropped /> },
          { id: "feedback", label: "Feedback", content: <Feedback /> },
        ]}
      />
    </main>
  );
}
