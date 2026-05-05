import { getStripe, resetStripeClient, getStripeWebhookSecret, isStripeConfigured } from "../stripe";

const MOCK_STRIPE_INSTANCE = { mock: "stripe" };

jest.mock("stripe", () => {
  return jest.fn().mockImplementation(() => MOCK_STRIPE_INSTANCE);
});

jest.mock("@/lib/payments/credentials", () => ({
  loadStripeCredentials: jest.fn(),
}));

import { loadStripeCredentials } from "@/lib/payments/credentials";

const mockLoadCreds = loadStripeCredentials as jest.MockedFunction<
  typeof loadStripeCredentials
>;

function withEnv(
  vars: Record<string, string | undefined>,
  fn: () => Promise<void>
) {
  const originals: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(vars)) {
    originals[key] = process.env[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  return fn().finally(() => {
    for (const [key, value] of Object.entries(originals)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  resetStripeClient();
});

describe("getStripe()", () => {
  it("returns Stripe client built from env when STRIPE_SECRET_KEY is set", async () => {
    await withEnv({ STRIPE_SECRET_KEY: "sk_test_env" }, async () => {
      mockLoadCreds.mockResolvedValue(null);
      const client = await getStripe();
      expect(client).toBe(MOCK_STRIPE_INSTANCE);
      expect(mockLoadCreds).not.toHaveBeenCalled();
    });
  });

  it("returns Stripe client built from DB when env is unset but DB has credentials", async () => {
    await withEnv({ STRIPE_SECRET_KEY: undefined }, async () => {
      mockLoadCreds.mockResolvedValue({
        secretKey: "sk_test_db",
        publishableKey: null,
        webhookSecret: null,
        accountId: null,
        accountName: null,
        isTestMode: true,
        lastValidatedAt: null,
      });
      const client = await getStripe();
      expect(client).toBe(MOCK_STRIPE_INSTANCE);
      expect(mockLoadCreds).toHaveBeenCalled();
    });
  });

  it("returns null when both env and DB are unset", async () => {
    await withEnv({ STRIPE_SECRET_KEY: undefined }, async () => {
      mockLoadCreds.mockResolvedValue(null);
      const client = await getStripe();
      expect(client).toBeNull();
    });
  });

  it("env wins when both env and DB are set (DB not queried)", async () => {
    await withEnv({ STRIPE_SECRET_KEY: "sk_test_env" }, async () => {
      mockLoadCreds.mockResolvedValue({
        secretKey: "sk_test_db",
        publishableKey: null,
        webhookSecret: null,
        accountId: null,
        accountName: null,
        isTestMode: true,
        lastValidatedAt: null,
      });
      const client = await getStripe();
      expect(client).toBe(MOCK_STRIPE_INSTANCE);
      expect(mockLoadCreds).not.toHaveBeenCalled();
    });
  });

  it("returns cached singleton on second call", async () => {
    await withEnv({ STRIPE_SECRET_KEY: "sk_test_env" }, async () => {
      mockLoadCreds.mockResolvedValue(null);
      const first = await getStripe();
      const second = await getStripe();
      expect(first).toBe(second);
      const Stripe = jest.requireMock("stripe");
      expect(Stripe).toHaveBeenCalledTimes(1);
    });
  });

  it("re-creates client after resetStripeClient()", async () => {
    await withEnv({ STRIPE_SECRET_KEY: "sk_test_env" }, async () => {
      mockLoadCreds.mockResolvedValue(null);
      await getStripe();
      resetStripeClient();
      await getStripe();
      const Stripe = jest.requireMock("stripe");
      expect(Stripe).toHaveBeenCalledTimes(2);
    });
  });
});

describe("getStripeWebhookSecret()", () => {
  it("returns env secret when set", async () => {
    await withEnv({ STRIPE_WEBHOOK_SECRET: "whsec_env" }, async () => {
      mockLoadCreds.mockResolvedValue(null);
      const secret = await getStripeWebhookSecret();
      expect(secret).toBe("whsec_env");
      expect(mockLoadCreds).not.toHaveBeenCalled();
    });
  });

  it("falls back to DB when both env keys are unset", async () => {
    await withEnv({ STRIPE_SECRET_KEY: undefined, STRIPE_WEBHOOK_SECRET: undefined }, async () => {
      mockLoadCreds.mockResolvedValue({
        secretKey: "sk_test_db",
        publishableKey: null,
        webhookSecret: "whsec_db",
        accountId: null,
        accountName: null,
        isTestMode: true,
        lastValidatedAt: null,
      });
      const secret = await getStripeWebhookSecret();
      expect(secret).toBe("whsec_db");
    });
  });

  it("does not fall back to DB when STRIPE_SECRET_KEY env is set (source coherence)", async () => {
    await withEnv({ STRIPE_SECRET_KEY: "sk_test_env", STRIPE_WEBHOOK_SECRET: undefined }, async () => {
      mockLoadCreds.mockResolvedValue({
        secretKey: "sk_test_db",
        publishableKey: null,
        webhookSecret: "whsec_db",
        accountId: null,
        accountName: null,
        isTestMode: true,
        lastValidatedAt: null,
      });
      const secret = await getStripeWebhookSecret();
      expect(secret).toBeNull();
      expect(mockLoadCreds).not.toHaveBeenCalled();
    });
  });

  it("returns null when neither env nor DB has webhook secret", async () => {
    await withEnv({ STRIPE_SECRET_KEY: undefined, STRIPE_WEBHOOK_SECRET: undefined }, async () => {
      mockLoadCreds.mockResolvedValue(null);
      const secret = await getStripeWebhookSecret();
      expect(secret).toBeNull();
    });
  });
});

describe("isStripeConfigured()", () => {
  it("returns true when STRIPE_SECRET_KEY env is set", async () => {
    await withEnv({ STRIPE_SECRET_KEY: "sk_test_env" }, async () => {
      const configured = await isStripeConfigured();
      expect(configured).toBe(true);
      expect(mockLoadCreds).not.toHaveBeenCalled();
    });
  });

  it("returns true when DB has credentials (env unset)", async () => {
    await withEnv({ STRIPE_SECRET_KEY: undefined }, async () => {
      mockLoadCreds.mockResolvedValue({
        secretKey: "sk_test_db",
        publishableKey: null,
        webhookSecret: null,
        accountId: null,
        accountName: null,
        isTestMode: true,
        lastValidatedAt: null,
      });
      const configured = await isStripeConfigured();
      expect(configured).toBe(true);
    });
  });

  it("returns false when neither env nor DB configured", async () => {
    await withEnv({ STRIPE_SECRET_KEY: undefined }, async () => {
      mockLoadCreds.mockResolvedValue(null);
      const configured = await isStripeConfigured();
      expect(configured).toBe(false);
    });
  });
});
