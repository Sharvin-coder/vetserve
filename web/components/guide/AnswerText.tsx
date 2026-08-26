"use client";

// Renders a validated answer, replacing [n] markers with the brick
// CitationMarker component. Text before validation streams as plain words.

import { Fragment } from "react";
import { CitationMarker } from "@/components/ui/Citation";

const MARKER = /\[(\d{1,2})\]/g;

export function AnswerText({
  text,
  validCitations,
  activeCitation,
  onActivate,
  onDeactivate,
}: {
  text: string;
  validCitations: Set<number>;
  activeCitation: number | null;
  onActivate: (n: number) => void;
  onDeactivate: () => void;
}) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const m of Array.from(text.matchAll(MARKER))) {
    const n = parseInt(m[1], 10);
    if (!validCitations.has(n)) continue;
    parts.push(<Fragment key={key++}>{text.slice(last, m.index)}</Fragment>);
    parts.push(
      <CitationMarker
        key={key++}
        n={n}
        active={activeCitation === n}
        onActivate={onActivate}
        onDeactivate={onDeactivate}
      />,
    );
    last = (m.index ?? 0) + m[0].length;
  }
  parts.push(<Fragment key={key++}>{text.slice(last)}</Fragment>);
  return <p className="max-w-measure whitespace-pre-wrap text-base">{parts}</p>;
}

/** Streaming view: raw tokens, markers hidden until validation. */
export function StreamingText({ text }: { text: string }) {
  return (
    <p className="max-w-measure whitespace-pre-wrap text-base text-ink">
      {text.replace(MARKER, "")}
      <span aria-hidden className="text-ink-muted">
        ▍
      </span>
    </p>
  );
}
