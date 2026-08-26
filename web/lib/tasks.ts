// API helpers for the task board. Every call carries the session token; the
// API re-runs it under RLS, so these are conveniences, not gatekeepers.

import { API_URL } from "./api";

export type TaskStatus = "open" | "claimed" | "accepted" | "done" | "confirmed" | "cancelled";
export type TaskCategory = "tech_help" | "yard" | "ride" | "errand" | "paperwork" | "company";

export interface Task {
  id: number;
  title: string;
  category: TaskCategory;
  description: string;
  zip: string;
  est_hours: number;
  status: TaskStatus;
  posted_by: string;
  claimed_by: string | null;
  created_at: string;
  updated_at: string;
  address?: string | null;
  posted_by_name?: string | null;
  claimed_by_name?: string | null;
}

export interface HoursRow {
  id: number;
  task_id: number;
  hours: number;
  confirmed_at: string;
  tasks: { title: string; category: TaskCategory } | null;
}

export interface AppNotification {
  id: number;
  task_id: number | null;
  message: string;
  read: boolean;
  created_at: string;
}

export const CATEGORY_LABELS: Record<TaskCategory, string> = {
  tech_help: "Phone or computer help",
  yard: "Yard work",
  ride: "A ride",
  errand: "An errand",
  paperwork: "Help with a form",
  company: "Company and conversation",
};

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function call<T>(
  token: string,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const resp = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  if (!resp.ok) {
    let detail = "Something went wrong. Try again.";
    try {
      detail = (await resp.json()).detail ?? detail;
    } catch {
      /* keep default */
    }
    throw new ApiError(resp.status, detail);
  }
  return resp.json();
}

export const browseTasks = (
  token: string,
  opts: { category?: string; zipPrefix?: string; openOnly?: boolean },
) => {
  const params = new URLSearchParams();
  if (opts.category) params.set("category", opts.category);
  if (opts.zipPrefix) params.set("zip_prefix", opts.zipPrefix);
  params.set("open_only", String(opts.openOnly ?? true));
  return call<{ tasks: Task[] }>(token, `/tasks?${params}`);
};

export const myTasks = (token: string) =>
  call<{ posted: Task[]; claimed: Task[] }>(token, "/tasks/mine");

export const taskDetail = (token: string, id: number) => call<Task>(token, `/tasks/${id}`);

export const postTask = (
  token: string,
  body: {
    title: string;
    category: TaskCategory;
    description: string;
    zip: string;
    address: string;
    est_hours: number;
  },
) => call<{ id: number }>(token, "/tasks", { method: "POST", body: JSON.stringify(body) });

export const transition = (
  token: string,
  id: number,
  action: "claim" | "accept" | "decline" | "done" | "confirm" | "cancel" | "withdraw",
) => call<{ ok: true }>(token, `/tasks/${id}/${action}`, { method: "POST" });

export const getNotifications = (token: string) =>
  call<{ notifications: AppNotification[] }>(token, "/notifications");

export const markNotificationsRead = (token: string) =>
  call<{ ok: true }>(token, "/notifications/read", { method: "POST" });

export const myHours = (token: string) =>
  call<{ hours: HoursRow[]; total: number }>(token, "/hours");

export const signup = async (body: {
  email: string;
  password: string;
  role: "veteran" | "student";
  display_name: string;
  zip: string;
  school?: string;
}): Promise<{ ok: boolean; next?: string; error?: string }> => {
  const resp = await fetch(`${API_URL}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const raw = (data as { detail?: unknown }).detail;
    return {
      ok: false,
      error: typeof raw === "string" ? raw : "Couldn't create the account. Check the fields.",
    };
  }
  return { ok: true, next: (data as { next?: string }).next };
};
