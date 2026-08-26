export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface HealthReport {
  status: "ok" | "degraded";
  llm_provider: string;
  ollama: {
    reachable: boolean;
    models: string[];
    generation_model_loaded?: boolean;
    embedding_model_loaded?: boolean;
    error?: string;
  };
  supabase: { reachable: boolean; error?: string };
}

export async function fetchHealth(): Promise<HealthReport> {
  const resp = await fetch(`${API_URL}/health`, { cache: "no-store" });
  if (!resp.ok) throw new Error(`API returned ${resp.status}`);
  return resp.json();
}
