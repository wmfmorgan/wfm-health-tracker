import { authEnabled, getSession } from "./session";

export class UnauthorizedError extends Error {
  readonly status = 401;

  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/** No-op when auth is disabled; throws UnauthorizedError if auth is on and session is missing. */
export async function assertAuthenticated(): Promise<void> {
  if (!authEnabled()) return;
  const session = await getSession();
  if (!session.authenticated) {
    throw new UnauthorizedError();
  }
}
