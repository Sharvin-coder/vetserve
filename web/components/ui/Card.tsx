import type { HTMLAttributes } from "react";

/** The base surface: white, 1px line border, 10px radius, no shadow, no hover lift. */
export function Card({ className = "", ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-card border border-line bg-surface p-5 ${className}`}
      {...rest}
    />
  );
}
