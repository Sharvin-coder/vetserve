"use client";

import { forwardRef, type TextareaHTMLAttributes } from "react";
import { borderClass, controlClass, describedBy, FieldShell, useFieldIds } from "./Field";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, id: providedId, className = "", rows = 4, ...rest },
  ref,
) {
  const { id, hintId, errorId } = useFieldIds(providedId);
  return (
    <FieldShell label={label} hint={hint} error={error} id={id} hintId={hintId} errorId={errorId}>
      <textarea
        ref={ref}
        id={id}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(hint, error, hintId, errorId)}
        className={`${controlClass} ${borderClass(error)} min-h-[88px] leading-[1.55] ${className}`}
        {...rest}
      />
    </FieldShell>
  );
});
