import { bootstrapDb } from "../src/server/db/bootstrap";
import { getSqlite } from "../src/server/db/index";
bootstrapDb();
const cols = getSqlite().prepare("PRAGMA table_info(medications)").all() as { name: string }[];
console.log(cols.map((c) => c.name).join(", "));
console.log("has how_it_helps:", cols.some((c) => c.name === "how_it_helps"));
