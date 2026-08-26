"use client";

// One question → answer exchange, through its whole lifecycle:
// retrieving → streaming → validated (or crisis / couldn't answer).

import { useState } from "react";
import { AnswerText, StreamingText } from "./AnswerText";
import { CrisisBanner } from "@/components/ui/Banner";
import { SkeletonText } from "@/components/ui/Skeleton";
import { sendFeedback, type FinalAnswer } from "@/lib/ask";

export type ExchangePhase = "retrieving" | "streaming" | "done" | "error";

export interface ExchangeData {
  id: number;
  question: string;
  phase: ExchangePhase;
  streamText: string;
  final: FinalAnswer | null;
  error: string | null;
}

const CONFIDENCE_COPY: Record<string, string> = {
  high: "High — this answer matched official passages closely.",
  medium: "Medium — read the sources to be sure this fits your situation.",
  low: "Low — the sources didn't cover this well.",
};

export function ConfidenceLine({ level }: { level: string }) {
  return (
    <p className="text-sm font-medium text-ink">
      Confidence: <span className="capitalize">{level}</span>
      <span className="font-normal text-ink-muted"> — {CONFIDENCE_COPY[level]?.split("— ")[1]}</span>
    </p>
  );
}

export function Exchange({
  data,
  activeCitation,
  onActivate,
  onDeactivate,
}: {
  data: ExchangeData;
  activeCitation: number | null;
  onActivate: (n: number) => void;
  onDeactivate: () => void;
}) {
  const [voted, setVoted] = useState<"up" | "down" | null>(null);
  const f = data.final;

  return (
    <article className="border-b border-line py-6 last:border-b-0">
      <p className="mb-3 font-display text-md font-medium text-ink">{data.question}</p>

      {data.phase === "retrieving" && (
        <div aria-label="Searching official documents">
          <p className="mb-2 text-sm text-ink-muted">Searching official documents…</p>
          <SkeletonText lines={2} />
        </div>
      )}

      {data.phase === "streaming" && <StreamingText text={data.streamText} />}

      {data.phase === "error" && (
        <p className="max-w-measure text-base text-danger">{data.error}</p>
      )}

      {data.phase === "done" && f && f.crisis && <CrisisBanner />}

      {data.phase === "done" && f && !f.crisis && (
        <div className="flex flex-col gap-3">
          <AnswerText
            text={f.answer ?? ""}
            validCitations={new Set((f.citations ?? []).map((c) => c.id))}
            activeCitation={activeCitation}
            onActivate={onActivate}
            onDeactivate={onDeactivate}
          />

          {f.handoff && (
            <p className="max-w-measure text-base text-ink">
              <span className="font-medium">Talk to a person: </span>
              {f.handoff.org},{" "}
              <a
                href={`tel:${f.handoff.phone.replace(/-/g, "")}`}
                className="font-semibold text-primary underline underline-offset-2 tnum"
              >
                {f.handoff.phone}
              </a>
              <span className="text-ink-muted"> · {f.handoff.hours}</span>
            </p>
          )}

          <div className="flex items-center gap-3">
            <span className="text-sm text-ink-muted" id={`feedback-${data.id}`}>
              Was this helpful?
            </span>
            {voted === null ? (
              <span role="group" aria-labelledby={`feedback-${data.id}`} className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setVoted("up");
                    sendFeedback(data.question, f.answer ?? "", true);
                  }}
                  className="min-h-[44px] rounded-control border border-line bg-surface px-3 text-sm font-medium text-ink hover:border-primary"
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setVoted("down");
                    sendFeedback(data.question, f.answer ?? "", false);
                  }}
                  className="min-h-[44px] rounded-control border border-line bg-surface px-3 text-sm font-medium text-ink hover:border-primary"
                >
                  No
                </button>
              </span>
            ) : (
              <span className="text-sm text-ink-muted">Thanks — noted.</span>
            )}
          </div>
        </div>
      )}
    </article>
  );
}
