import { describe, it, expect } from "vitest";
import {
  assertTextUsable,
  countExtractedChars,
  MIN_PDF_TEXT_CHARS,
  MAX_PDF_TEXT_CHARS,
  PdfTextError,
} from "@/lib/pdf-text";

describe("assertTextUsable", () => {
  it("throws EMPTY for empty / whitespace-only text", () => {
    expect(() => assertTextUsable("")).toThrow(PdfTextError);
    expect(() => assertTextUsable("   \n\t  ")).toThrow(PdfTextError);
    try {
      assertTextUsable("");
    } catch (e) {
      expect(e).toBeInstanceOf(PdfTextError);
      expect((e as PdfTextError).code).toBe("EMPTY");
    }
  });

  it("throws TOO_SHORT for text under MIN_PDF_TEXT_CHARS", () => {
    const short = "x".repeat(MIN_PDF_TEXT_CHARS - 1);
    expect(() => assertTextUsable(short)).toThrow(PdfTextError);
    try {
      assertTextUsable(short);
    } catch (e) {
      expect((e as PdfTextError).code).toBe("TOO_SHORT");
    }
  });

  it("throws TOO_LONG for text over MAX_PDF_TEXT_CHARS", () => {
    // Build slightly over max using non-whitespace so length check applies
    const long = "a".repeat(MAX_PDF_TEXT_CHARS + 1);
    expect(() => assertTextUsable(long)).toThrow(PdfTextError);
    try {
      assertTextUsable(long);
    } catch (e) {
      expect((e as PdfTextError).code).toBe("TOO_LONG");
    }
  });

  it("returns trimmed text for a usable 50-char string", () => {
    const ok = "a".repeat(50);
    expect(assertTextUsable(`  ${ok}  `)).toBe(ok);
  });

  it("strips null bytes before returning", () => {
    const ok = "Lab result: Glucose 95 mg/dL normal range ok.";
    expect(assertTextUsable(`\u0000${ok}`)).toBe(ok);
  });
});

describe("countExtractedChars", () => {
  it("returns string length", () => {
    expect(countExtractedChars("hello")).toBe(5);
  });
});
