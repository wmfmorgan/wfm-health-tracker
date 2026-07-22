import { migrate } from "./migrate";

let done = false;

export function bootstrapDb() {
  if (done) return;
  migrate();
  done = true;
}

/** Test-only: allow migrate/bootstrap to run again after DATA_DIR swap. */
export function resetBootstrapForTests() {
  done = false;
}
