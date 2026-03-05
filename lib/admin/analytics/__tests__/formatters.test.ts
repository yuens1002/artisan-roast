import {
  formatCurrency,
  formatPercent,
  formatNumber,
  formatWeight,
  formatDelta,
  formatByType,
} from "../formatters";

describe("formatCurrency", () => {
  it("formats cents to dollar string", () => {
    expect(formatCurrency(123456)).toBe("$1,234.56");
  });

  it("keeps two decimal places for round dollars", () => {
    expect(formatCurrency(100000)).toBe("$1,000.00");
  });

  it("handles zero", () => {
    expect(formatCurrency(0)).toBe("$0.00");
  });
});

describe("formatPercent", () => {
  it("formats ratio as percentage", () => {
    expect(formatPercent(0.123)).toBe("12.3%");
  });

  it("handles zero", () => {
    expect(formatPercent(0)).toBe("0.0%");
  });

  it("handles 100%", () => {
    expect(formatPercent(1)).toBe("100.0%");
  });
});

describe("formatNumber", () => {
  it("formats with commas", () => {
    expect(formatNumber(1234)).toBe("1,234");
  });

  it("rounds decimals", () => {
    expect(formatNumber(1234.7)).toBe("1,235");
  });
});

describe("formatWeight", () => {
  it("formats grams as lbs", () => {
    expect(formatWeight(453.592)).toBe("1.0 lbs");
  });

  it("handles zero", () => {
    expect(formatWeight(0)).toBe("0.0 lbs");
  });
});

describe("formatDelta", () => {
  it("formats positive delta", () => {
    expect(formatDelta({ value: 0.123, direction: "up" })).toBe("+12.3%");
  });

  it("formats negative delta", () => {
    expect(formatDelta({ value: 0.05, direction: "down" })).toBe("−5.0%");
  });

  it("formats flat delta as percentage", () => {
    expect(formatDelta({ value: 0, direction: "flat" })).toBe("0.0%");
  });
});

describe("formatByType", () => {
  it("delegates to currency", () => {
    expect(formatByType(5000, "currency")).toBe("$50.00");
  });

  it("delegates to percent", () => {
    expect(formatByType(0.5, "percent")).toBe("50.0%");
  });

  it("delegates to number", () => {
    expect(formatByType(42, "number")).toBe("42");
  });
});
