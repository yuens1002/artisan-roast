import { PrismaClient, ActivityType, OrderStatus, DeliveryMethod } from "@prisma/client";

// --- User Personas for Realistic Behavior ---
const PERSONAS = {
  ESPRESSO_LOVER: {
    preferredRoast: "dark-roast",
    searchQueries: [
      "dark espresso",
      "espresso blend",
      "bold coffee",
      "italian roast",
    ],
    productPreferences: ["espresso", "dark", "bold", "italian"],
  },
  LIGHT_ROAST_EXPLORER: {
    preferredRoast: "light-roast",
    searchQueries: [
      "fruity coffee",
      "light roast",
      "ethiopian",
      "floral coffee",
    ],
    productPreferences: ["yirgacheffe", "kenya", "ethiopia", "light"],
  },
  BALANCED_DRINKER: {
    preferredRoast: "medium-roast",
    searchQueries: [
      "medium roast",
      "breakfast blend",
      "smooth coffee",
      "colombia",
    ],
    productPreferences: ["colombia", "guatemala", "medium", "breakfast"],
  },
  ADVENTUROUS_TASTER: {
    preferredRoast: null, // Tries everything
    searchQueries: [
      "rare coffee",
      "micro lot",
      "geisha",
      "unique coffee",
      "honey process",
    ],
    productPreferences: ["geisha", "micro", "panama", "yemen", "anaerobic"],
  },
  SUBSCRIPTION_CUSTOMER: {
    preferredRoast: "medium-roast",
    searchQueries: ["subscription coffee", "monthly coffee", "coffee delivery"],
    productPreferences: ["subscription", "blend", "colombia", "organic"],
  },
};

const FAKE_NAMES = [
  "Alex Rivera", "Jordan Lee", "Morgan Patel", "Casey Kim",
  "Taylor Brooks", "Quinn Nguyen", "Avery Santos", "Riley Cooper",
  "Jamie Ortiz", "Drew Campbell", "Sam Nakamura", "Chris Delgado",
  "Hayden Park", "Reese Johansen", "Dakota Tran", "Emery Washington",
];

const STREET_NAMES = [
  "Main St", "Oak Ave", "Elm Dr", "Cedar Ln", "Pine Rd",
  "Maple Way", "Birch Ct", "Walnut Blvd", "Spruce Pl", "Willow St",
  "Highland Ave", "Lakeview Dr", "Sunset Blvd", "Park Pl", "River Rd",
];

// City/state/zip tuples so addresses are geographically consistent
const CITY_STATE_ZIP = [
  { city: "Seattle", state: "WA", zip: "98101" },
  { city: "Tacoma", state: "WA", zip: "98402" },
  { city: "Portland", state: "OR", zip: "97201" },
  { city: "Eugene", state: "OR", zip: "97401" },
  { city: "San Francisco", state: "CA", zip: "94102" },
  { city: "Los Angeles", state: "CA", zip: "90001" },
  { city: "San Diego", state: "CA", zip: "92101" },
  { city: "Austin", state: "TX", zip: "73301" },
  { city: "Denver", state: "CO", zip: "80201" },
  { city: "Chicago", state: "IL", zip: "60601" },
  { city: "Brooklyn", state: "NY", zip: "11201" },
  { city: "Boston", state: "MA", zip: "02101" },
];

// Demo user emails for idempotency guard
const DEMO_EMAILS = [
  "demo@artisanroast.com",
  "sarah.coffee@example.com",
  "mike.espresso@example.com",
  "emily.brew@example.com",
];

// --- Helper Functions ---
function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

// Weighted carrier selection: USPS 60%, FedEx 25%, UPS 10%, DHL 5%
function pickCarrier(): string {
  const roll = Math.random();
  if (roll < 0.60) return "USPS";
  if (roll < 0.85) return "FedEx";
  if (roll < 0.95) return "UPS";
  return "DHL";
}

function generateTrackingNumber(carrier: string): string {
  const digits = (n: number) =>
    Array.from({ length: n }, () => randomInt(0, 9)).join("");
  switch (carrier) {
    case "USPS":
      return `9400${digits(18)}`;
    case "FedEx":
      return `7489${digits(8)}`;
    case "UPS":
      return `1Z${digits(6)}${randomInt(10, 99)}${digits(8)}`;
    case "DHL":
      return `${digits(10)}`;
    default:
      return `TRK${digits(12)}`;
  }
}

let stripeCounter = 0;
function generateStripeIds() {
  const suffix = String(++stripeCounter).padStart(4, "0");
  const rand = Math.random().toString(36).substring(2, 10);
  return {
    stripeSessionId: `cs_seed_${suffix}_${rand}`,
    stripePaymentIntentId: `pi_seed_${suffix}_${rand}`,
    stripeChargeId: `ch_seed_${suffix}_${rand}`,
    stripeCustomerId: `cus_seed_${rand}`,
    paymentCardLast4: String(randomInt(1000, 9999)),
  };
}

const TAX_RATE = 0.08;
const SHIPPING_RATES = { min: 499, max: 1299 }; // $4.99–$12.99

function computeOrderFinancials(
  items: Array<{ priceInCents: number; quantity: number }>,
  deliveryMethod: DeliveryMethod,
  promoDiscountPercent?: number,
) {
  const subtotalInCents = items.reduce(
    (sum, item) => sum + item.priceInCents * item.quantity,
    0,
  );
  const discountAmountInCents = promoDiscountPercent
    ? Math.round(subtotalInCents * (promoDiscountPercent / 100))
    : 0;
  const taxableAmount = subtotalInCents - discountAmountInCents;
  const taxAmountInCents = Math.round(taxableAmount * TAX_RATE);
  const shippingAmountInCents =
    deliveryMethod === "PICKUP"
      ? 0
      : randomInt(SHIPPING_RATES.min, SHIPPING_RATES.max);
  const totalInCents =
    taxableAmount + taxAmountInCents + shippingAmountInCents;

  return {
    subtotalInCents,
    discountAmountInCents,
    taxAmountInCents,
    shippingAmountInCents,
    totalInCents,
  };
}

export async function seedSyntheticData(prisma: PrismaClient) {
  console.log("  🎭 Creating synthetic user behavior data...");

  // Get existing users and products
  const users = await prisma.user.findMany();
  const allProducts = await prisma.product.findMany({
    include: {
      variants: { include: { purchaseOptions: true } },
      categories: { include: { category: true } },
    },
  });

  // Filter to only products with valid variants and purchase options
  const products = allProducts.filter(
    (p) =>
      p.variants.length > 0 &&
      p.variants.some((v) => v.purchaseOptions.length > 0)
  );

  if (users.length === 0 || products.length === 0) {
    throw new Error(
      "Users and products must be seeded first. Run seedUsers and seedProducts first."
    );
  }

  // --- Idempotency: delete existing demo user orders on re-run ---
  const demoUserIds = users
    .filter((u) => u.email && DEMO_EMAILS.includes(u.email))
    .map((u) => u.id);
  if (demoUserIds.length > 0) {
    const deleted = await prisma.order.deleteMany({
      where: { userId: { in: demoUserIds } },
    });
    if (deleted.count > 0) {
      console.log(`    ↻ Cleared ${deleted.count} existing demo orders`);
    }
  }

  // --- Seed Newsletter Subscribers ---
  const newsletterSeeds = [
    { email: "coffeelover@example.com", daysAgoValue: 1, isActive: true },
    { email: "morningbrew@example.com", daysAgoValue: 2, isActive: true },
    { email: "espressofan@example.com", daysAgoValue: 3, isActive: true },
    { email: "singleoriginfan@example.com", daysAgoValue: 5, isActive: true },
    { email: "espressofanatic@example.com", daysAgoValue: 9, isActive: true },
    { email: "pouroversarah@example.com", daysAgoValue: 12, isActive: true },
    { email: "decafdan@example.com", daysAgoValue: 15, isActive: true },
    { email: "weeklybeans@example.com", daysAgoValue: 18, isActive: true },
    { email: "travelingtaster@example.com", daysAgoValue: 21, isActive: false },
    { email: "seasonalsips@example.com", daysAgoValue: 24, isActive: true },
    { email: "palatepilot@example.com", daysAgoValue: 30, isActive: false },
  ];

  for (const seed of newsletterSeeds) {
    await prisma.newsletterSubscriber.upsert({
      where: { email: seed.email },
      update: {
        isActive: seed.isActive,
        subscribedAt: daysAgo(seed.daysAgoValue),
      },
      create: {
        email: seed.email,
        isActive: seed.isActive,
        subscribedAt: daysAgo(seed.daysAgoValue),
      },
    });
  }

  console.log(`    ✓ Seeded ${newsletterSeeds.length} newsletter subscribers`);

  // --- Demo user: 9 orders covering all statuses + refunds ---
  const demoUser = users.find((u) => u.email === "demo@artisanroast.com");
  if (demoUser) {
    // Collect purchase options from the first 6 products
    const demoPOs = products
      .slice(0, 6)
      .map((p) => {
        const v = p.variants.find((v) => v.purchaseOptions.length > 0);
        if (!v) return null;
        return (
          v.purchaseOptions.find((po) => po.type === "ONE_TIME") ??
          v.purchaseOptions[0]
        );
      })
      .filter(
        (po): po is NonNullable<typeof po> => po !== null && po !== undefined,
      );

    const demoLocation = CITY_STATE_ZIP[0]; // Seattle

    const makeAddress = () => ({
      recipientName: demoUser.name || "Demo User",
      shippingStreet: `${randomInt(100, 9999)} ${randomElement(STREET_NAMES)}`,
      shippingCity: demoLocation.city,
      shippingState: demoLocation.state,
      shippingPostalCode: demoLocation.zip,
      shippingCountry: "US",
      customerEmail: demoUser.email,
    });

    // Order 1: PENDING — delivery, 1 item, no promo
    {
      const items = [{ po: demoPOs[0], quantity: 1 }];
      const fin = computeOrderFinancials(
        items.map((i) => ({ priceInCents: i.po.priceInCents, quantity: i.quantity })),
        "DELIVERY",
      );
      await prisma.order.create({
        data: {
          userId: demoUser.id,
          status: "PENDING",
          deliveryMethod: "DELIVERY",
          ...fin,
          ...makeAddress(),
          ...generateStripeIds(),
          items: {
            create: items.map((i) => ({
              purchaseOptionId: i.po.id,
              quantity: i.quantity,
              priceInCents: i.po.priceInCents,
            })),
          },
          createdAt: daysAgo(0),
        },
      });
    }

    // Order 2: SHIPPED — delivery, 2 items, USPS
    {
      const items = [
        { po: demoPOs[0], quantity: 1 },
        { po: demoPOs[1], quantity: 2 },
      ];
      const fin = computeOrderFinancials(
        items.map((i) => ({ priceInCents: i.po.priceInCents, quantity: i.quantity })),
        "DELIVERY",
      );
      const carrier = "USPS";
      await prisma.order.create({
        data: {
          userId: demoUser.id,
          status: "SHIPPED",
          deliveryMethod: "DELIVERY",
          ...fin,
          ...makeAddress(),
          ...generateStripeIds(),
          carrier,
          trackingNumber: generateTrackingNumber(carrier),
          shippedAt: daysAgo(1),
          items: {
            create: items.map((i) => ({
              purchaseOptionId: i.po.id,
              quantity: i.quantity,
              priceInCents: i.po.priceInCents,
            })),
          },
          createdAt: daysAgo(2),
        },
      });
    }

    // Order 3: OUT_FOR_DELIVERY — delivery, 2 items, FedEx
    {
      const items = [
        { po: demoPOs[2], quantity: 1 },
        { po: demoPOs[3], quantity: 1 },
      ];
      const fin = computeOrderFinancials(
        items.map((i) => ({ priceInCents: i.po.priceInCents, quantity: i.quantity })),
        "DELIVERY",
      );
      const carrier = "FedEx";
      await prisma.order.create({
        data: {
          userId: demoUser.id,
          status: "OUT_FOR_DELIVERY",
          deliveryMethod: "DELIVERY",
          ...fin,
          ...makeAddress(),
          ...generateStripeIds(),
          carrier,
          trackingNumber: generateTrackingNumber(carrier),
          shippedAt: daysAgo(2),
          items: {
            create: items.map((i) => ({
              purchaseOptionId: i.po.id,
              quantity: i.quantity,
              priceInCents: i.po.priceInCents,
            })),
          },
          createdAt: daysAgo(3),
        },
      });
    }

    // Order 4: DELIVERED — delivery, 3 items, ROAST10 (10% off), USPS
    {
      const items = [
        { po: demoPOs[0], quantity: 1 },
        { po: demoPOs[2], quantity: 1 },
        { po: demoPOs[4], quantity: 1 },
      ];
      const fin = computeOrderFinancials(
        items.map((i) => ({ priceInCents: i.po.priceInCents, quantity: i.quantity })),
        "DELIVERY",
        10,
      );
      const carrier = "USPS";
      await prisma.order.create({
        data: {
          userId: demoUser.id,
          status: "DELIVERED",
          deliveryMethod: "DELIVERY",
          ...fin,
          ...makeAddress(),
          ...generateStripeIds(),
          promoCode: "ROAST10",
          carrier,
          trackingNumber: generateTrackingNumber(carrier),
          shippedAt: daysAgo(5),
          deliveredAt: daysAgo(3),
          items: {
            create: items.map((i) => ({
              purchaseOptionId: i.po.id,
              quantity: i.quantity,
              priceInCents: i.po.priceInCents,
            })),
          },
          createdAt: daysAgo(7),
        },
      });
    }

    // Order 5: DELIVERED — partial refund (1 of 2 items refunded)
    {
      const items = [
        { po: demoPOs[1], quantity: 2 },
        { po: demoPOs[3], quantity: 1 },
      ];
      const fin = computeOrderFinancials(
        items.map((i) => ({ priceInCents: i.po.priceInCents, quantity: i.quantity })),
        "DELIVERY",
      );
      const carrier = "USPS";

      // Refund: item 0 qty 1 (of 2) — refund that item's unit price + proportional tax
      const refundItemPrice = items[0].po.priceInCents * 1;
      const refundTax = Math.round(refundItemPrice * TAX_RATE);
      const refundedAmountInCents = refundItemPrice + refundTax;

      const order = await prisma.order.create({
        data: {
          userId: demoUser.id,
          status: "DELIVERED",
          deliveryMethod: "DELIVERY",
          ...fin,
          ...makeAddress(),
          ...generateStripeIds(),
          carrier,
          trackingNumber: generateTrackingNumber(carrier),
          shippedAt: daysAgo(12),
          deliveredAt: daysAgo(10),
          refundedAmountInCents,
          refundedAt: daysAgo(8),
          refundReason: "Customer received wrong grind size",
          items: {
            create: items.map((i) => ({
              purchaseOptionId: i.po.id,
              quantity: i.quantity,
              priceInCents: i.po.priceInCents,
            })),
          },
          createdAt: daysAgo(14),
        },
        include: { items: true },
      });

      // Mark first item as partially refunded (1 of 2 qty)
      await prisma.orderItem.update({
        where: { id: order.items[0].id },
        data: { refundedQuantity: 1 },
      });
    }

    // Order 6: DELIVERED — full refund (all items)
    {
      const items = [
        { po: demoPOs[2], quantity: 1 },
        { po: demoPOs[5], quantity: 2 },
      ];
      const fin = computeOrderFinancials(
        items.map((i) => ({ priceInCents: i.po.priceInCents, quantity: i.quantity })),
        "DELIVERY",
      );
      const carrier = "FedEx";

      const order = await prisma.order.create({
        data: {
          userId: demoUser.id,
          status: "DELIVERED",
          deliveryMethod: "DELIVERY",
          ...fin,
          ...makeAddress(),
          ...generateStripeIds(),
          carrier,
          trackingNumber: generateTrackingNumber(carrier),
          shippedAt: daysAgo(18),
          deliveredAt: daysAgo(16),
          refundedAmountInCents: fin.totalInCents,
          refundedAt: daysAgo(14),
          refundReason: "Order arrived damaged — full refund issued",
          items: {
            create: items.map((i) => ({
              purchaseOptionId: i.po.id,
              quantity: i.quantity,
              priceInCents: i.po.priceInCents,
            })),
          },
          createdAt: daysAgo(20),
        },
        include: { items: true },
      });

      // Mark all items as fully refunded
      for (const item of order.items) {
        await prisma.orderItem.update({
          where: { id: item.id },
          data: { refundedQuantity: item.quantity },
        });
      }
    }

    // Order 7: PICKED_UP — pickup, 1 item
    {
      const items = [{ po: demoPOs[3], quantity: 1 }];
      const fin = computeOrderFinancials(
        items.map((i) => ({ priceInCents: i.po.priceInCents, quantity: i.quantity })),
        "PICKUP",
      );
      await prisma.order.create({
        data: {
          userId: demoUser.id,
          status: "PICKED_UP",
          deliveryMethod: "PICKUP",
          ...fin,
          ...makeAddress(),
          ...generateStripeIds(),
          items: {
            create: items.map((i) => ({
              purchaseOptionId: i.po.id,
              quantity: i.quantity,
              priceInCents: i.po.priceInCents,
            })),
          },
          createdAt: daysAgo(10),
        },
      });
    }

    // Order 8: CANCELLED — delivery, 2 items
    {
      const items = [
        { po: demoPOs[0], quantity: 1 },
        { po: demoPOs[4], quantity: 1 },
      ];
      const fin = computeOrderFinancials(
        items.map((i) => ({ priceInCents: i.po.priceInCents, quantity: i.quantity })),
        "DELIVERY",
      );
      await prisma.order.create({
        data: {
          userId: demoUser.id,
          status: "CANCELLED",
          deliveryMethod: "DELIVERY",
          ...fin,
          ...makeAddress(),
          ...generateStripeIds(),
          items: {
            create: items.map((i) => ({
              purchaseOptionId: i.po.id,
              quantity: i.quantity,
              priceInCents: i.po.priceInCents,
            })),
          },
          createdAt: daysAgo(14),
        },
      });
    }

    // Order 9: FAILED — delivery, 1 item
    {
      const items = [{ po: demoPOs[1], quantity: 1 }];
      const fin = computeOrderFinancials(
        items.map((i) => ({ priceInCents: i.po.priceInCents, quantity: i.quantity })),
        "DELIVERY",
      );
      await prisma.order.create({
        data: {
          userId: demoUser.id,
          status: "FAILED",
          deliveryMethod: "DELIVERY",
          ...fin,
          ...makeAddress(),
          ...generateStripeIds(),
          failureReason: "Card declined — insufficient funds",
          failedAt: daysAgo(20),
          items: {
            create: items.map((i) => ({
              purchaseOptionId: i.po.id,
              quantity: i.quantity,
              priceInCents: i.po.priceInCents,
            })),
          },
          createdAt: daysAgo(21),
        },
      });
    }

    console.log(
      `    ✓ Created 9 demo orders for ${demoUser.email} (incl. 2 refunds, 1 promo)`
    );
  }

  // --- Generate User Activities and Orders ---
  let totalActivities = 0;
  let totalOrders = 0;

  for (const user of users) {
    const sessionId = generateSessionId();
    const activityCount = randomInt(3, 15); // Each user generates 3-15 activities
    const daysActive = randomInt(1, 60); // Active within last 60 days

    // Generate page views and interactions
    for (let i = 0; i < activityCount; i++) {
      const activityType = randomElement([
        ActivityType.PAGE_VIEW,
        ActivityType.PRODUCT_VIEW,
        ActivityType.SEARCH,
        ActivityType.ADD_TO_CART,
      ]);

      if (activityType === ActivityType.PRODUCT_VIEW) {
        const product = randomElement(products);
        await prisma.userActivity.create({
          data: {
            sessionId,
            userId: user.id,
            activityType,
            productId: product.id,
            source: randomElement([
              "category-page",
              "search-results",
              "homepage",
            ]),
            createdAt: daysAgo(randomInt(0, daysActive)),
          },
        });
      } else if (activityType === ActivityType.SEARCH) {
        const persona = randomElement(Object.values(PERSONAS));
        await prisma.userActivity.create({
          data: {
            sessionId,
            userId: user.id,
            activityType,
            searchQuery: randomElement(persona.searchQueries),
            source: "homepage",
            createdAt: daysAgo(randomInt(0, daysActive)),
          },
        });
      } else {
        await prisma.userActivity.create({
          data: {
            sessionId,
            userId: user.id,
            activityType,
            source: randomElement([
              "homepage",
              "category-page",
              "search-results",
            ]),
            createdAt: daysAgo(randomInt(0, daysActive)),
          },
        });
      }
    }

    // Generate some orders for active users
    // Guarantee at least 1 order for the first 2 users (for demo statuses)
    const orderCount = totalOrders < 2 ? randomInt(1, 3) : randomInt(0, 3);
    for (let i = 0; i < orderCount; i++) {
      const orderProducts = [];
      const numItems = randomInt(1, 4); // 1-4 items per order

      for (let j = 0; j < numItems; j++) {
        const product = randomElement(products);
        const validVariants = product.variants.filter(
          (v) => v.purchaseOptions.length > 0
        );
        if (validVariants.length === 0) continue;
        const variant = randomElement(validVariants);
        const purchaseOption = randomElement(variant.purchaseOptions);

        orderProducts.push({
          productId: product.id,
          variantId: variant.id,
          purchaseOptionId: purchaseOption.id,
          quantity: randomInt(1, 3),
          unitPrice: purchaseOption.priceInCents,
        });
      }

      if (orderProducts.length === 0) continue;

      const deliveryMethod: DeliveryMethod = "DELIVERY";
      const fin = computeOrderFinancials(
        orderProducts.map((item) => ({
          priceInCents: item.unitPrice,
          quantity: item.quantity,
        })),
        deliveryMethod,
      );

      const location = randomElement(CITY_STATE_ZIP);

      // First order: OUT_FOR_DELIVERY, second: SHIPPED, rest: DELIVERED
      const orderStatus: OrderStatus =
        totalOrders === 0
          ? "OUT_FOR_DELIVERY"
          : totalOrders === 1
            ? "SHIPPED"
            : "DELIVERED";
      const orderCreatedAt =
        totalOrders === 0
          ? daysAgo(1)
          : totalOrders === 1
            ? daysAgo(2)
            : daysAgo(randomInt(5, 60));
      const shippedAt =
        totalOrders === 0
          ? daysAgo(1)
          : totalOrders === 1
            ? daysAgo(1)
            : daysAgo(randomInt(3, 55));

      const carrier = pickCarrier();

      await prisma.order.create({
        data: {
          userId: user.id,
          status: orderStatus,
          deliveryMethod,
          ...fin,
          ...generateStripeIds(),
          recipientName: user.name || randomElement(FAKE_NAMES),
          customerEmail: user.email,
          shippingStreet: `${randomInt(100, 9999)} ${randomElement(STREET_NAMES)}`,
          shippingCity: location.city,
          shippingState: location.state,
          shippingPostalCode: location.zip,
          shippingCountry: "US",
          carrier,
          trackingNumber: generateTrackingNumber(carrier),
          shippedAt,
          ...(orderStatus === "DELIVERED" && { deliveredAt: daysAgo(randomInt(1, 3)) }),
          items: {
            create: orderProducts.map((item) => ({
              purchaseOptionId: item.purchaseOptionId,
              quantity: item.quantity,
              priceInCents: item.unitPrice,
            })),
          },
          createdAt: orderCreatedAt,
        },
      });

      totalOrders++;

      // Create cart add activities for ordered items
      for (const item of orderProducts) {
        await prisma.userActivity.create({
          data: {
            sessionId,
            userId: user.id,
            activityType: ActivityType.ADD_TO_CART,
            productId: item.productId,
            source: "product-page",
            createdAt: daysAgo(randomInt(1, 60)),
          },
        });
        totalActivities++;
      }
    }

    totalActivities += activityCount;
  }

  console.log(`    ✓ Generated ${totalActivities} user activities`);
  console.log(`    ✓ Created ${totalOrders} random-user orders`);

  // --- Generate Anonymous Sessions ---
  const anonymousSessionCount = randomInt(20, 50);
  let anonymousActivities = 0;

  for (let i = 0; i < anonymousSessionCount; i++) {
    const sessionId = generateSessionId();
    const activityCount = randomInt(1, 5); // 1-5 activities per anonymous session

    for (let j = 0; j < activityCount; j++) {
      const activityType = randomElement([
        ActivityType.PAGE_VIEW,
        ActivityType.SEARCH,
        ActivityType.PRODUCT_VIEW,
      ]);

      if (activityType === ActivityType.PRODUCT_VIEW) {
        const product = randomElement(products);
        await prisma.userActivity.create({
          data: {
            sessionId,
            userId: null,
            activityType,
            productId: product.id,
            source: randomElement(["category-page", "search-results"]),
            createdAt: daysAgo(randomInt(0, 7)),
          },
        });
      } else if (activityType === ActivityType.SEARCH) {
        const allQueries = Object.values(PERSONAS).flatMap(
          (p) => p.searchQueries
        );
        await prisma.userActivity.create({
          data: {
            sessionId,
            userId: null,
            activityType,
            searchQuery: randomElement(allQueries),
            source: "homepage",
            createdAt: daysAgo(randomInt(0, 7)),
          },
        });
      } else {
        await prisma.userActivity.create({
          data: {
            sessionId,
            userId: null,
            activityType,
            source: randomElement(["homepage", "category-page"]),
            createdAt: daysAgo(randomInt(0, 7)),
          },
        });
      }
      anonymousActivities++;
    }
  }

  console.log(`    ✓ Generated ${anonymousActivities} anonymous activities`);
  console.log(`    ✓ Created ${anonymousSessionCount} anonymous sessions`);
}
