"use client";

import { forwardRef, type SelectHTMLAttributes } from "react";
import { borderClass, controlClass, describedBy, FieldShell, useFieldIds } from "./Field";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hint?: string;
  error?: string;
  options: SelectOption[];
  /** shown as a disabled first option when no value is selected */
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, options, placeholder, id: providedId, className = "", ...rest },
  ref,
) {
  const { id, hintId, errorId } = useFieldIds(providedId);
  return (
    <FieldShell label={label} hint={hint} error={error} id={id} hintId={hintId} errorId={errorId}>
      <select
        ref={ref}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(hint, error, hintId, errorId)}
        className={`${controlClass} ${borderClass(error)} appearance-none bg-no-repeat pr-10 ${className}`}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'><path d='M1 1l5 5 5-5' fill='none' stroke='%231C2321' stroke-width='2'/></svg>\")",
          backgroundPosition: "right 14px center",
        }}
        {...rest}
      >
        {placeholder ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
});
