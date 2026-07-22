import path from "node:path";
import os from "node:os";
import fs from "node:fs";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "wfm-ht-"));
process.env.DATA_DIR = tmp;
process.env.SESSION_SECRET = "test-session-secret-at-least-32-chars!!";
process.env.APP_PASSWORD = "";
