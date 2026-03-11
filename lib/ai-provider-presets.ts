/**
 * AI Provider Presets
 *
 * Client-safe constants for AI provider configuration.
 * Extracted from ai-client.ts to avoid pulling server-only dependencies
 * (prisma, pg) into client bundles.
 */

export const AI_PROVIDER_PRESETS: Record<
  string,
  { label: string; baseUrl: string; modelHint: string }
> = {
  openai: {
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    modelHint: "gpt-4o-mini",
  },
  gemini: {
    label: "Google Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    modelHint: "gemini-2.5-flash",
  },
  groq: {
    label: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    modelHint: "llama-3.3-70b-versatile",
  },
  ollama: {
    label: "Ollama (Local)",
    baseUrl: "http://localhost:11434/v1",
    modelHint: "llama3.2",
  },
};
