import { NextResponse } from "next/server";
import type { OrderStatus } from "@prisma/client";
import { requireAdminApi } from "@/lib/admin";
import { parsePeriodParam, parseCompareParam, validateCustomDateParams } from "@/lib/admin/analytics/time";
import { getSalesAnalytics } from "@/lib/admin/analytics/services/get-sales-analytics";
import { buildCsvString } from "@/lib/admin/analytics/csv-export";
import { formatCurrency } from "@/lib/admin/analytics/formatters";

const VALID_STATUSES = new Set<string>([
  "PENDING", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "PICKED_UP", "CANCELLED", "FAILED",
]);

export async function GET(request: Request) {
  try {
    const auth = await requireAdminApi();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const compare = parseCompareParam(searchParams.get("compare"));
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    if (fromParam && toParam) {
      const dateError = validateCustomDateParams(fromParam, toParam);
      if (dateError) {
        return NextResponse.json({ error: dateError }, { status: 400 });
      }
    }

    const dateParams = fromParam && toParam
      ? { customFrom: fromParam, customTo: toParam } as const
      : { period: parsePeriodParam(searchParams.get("period")) } as const;

    const data = await getSalesAnalytics({
      ...dateParams,
      compare,
      orderType: parseOrderType(searchParams.get("orderType")),
      statuses: parseStatuses(searchParams.get("status")),
      productId: searchParams.get("productId") ?? undefined,
      categoryId: searchParams.get("categoryId") ?? undefined,
      promoCode: searchParams.get("promoCode") ?? undefined,
      location: searchParams.get("location") ?? undefined,
      amountOp: parseAmountOp(searchParams.get("amountOp")),
      amountCents: searchParams.get("amount")
        ? parseIntParam(searchParams.get("amount"), 0)
        : undefined,
      page: parseIntParam(searchParams.get("page"), 0),
      pageSize: parseIntParam(searchParams.get("pageSize"), 25),
      sort: searchParams.get("sort") ?? "createdAt",
      dir: parseDir(searchParams.get("dir")),
    });

    // CSV export
    if (searchParams.get("export") === "csv") {
      const csv = buildCsvString(
        ["Order #", "Date", "Email", "Items", "Type", "Status", "Total", "Refunded", "Location"],
        data.table.rows.map((r) => [
          r.orderNumber,
          new Date(r.createdAt).toISOString().slice(0, 10),
          r.customerEmail ?? "",
          String(r.itemCount),
          r.orderType,
          r.status,
          formatCurrency(r.total),
          formatCurrency(r.refunded),
          [r.city, r.state].filter(Boolean).join(", "),
        ])
      );

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="sales-export.csv"`,
        },
      });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Sales API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch sales data" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// Param helpers
// ---------------------------------------------------------------------------

function parseOrderType(
  value: string | null
): "ALL" | "ONE_TIME" | "SUBSCRIPTION" | undefined {
  if (!value) return undefined;
  // Multi-value: "SUBSCRIPTION,ONE_TIME" → both selected = ALL
  const parts = value.split(",").filter(Boolean);
  if (parts.length > 1) return "ALL";
  if (parts[0] === "ONE_TIME" || parts[0] === "SUBSCRIPTION") return parts[0];
  if (parts[0] === "ALL") return "ALL";
  return undefined;
}

function parseStatuses(value: string | null): OrderStatus[] | undefined {
  if (!value) return undefined;
  const parts = value.split(",").filter((s) => VALID_STATUSES.has(s)) as OrderStatus[];
  return parts.length > 0 ? parts : undefined;
}

function parseAmountOp(
  value: string | null
): "=" | ">=" | "<=" | undefined {
  if (value === "=" || value === ">=" || value === "<=") return value;
  return undefined;
}

function parseIntParam(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const n = parseInt(value, 10);
  return Number.isNaN(n) ? fallback : n;
}

function parseDir(value: string | null): "asc" | "desc" {
  return value === "asc" ? "asc" : "desc";
}
