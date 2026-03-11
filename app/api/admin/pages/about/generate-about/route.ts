import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createHash } from "crypto";
import { readFile } from "fs/promises";
import path from "path";
import {
  GenerateAboutRequest,
  GeneratedBlock,
  GeneratedHeroBlock,
  GeneratedRichTextBlock,
  generateAboutRequestSchema,
  LengthPreference,
  Tone,
  WizardAnswers,
} from "@/lib/api-schemas/generate-about";
import {
  chatCompletion,
  isAIFeatureEnabled,
  getAIConfig,
  type ChatContentPart,
} from "@/lib/ai-client";

const FEATURE_NAME = "about-assist";

interface PromptOptions {
  tone: Tone;
  lengthPreference: LengthPreference;
  statCount: number;
}

const DEFAULT_OPTIONS: PromptOptions = {
  tone: "friendly",
  lengthPreference: "medium",
  statCount: 3,
};

const STYLE_METADATA = {
  story: {
    title: "Our Story",
    description:
      "Narrative-driven, warm, and emotionally engaging; lean on founder journey.",
  },
  values: {
    title: "Our Values",
    description:
      "Professional, trustworthy, principles-focused; open with mission and proof points.",
  },
  product: {
    title: "Our Coffee",
    description:
      "Enthusiastic, educational, coffee-focused; highlight sourcing, craft, and flavor.",
  },
};
const LENGTH_TARGETS: Record<
  LengthPreference,
  { label: string; words: string }
> = {
  short: { label: "short", words: "220-320" },
  medium: { label: "medium", words: "320-500" },
  long: { label: "long", words: "500-700" },
};

function stableSerialize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stableSerialize);
  }
  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = stableSerialize((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }
  return value;
}

function stableStringify(value: unknown): string {
  return JSON.stringify(stableSerialize(value));
}

function hashSha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeBlocks(
  blocks?: Array<{
    type?: string;
    order?: number;
    content?: Record<string, unknown>;
  }>
): Array<{
  type?: string;
  order: number | null;
  content?: Record<string, unknown>;
}> | null {
  if (!blocks || !Array.isArray(blocks)) return null;
  const mapped = blocks.map((block) => ({
    type: block?.type,
    order:
      typeof block?.order === "number" && Number.isFinite(block.order)
        ? block.order
        : null,
    content: block?.content,
  }));

  return mapped.sort((a, b) => {
    const aOrder = a.order ?? 0;
    const bOrder = b.order ?? 0;
    return aOrder - bOrder;
  });
}

function buildSystemPrompt(
  style: keyof typeof STYLE_METADATA,
  options: PromptOptions
): string {
  const { statCount, tone, lengthPreference } = options;
  const lengthTarget = LENGTH_TARGETS[lengthPreference];
  const statLabel = `${statCount} stat blocks (value: 1-3 words, label: 3-5 words; hard limit ${statCount})`;

  return `You are an expert content writer specializing in crafting compelling "About Us" pages for specialty coffee roasters.

Tone: ${tone}. Style focus: ${STYLE_METADATA[style].description}
Target length: ${lengthTarget.words} words (overall), concise paragraphs.

Generate a JSON object with structured blocks for a page editor:
{
  "metaDescription": "SEO description 140-160 characters, plain text",
  "blocks": [
    {
      "type": "hero",
      "order": 0,
      "content": {
        "title": "${STYLE_METADATA[style].title}",
        "imageUrl": "__HERO_IMAGE_URL__",
        "caption": "Brief caption about the image"
      }
    },
    { "type": "stat", "order": 1, "content": { "label": "Founded", "value": "YYYY", "emoji": "📅" } },
    { "type": "stat", "order": 2, "content": { "label": "Origin Countries", "value": "X+", "emoji": "🌍" } },
    { "type": "stat", "order": 3, "content": { "label": "Community Impact", "value": "Concise stat", "emoji": "🤝" } },
    {
      "type": "pullQuote",
      "order": 4,
      "content": {
        "text": "Impactful line from the story/mission",
        "author": "Optional author name"
      }
    },
    {
      "type": "richText",
      "order": 5,
      "content": {
        "html": "<p>Opening hook...</p><p>Next paragraph...</p>"
      }
    },
    {
      "type": "richText",
      "order": 6,
      "content": {
        "html": "<h2>Section Heading</h2><p>Content for this section...</p>"
      }
    }
  ]
}

Block Requirements:
- 1 hero block (title: 2-6 words, compelling)
- ${statLabel} and each stat MUST include an "emoji" field with a single emoji character
- 1 pullQuote block (10-18 words max, most resonant line)
-- 1 richText block containing the full story/sections (3-5 paragraphs total, paragraphs 40-70 words)
- Include metaDescription at root (140-160 characters, no HTML)

Rich Text Content:
- MUST return real HTML strings; do NOT escape or markdown. Allowed tags: <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em>, <a>.
- Use a single richText block to hold all sections; structure with <h2> section headings (2-3 sections) and optional <h3> subsections inside that one block.
- Use <p> for paragraphs (2-3 sentences each) and include line breaks via multiple <p> tags, not \n.
- Optional concise bullet lists with <ul>/<li> where helpful.
- Tailor to the chosen style (${style}) and use the provided tone consistently.

Hero Image:
- Use "__HERO_IMAGE_URL__" as placeholder (will be replaced with actual image)
- Caption should describe the image (8-14 words)

Return ONLY valid JSON, no markdown code blocks.`;
}

function buildUserPrompt(
  answers: WizardAnswers,
  lengthPreference: LengthPreference
): string {
  const lengthTarget = LENGTH_TARGETS[lengthPreference];

  return `Generate an About page for ${answers.businessName} based on these details:

**Founding Story:**
${answers.foundingStory}

**What Makes Them Unique:**
${answers.uniqueApproach}

**Coffee Sourcing:**
${answers.coffeeSourcing}

**Roasting Philosophy:**
${answers.roastingPhilosophy}

**Target Audience:**
${answers.targetAudience}

**Brand Personality:**
${answers.brandPersonality}

**Core Values:**
${answers.keyValues}

**Community Role:**
${answers.communityRole}

**Future Vision:**
${answers.futureVision}

Generate a compelling, authentic About page that reflects these unique characteristics. The content should be ${lengthTarget.words} words, well-structured with HTML headings and paragraphs, and match the brand personality described above.`;
}

function isTone(value: unknown): value is Tone {
  return (
    typeof value === "string" &&
    [
      "warm",
      "friendly",
      "professional",
      "bold",
      "approachable",
      "educational",
    ].includes(value)
  );
}

function isLengthPreference(value: unknown): value is LengthPreference {
  return (
    typeof value === "string" && ["short", "medium", "long"].includes(value)
  );
}

function resolveOptions(
  incoming: Partial<PromptOptions>,
  currentBlocks?: Array<{ type?: string }>
): PromptOptions {
  const resolved: PromptOptions = { ...DEFAULT_OPTIONS };

  if (isTone(incoming.tone)) {
    resolved.tone = incoming.tone;
  }

  if (isLengthPreference(incoming.lengthPreference)) {
    resolved.lengthPreference = incoming.lengthPreference;
  }

  if (
    typeof incoming.statCount === "number" &&
    !Number.isNaN(incoming.statCount)
  ) {
    resolved.statCount = Math.min(
      6,
      Math.max(1, Math.floor(incoming.statCount))
    );
  }

  if (currentBlocks && Array.isArray(currentBlocks)) {
    const statCount = currentBlocks.filter((b) => b?.type === "stat").length;
    if (statCount > 0) {
      resolved.statCount = Math.min(6, Math.max(1, statCount));
    }
  }

  return resolved;
}

function isLocalImageUrl(url?: string | null): url is string {
  return !!url && url.startsWith("/");
}

function getMimeTypeFromPath(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    case "jpg":
    case "jpeg":
    default:
      return "image/jpeg";
  }
}

type AltTextResult = {
  altText: string | null;
  tokens: number | null;
  latencyMs: number | null;
};

async function generateAltTextFromLocalImage(
  imageUrl: string,
  hint?: string | null
): Promise<AltTextResult> {
  try {
    const startedAt = Date.now();
    const fullPath = path.join(
      process.cwd(),
      "public",
      imageUrl.replace(/^\//, "")
    );
    const buffer = await readFile(fullPath);
    const base64 = buffer.toString("base64");
    const mimeType = getMimeTypeFromPath(imageUrl);
    const dataUrl = `data:${mimeType};base64,${base64}`;

    const content: ChatContentPart[] = [
      { type: "image_url", image_url: { url: dataUrl, detail: "low" } },
      {
        type: "text",
        text: `Write a concise, accessible alt text (max 18 words) describing this image. Avoid opinions; be specific. ${
          hint ? `Context: ${hint}` : ""
        }`,
      },
    ];

    const result = await chatCompletion({
      messages: [{ role: "user", content }],
      maxTokens: 60,
      temperature: 0.3,
    });

    const text = result.text.trim();
    return {
      altText: text.replace(/^"|"$/g, ""),
      tokens: result.usage.totalTokens,
      latencyMs: Date.now() - startedAt,
    };
  } catch (error) {
    console.error("Alt text generation failed:", error);
    return { altText: null, tokens: null, latencyMs: null };
  }
}

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { isAdmin: true },
    });

    if (!user?.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!(await isAIFeatureEnabled("aboutAssist"))) {
      return NextResponse.json(
        { error: "About page assistant is currently disabled" },
        { status: 403 }
      );
    }

    const parseResult = generateAboutRequestSchema.safeParse(
      await request.json()
    );

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const requestBody: GenerateAboutRequest = parseResult.data;

    const {
      answers,
      currentBlocks,
      tone,
      lengthPreference,
      statCount,
      heroImageUrl: requestHeroImageUrl,
      heroImageDescription: requestHeroImageDescription,
      previousHeroImageUrl: requestPreviousHeroImageUrl,
      previousAnswersFingerprint,
      previousContentFingerprint,
      forceRegenerate,
    } = requestBody;

    const promptOptions = resolveOptions(
      { tone, lengthPreference, statCount },
      currentBlocks
    );

    const systemPrompts = {
      storyFirst: buildSystemPrompt("story", promptOptions),
      valuesFirst: buildSystemPrompt("values", promptOptions),
      productFirst: buildSystemPrompt("product", promptOptions),
    };

    if (!answers || typeof answers !== "object") {
      return NextResponse.json(
        { error: "Invalid wizard answers" },
        { status: 400 }
      );
    }

    const typedAnswers = answers as WizardAnswers;
    const currentHeroBlock = currentBlocks?.find(
      (b): b is GeneratedHeroBlock => b?.type === "hero"
    );

    const currentHeroImageUrl = currentHeroBlock?.content?.imageUrl;
    const currentHeroAlt =
      currentHeroBlock?.content?.altText || currentHeroBlock?.content?.imageAlt;

    const heroImageUrlFromAnswers =
      typedAnswers.heroImageUrl ||
      requestHeroImageUrl ||
      currentHeroImageUrl ||
      null;

    const previousHeroImageUrl =
      typedAnswers.previousHeroImageUrl || requestPreviousHeroImageUrl || null;

    const providedHeroAlt =
      typedAnswers.heroImageDescription ||
      requestHeroImageDescription ||
      currentHeroAlt ||
      null;

    const answersFingerprint = hashSha256(stableStringify(typedAnswers));
    const contentFingerprint = hashSha256(
      stableStringify(normalizeBlocks(currentBlocks))
    );

    const shouldRegenerate =
      forceRegenerate === true ||
      answersFingerprint !== (previousAnswersFingerprint || null) ||
      contentFingerprint !== (previousContentFingerprint || null);

    if (!shouldRegenerate) {
      console.log("[about-assist] cache hit, skipping regeneration", {
        answersFingerprint,
        contentFingerprint,
      });

      return NextResponse.json({
        regenerated: false,
        reason: "unchanged",
        variations: [],
        answers: typedAnswers,
        tokens: null,
        fingerprints: {
          answers: answersFingerprint,
          content: contentFingerprint,
        },
      });
    }

    const resolvedHeroImageUrl =
      heroImageUrlFromAnswers || "/products/placeholder-hero.jpg";

    const urlChanged =
      !!heroImageUrlFromAnswers &&
      ((!!previousHeroImageUrl &&
        heroImageUrlFromAnswers !== previousHeroImageUrl) ||
        (!!currentHeroImageUrl &&
          heroImageUrlFromAnswers !== currentHeroImageUrl) ||
        (!previousHeroImageUrl && !currentHeroImageUrl));

    let heroAltText: string | null = null;
    let altTokens: number | null = null;
    let altLatencyMs: number | null = null;
    let altGenerated = false;

    console.log("[about-assist] hero inputs", {
      requestHeroImageUrl,
      currentHeroImageUrl,
      previousHeroImageUrl,
      heroImageUrlFromAnswers,
      providedHeroAlt,
      currentHeroAlt,
      urlChanged,
      isLocal: heroImageUrlFromAnswers
        ? isLocalImageUrl(heroImageUrlFromAnswers)
        : false,
    });

    if (providedHeroAlt && !urlChanged) {
      heroAltText = providedHeroAlt;
      console.log("[about-assist] reuse provided alt", {
        reason: "providedAltAndUrlUnchanged",
      });
    } else if (
      heroImageUrlFromAnswers &&
      isLocalImageUrl(heroImageUrlFromAnswers)
    ) {
      const altResult = await generateAltTextFromLocalImage(
        heroImageUrlFromAnswers,
        providedHeroAlt
      );
      heroAltText = altResult.altText;
      altTokens = altResult.tokens;
      altLatencyMs = altResult.latencyMs;
      altGenerated = true;
      console.log("[about-assist] generated alt", {
        heroImageUrlFromAnswers,
        altTokens,
        altLatencyMs,
      });
    } else {
      console.log("[about-assist] skipped alt generation", {
        heroImageUrlFromAnswers,
        reason: heroImageUrlFromAnswers ? "non-local-image" : "no-hero-image",
      });
    }

    let userPrompt = buildUserPrompt(
      typedAnswers,
      promptOptions.lengthPreference
    );

    if (currentBlocks && Array.isArray(currentBlocks)) {
      const blockCounts = currentBlocks.reduce(
        (acc: Record<string, number>, block: { type: string }) => {
          acc[block.type] = (acc[block.type] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      userPrompt += `\n\nIMPORTANT: Match this block structure:\n${JSON.stringify(blockCounts, null, 2)}\nGenerate exactly the same number of blocks for each type.`;
    }

    type ParsedResponse = {
      metaDescription?: string | null;
      blocks?: GeneratedBlock[];
    };

    const parseJsonResponse = (
      rawText: string,
      variationType: string
    ): ParsedResponse => {
      console.log(`\n=== ${variationType} Raw Response (first 500 chars) ===`);
      console.log(rawText.substring(0, 500));

      let jsonText = rawText.trim();
      if (jsonText.startsWith("```json")) {
        jsonText = jsonText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      } else if (jsonText.startsWith("```")) {
        jsonText = jsonText.replace(/^```\s*/, "").replace(/\s*```$/, "");
      }

      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
      }

      try {
        const parsed = JSON.parse(jsonText) as ParsedResponse;
        console.log(`${variationType} parsed successfully:`, {
          hasBlocks: Array.isArray(parsed.blocks),
          blocksCount: parsed.blocks?.length || 0,
        });
        return parsed;
      } catch (firstError) {
        console.log(
          `First parse attempt failed for ${variationType}, trying with escaped newlines...`
        );

        try {
          const fixedJson = jsonText
            .replace(/\n/g, "\\n")
            .replace(/\r/g, "\\r")
            .replace(/\t/g, "\\t");

          const parsed = JSON.parse(fixedJson) as ParsedResponse;
          console.log(`${variationType} parsed successfully after fixing:`, {
            hasBlocks: Array.isArray(parsed.blocks),
            blocksCount: parsed.blocks?.length || 0,
          });

          return parsed;
        } catch (secondError) {
          console.error(
            `Failed to parse ${variationType} JSON after fix attempt:`,
            secondError
          );
          console.log(
            "Full attempted parse text:",
            jsonText.substring(0, 1000)
          );
          throw new Error(`Invalid JSON format from AI for ${variationType}`);
        }
      }
    };

    const runVariation = async (
      label: "story" | "values" | "product",
      prompt: string,
      title: string,
      description: string
    ) => {
      const result = await chatCompletion({
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: userPrompt },
        ],
      });

      const usageTokens = result.usage.totalTokens;

      try {
        const rawText = result.text;
        const parsed = parseJsonResponse(rawText, title);
        console.log(`${title} blocks count:`, parsed.blocks?.length);

        const metaDescription =
          typeof parsed.metaDescription === "string"
            ? parsed.metaDescription
            : null;

        if (parsed.blocks && Array.isArray(parsed.blocks)) {
          const heroBlock = parsed.blocks.find(
            (b): b is GeneratedHeroBlock => b.type === "hero"
          );
          if (heroBlock?.content) {
            heroBlock.content.imageUrl = resolvedHeroImageUrl;
            if (heroAltText) {
              heroBlock.content.altText = heroAltText;
            }
          }
        }

        return {
          variation: {
            style: label,
            title,
            description,
            heroImageUrl: resolvedHeroImageUrl,
            heroAltText,
            metaDescription,
            blocks: parsed.blocks,
          },
          tokens: usageTokens ?? null,
        } as const;
      } catch (error) {
        console.error(`${title} variation failed, using fallback`, error);
        return {
          variation: {
            style: label,
            title,
            description,
            heroImageUrl: resolvedHeroImageUrl,
            heroAltText,
            metaDescription: null,
            blocks: [
              {
                type: "hero",
                order: 0,
                content: {
                  title,
                  imageUrl: resolvedHeroImageUrl,
                  altText: heroAltText || undefined,
                  caption: "(Regenerate to refresh content)",
                },
              },
              {
                type: "richText",
                order: 1,
                content: {
                  html: "<p>(AI generation encountered an error. Please regenerate.)</p>",
                },
              },
            ],
          },
          tokens: usageTokens ?? null,
        } as const;
      }
    };

    const [storyResult, valuesResult, productResult] = await Promise.all([
      runVariation(
        "story",
        systemPrompts.storyFirst,
        "Story-First Approach",
        "Narrative-driven, warm, and emotionally engaging"
      ),
      runVariation(
        "values",
        systemPrompts.valuesFirst,
        "Values-First Approach",
        "Professional, trustworthy, principles-focused"
      ),
      runVariation(
        "product",
        systemPrompts.productFirst,
        "Product-First Approach",
        "Educational, enthusiastic, coffee-focused"
      ),
    ]);

    const variations = [
      storyResult.variation,
      valuesResult.variation,
      productResult.variation,
    ];

    const tokens: Record<"story" | "values" | "product", number | null> = {
      story: storyResult.tokens,
      values: valuesResult.tokens,
      product: productResult.tokens,
    };

    // Persist token usage for future reporting; do not block main flow if logging fails
    try {
      const duration = Date.now() - startedAt;
      const mainTokens = Object.values(tokens).reduce<number>((sum, count) => {
        return sum + (typeof count === "number" ? count : 0);
      }, 0);

      let aiConfig: { model: string } = { model: "unknown" };
      try {
        aiConfig = await getAIConfig();
      } catch {
        // Config may not be available during token logging
      }

      const tokenRows = [
        {
          modelId: aiConfig.model,
          provider: "openai-compatible",
          feature: FEATURE_NAME,
          route: "/api/admin/pages/about/generate-about",
          actorType: "admin",
          status: "success",
          promptTokens: null,
          completionTokens: null,
          tokens: mainTokens,
          latencyMs: duration,
        },
        {
          modelId: aiConfig.model,
          provider: "openai-compatible",
          feature: FEATURE_NAME,
          route: "/api/admin/pages/about/generate-about",
          actorType: "admin",
          status: altGenerated ? "success" : "skipped",
          promptTokens: null,
          completionTokens: null,
          tokens: altGenerated ? (altTokens ?? 0) : 0,
          latencyMs: altGenerated ? altLatencyMs : null,
        },
      ];

      console.log("/generate-about token log rows", tokenRows);

      await prisma.aiTokenUsage.createMany({ data: tokenRows });
    } catch (tokenError) {
      console.warn("Token usage logging skipped", tokenError);
    }

    // Debug the outgoing payload to inspect richText HTML
    try {
      const debugSample = variations.map((v) => ({
        style: v.style,
        metaDescription: v.metaDescription,
        richTextBlocks: v.blocks?.filter(
          (b): b is GeneratedRichTextBlock => b.type === "richText"
        ),
      }));
      console.log(
        "/api/admin/pages/about/generate-about response sample:",
        JSON.stringify(debugSample, null, 2)
      );
    } catch (logError) {
      console.warn("Debug log failed", logError);
    }

    return NextResponse.json({
      regenerated: true,
      variations,
      answers: typedAnswers,
      tokens,
      fingerprints: {
        answers: answersFingerprint,
        content: contentFingerprint,
      },
    });
  } catch (error) {
    console.error("Error generating About page:", error);

    const errorMessage = error instanceof Error ? error.message : "";
    const isRateLimitError =
      errorMessage.includes("429") ||
      errorMessage.includes("quota") ||
      errorMessage.includes("Too Many Requests");

    return NextResponse.json(
      {
        error: isRateLimitError
          ? "The AI service is busy right now. Please wait a moment and try again."
          : "Failed to generate content. Please try again.",
      },
      { status: isRateLimitError ? 429 : 500 }
    );
  }
}
