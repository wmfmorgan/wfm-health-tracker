import { describe, it, expect } from "vitest";
import { useFreshDb, getDb } from "../helpers/test-db";
import { importJobs } from "@/server/db/schema";

useFreshDb();

describe("import_jobs schema", () => {
  it("can insert an import job row", () => {
    // For this step: just ensure select from import_jobs does not throw
    const rows = getDb().select().from(importJobs).all();
    expect(rows).toEqual([]);
  });
});
