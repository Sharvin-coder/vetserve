export type TaskStatus = "open" | "claimed" | "accepted" | "done" | "confirmed" | "cancelled";

/** Colored text on the white surface (AA everywhere, incl. warn); a tinted dot
 * repeats the color but the WORD is always the signal — never color alone. */
const tones: Record<TaskStatus, { label: string; text: string; dot: string }> = {
  open: { label: "Open", text: "text-primary", dot: "bg-primary" },
  claimed: { label: "Claimed", text: "text-warn", dot: "bg-warn" },
  accepted: { label: "Accepted", text: "text-primary", dot: "bg-primary" },
  done: { label: "Marked done", text: "text-warn", dot: "bg-warn" },
  confirmed: { label: "Confirmed", text: "text-success", dot: "bg-success" },
  cancelled: { label: "Cancelled", text: "text-danger", dot: "bg-danger" },
};

export function StatusPill({ status }: { status: TaskStatus }) {
  const tone = tones[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-control border border-line bg-surface px-2.5 py-1 text-sm font-medium ${tone.text}`}
    >
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
      {tone.label}
    </span>
  );
}
