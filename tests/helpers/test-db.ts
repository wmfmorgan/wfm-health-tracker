import { beforeEach } from "vitest";
import { resetDbForTests, getDb, ensureDataDirs } from "@/server/db";
import { migrate } from "@/server/db/migrate";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

export function useFreshDb() {
  beforeEach(() => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wfm-ht-"));
    process.env.DATA_DIR = dir;
    resetDbForTests();
    migrate();
  });
}

export { getDb, ensureDataDirs };
