"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { borderClass, controlClass, describedBy, FieldShell, useFieldIds } from "./Field";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, id: providedId, className = "", ...rest },
  ref,
) {
  const { id, hintId, errorId } = useFieldIds(providedId);
  return (
    <FieldShell label={label} hint={hint} error={error} id={id} hintId={hintId} errorId={errorId}>
      <input
        ref={ref}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(hint, error, hintId, errorId)}
        className={`${controlClass} ${borderClass(error)} ${className}`}
        {...rest}
      />
    </FieldShell>
  );
});
