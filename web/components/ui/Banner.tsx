import type { ReactNode } from "react";

type Kind = "info" | "warn" | "crisis";

/** Tinted surface + colored left rule + ink text. Colored text never sits on a
 * tint, so contrast holds. Crisis is calm — tinted, never full-bleed red. */
const kinds: Record<Kind, { wrap: string; rule: string; role: "status" | "alert" }> = {
  info: { wrap: "bg-primary-tint", rule: "border-l-primary", role: "status" },
  warn: { wrap: "bg-warn-tint", rule: "border-l-warn", role: "status" },
  crisis: { wrap: "bg-danger-tint", rule: "border-l-danger", role: "alert" },
};

export function Banner({
  kind = "info",
  title,
  children,
}: {
  kind?: Kind;
  title?: string;
  children: ReactNode;
}) {
  const k = kinds[kind];
  return (
    <div
      role={k.role}
      className={`rounded-card border border-line border-l-4 p-4 pl-4 text-ink ${k.wrap} ${k.rule}`}
    >
      {title ? <p className="mb-1 font-display text-md font-medium">{title}</p> : null}
      <div className="text-base">{children}</div>
    </div>
  );
}

/** The crisis response used by VetGuide: replaces the whole answer area. */
export function CrisisBanner() {
  return (
    <Banner kind="crisis" title="You deserve support right now, from a person.">
      <p className="mb-3">
        The Veterans Crisis Line is free, confidential, and answered by people trained to help
        veterans — day or night.
      </p>
      <p className="mb-1 text-md">
        Call{" "}
        <a href="tel:988" className="font-semibold text-primary underline underline-offset-2">
          988
        </a>
        , then press 1
      </p>
      <p className="text-md">
        Or text{" "}
        <a href="sms:838255" className="font-semibold text-primary underline underline-offset-2">
          838255
        </a>
      </p>
    </Banner>
  );
}
