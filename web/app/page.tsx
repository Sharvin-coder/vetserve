"use client";

// Phase 0 placeholder page: proves web → API → (Ollama, Supabase) wiring.
// The real landing page replaces this in Phase 4.

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { SkeletonText } from "@/components/ui/Skeleton";
import { fetchHealth, type HealthReport } from "@/lib/api";

function Row({ label, ok, detail }: { label: string; ok: boolean | null; detail?: string }) {
  const word = ok === null ? "Checking" : ok ? "Connected" : "Not reachable";
  const tone = ok === null ? "text-ink-muted" : ok ? "text-success" : "text-danger";
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line py-3 last:border-b-0">
      <div>
        <p className="text-base font-medium">{label}</p>
        {detail ? <p className="text-sm text-ink-muted">{detail}</p> : null}
      </div>
      <p className={`text-base font-semibold ${tone}`}>{word}</p>
    </div>
  );
}

export default function Home() {
  const [health, setHealth] = useState<HealthReport | null>(null);
  const [apiDown, setApiDown] = useState(false);

  useEffect(() => {
    fetchHealth()
      .then(setHealth)
      .catch(() => setApiDown(true));
  }, []);

  const models = health?.ollama.models ?? [];

  return (
    <main className="mx-auto max-w-measure px-5 py-16">
      <h1 className="font-display text-2xl font-medium">VetServe Katy</h1>
      <p className="mt-2 max-w-measure text-base text-ink-muted">
        Straight answers about benefits, and neighbors who&rsquo;ll help with the rest. This is the
        Phase 0 system check; the real site is coming in later phases.
      </p>

      <Card className="mt-8 p-0 px-5 py-2">
        {apiDown ? (
          <div className="py-3">
            <Row label="API (FastAPI)" ok={false} detail="Start it with: uv run uvicorn app.main:app" />
          </div>
        ) : health === null ? (
          <div className="py-4">
            <SkeletonText lines={3} />
          </div>
        ) : (
          <>
            <Row label="API (FastAPI)" ok={true} detail={`Provider: ${health.llm_provider}`} />
            <Row
              label="Ollama"
              ok={health.ollama.reachable}
              detail={
                health.ollama.reachable
                  ? models.length
                    ? `Models: ${models.join(", ")}`
                    : "Reachable, but no models pulled yet"
                  : "Run: ollama serve, then ollama pull qwen2.5:7b-instruct"
              }
            />
            <Row
              label="Supabase"
              ok={health.supabase.reachable}
              detail={
                health.supabase.reachable
                  ? "Postgres, auth, and vectors"
                  : health.supabase.error === "not_configured"
                    ? "Add SUPABASE_URL and SUPABASE_ANON_KEY to .env"
                    : "Check SUPABASE_URL and keys in .env"
              }
            />
          </>
        )}
      </Card>

      <p className="mt-6 text-sm text-ink-muted">
        Component review: <a href="/styleguide" className="font-medium text-primary underline underline-offset-2">/styleguide</a>
      </p>
    </main>
  );
}
