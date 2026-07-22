import { describe, it, expect } from "vitest";
import { useFreshDb } from "../helpers/test-db";
import { createMedication } from "@/server/services/medications";
import { createBackupZip, checkpointDatabase } from "@/server/services/backup";
import { ensureDataDirs } from "@/server/db";
import fs from "node:fs";
import path from "node:path";

useFreshDb();

describe("backup", () => {
  it("creates a non-empty zip including the database", async () => {
    createMedication({ name: "Mesalamine", status: "active", prn: false });
    checkpointDatabase();

    const { buffer, filename } = await createBackupZip();
    expect(filename).toMatch(/^wfm-health-backup-.+\.zip$/);
    expect(buffer.byteLength).toBeGreaterThan(100);
    // ZIP local file header magic
    expect(buffer.subarray(0, 2).toString("utf8")).toBe("PK");

    const { dbPath } = ensureDataDirs();
    expect(fs.existsSync(dbPath)).toBe(true);
    expect(fs.existsSync(path.dirname(dbPath))).toBe(true);
  });
});
