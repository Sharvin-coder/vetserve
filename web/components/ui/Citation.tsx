"use client";

/** The signature element: brick superscript markers in answer text,
 * paired with SourceCard passages. Hover/focus on a marker highlights
 * its card (via data attributes and a shared active id). */

export function CitationMarker({
  n,
  active = false,
  onActivate,
  onDeactivate,
}: {
  n: number;
  active?: boolean;
  onActivate?: (n: number) => void;
  onDeactivate?: () => void;
}) {
  return (
    <sup className="ml-0.5">
      <button
        type="button"
        aria-label={`Source ${n}`}
        onMouseEnter={() => onActivate?.(n)}
        onMouseLeave={() => onDeactivate?.()}
        onFocus={() => onActivate?.(n)}
        onBlur={() => onDeactivate?.()}
        onClick={() => {
          document
            .getElementById(`source-card-${n}`)
            ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }}
        className={[
          "inline-flex min-h-0 items-center rounded-full px-1 text-sm font-semibold leading-tight",
          active ? "bg-accent text-primary-ink" : "text-accent hover:bg-accent hover:text-primary-ink",
        ].join(" ")}
      >
        {n}
      </button>
    </sup>
  );
}
