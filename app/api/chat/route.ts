import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { VOICE_BARISTA_SYSTEM_PROMPT } from "@/lib/voice-barista-system-prompt";
import { chatCompletion, isAIFeatureEnabled, AIError } from "@/lib/ai-client";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { message, conversationHistory } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Get user context (full order history for better personalization)
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        orders: {
          orderBy: { createdAt: "desc" },
          include: {
            items: {
              include: {
                purchaseOption: {
                  include: {
                    variant: {
                      include: {
                        product: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        addresses: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get all products for context
    const products = await prisma.product.findMany({
      where: { isDisabled: false },
      include: {
        variants: {
          include: {
            purchaseOptions: true,
          },
        },
        categories: {
          include: {
            category: true,
          },
        },
      },
    });

    // Build context for AI
    const userContext = {
      name: user.name,
      email: user.email,
      orderHistory: user.orders.map((order) => ({
        id: order.id,
        date: order.createdAt,
        items: order.items.map((item) => ({
          product: item.purchaseOption?.variant?.product?.name || "Unknown",
          size: item.purchaseOption?.variant?.name || "Unknown",
          quantity: item.quantity,
        })),
      })),
      favoriteProducts: getFavoriteProducts(user.orders),
    };

    const productsContext = products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      roastLevel: p.roastLevel || "Unknown",
      origin: p.origin,
      tastingNotes: p.tastingNotes,
      variants: p.variants.map((v) => ({
        id: v.id,
        name: v.name,
        weight: v.weight,
        purchaseOptions: v.purchaseOptions.map((po) => ({
          id: po.id,
          type: po.type,
          price: po.priceInCents / 100,
        })),
      })),
    }));

    // Build conversation prompt
    const conversationContext = conversationHistory
      ? conversationHistory
          .map(
            (msg: { role: string; text: string }) =>
              `${msg.role === "user" ? "Customer" : "Barista"}: ${msg.text}`
          )
          .join("\n")
      : "";

    const prompt = `${VOICE_BARISTA_SYSTEM_PROMPT}

## Current User Context
${JSON.stringify(userContext, null, 2)}

## Available Products
${JSON.stringify(productsContext, null, 2)}

## Conversation So Far
${conversationContext}

Customer: ${message}
Barista:`;

    // Check if chat feature is enabled
    if (!(await isAIFeatureEnabled("chat"))) {
      return NextResponse.json(
        { error: "AI chat is currently disabled" },
        { status: 403 }
      );
    }

    // Call AI via OpenAI-compatible API
    let text: string;
    try {
      const result = await chatCompletion({
        messages: [
          { role: "system", content: prompt.split("Customer: " + message)[0] },
          { role: "user", content: message },
        ],
        maxTokens: 1000,
        temperature: 0.7,
      });
      text = result.text;
    } catch (error) {
      if (error instanceof AIError) {
        if (error.code === "rate_limit") {
          return NextResponse.json({
            message:
              "I'm experiencing high demand right now. Please try again in a moment! ☕",
            error: "rate_limit",
          });
        }
        if (error.code === "service_unavailable") {
          return NextResponse.json({
            message:
              "I'm taking a quick coffee break! Please try again in a few seconds. ☕",
            error: "service_unavailable",
          });
        }
      }
      throw error;
    }

    return NextResponse.json({
      message: text.trim(),
      userContext: {
        hasOrders: user.orders.length > 0,
        favoriteProducts: getFavoriteProducts(user.orders),
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Failed to process message" },
      { status: 500 }
    );
  }
}

// Helper function to get favorite products
function getFavoriteProducts(
  orders: Array<{
    items: Array<{
      purchaseOption: {
        variant: {
          product: { id: string; name: string };
        };
      } | null;
    }>;
  }>
) {
  const productCounts = new Map<string, { name: string; count: number }>();

  orders.forEach((order) => {
    order.items.forEach((item) => {
      const product = item.purchaseOption?.variant?.product;
      if (!product) return;

      const existing = productCounts.get(product.id);
      if (existing) {
        existing.count++;
      } else {
        productCounts.set(product.id, {
          name: product.name,
          count: 1,
        });
      }
    });
  });

  return Array.from(productCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map((p) => p.name);
}
