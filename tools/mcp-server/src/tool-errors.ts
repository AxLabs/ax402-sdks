import { LaunaError } from "@launaio/sdk";

/** Only static, caller-actionable validation messages belong in this set. */
const publicMessages = new Set([
  "card payments are not enabled on this deployment",
  "link a ready Stripe account before enabling card payments",
  "card payments currently require a permanent, read-only GET endpoint",
  "card currency must be usd",
  "card amount_minor must be an integer from 50 to 99999999",
  "configure x402 accepts or enabled card pricing",
  "invalid card_payment",
  "pay_to_address or pay_to_addresses required for user_wallet mode",
  "pay_to_addresses network required",
  "sandbox fork supports exact scheme only",
  "network and asset are required for custom token pricing",
  "price or amount is required for custom token pricing",
  "invalid request body",
  "invalid api id",
  "invalid endpoint id",
  "invalid pay_to_mode",
  "name required",
  "slug already exists",
  "insufficient scope",
  "endpoint pricing is required; ask the user for price and payment terms",
  "decimals are required for custom token pricing",
  "email verification required",
  "sandbox wallet is only available in Sandbox; reconnect with Sandbox access",
  "sandbox wallet only available in development environment",
]);

/** A validation failure authored locally, never an arbitrary upstream error. */
export class ToolInputError extends Error {}

export function publicToolError(error: unknown): string {
  if (error instanceof LaunaError) {
    const prefix = `Launa request rejected (${error.status})`;
    // Never forward arbitrary backend text, response bodies, or server errors.
    return error.status >= 400 && error.status < 500 && publicMessages.has(error.message)
      ? `${prefix}: ${error.message}`
      : prefix;
  }
  if (error instanceof ToolInputError && publicMessages.has(error.message)) {
    return error.message;
  }
  return "Launa request failed";
}
