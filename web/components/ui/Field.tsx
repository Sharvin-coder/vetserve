import { useId, type ReactNode } from "react";

/** Shared label + hint + error wrapper. Labels are always visible —
 * never placeholder-only. Error text is tied to the control via aria-describedby. */
export interface FieldChrome {
  label: string;
  hint?: string;
  error?: string;
}

export function useFieldIds(provided?: string) {
  const auto = useId();
  const id = provided ?? auto;
  return { id, hintId: `${id}-hint`, errorId: `${id}-error` };
}

export function FieldShell({
  label,
  hint,
  error,
  id,
  hintId,
  errorId,
  children,
}: FieldChrome & { id: string; hintId: string; errorId: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-base font-medium text-ink">
        {label}
      </label>
      {hint ? (
        <p id={hintId} className="text-sm text-ink-muted">
          {hint}
        </p>
      ) : null}
      {children}
      {error ? (
        <p id={errorId} className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function describedBy(hint?: string, error?: string, hintId?: string, errorId?: string) {
  const ids = [hint ? hintId : null, error ? errorId : null].filter(Boolean);
  return ids.length ? ids.join(" ") : undefined;
}

export const controlClass = [
  "min-h-[44px] w-full rounded-control border bg-surface px-3.5 py-2 text-base text-ink",
  "placeholder:text-ink-muted",
  "disabled:cursor-not-allowed disabled:bg-bg disabled:text-ink-muted",
].join(" ");

export function borderClass(error?: string) {
  return error ? "border-danger" : "border-line";
}
