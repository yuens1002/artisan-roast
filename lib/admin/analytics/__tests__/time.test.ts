import {
  parsePeriodParam,
  parseCompareParam,
  getDateRange,
  getComparisonRange,
  toDateKey,
  generateDateKeys,
  bucketByDay,
} from "../time";

describe("parsePeriodParam", () => {
  it("returns valid presets as-is", () => {
    expect(parsePeriodParam("7d")).toBe("7d");
    expect(parsePeriodParam("30d")).toBe("30d");
    expect(parsePeriodParam("1yr")).toBe("1yr");
  });

  it("defaults to 30d for invalid input", () => {
    expect(parsePeriodParam("invalid")).toBe("30d");
    expect(parsePeriodParam(null)).toBe("30d");
    expect(parsePeriodParam(undefined)).toBe("30d");
  });
});

describe("parseCompareParam", () => {
  it("returns valid modes as-is", () => {
    expect(parseCompareParam("previous")).toBe("previous");
    expect(parseCompareParam("lastYear")).toBe("lastYear");
    expect(parseCompareParam("none")).toBe("none");
  });

  it("defaults to previous for invalid input", () => {
    expect(parseCompareParam("invalid")).toBe("previous");
    expect(parseCompareParam(null)).toBe("previous");
  });
});

describe("getDateRange", () => {
  const now = new Date("2026-03-04T12:00:00Z");

  it("computes 7d range", () => {
    const range = getDateRange("7d", now);
    expect(toDateKey(range.from)).toBe("2026-02-26");
    expect(toDateKey(range.to)).toBe("2026-03-05"); // exclusive
  });

  it("computes 30d range", () => {
    const range = getDateRange("30d", now);
    expect(toDateKey(range.from)).toBe("2026-02-03");
  });

  it("to is always exclusive (start of next day in UTC)", () => {
    const range = getDateRange("7d", now);
    expect(range.to.getUTCHours()).toBe(0);
    expect(range.to.getUTCMinutes()).toBe(0);
  });
});

describe("getComparisonRange", () => {
  const range = getDateRange("7d", new Date("2026-03-04T12:00:00Z"));

  it("returns null for none", () => {
    expect(getComparisonRange(range, "none")).toBeNull();
  });

  it("shifts back for previous period", () => {
    const comp = getComparisonRange(range, "previous")!;
    expect(toDateKey(comp.to)).toBe(toDateKey(range.from));
  });

  it("shifts back 1 year for lastYear", () => {
    const comp = getComparisonRange(range, "lastYear")!;
    expect(comp.from.getUTCFullYear()).toBe(range.from.getUTCFullYear() - 1);
    expect(comp.from.getUTCMonth()).toBe(range.from.getUTCMonth());
    expect(comp.from.getUTCDate()).toBe(range.from.getUTCDate());
  });
});

describe("generateDateKeys", () => {
  it("produces one key per day", () => {
    const range = getDateRange("7d", new Date("2026-03-04T12:00:00Z"));
    const keys = generateDateKeys(range);
    expect(keys.length).toBe(7);
    expect(keys[0]).toBe("2026-02-26");
    expect(keys[6]).toBe("2026-03-04");
  });
});

describe("bucketByDay", () => {
  it("groups items by date key", () => {
    const items = [
      { createdAt: new Date("2026-03-01T10:00:00Z"), val: 1 },
      { createdAt: new Date("2026-03-01T20:00:00Z"), val: 2 },
      { createdAt: new Date("2026-03-02T05:00:00Z"), val: 3 },
    ];
    const map = bucketByDay(items, (i) => i.createdAt);
    expect(map.get("2026-03-01")?.length).toBe(2);
    expect(map.get("2026-03-02")?.length).toBe(1);
  });
});
