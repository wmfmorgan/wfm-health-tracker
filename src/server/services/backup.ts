import fs from "node:fs";
import path from "node:path";
import { PassThrough } from "node:stream";
import { ZipArchive } from "archiver";
import { bootstrapDb } from "@/server/db/bootstrap";
import { ensureDataDirs, getSqlite } from "@/server/db";

/**
 * Checkpoint WAL into the main DB file so a zip of data/ is consistent.
 */
export function checkpointDatabase() {
  bootstrapDb();
  getSqlite().pragma("wal_checkpoint(TRUNCATE)");
}

/**
 * Build a zip archive of the data directory (SQLite + uploads).
 * Returns buffer + suggested download filename.
 */
export async function createBackupZip(): Promise<{ buffer: Buffer; filename: string }> {
  bootstrapDb();
  checkpointDatabase();

  const { dataDir } = ensureDataDirs();
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const filename = `wfm-health-backup-${stamp}.zip`;

  const buffer = await new Promise<Buffer>((resolve, reject) => {
    const archive = new ZipArchive({ zlib: { level: 9 } });
    const stream = new PassThrough();
    const chunks: Buffer[] = [];

    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
    archive.on("error", reject);
    archive.on("warning", (err: Error & { code?: string }) => {
      if (err.code !== "ENOENT") reject(err);
    });

    archive.pipe(stream);

    // Include all files under data/ (db, wal/shm if present, uploads)
    const entries = fs.readdirSync(dataDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === ".gitkeep") continue;
      const full = path.join(dataDir, entry.name);
      if (entry.isDirectory()) {
        archive.directory(full, entry.name);
      } else if (entry.isFile()) {
        archive.file(full, { name: entry.name });
      }
    }

    void archive.finalize();
  });

  return { buffer, filename };
}
