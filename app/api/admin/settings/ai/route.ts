import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin";
import {
  getAISettings,
  setAISettings,
} from "@/lib/config/app-settings";
import { testAIConnection, AIError } from "@/lib/ai-client";

/** Mask API key for display — show only last 4 chars */
function maskApiKey(key: string): string {
  if (!key || key.length <= 4) return key ? "••••" : "";
  return "••••••••" + key.slice(-4);
}

export async function GET() {
  try {
    const auth = await requireAdminApi();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }
    const settings = await getAISettings();
    return NextResponse.json({
      ...settings,
      apiKey: maskApiKey(settings.apiKey),
      hasApiKey: settings.apiKey.length > 0,
    });
  } catch (error) {
    console.error("Error fetching AI settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch AI settings" },
      { status: 500 }
    );
  }
}

const aiSettingsSchema = z.object({
  baseUrl: z.string().url().optional().or(z.literal("")),
  apiKey: z.string().optional(),
  model: z.string().optional(),
  chatEnabled: z.boolean().optional(),
  recommendEnabled: z.boolean().optional(),
  aboutAssistEnabled: z.boolean().optional(),
});

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAdminApi();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }
    const body = await request.json();
    const parsed = aiSettingsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updates = { ...parsed.data };

    // Don't overwrite key with masked value
    if (updates.apiKey?.startsWith("••")) {
      delete updates.apiKey;
    }

    await setAISettings(updates);

    const settings = await getAISettings();
    return NextResponse.json({
      success: true,
      ...settings,
      apiKey: maskApiKey(settings.apiKey),
      hasApiKey: settings.apiKey.length > 0,
    });
  } catch (error) {
    console.error("Error updating AI settings:", error);
    return NextResponse.json(
      { error: "Failed to update AI settings" },
      { status: 500 }
    );
  }
}

/**
 * POST — Test AI connection with provided credentials.
 * Does not persist settings; just validates connectivity.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminApi();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }
    const body = await request.json();

    const schema = z.object({
      baseUrl: z.string().url(),
      apiKey: z.string(),
      model: z.string().min(1),
    });

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Provide base URL, API key, and model to test." },
        { status: 400 }
      );
    }

    // If the key is masked, use the stored key
    let { apiKey } = parsed.data;
    if (apiKey.startsWith("••")) {
      const current = await getAISettings();
      apiKey = current.apiKey;
    }

    const result = await testAIConnection(
      parsed.data.baseUrl,
      apiKey,
      parsed.data.model
    );

    return NextResponse.json({
      success: true,
      model: result.model,
      responseTime: result.responseTime,
    });
  } catch (error) {
    if (error instanceof AIError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode || 500 }
      );
    }
    const message =
      error instanceof Error ? error.message : "Connection test failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
