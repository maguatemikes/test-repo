/**
 * Lightweight input validation for customers (no external deps).
 * Swap for Zod later if desired.
 */
export type CustomerInput = { email: string; displayName?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateCustomerInput(input: { email?: unknown; displayName?: unknown }): CustomerInput {
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  if (!EMAIL_RE.test(email)) throw new Error("A valid email is required");
  const displayName =
    typeof input.displayName === "string" && input.displayName.trim() ? input.displayName.trim() : undefined;
  return { email, displayName };
}
