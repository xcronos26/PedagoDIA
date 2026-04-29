/**
 * Multi-provider AI system.
 * Providers are tried in order — first success wins.
 * Add a new provider by appending to the PROVIDERS array.
 *
 * Current order: Claude (Anthropic) → Gemini (Google) → GPT (OpenAI)
 */

import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";

export interface AIResult {
  text: string;
  provider: string;
}

// ── Claude ────────────────────────────────────────────────────────────────────
async function callClaude(prompt: string): Promise<AIResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY não configurada");

  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model: "claude-3-5-haiku-20241022",
    max_tokens: 8192,
    messages: [{ role: "user", content: prompt }],
  });

  const block = message.content[0];
  if (!block || block.type !== "text") throw new Error("Claude retornou resposta vazia");

  return { text: block.text, provider: "claude" };
}

// ── Gemini ────────────────────────────────────────────────────────────────────
async function callGemini(prompt: string): Promise<AIResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY não configurada");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: { responseMimeType: "application/json", maxOutputTokens: 8192 },
  });

  const result = await model.generateContent(prompt);
  return { text: result.response.text(), provider: "gemini" };
}

// ── OpenAI (GPT) ──────────────────────────────────────────────────────────────
async function callOpenAI(prompt: string): Promise<AIResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY não configurada");

  const client = new OpenAI({ apiKey });
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 8192,
    messages: [{ role: "user", content: prompt }],
  });

  const text = completion.choices[0]?.message?.content;
  if (!text) throw new Error("OpenAI retornou resposta vazia");

  return { text, provider: "openai" };
}

// ── Provider list — edit this to add/reorder providers ───────────────────────
type ProviderFn = (prompt: string) => Promise<AIResult>;

const PROVIDERS: Array<{ name: string; fn: ProviderFn }> = [
  { name: "claude", fn: callClaude },
  { name: "gemini", fn: callGemini },
  { name: "openai", fn: callOpenAI },
];

// ── Public interface ──────────────────────────────────────────────────────────

/**
 * Gera conteúdo usando o primeiro provedor disponível.
 * Tenta em ordem: Claude → Gemini → ...
 * Se todos falharem, lança o último erro.
 */
export async function generateContent(prompt: string): Promise<AIResult> {
  const errors: string[] = [];

  for (const provider of PROVIDERS) {
    try {
      const result = await provider.fn(prompt);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`[${provider.name}] ${msg}`);

      // Quota/rate limit errors → try next provider immediately
      // Auth/config errors → also try next (key may not be set)
    }
  }

  throw new Error(`Todos os provedores de IA falharam:\n${errors.join("\n")}`);
}

/**
 * Detecta erros de quota/rate-limit para retornar status HTTP correto.
 */
export function getAiErrorStatus(err: unknown): number {
  const e = err as { status?: number; code?: string; message?: string };
  if (e?.status === 429) return 429;
  if (e?.status === 503) return 503;
  const msg = (e?.message ?? "").toLowerCase();
  if (msg.includes("rate") || msg.includes("quota") || msg.includes("limit")) return 429;
  if (msg.includes("overloaded") || msg.includes("unavailable")) return 503;
  return 500;
}

export function getAiErrorMessage(err: unknown, fallback: string): string {
  const status = getAiErrorStatus(err);
  if (status === 429) return "Limite de requisições da IA atingido. Tente novamente em alguns segundos.";
  if (status === 503) return "A IA está com alta demanda. Tente novamente em breve.";
  return fallback;
}
