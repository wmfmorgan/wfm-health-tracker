import bcrypt from "bcryptjs";

/** Verify a passcode against an env value that may be plaintext or a bcrypt $2 hash. */
export function verifyPassword(plain: string, hashOrPlainFromEnv: string): boolean {
  if (hashOrPlainFromEnv.startsWith("$2")) {
    return bcrypt.compareSync(plain, hashOrPlainFromEnv);
  }
  return plain === hashOrPlainFromEnv;
}

export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, 10);
}
