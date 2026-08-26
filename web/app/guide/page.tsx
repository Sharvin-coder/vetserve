"use client";

// VetGuide — Screen 2. Conversation main column, large input pinned to the
// bottom, source rail on the right (stacked below on mobile).

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { Exchange, ConfidenceLine, type ExchangeData } from "@/components/guide/Exchange";
import { HelpRail } from "@/components/guide/HelpRail";
import { Button } from "@/components/ui/Button";
import { SourceCard } from "@/components/ui/SourceCard";
import { askOnce, askStreaming, type Citation } from "@/lib/ask";

const STARTERS = [
  "Am I eligible for the Hazlewood Act?",
  "How do I file a VA disability claim?",
  "Who qualifies for VA health care?",
  "What does the GI Bill cover?",
  "Do disabled veterans get a property tax break in Texas?",
  "What are the hours of the Katy VA clinic?",
];

function GuideInner() {
  const searchParams = useSearchParams();
  const [exchanges, setExchanges] = useState<ExchangeData[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [activeCitation, setActiveCitation] = useState<number | null>(null);
  const nextId = useRef(1);
  const listRef = useRef<HTMLDivElement>(null);

  // a question handed over from the landing page (?q=...) asks itself once
  const askedFromUrl = useRef(false);
  useEffect(() => {
    const q = searchParams.get("q");
    if (q && !askedFromUrl.current) {
      askedFromUrl.current = true;
      ask(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const last = exchanges[exchanges.length - 1] ?? null;
  const lastFinal = last?.phase === "done" ? last.final : null;
  const railCitations: Citation[] =
    lastFinal && !lastFinal.crisis ? (lastFinal.citations ?? []) : [];

  function patchLast(patch: Partial<ExchangeData>) {
    setExchanges((xs) => {
      const copy = [...xs];
      copy[copy.length - 1] = { ...copy[copy.length - 1], ...patch };
      return copy;
    });
  }

  async function ask(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    setBusy(true);
    setInput("");
    setActiveCitation(null);
    setExchanges((xs) => [
      ...xs,
      { id: nextId.current++, question: q, phase: "retrieving", streamText: "", final: null, error: null },
    ]);
    requestAnimationFrame(() =>
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }),
    );

    await askStreaming(q, {
      onRetrieval: () => patchLast({ phase: "streaming" }),
      onToken: (text) =>
        setExchanges((xs) => {
          const copy = [...xs];
          const cur = copy[copy.length - 1];
          copy[copy.length - 1] = { ...cur, phase: "streaming", streamText: cur.streamText + text };
          return copy;
        }),
      onFinal: (payload) => patchLast({ phase: "done", final: payload }),
      onError: async (message) => {
        // stream dropped — ask once more without streaming before giving up
        try {
          const payload = await askOnce(q);
          patchLast({ phase: "done", final: payload });
        } catch {
          patchLast({ phase: "error", error: message });
        }
      },
    });
    setBusy(false);
  }

  return (
    <main className="mx-auto grid min-h-screen max-w-board grid-rows-[1fr_auto] px-5 py-6 md:grid-cols-[1fr_320px] md:gap-8">
      {/* conversation column */}
      <div className="flex min-h-0 flex-col">
        <header className="border-b border-line pb-4">
          <h1 className="font-display text-xl font-medium">VetGuide</h1>
          <p className="mt-1 max-w-measure text-ui text-ink-muted">
            Answers from official VA and Texas documents, with sources.
          </p>
        </header>

        <div
          ref={listRef}
          aria-live="polite"
          className="min-h-0 flex-1 overflow-y-auto"
        >
          {exchanges.length === 0 ? (
            <div className="py-8">
              <p className="mb-4 text-base text-ink-muted">Start with one of these, or ask your own:</p>
              <div className="flex max-w-measure flex-wrap gap-2.5">
                {STARTERS.map((s) => (
                  <Button key={s} variant="quiet" className="border border-line text-left" onClick={() => ask(s)}>
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            exchanges.map((x) => (
              <Exchange
                key={x.id}
                data={x}
                activeCitation={activeCitation}
                onActivate={setActiveCitation}
                onDeactivate={() => setActiveCitation(null)}
              />
            ))
          )}
        </div>

        {/* input pinned to the bottom of the column */}
        <form
          className="sticky bottom-0 border-t border-line bg-bg pb-2 pt-4"
          onSubmit={(e) => {
            e.preventDefault();
            ask(input);
          }}
        >
          <label htmlFor="guide-input" className="mb-1.5 block text-base font-medium">
            Your question
          </label>
          <div className="flex gap-2.5">
            <input
              id="guide-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about benefits, health care, education"
              className="min-h-[52px] w-full rounded-control border border-line bg-surface px-4 text-base text-ink placeholder:text-ink-muted"
            />
            <Button type="submit" disabled={busy || !input.trim()} className="min-h-[52px] shrink-0">
              Ask VetGuide
            </Button>
          </div>
          <p className="mt-2 text-sm text-ink-muted">
            VetGuide reads official documents; it isn&rsquo;t official advice. For decisions about your
            benefits, talk to a Veterans Service Officer.
          </p>
        </form>
      </div>

      {/* source rail: right on desktop, stacked below on mobile */}
      <div className="flex flex-col gap-4 pb-8 pt-6 md:pt-0">
        {lastFinal && !lastFinal.crisis && lastFinal.confidence && railCitations.length > 0 && (
          <>
            <ConfidenceLine level={lastFinal.confidence} />
            <div className="flex flex-col gap-3" aria-label="Sources for the latest answer">
              {railCitations.map((c) => (
                <SourceCard
                  key={c.id}
                  n={c.id}
                  title={c.title}
                  sourceUrl={c.source_url}
                  page={c.page}
                  excerpt={c.excerpt}
                  active={activeCitation === c.id}
                  onSelect={setActiveCitation}
                />
              ))}
            </div>
          </>
        )}
        <HelpRail />
      </div>
    </main>
  );
}

export default function GuidePage() {
  return (
    <Suspense>
      <GuideInner />
    </Suspense>
  );
}
