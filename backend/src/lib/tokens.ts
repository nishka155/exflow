import { randomBytes, createHash } from "crypto";

export function generateToken() {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  return { token, tokenHash };
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
