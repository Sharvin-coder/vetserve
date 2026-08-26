"use client";

/** A retrieved passage backing a citation marker: thin brick left rule,
 * document title in Fraunces, page number, verbatim excerpt with the
 * matched sentence highlighted in a pale brick tint. */
export interface SourceCardProps {
  n: number;
  title: string;
  sourceUrl: string;
  page?: number | null;
  /** verbatim excerpt; `match` is the sentence to highlight inside it */
  excerpt: string;
  match?: string;
  active?: boolean;
  onSelect?: (n: number) => void;
}

function Excerpt({ excerpt, match }: { excerpt: string; match?: string }) {
  if (!match) return <>{excerpt}</>;
  const i = excerpt.indexOf(match);
  if (i === -1) return <>{excerpt}</>;
  return (
    <>
      {excerpt.slice(0, i)}
      <mark className="match">{match}</mark>
      {excerpt.slice(i + match.length)}
    </>
  );
}

export function SourceCard({
  n,
  title,
  sourceUrl,
  page,
  excerpt,
  match,
  active = false,
  onSelect,
}: SourceCardProps) {
  return (
    <article
      id={`source-card-${n}`}
      onClick={() => {
        onSelect?.(n);
        document
          .querySelector(`[aria-label="Source ${n}"]`)
          ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }}
      className={[
        "card-in cursor-pointer rounded-card border border-line bg-surface p-4 pl-3.5",
        "border-l-2 border-l-accent",
        active ? "bg-accent-tint" : "",
      ].join(" ")}
    >
      <header className="mb-1 flex items-baseline gap-2">
        <span aria-hidden className="text-sm font-semibold text-accent">
          {n}
        </span>
        <h3 className="font-display text-md font-medium text-ink">{title}</h3>
      </header>
      {page != null ? <p className="mb-1.5 text-sm text-ink-muted tnum">Page {page}</p> : null}
      <blockquote className="text-ui text-ink">
        “<Excerpt excerpt={excerpt} match={match} />”
      </blockquote>
      <a
        href={sourceUrl}
        target="_blank"
        rel="noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="mt-2 inline-block text-sm font-medium text-primary underline underline-offset-2"
      >
        View the original document
      </a>
    </article>
  );
}
