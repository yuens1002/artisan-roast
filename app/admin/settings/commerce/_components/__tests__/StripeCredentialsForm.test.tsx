import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { StripeCredentialsForm } from "../StripeCredentialsForm";

jest.mock("@/lib/demo", () => ({ IS_DEMO: false }));

const mockToast = jest.fn();
jest.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

const mockFetch = global.fetch as jest.Mock;

// ── response factories ────────────────────────────────────────────────────────

function makeConfigResponse(dbOverrides: Record<string, unknown> = {}) {
  return {
    ok: true,
    json: async () => ({
      envSecretSet: false,
      envWebhookSet: false,
      envPublishableSet: false,
      db: {
        hasRow: false,
        hasSecretKey: false,
        hasWebhookSecret: false,
        publishableKey: null,
        accountId: null,
        accountName: null,
        isTestMode: null,
        lastValidatedAt: null,
        decryptionError: false,
        secretKeyMasked: null,
        webhookSecretMasked: null,
        ...dbOverrides,
      },
    }),
  };
}

function savedConfigResponse() {
  return makeConfigResponse({
    hasRow: true,
    hasSecretKey: true,
    hasWebhookSecret: true,
    publishableKey: "pk_test_existing123",
    secretKeyMasked: "••••••••1234",
    webhookSecretMasked: "••••••••abcd",
  });
}

function successResponse() {
  return { ok: true, json: async () => ({ success: true }) };
}

// ── helpers ───────────────────────────────────────────────────────────────────

async function renderAndLoad(fetchReturn = makeConfigResponse()) {
  mockFetch.mockResolvedValue(fetchReturn);
  const result = render(<StripeCredentialsForm />);
  await waitFor(() =>
    expect(screen.queryByText("Loading Stripe configuration…")).not.toBeInTheDocument()
  );
  return result;
}

function getInputById(id: string) {
  return document.getElementById(id) as HTMLInputElement;
}

beforeEach(() => {
  // resetAllMocks flushes queued mockResolvedValueOnce calls too,
  // preventing stale responses from leaking into the next test
  jest.resetAllMocks();
  jest.useRealTimers();
});

// ── required field validation ────────────────────────────────────────────────

describe("required field validation", () => {
  it("shows Required field on all three fields when Save is clicked with nothing filled", async () => {
    await renderAndLoad();
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    const errors = await screen.findAllByText("Required field");
    expect(errors).toHaveLength(3);
  });

  it("clears the required field error on the field the user starts typing in", async () => {
    await renderAndLoad();
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    await screen.findAllByText("Required field"); // all 3 visible

    fireEvent.change(getInputById("stripe-secret-key"), { target: { value: "sk_test_x" } });

    await waitFor(() =>
      expect(screen.queryAllByText("Required field")).toHaveLength(2)
    );
  });

  it("does not show required field errors when all fields are pre-populated from DB", async () => {
    mockFetch
      .mockResolvedValueOnce(savedConfigResponse()) // initial GET
      .mockResolvedValueOnce(successResponse())     // PUT (short-circuit on server)
      .mockResolvedValueOnce(savedConfigResponse()); // re-fetch after save

    render(<StripeCredentialsForm />);
    await waitFor(() =>
      expect(screen.queryByText("Loading Stripe configuration…")).not.toBeInTheDocument()
    );

    // With saved DB values, button is "Undo Changes" — make a change to get Save button
    fireEvent.change(getInputById("stripe-publishable-key"), { target: { value: "pk_test_new" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    // PUT is called (validation passed) and no required field errors appear
    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/admin/settings/stripe",
        expect.objectContaining({ method: "PUT" })
      )
    );
    expect(screen.queryByText("Required field")).not.toBeInTheDocument();
  });
});

// ── icon state ───────────────────────────────────────────────────────────────

describe("icon state", () => {
  it("renders green check icons on initial load when DB has verified values", async () => {
    const { container } = await renderAndLoad(savedConfigResponse());
    // All three fields are verified in DB — all three should show green on load
    expect(container.querySelectorAll(".text-emerald-500").length).toBeGreaterThanOrEqual(3);
  });

  it("renders the muted circle icon when the user types in a field (dirty, not yet saved)", async () => {
    const { container } = await renderAndLoad();
    fireEvent.change(getInputById("stripe-secret-key"), { target: { value: "sk_test_x" } });
    expect(container.querySelector(".text-muted-foreground\\/30")).toBeInTheDocument();
  });

  it("shows green check icons on all fields after a successful save", async () => {
    const { container } = await renderAndLoad();

    fireEvent.change(getInputById("stripe-secret-key"), { target: { value: "sk_test_valid" } });
    fireEvent.change(getInputById("stripe-publishable-key"), { target: { value: "pk_test_valid" } });
    fireEvent.change(getInputById("stripe-webhook-secret"), { target: { value: "whsec_valid" } });

    mockFetch
      .mockResolvedValueOnce(successResponse())
      .mockResolvedValueOnce(savedConfigResponse());

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() =>
      expect(container.querySelectorAll(".text-emerald-500").length).toBeGreaterThan(0)
    );
  });

});

// ── dirty field tracking ──────────────────────────────────────────────────────

describe("dirty field tracking — PUT body contains only changed fields", () => {
  it("sends only the publishable key when that is the only changed field", async () => {
    mockFetch
      .mockResolvedValueOnce(savedConfigResponse()) // GET
      .mockResolvedValueOnce(successResponse())     // PUT
      .mockResolvedValueOnce(savedConfigResponse()); // re-fetch

    render(<StripeCredentialsForm />);
    await waitFor(() =>
      expect(screen.queryByText("Loading Stripe configuration…")).not.toBeInTheDocument()
    );

    // Change only pub key (makes it dirty → Save button appears)
    fireEvent.change(getInputById("stripe-publishable-key"), {
      target: { value: "pk_test_changed" },
    });

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      const putCall = mockFetch.mock.calls.find(
        (c: unknown[]) => (c[1] as RequestInit)?.method === "PUT"
      );
      expect(putCall).toBeDefined();
      const body = JSON.parse((putCall![1] as RequestInit).body as string);
      expect(body).toEqual({ publishableKey: "pk_test_changed" });
      expect(body).not.toHaveProperty("secretKey");
      expect(body).not.toHaveProperty("webhookSecret");
    });
  });

  it("sends all three fields when all three are changed", async () => {
    const { container } = await renderAndLoad();

    fireEvent.change(container.querySelector("#stripe-secret-key")!, { target: { value: "sk_test_new" } });
    fireEvent.change(container.querySelector("#stripe-publishable-key")!, { target: { value: "pk_test_new" } });
    fireEvent.change(container.querySelector("#stripe-webhook-secret")!, { target: { value: "whsec_new" } });

    mockFetch
      .mockResolvedValueOnce(successResponse())
      .mockResolvedValueOnce(savedConfigResponse());

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      const putCall = mockFetch.mock.calls.find(
        (c: unknown[]) => (c[1] as RequestInit)?.method === "PUT"
      );
      const body = JSON.parse((putCall![1] as RequestInit).body as string);
      expect(body).toEqual({
        secretKey: "sk_test_new",
        publishableKey: "pk_test_new",
        webhookSecret: "whsec_new",
      });
    });
  });
});

// ── Undo Changes — error recovery only ───────────────────────────────────────

describe("Undo Changes — transient error-recovery button", () => {
  it("does not appear on initial load with valid DB values (Save always visible)", async () => {
    await renderAndLoad(savedConfigResponse());
    expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /undo changes/i })).not.toBeInTheDocument();
  });

  it("does not appear while editing (dirty fields)", async () => {
    await renderAndLoad(savedConfigResponse());
    fireEvent.change(getInputById("stripe-publishable-key"), { target: { value: "pk_test_changed" } });
    expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /undo changes/i })).not.toBeInTheDocument();
  });

  it("replaces Save with Undo Changes after a failed save when DB has a validated state", async () => {
    await renderAndLoad(savedConfigResponse());

    fireEvent.change(getInputById("stripe-publishable-key"), { target: { value: "pk_bad" } });
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Something went wrong, one or more keys may be incorrect." }),
    });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() =>
      expect(screen.getByText(/Something went wrong/)).toBeInTheDocument()
    );
    // Save is gone — replaced by Undo Changes
    expect(screen.queryByRole("button", { name: /save/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /undo changes/i })).toBeInTheDocument();
  });

  it("does not appear after a failed save when DB has no validated secret key", async () => {
    // Regression: partial/bad DB state must not show Undo (nothing valid to revert to).
    // Give it a saved webhook so required validation passes and the request reaches the server.
    await renderAndLoad(makeConfigResponse({
      hasRow: true,
      hasSecretKey: false,
      hasWebhookSecret: true,
      publishableKey: "df fdfe",
      secretKeyMasked: null,
      webhookSecretMasked: "••••••••abcd",
    }));

    fireEvent.change(getInputById("stripe-secret-key"), { target: { value: "sk_test_bad" } });
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Something went wrong, one or more keys may be incorrect." }),
    });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() =>
      expect(screen.getByText(/Something went wrong/)).toBeInTheDocument()
    );
    // hasSecretKey=false on DB → Undo Changes must not appear
    expect(screen.queryByRole("button", { name: /undo changes/i })).not.toBeInTheDocument();
  });

  it("clicking Undo Changes restores DB values, clears error, and hides itself", async () => {
    const { container } = await renderAndLoad(savedConfigResponse());

    fireEvent.change(getInputById("stripe-publishable-key"), { target: { value: "pk_bad" } });
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Something went wrong, one or more keys may be incorrect." }),
    });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /undo changes/i })).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: /undo changes/i }));

    // Error cleared, Undo gone, DB value restored, green icons back
    expect(screen.queryByText(/Something went wrong/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /undo changes/i })).not.toBeInTheDocument();
    expect(getInputById("stripe-publishable-key").value).toBe("pk_test_existing123");
    expect(container.querySelectorAll(".text-emerald-500").length).toBeGreaterThanOrEqual(3);
  });

  it("does not appear after a successful save", async () => {
    await renderAndLoad(savedConfigResponse());

    mockFetch
      .mockResolvedValueOnce(successResponse())
      .mockResolvedValueOnce(savedConfigResponse()); // re-fetch after save

    fireEvent.change(getInputById("stripe-publishable-key"), { target: { value: "pk_test_new" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() =>
      expect(screen.getByText("Saved successfully.")).toBeInTheDocument()
    );
    expect(screen.queryByRole("button", { name: /undo changes/i })).not.toBeInTheDocument();
  });
});
