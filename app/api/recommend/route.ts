import { NextResponse } from "next/server";
import { ProductType } from "@prisma/client";
import {
  getProductsForAI,
  getUserRecommendationContext,
  getFeaturedProducts,
} from "@/lib/data";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { chatCompletion, isAIFeatureEnabled } from "@/lib/ai-client";

// Define the expected structure of the *incoming* request body
interface RecommendRequest {
  taste: string;
  brewMethod: string;
  userId?: string; // Optional: explicit userId override
}

/**
 * API route to get an AI coffee recommendation.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RecommendRequest;
    const { taste, brewMethod } = body;

    // --- 1. Input Validation ---
    if (!taste || !brewMethod) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    // --- 2. Check for authenticated user ---
    const session = await auth();
    const userId = body.userId || session?.user?.id;

    // --- 3. Fetch user behavioral context (if authenticated) ---
    let userContext = null;
    let isPersonalized = false;
    if (userId) {
      try {
        userContext = await getUserRecommendationContext(userId);
        isPersonalized = true;
      } catch (error) {
        console.warn(
          "Failed to fetch user context, falling back to generic:",
          error
        );
        // Continue with generic recommendation
      }
    }

    // --- 4. Fetch Products from Database ---
    const products = await getProductsForAI();
    if (!products || products.length === 0) {
      throw new Error("No products found in database.");
    }

    // Check if recommend feature is enabled
    if (!(await isAIFeatureEnabled("recommend"))) {
      return new NextResponse(
        JSON.stringify({ message: "AI recommendations are currently disabled" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // --- 5. Create the Product List for the Prompt ---
    const productList = products
      .map((p) => `- ${p.name}: (Tasting notes: ${p.tastingNotes.join(", ")})`)
      .join("\n");

    // --- 6. Build Personalized Context (if available) ---
    let personalizedContext = "";
    if (userContext && isPersonalized) {
      const purchasedNames = userContext.purchaseHistory.products
        .slice(0, 5)
        .map((p: { name: string }) => p.name);
      const viewedNames = userContext.recentViews
        .slice(0, 5)
        .map((v: { name: string }) => v.name);
      const topSearches = userContext.searchHistory
        .slice(0, 3)
        .map((s: { query: string }) => s.query);

      personalizedContext = `\n\n--- CUSTOMER PURCHASE & BEHAVIOR HISTORY ---
This customer has demonstrated clear preferences based on their history:

Previously Purchased (${userContext.purchaseHistory.totalOrders} orders):
${purchasedNames.length > 0 ? purchasedNames.map((n: string) => `  - ${n}`).join("\n") : "  (No previous orders)"}

${
  userContext.purchaseHistory.preferredRoastLevel
    ? `Preferred Roast Level: ${userContext.purchaseHistory.preferredRoastLevel}\n`
    : ""
}${
        userContext.purchaseHistory.topTastingNotes.length > 0
          ? `Frequently Enjoyed Tasting Notes: ${userContext.purchaseHistory.topTastingNotes.join(", ")}\n`
          : ""
      }
Recently Viewed Products:
${viewedNames.length > 0 ? viewedNames.map((n: string) => `  - ${n}`).join("\n") : "  (No recent views)"}

Recent Search Queries:
${topSearches.length > 0 ? topSearches.map((q: string) => `  - "${q}"`).join("\n") : "  (No recent searches)"}

**IMPORTANT**: Use this history to provide a PERSONALIZED recommendation. Prioritize coffees similar to what they've enjoyed before, but also consider introducing them to complementary profiles they might love based on their stated preferences below.`;
    }

    // Fetch store name
    const storeNameSetting = await prisma.siteSettings.findUnique({
      where: { key: "store_name" },
    });
    const storeName = storeNameSetting?.value || "Artisan Roast";

    // --- 7. Engineer the AI Prompt ---
    const systemPrompt = `
      You are an expert coffee sommelier for "${storeName}," a specialty coffee roaster.
      A customer needs a recommendation.
      Your task is to recommend ONE coffee from the provided list that best matches the customer's preferences.
      You must ONLY recommend a coffee from the list.
      
      Your response should be friendly, concise (2-3 sentences), and justify your choice
      by connecting the coffee's tasting notes to the customer's preferences${isPersonalized ? " and purchase history" : ""}.
      Start by naming the coffee you recommend.

      Here is the list of available coffees:
      ${productList}${personalizedContext}
    `;

    const userQuery = `I typically enjoy coffee with ${taste} notes and I brew using a ${brewMethod}. Which coffee should I try?`;

    // --- 5. Call AI via OpenAI-compatible API ---
    const result = await chatCompletion({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userQuery },
      ],
      maxTokens: 500,
      temperature: 0.7,
    });

    const text = result.text;

    if (!text || result.finishReason === "length") {
      if (result.finishReason === "length") {
        return NextResponse.json({
          text: `I'd recommend exploring our selection based on your preferences! Our ${taste.toLowerCase()} coffees are perfect for ${brewMethod.toLowerCase()}. Browse our full catalog to find your perfect match.`,
          isPersonalized,
          userContext: isPersonalized
            ? {
                totalOrders: userContext?.purchaseHistory.totalOrders,
                preferredRoastLevel:
                  userContext?.purchaseHistory.preferredRoastLevel,
              }
            : null,
        });
      }
      throw new Error("No text in AI response");
    }

    // --- 7. Extract recommended product slug from the response ---
    let productSlug = null;
    let productData = null;

    // Try to find a product name in the recommendation text
    for (const product of products) {
      if (text.toLowerCase().includes(product.name.toLowerCase())) {
        productSlug = product.slug;
        break;
      }
    }

    // --- 8. Fetch full product data if found, otherwise use first featured ---
    if (productSlug) {
      productData = await prisma.product.findUnique({
        where: { slug: productSlug },
        include: {
          variants: {
            orderBy: { order: "asc" },
            include: {
              images: {
                orderBy: { order: "asc" },
                take: 1,
              },
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
    }

    // Fallback: If no product matched, use first featured product
    if (!productData) {
      const featuredProducts = await getFeaturedProducts(ProductType.COFFEE);
      if (featuredProducts.length > 0) {
        const fallbackProduct = featuredProducts[0];
        productSlug = fallbackProduct.slug;
        productData = await prisma.product.findUnique({
          where: { slug: productSlug },
          include: {
            variants: {
              orderBy: { order: "asc" },
              include: {
                images: {
                  orderBy: { order: "asc" },
                  take: 1,
                },
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
      }
    }

    // --- 9. Return the AI's response with product data ---

    // Inject roastLevel into productData if available
    let enhancedProductData = null;
    if (productData) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const categories = (productData as any).categories || [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const roastCategory = categories.find((c: any) =>
        c.category.slug.endsWith("-roast")
      );
      const roastLevel = roastCategory
        ? roastCategory.category.name.replace(" Roast", "")
        : "Medium";

      enhancedProductData = {
        ...productData,
        roastLevel,
      };
    }

    return NextResponse.json({
      text,
      productSlug,
      productData: enhancedProductData,
      isPersonalized,
      userContext: isPersonalized
        ? {
            totalOrders: userContext?.purchaseHistory.totalOrders,
            preferredRoastLevel:
              userContext?.purchaseHistory.preferredRoastLevel,
          }
        : null,
    });
  } catch (error) {
    console.error("AI Recommendation Error:", error);
    // Provide a generic error message to the client
    return new NextResponse(
      JSON.stringify({ message: "Internal Server Error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
