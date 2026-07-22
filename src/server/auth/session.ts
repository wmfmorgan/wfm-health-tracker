import { getIronSession, type IronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export type SessionData = { authenticated?: boolean };

export function authEnabled(): boolean {
  return Boolean(process.env.APP_PASSWORD && process.env.APP_PASSWORD.length > 0);
}

/**
 * iron-session options. Requires SESSION_SECRET (32+ chars).
 * Only call this when auth is enabled — missing secret must not break open mode.
 */
export function sessionOptions(): SessionOptions {
  const password = process.env.SESSION_SECRET;
  if (!password || password.length < 32) {
    throw new Error("SESSION_SECRET must be set (32+ chars) when using auth");
  }
  return {
    cookieName: "wfm_ht_session",
    password,
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    },
  };
}

/**
 * Returns the sealed cookie session when auth is on.
 * When auth is disabled, returns a no-op session object so callers never require SESSION_SECRET.
 */
export async function getSession(): Promise<IronSession<SessionData>> {
  if (!authEnabled()) {
    return {
      authenticated: true,
      save: async () => {},
      destroy: () => {},
      updateConfig: () => {},
    } as IronSession<SessionData>;
  }
  return getIronSession<SessionData>(await cookies(), sessionOptions());
}
