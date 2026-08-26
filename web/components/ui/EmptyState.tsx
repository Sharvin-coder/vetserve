import type { ReactNode } from "react";

/** Empty states invite an action; they never just say "nothing here". */
export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-card border border-dashed border-line bg-surface px-6 py-10 text-center">
      <p className="font-display text-md font-medium text-ink">{title}</p>
      {body ? <p className="mx-auto mt-1.5 max-w-measure text-base text-ink-muted">{body}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
