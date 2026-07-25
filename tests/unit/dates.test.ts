import { describe, expect, it } from "vitest";
import { formatDisplayDate, normalizeIsoDate } from "@/lib/dates";

describe("normalizeIsoDate", () => {
  it("keeps YYYY-MM-DD", () => {
    expect(normalizeIsoDate("2026-03-01")).toBe("2026-03-01");
  });

  it("strips time suffix from ISO datetimes", () => {
    expect(normalizeIsoDate("2026-03-01T14:30:00Z")).toBe("2026-03-01");
    expect(normalizeIsoDate("2026-03-01 00:00:00")).toBe("2026-03-01");
  });

  it("parses US slash dates", () => {
    expect(normalizeIsoDate("3/1/2026")).toBe("2026-03-01");
    expect(normalizeIsoDate("03/15/2026")).toBe("2026-03-15");
  });

  it("parses unambiguous day-first dates", () => {
    expect(normalizeIsoDate("15-03-2026")).toBe("2026-03-15");
    expect(normalizeIsoDate("15.03.2026")).toBe("2026-03-15");
  });

  it("returns null for empty or junk", () => {
    expect(normalizeIsoDate(null)).toBeNull();
    expect(normalizeIsoDate("")).toBeNull();
    expect(normalizeIsoDate("not a date")).toBeNull();
  });
});

describe("formatDisplayDate", () => {
  it("formats ISO dates", () => {
    expect(formatDisplayDate("2026-03-01")).toMatch(/Mar/);
    expect(formatDisplayDate("2026-03-01")).toMatch(/2026/);
  });

  it("shows No date when missing", () => {
    expect(formatDisplayDate(null)).toBe("No date");
    expect(formatDisplayDate(undefined)).toBe("No date");
  });
});
