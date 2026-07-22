import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { verifyPassword, hashPassword } from "@/server/auth/password";
import { authEnabled } from "@/server/auth/session";

describe("password", () => {
  it("matches plaintext env style", () => {
    expect(verifyPassword("secret", "secret")).toBe(true);
    expect(verifyPassword("nope", "secret")).toBe(false);
  });

  it("matches bcrypt hash", () => {
    const h = hashPassword("secret");
    expect(h.startsWith("$2")).toBe(true);
    expect(verifyPassword("secret", h)).toBe(true);
    expect(verifyPassword("wrong", h)).toBe(false);
  });
});

describe("authEnabled", () => {
  const original = process.env.APP_PASSWORD;

  afterEach(() => {
    process.env.APP_PASSWORD = original;
  });

  it("is false when APP_PASSWORD empty/unset", () => {
    process.env.APP_PASSWORD = "";
    expect(authEnabled()).toBe(false);
    delete process.env.APP_PASSWORD;
    expect(authEnabled()).toBe(false);
  });

  it("is true when APP_PASSWORD is set", () => {
    process.env.APP_PASSWORD = "my-pass";
    expect(authEnabled()).toBe(true);
  });
});

describe("sessionOptions when auth disabled", () => {
  const originalPassword = process.env.APP_PASSWORD;
  const originalSecret = process.env.SESSION_SECRET;

  beforeEach(() => {
    process.env.APP_PASSWORD = "";
  });

  afterEach(() => {
    process.env.APP_PASSWORD = originalPassword;
    process.env.SESSION_SECRET = originalSecret;
  });

  it("getSession does not require SESSION_SECRET when auth is off", async () => {
    delete process.env.SESSION_SECRET;
    const { getSession, authEnabled: enabled } = await import("@/server/auth/session");
    expect(enabled()).toBe(false);
    const session = await getSession();
    expect(session.authenticated).toBe(true);
    await expect(session.save()).resolves.toBeUndefined();
  });
});
