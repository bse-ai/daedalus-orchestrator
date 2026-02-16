import { createHmac, timingSafeEqual } from "node:crypto";

// HMAC both values with a fixed key so that comparison is always
// constant-time regardless of input lengths, eliminating the
// length-oracle side-channel.
const HMAC_KEY = "forge-orchestrator-secret-equal-v1";

export function safeEqualSecret(
  provided: string | undefined | null,
  expected: string | undefined | null,
): boolean {
  if (typeof provided !== "string" || typeof expected !== "string") {
    return false;
  }
  const providedDigest = createHmac("sha256", HMAC_KEY).update(provided).digest();
  const expectedDigest = createHmac("sha256", HMAC_KEY).update(expected).digest();
  return timingSafeEqual(providedDigest, expectedDigest);
}
