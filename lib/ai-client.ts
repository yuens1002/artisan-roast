/**
 * LLM-Agnostic AI Client
 *
 * Universal client that speaks the OpenAI-compatible `/v1/chat/completions` format.
 * Works with any provider: OpenAI, Gemini, Anthropic, Groq, Together, Mistral,
 * Ollama, LM Studio, and others.
 *
 * Configuration priority: DB settings (SiteSettings) > env vars > defaults.
 */

import { prisma } from "./prisma";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | ChatContentPart[];
}

export type ChatContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string; detail?: "auto" | "low" | "high" } };

export interface ChatCompletionOptions {
  messages: ChatMessage[];
  /** Override model for this call (e.g. vision model) */
  model?: string;
  maxTokens?: number;
  temperature?: number;
  /** Override base URL for this call */
  baseUrl?: string;
  /** Override API key for this call */
  apiKey?: string;
}

export interface ChatCompletionResult {
  text: string;
  finishReason: string | null;
  usage: {
    promptTokens: number | null;
    completionTokens: number | null;
    totalTokens: number | null;
  };
}

// ---------------------------------------------------------------------------
// Provider presets (re-exported from client-safe module)
// ---------------------------------------------------------------------------

export { AI_PROVIDER_PRESETS } from "./ai-provider-presets";

// ---------------------------------------------------------------------------
// Settings keys (must match app-settings.ts)
// ---------------------------------------------------------------------------

const AI_SETTINGS_KEYS = {
  BASE_URL: "ai.baseUrl",
  API_KEY: "ai.apiKey",
  MODEL: "ai.model",
  CHAT_ENABLED: "ai.chatEnabled",
  RECOMMEND_ENABLED: "ai.recommendEnabled",
  ABOUT_ASSIST_ENABLED: "ai.aboutAssistEnabled",
} as const;

// ---------------------------------------------------------------------------
// Configuration resolution
// ---------------------------------------------------------------------------

interface AIConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

/**
 * Resolve AI configuration from DB settings, then env vars.
 * Throws if no base URL or API key is configured.
 */
export async function getAIConfig(): Promise<AIConfig> {
  const settings = await prisma.siteSettings.findMany({
    where: {
      key: {
        in: [AI_SETTINGS_KEYS.BASE_URL, AI_SETTINGS_KEYS.API_KEY, AI_SETTINGS_KEYS.MODEL],
      },
    },
  });

  const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));

  const baseUrl =
    map[AI_SETTINGS_KEYS.BASE_URL] || process.env.AI_BASE_URL || "";
  const apiKey =
    map[AI_SETTINGS_KEYS.API_KEY] || process.env.AI_API_KEY || "";
  const model =
    map[AI_SETTINGS_KEYS.MODEL] || process.env.AI_MODEL || "gpt-4o-mini";

  if (!baseUrl) {
    throw new Error(
      "AI is not configured. Set a Base URL in Settings > AI or via AI_BASE_URL env var."
    );
  }

  // API key is optional for local providers like Ollama
  return { baseUrl, apiKey, model };
}

/**
 * Check whether a specific AI feature is enabled.
 * Returns true if the setting is missing (enabled by default).
 */
export async function isAIFeatureEnabled(
  feature: "chat" | "recommend" | "aboutAssist"
): Promise<boolean> {
  const keyMap = {
    chat: AI_SETTINGS_KEYS.CHAT_ENABLED,
    recommend: AI_SETTINGS_KEYS.RECOMMEND_ENABLED,
    aboutAssist: AI_SETTINGS_KEYS.ABOUT_ASSIST_ENABLED,
  };

  const setting = await prisma.siteSettings.findUnique({
    where: { key: keyMap[feature] },
  });

  // Default to true if not explicitly set
  if (!setting) return true;
  return setting.value === "true";
}

// ---------------------------------------------------------------------------
// Chat Completion
// ---------------------------------------------------------------------------

/**
 * Send a chat completion request to any OpenAI-compatible provider.
 *
 * @example
 * ```ts
 * const result = await chatCompletion({
 *   messages: [
 *     { role: "system", content: "You are a barista." },
 *     { role: "user", content: "Recommend a coffee." },
 *   ],
 *   maxTokens: 500,
 *   temperature: 0.7,
 * });
 * console.log(result.text);
 * ```
 */
export async function chatCompletion(
  options: ChatCompletionOptions
): Promise<ChatCompletionResult> {
  const config = await getAIConfig();

  const baseUrl = (options.baseUrl || config.baseUrl).replace(/\/+$/, "");
  const apiKey = options.apiKey || config.apiKey;
  const model = options.model || config.model;

  const url = `${baseUrl}/chat/completions`;

  const body: Record<string, unknown> = {
    model,
    messages: options.messages,
  };

  if (options.maxTokens !== undefined) {
    body.max_tokens = options.maxTokens;
  }
  if (options.temperature !== undefined) {
    body.temperature = options.temperature;
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`AI API error [${response.status}]:`, errorText);

    if (response.status === 429) {
      throw new AIError(
        "AI service rate limited. Please try again in a moment.",
        "rate_limit",
        429
      );
    }

    if (response.status === 503) {
      throw new AIError(
        "AI service temporarily unavailable. Please try again.",
        "service_unavailable",
        503
      );
    }

    throw new AIError(
      `AI API error: ${response.status} ${response.statusText}`,
      "api_error",
      response.status
    );
  }

  const data = await response.json();
  const choice = data.choices?.[0];

  if (!choice?.message?.content) {
    console.error("No content in AI response:", data);
    throw new AIError(
      "AI returned an empty response. Please try again.",
      "empty_response"
    );
  }

  return {
    text: choice.message.content,
    finishReason: choice.finish_reason ?? null,
    usage: {
      promptTokens: data.usage?.prompt_tokens ?? null,
      completionTokens: data.usage?.completion_tokens ?? null,
      totalTokens: data.usage?.total_tokens ?? null,
    },
  };
}

// ---------------------------------------------------------------------------
// Test Connection
// ---------------------------------------------------------------------------

/**
 * Test connectivity to an AI provider. Used by the Settings > AI page.
 * Returns the model name on success, throws on failure.
 */
export async function testAIConnection(
  baseUrl: string,
  apiKey: string,
  model: string
): Promise<{ model: string; responseTime: number }> {
  const start = Date.now();

  const result = await chatCompletion({
    baseUrl,
    apiKey,
    model,
    messages: [{ role: "user", content: "Say 'OK' and nothing else." }],
    maxTokens: 5,
    temperature: 0,
  });

  return {
    model: result.text ? model : model,
    responseTime: Date.now() - start,
  };
}

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

export class AIError extends Error {
  code: string;
  statusCode?: number;

  constructor(message: string, code: string, statusCode?: number) {
    super(message);
    this.name = "AIError";
    this.code = code;
    this.statusCode = statusCode;
  }
}
