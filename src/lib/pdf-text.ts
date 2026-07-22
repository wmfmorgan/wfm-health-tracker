export const MIN_PDF_TEXT_CHARS = 40;
export const MAX_PDF_TEXT_CHARS = 200_000;

export class PdfTextError extends Error {
  constructor(
    message: string,
    public code: "EMPTY" | "TOO_SHORT" | "TOO_LONG" | "PARSE_FAILED",
  ) {
    super(message);
    this.name = "PdfTextError";
  }
}

export function assertTextUsable(text: string): string {
  const nonWs = text.replace(/\u0000/g, "").replace(/\s+/g, " ").trim();
  if (!nonWs) {
    throw new PdfTextError(
      "No text layer found. This looks like a scanned image PDF — Phase 2 requires selectable text (OCR not available).",
      "EMPTY",
    );
  }
  if (nonWs.length < MIN_PDF_TEXT_CHARS) {
    throw new PdfTextError(
      "PDF text layer is too short to extract labs. This may be a scan or mostly images.",
      "TOO_SHORT",
    );
  }
  if (nonWs.length > MAX_PDF_TEXT_CHARS) {
    throw new PdfTextError(
      `PDF text exceeds ${MAX_PDF_TEXT_CHARS} characters. Split the PDF or enter labs manually.`,
      "TOO_LONG",
    );
  }
  return text.replace(/\u0000/g, "").trim();
}

export async function extractPdfText(buffer: Buffer): Promise<string> {
  let data: { text?: string };
  try {
    // pdf-parse v2: named PDFParse class (v1 was default function export).
    // Must stay external to Next's bundler (see next.config serverExternalPackages).
    const { PDFParse } = await import("pdf-parse");
    // Ensure a real Node Buffer (FormData / ArrayBuffer edge cases)
    const dataBuf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
    const parser = new PDFParse({ data: dataBuf });
    try {
      data = await parser.getText();
    } finally {
      await parser.destroy().catch(() => undefined);
    }
  } catch (e) {
    if (e instanceof PdfTextError) throw e;
    const detail = e instanceof Error ? e.message : String(e);
    // Log real cause server-side; UI still gets a clear message
    console.error("pdf-parse failed:", detail);
    throw new PdfTextError(
      `Could not parse PDF${detail ? ` (${detail})` : ""}`,
      "PARSE_FAILED",
    );
  }
  return assertTextUsable(data.text ?? "");
}

export function countExtractedChars(text: string): number {
  return text.length;
}
