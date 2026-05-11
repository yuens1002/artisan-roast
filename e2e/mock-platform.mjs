/**
 * Mock Platform Server for E2E Tests
 *
 * Lightweight HTTP server returning canned JSON responses for platform APIs.
 * Configurable via POST /__config to set per-route overrides.
 * Reset via POST /__reset.
 */

import { createServer } from "node:http";

// ---------------------------------------------------------------------------
// Default responses
// ---------------------------------------------------------------------------

const DEFAULT_LICENSE = {
  valid: true,
  tier: "PRIORITY_SUPPORT",
  features: ["ga", "ai-product-ops", "priority-support"],
  trialEndsAt: null,
  managedBy: null,
  compatibility: "full",
  warnings: [],
  usage: null,
  gaConfig: {
    connected: false,
    measurementId: null,
    propertyName: null,
    lastSynced: null,
  },
  availableActions: [],
  plan: { slug: "pro", name: "Pro", snapshotAt: new Date().toISOString() },
  lapsed: null,
  support: {
    pools: [
      {
        slug: "tickets",
        label: "Priority Tickets",
        icon: "ticket",
        limit: 5,
        purchased: 0,
        used: 0,
        remaining: 5,
      },
    ],
  },
  alaCarte: [],
  legal: null,
};

const FREE_LICENSE = {
  valid: false,
  tier: "FREE",
  features: [],
  trialEndsAt: null,
  managedBy: null,
  compatibility: "full",
  warnings: [],
  usage: null,
  gaConfig: {
    connected: false,
    measurementId: null,
    propertyName: null,
    lastSynced: null,
  },
  availableActions: [],
  plan: null,
  lapsed: null,
  support: { pools: [] },
  alaCarte: [],
  legal: null,
};

const DEFAULT_PLANS = [
  {
    slug: "pro",
    name: "Pro",
    description: "Professional features for growing stores",
    price: 2900,
    interval: "month",
    features: ["ga", "ai-product-ops", "priority-support"],
    details: {
      benefits: [
        "Google Analytics integration",
        "AI-powered product operations",
        "Priority support with SLA",
      ],
      sla: "24h response time",
      quotas: { ticketsPerCycle: 5 },
      scope: "All Pro features",
      excludes: "Hosted infrastructure",
      terms: "Billed monthly. Cancel anytime.",
    },
  },
];

// HydratedPlan-shaped payload for GET /api/plans/resolved.
// Default state assumes the caller is on FREE — the Pro plan renders in NONE
// state with a Subscribe action. The action omits `url` and `endpoint` so the
// client falls through to the startCheckout server action → POST /api/checkout
// → returns the Stripe URL from DEFAULT_CHECKOUT, which the test asserts on.
const DEFAULT_HYDRATED_PLANS = [
  {
    slug: "pro",
    name: "Pro",
    description: "Professional features for growing stores",
    price: 2900,
    currency: "USD",
    interval: "month",
    features: ["ga", "ai-product-ops", "priority-support"],
    details: {
      benefits: {
        activeItems: [
          "Google Analytics integration",
          "AI-powered product operations",
          "Priority support with SLA",
        ],
      },
    },
    visibility: "self-hosted",
    state: {
      status: "NONE",
      actions: [
        { slug: "subscribe", label: "Subscribe", variant: "primary" },
      ],
    },
  },
];

const DEFAULT_ISSUE = {
  issueNumber: 42,
  issueUrl: "https://github.com/artisan-roast/community/issues/42",
};

const DEFAULT_TICKET = {
  id: "tkt_001",
  title: "Test ticket",
  status: "OPEN",
  createdAt: new Date().toISOString(),
};

const DEFAULT_CHECKOUT = {
  url: "https://checkout.stripe.com/c/pay/test_session_id",
};

// ---------------------------------------------------------------------------
// State (resettable per test)
// ---------------------------------------------------------------------------

let overrides = {};
let ticketCount = 0;
let tickets = [];

function reset() {
  overrides = {};
  ticketCount = 0;
  tickets = [];
}

function getResponse(key, defaultVal) {
  if (overrides[key]?.error) {
    return { status: overrides[key].status || 500, body: { error: overrides[key].error } };
  }
  if (overrides[key]?.body) {
    return { status: overrides[key].status || 200, body: overrides[key].body };
  }
  return { status: 200, body: defaultVal };
}

// ---------------------------------------------------------------------------
// Request handler
// ---------------------------------------------------------------------------

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString()));
      } catch {
        resolve({});
      }
    });
  });
}

async function handler(req, res) {
  const url = new URL(req.url, "http://localhost:9999");
  const path = url.pathname;
  const method = req.method;

  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // Config endpoints
  if (path === "/__reset" && method === "POST") {
    reset();
    res.writeHead(200);
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (path === "/__config" && method === "POST") {
    const body = await readBody(req);
    Object.assign(overrides, body);
    res.writeHead(200);
    res.end(JSON.stringify({ ok: true, overrides }));
    return;
  }

  // Platform API routes
  if (path === "/api/license/validate" && method === "POST") {
    const body = await readBody(req);
    // If no key provided, return FREE
    if (!body.key) {
      const resp = getResponse("license", FREE_LICENSE);
      res.writeHead(resp.status);
      res.end(JSON.stringify(resp.body));
      return;
    }
    const resp = getResponse("license", DEFAULT_LICENSE);
    res.writeHead(resp.status);
    res.end(JSON.stringify(resp.body));
    return;
  }

  if (path === "/api/plans" && method === "GET") {
    const resp = getResponse("plans", { plans: DEFAULT_PLANS });
    res.writeHead(resp.status);
    res.end(JSON.stringify(resp.body));
    return;
  }

  if (path === "/api/plans/resolved" && method === "GET") {
    const resp = getResponse("plansResolved", { plans: DEFAULT_HYDRATED_PLANS });
    res.writeHead(resp.status);
    res.end(JSON.stringify(resp.body));
    return;
  }

  if (path === "/api/checkout" && method === "POST") {
    const resp = getResponse("checkout", DEFAULT_CHECKOUT);
    res.writeHead(resp.status);
    res.end(JSON.stringify(resp.body));
    return;
  }

  if (path === "/api/support/issues" && method === "POST") {
    const resp = getResponse("issues", DEFAULT_ISSUE);
    res.writeHead(resp.status);
    res.end(JSON.stringify(resp.body));
    return;
  }

  if (path === "/api/support/tickets" && method === "POST") {
    const body = await readBody(req);
    ticketCount++;
    const ticket = {
      ...DEFAULT_TICKET,
      id: `tkt_${String(ticketCount).padStart(3, "0")}`,
      title: body.title || "Untitled",
      createdAt: new Date().toISOString(),
    };
    tickets.unshift(ticket);

    const priorityUsed = body.type === "priority" ? ticketCount : ticketCount - 1;
    const resp = getResponse("createTicket", { ticket, creditsRemaining: Math.max(0, 5 - priorityUsed) });
    res.writeHead(resp.status);
    res.end(JSON.stringify(resp.body));
    return;
  }

  if (path === "/api/support/tickets" && method === "GET") {
    const resp = getResponse("tickets", {
      tickets,
      usage: { used: ticketCount, limit: 5 },
    });
    res.writeHead(resp.status);
    res.end(JSON.stringify(resp.body));
    return;
  }

  if (path === "/api/features" && method === "GET") {
    const resp = getResponse("features", {
      features: [
        { slug: "ga", name: "Google Analytics", description: "GA tracking", category: "analytics", minAppVersion: "0.95.0" },
        { slug: "ai-product-ops", name: "AI Product Ops", description: "AI product operations", category: "ai", minAppVersion: "0.95.0" },
        { slug: "priority-support", name: "Priority Support", description: "Priority tickets", category: "support", minAppVersion: "0.95.0" },
      ],
    });
    res.writeHead(resp.status);
    res.end(JSON.stringify(resp.body));
    return;
  }

  // 404 for unknown routes
  res.writeHead(404);
  res.end(JSON.stringify({ error: `Unknown route: ${method} ${path}` }));
}

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------

const server = createServer(handler);
const PORT = process.env.MOCK_PLATFORM_PORT || 9999;

// Listen on :: (dual-stack) so both IPv4 (127.0.0.1) and IPv6 (::1) connections
// are accepted — on Windows, Node 18+ resolves localhost to ::1 by default.
server.listen(PORT, "::", () => {
  console.log(`Mock platform server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on("SIGTERM", () => server.close());
process.on("SIGINT", () => server.close());
