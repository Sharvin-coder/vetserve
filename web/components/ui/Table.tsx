import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";

/** Table primitives: tabular numerals via the global `table` rule, optional
 * sticky header for the dense admin screens. */
export function Table({
  sticky = false,
  className = "",
  ...rest
}: HTMLAttributes<HTMLTableElement> & { sticky?: boolean }) {
  return (
    <div className="overflow-x-auto rounded-card border border-line bg-surface">
      <table
        className={`w-full border-collapse text-ui [&_tbody_tr:last-child_td]:border-b-0 ${sticky ? "[&_thead_th]:sticky [&_thead_th]:top-0 [&_thead_th]:bg-surface" : ""} ${className}`}
        {...rest}
      />
    </div>
  );
}

export function Th({ className = "", ...rest }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope="col"
      className={`border-b border-line px-4 py-3 text-left text-sm font-semibold text-ink-muted ${className}`}
      {...rest}
    />
  );
}

export function Td({ className = "", ...rest }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={`border-b border-line px-4 py-3 text-ink ${className}`} {...rest} />
  );
}
