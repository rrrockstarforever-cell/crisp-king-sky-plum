// Pulse Med web API. Grok runs on the injected XAI_API_KEY (never sent to the browser).
// ChatGPT / Claude subscription sign-in is desktop-only and is reported honestly.
import { research } from "./web.mjs";

const GROK_MODEL = "grok-4.5";
const DEFAULT_MODELS: Record<string, string> = {
  gemini: "gemini-2.5-flash",
  chatgpt: "gpt-4.1",
  claude: "claude-sonnet-4-5",
  grok: GROK_MODEL,
};

const g = globalThis as typeof globalThis & { __pulseGeminiKey?: string };
function geminiKey(): string {
  return (g.__pulseGeminiKey || "").trim();
}
function setGeminiKey(key: string) {
  g.__pulseGeminiKey = key;
}

function grokReady(): boolean {
  return Boolean(process.env.XAI_API_KEY?.trim());
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

const DESKTOP_ONLY =
  "ChatGPT and Claude subscription sign-in is part of the Pulse Med desktop app. This web version uses the built-in Grok connection.";

type ChatMessage = { role: "user" | "assistant"; content: string };

function clampMessages(raw: unknown): ChatMessage[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 16) return null;
  const out: ChatMessage[] = [];
  let total = 0;
  for (const m of raw) {
    if (!m || (m.role !== "user" && m.role !== "assistant") || typeof m.content !== "string") return null;
    const content = m.content.slice(0, 24_000);
    total += content.length;
    if (total > 80_000) return null;
    out.push({ role: m.role, content });
  }
  return out;
}

async function callGrok(opts: {
  model?: string;
  system?: string;
  messages: ChatMessage[];
  json?: boolean;
}): Promise<string> {
  const apiKey = process.env.XAI_API_KEY?.trim();
  if (!apiKey) throw Object.assign(new Error("Grok is not available in this environment."), { status: 401 });
  const requested = (opts.model || "").trim();
  const model = requested.startsWith("grok-") ? requested : GROK_MODEL;
  const messages = [
    ...(opts.system ? [{ role: "system" as const, content: opts.system.slice(0, 12_000) }] : []),
    ...opts.messages,
  ];
  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 4096,
      temperature: 0.4,
      ...(opts.json ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  const body = (await res.json().catch(() => null)) as {
    error?: { message?: string };
    choices?: { message?: { content?: string } }[];
  } | null;
  if (!res.ok) {
    const msg = body?.error?.message || `Grok request failed (HTTP ${res.status}).`;
    // Unknown model ids from the desktop defaults: retry once on grok-4.5.
    if (res.status === 400 && model !== GROK_MODEL && /model/i.test(msg)) {
      return callGrok({ ...opts, model: GROK_MODEL });
    }
    throw Object.assign(new Error(msg), { status: res.status === 401 ? 401 : 502 });
  }
  return body?.choices?.[0]?.message?.content ?? "";
}

async function callGemini(opts: {
  model?: string;
  system?: string;
  messages: ChatMessage[];
  json?: boolean;
}): Promise<string> {
  const key = geminiKey();
  if (!key) throw Object.assign(new Error("Gemini is not connected. Add a Gemini API key in Settings."), { status: 401 });
  const model = (opts.model || DEFAULT_MODELS.gemini).replace(/^models\//, "");
  const contents = opts.messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: opts.system ? { parts: [{ text: opts.system.slice(0, 12_000) }] } : undefined,
        contents,
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 4096,
          ...(opts.json ? { responseMimeType: "application/json" } : {}),
        },
      }),
    },
  );
  const body = (await res.json().catch(() => null)) as {
    error?: { message?: string };
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  } | null;
  if (!res.ok) {
    throw Object.assign(new Error(body?.error?.message || `Gemini request failed (HTTP ${res.status}).`), { status: 502 });
  }
  return body?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") ?? "";
}

async function runCompletion(opts: {
  provider: string;
  model?: string;
  system?: string;
  messages: ChatMessage[];
  json?: boolean;
}): Promise<string> {
  if (opts.provider === "grok") return callGrok(opts);
  if (opts.provider === "gemini") return callGemini(opts);
  if (opts.provider === "chatgpt" || opts.provider === "claude") {
    throw Object.assign(new Error(DESKTOP_ONLY), { status: 401 });
  }
  throw Object.assign(new Error(`Unknown AI provider: ${opts.provider}`), { status: 400 });
}

function parseJsonBlock(raw: string): Record<string, unknown> | null {
  if (!raw) return null;
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();
  const start = text.search(/[[{]/);
  if (start > 0) text = text.slice(start);
  const end = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));
  if (end > -1) text = text.slice(0, end + 1);
  try {
    const value = JSON.parse(text) as unknown;
    if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
    return null;
  } catch {
    return null;
  }
}

const PERSONA: Record<string, string> = {
  BOARD_MASTER:
    "You are the PULSE MED Board Exam Master for NEET-PG / INI-CET / AMC CAT: razor-sharp high-yield clinical breakdowns, distractor dissection, and exam-board pearls.",
  ATTENDING:
    "You are the PULSE MED Socratic Attending Physician on teaching rounds: reason step by step with the resident.",
  PHARMACOLOGIST:
    "You are the PULSE MED Mechanism & Kinetics Specialist: pharmacodynamics, pharmacokinetics, receptors and resistance explained precisely.",
};

function statusBody() {
  return {
    success: true,
    providers: {
      gemini: { connected: Boolean(geminiKey()) },
      chatgpt: { connected: false },
      claude: { connected: false },
      grok: { connected: grokReady(), userEmail: grokReady() ? "Built-in Grok" : undefined },
    },
    defaults: DEFAULT_MODELS,
  };
}

async function handlePost(path: string, request: Request): Promise<Response> {
  let body: Record<string, unknown> = {};
  if (request.headers.get("content-length") && Number(request.headers.get("content-length")) > 400_000) {
    return json({ error: "Request is too large." }, 413);
  }
  try {
    const parsed = await request.json();
    if (parsed && typeof parsed === "object") body = parsed as Record<string, unknown>;
  } catch {
    body = {};
  }

  if (path === "/api/oauth/start" || path === "/api/oauth/poll" || path === "/api/oauth/complete") {
    const provider = String(body.provider || "");
    if (provider === "grok" && grokReady()) {
      return json({ error: "Grok is already connected in this web app. Open Settings and set it active." }, 400);
    }
    return json({ error: DESKTOP_ONLY }, 400);
  }

  if (path === "/api/oauth/logout") {
    const provider = String(body.provider || "");
    if (provider === "gemini") setGeminiKey("");
    if (provider === "grok") {
      return json({ ok: true, connected: grokReady(), note: "Built-in Grok stays available in the web app." });
    }
    return json({ ok: true, connected: false, provider });
  }

  if (path === "/api/settings/gemini-key") {
    const key = String(body.apiKey || "").trim();
    if (!/^[A-Za-z0-9_\-]{10,}$/.test(key)) {
      return json({ error: "That does not look like a valid Gemini API key." }, 400);
    }
    setGeminiKey(key);
    return json({ ok: true, connected: true });
  }

  if (path === "/api/ai/complete") {
    const provider = String(body.provider || "");
    const messages = clampMessages(body.messages);
    if (!provider) return json({ error: "No AI provider selected. Connect an AI provider in Settings." }, 400);
    if (!messages) return json({ error: "messages must be a short array of {role, content}." }, 400);
    try {
      const text = await runCompletion({
        provider,
        model: typeof body.model === "string" ? body.model : undefined,
        system: typeof body.system === "string" ? body.system : undefined,
        messages,
        json: Boolean(body.json),
      });
      if (!text.trim()) return json({ error: "The AI provider returned an empty response. Try again." }, 502);
      return json({ success: true, text, model: (typeof body.model === "string" && body.model) || DEFAULT_MODELS[provider] || GROK_MODEL });
    } catch (err) {
      const e = err as { message?: string; status?: number };
      return json({ error: e.message || "AI request failed." }, e.status || 502);
    }
  }

  if (path === "/api/ai/tutor-chat") {
    const message = typeof body.message === "string" ? body.message.slice(0, 12_000) : "";
    if (!message.trim()) return json({ error: "message is required." }, 400);
    let provider = typeof body.provider === "string" ? body.provider : "";
    if (!provider) provider = grokReady() ? "grok" : geminiKey() ? "gemini" : "";
    if (!provider) return json({ error: "No AI provider is connected yet." }, 401);
    const persona = typeof body.persona === "string" ? body.persona : "BOARD_MASTER";
    const exam = typeof body.exam === "string" ? body.exam : "";
    const contextQuestion = body.contextQuestion as { stem?: string; subject?: string; subtopic?: string; correctOption?: string; trapExplanation?: string } | undefined;
    const system = [
      "You are the PULSE MED clinical AI tutor for postgraduate medical exams (NEET-PG, INI-CET, AMC CAT).",
      exam ? `The learner's active exam is ${exam.replaceAll("_", "-")}.` : "",
      PERSONA[persona] || PERSONA.BOARD_MASTER,
      "Be high-yield and clinically grounded. Do not invent citations.",
      contextQuestion?.stem
        ? `Attached question (${contextQuestion.subject || "n/a"} / ${contextQuestion.subtopic || "n/a"}). Stem: "${String(contextQuestion.stem).slice(0, 2000)}". Marked key: ${contextQuestion.correctOption || "n/a"}.`
        : "",
      'Respond with ONLY a JSON object: {"reply":"markdown answer","reasoningSteps":[{"step":"","detail":""}],"pearl":"","citations":[],"suggestedFollowups":[]}',
    ]
      .filter(Boolean)
      .join("\n");
    const history = clampMessages(body.history) ?? [];
    try {
      const raw = await runCompletion({
        provider,
        model: typeof body.model === "string" ? body.model : undefined,
        system,
        messages: [...history.slice(-8), { role: "user", content: message }],
        json: true,
      });
      const parsed = parseJsonBlock(raw);
      const reply = typeof parsed?.reply === "string" && parsed.reply.trim() ? parsed.reply : raw.trim();
      if (!reply) return json({ error: "The AI provider returned an empty response. Try again." }, 502);
      const result: Record<string, unknown> = { success: true, reply, modelUsed: DEFAULT_MODELS[provider] || GROK_MODEL };
      if (Array.isArray(parsed?.reasoningSteps)) result.reasoningSteps = parsed.reasoningSteps.slice(0, 6);
      if (typeof parsed?.pearl === "string" && parsed.pearl.trim()) result.pearl = parsed.pearl.trim();
      if (Array.isArray(parsed?.citations)) result.citations = parsed.citations.filter((c) => typeof c === "string").slice(0, 6);
      if (Array.isArray(parsed?.suggestedFollowups)) {
        result.suggestedFollowups = parsed.suggestedFollowups.filter((c) => typeof c === "string").slice(0, 4);
      }
      return json(result);
    } catch (err) {
      const e = err as { message?: string; status?: number };
      return json({ error: e.message || "AI request failed." }, e.status || 502);
    }
  }

  if (path === "/api/web/research") {
    const query = typeof body.query === "string" ? body.query : "";
    try {
      const out = await research(query);
      return json({ success: true, sources: out.sources, retrievedAt: out.retrievedAt });
    } catch (err) {
      const e = err as { message?: string };
      return json({ error: e.message || "Web research failed." }, 502);
    }
  }

  return json({ error: "Not found" }, 404);
}

async function handleGet(path: string): Promise<Response> {
  if (path === "/api/oauth/status" || path === "/api/providers/status") {
    if (path === "/api/providers/status") {
      return json({
        providers: (["gemini", "chatgpt", "claude", "grok"] as const).map((id) => ({
          id,
          model: DEFAULT_MODELS[id],
          connected: id === "grok" ? grokReady() : id === "gemini" ? Boolean(geminiKey()) : false,
        })),
      });
    }
    return json(statusBody());
  }

  if (path === "/api/models/available") {
    return json({
      providers: {
        grok: grokReady() ? [{ id: GROK_MODEL, name: "Grok 4.5", source: "account" }] : [],
        gemini: geminiKey() ? [{ id: DEFAULT_MODELS.gemini, name: "Gemini 2.5 Flash", source: "account" }] : [],
        chatgpt: [],
        claude: [],
      },
      errors: {
        chatgpt: DESKTOP_ONLY,
        claude: DESKTOP_ONLY,
        ...(grokReady() ? {} : { grok: "Grok is not available in this environment." }),
        ...(geminiKey() ? {} : { gemini: "No Gemini API key saved." }),
      },
      fetchedAt: new Date().toISOString(),
    });
  }

  if (path === "/api/models/catalog") {
    try {
      const upstream = await fetch("https://models.dev/api.json", { signal: AbortSignal.timeout(12_000) });
      if (!upstream.ok) throw new Error(`models.dev returned HTTP ${upstream.status}`);
      const raw = (await upstream.json()) as Record<string, { models?: Record<string, { id?: string; name?: string; limit?: { context?: number }; release_date?: string }> }>;
      const map: Record<string, string> = { chatgpt: "openai", claude: "anthropic", gemini: "google", grok: "xai" };
      const providers: Record<string, { id: string; name: string; context: number | null; released: string | null }[]> = {};
      for (const [ours, theirs] of Object.entries(map)) {
        const modelsObj = raw?.[theirs]?.models ?? {};
        providers[ours] = Object.values(modelsObj)
          .map((m) => ({
            id: typeof m?.id === "string" ? m.id : "",
            name: typeof m?.name === "string" ? m.name : typeof m?.id === "string" ? m.id : "",
            context: typeof m?.limit?.context === "number" ? m.limit.context : null,
            released: typeof m?.release_date === "string" ? m.release_date : null,
          }))
          .filter((m) => m.id)
          .slice(0, 40);
      }
      if (!providers.grok?.some((m) => m.id === GROK_MODEL)) {
        providers.grok = [{ id: GROK_MODEL, name: "Grok 4.5", context: null, released: null }, ...(providers.grok || [])];
      }
      return json({ providers, fetchedAt: new Date().toISOString() });
    } catch (err) {
      const e = err as { message?: string };
      return json({ error: `Could not load the live model catalog (${e.message || "network error"}).` }, 502);
    }
  }

  return json({ error: "Not found" }, 404);
}

export async function handlePulseApi(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";
  try {
    if (request.method === "GET") return await handleGet(path);
    if (request.method === "POST") return await handlePost(path, request);
    return json({ error: "method not allowed" }, 405);
  } catch (err) {
    console.error("[pulse] api error", err);
    return json({ error: "Request failed." }, 500);
  }
}
