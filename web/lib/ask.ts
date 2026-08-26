// Streaming client for POST /ask. EventSource can't POST, so we parse the
// SSE frames off a fetch() body stream ourselves.

import { API_URL } from "./api";

export interface Citation {
  id: number;
  title: string;
  source_url: string;
  page: number | null;
  excerpt: string;
}

export interface Handoff {
  org: string;
  phone: string;
  hours: string;
  source?: string;
}

export interface CrisisContact {
  method: "call" | "text";
  label: string;
  number: string;
}

export interface FinalAnswer {
  crisis: boolean;
  message?: string;
  contacts?: CrisisContact[];
  answer?: string;
  citations?: Citation[];
  confidence?: "high" | "medium" | "low";
  handoff?: Handoff | null;
  dropped_sentences?: number;
}

export interface AskCallbacks {
  onRetrieval?: (citations: Citation[]) => void;
  onToken?: (text: string) => void;
  onFinal: (payload: FinalAnswer) => void;
  /** may be async (e.g. a non-streaming retry); askStreaming awaits it */
  onError: (message: string) => void | Promise<void>;
}

export async function askStreaming(
  question: string,
  callbacks: AskCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  let resp: Response;
  try {
    resp = await fetch(`${API_URL}/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, stream: true }),
      signal,
    });
  } catch {
    await callbacks.onError("Couldn't reach VetGuide. Check that the API is running, then try again.");
    return;
  }
  if (!resp.ok || !resp.body) {
    await callbacks.onError("VetGuide had a problem answering. Try again in a moment.");
    return;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let sawFinal = false;

  const handleFrame = (frame: string) => {
    let event = "message";
    const dataLines: string[] = [];
    for (const line of frame.split("\n")) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
    }
    if (!dataLines.length) return;
    let data: unknown;
    try {
      data = JSON.parse(dataLines.join("\n"));
    } catch {
      return;
    }
    if (event === "retrieval") {
      callbacks.onRetrieval?.((data as { citations: Citation[] }).citations);
    } else if (event === "token") {
      callbacks.onToken?.((data as { text: string }).text);
    } else if (event === "final") {
      sawFinal = true;
      callbacks.onFinal(data as FinalAnswer);
    }
  };

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let sep: number;
      while ((sep = buffer.indexOf("\n\n")) !== -1) {
        handleFrame(buffer.slice(0, sep));
        buffer = buffer.slice(sep + 2);
      }
    }
    if (buffer.trim()) handleFrame(buffer);
  } catch {
    if (!sawFinal) await callbacks.onError("The connection dropped mid-answer. Try again.");
    return;
  }
  if (!sawFinal) {
    await callbacks.onError("VetGuide didn't finish answering. Try again.");
  }
}

/** Non-streaming fallback: one POST, full validated payload. Used when the
 * SSE stream drops mid-answer (flaky network, throttled tab). */
export async function askOnce(question: string): Promise<FinalAnswer> {
  const resp = await fetch(`${API_URL}/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, stream: false }),
  });
  if (!resp.ok) throw new Error(`API returned ${resp.status}`);
  return resp.json();
}

export async function sendFeedback(question: string, answer: string, helpful: boolean) {
  try {
    await fetch(`${API_URL}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, answer, helpful }),
    });
  } catch {
    // feedback is best-effort; never surface an error for it
  }
}
