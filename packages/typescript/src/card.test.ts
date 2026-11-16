import { describe, it, expect } from "vitest";
import { CardCheckout } from "./card.js";

describe("hosted card payments", () => {
  it("uses one token for creation, polling and delivery without following redirects", async () => {
    const calls: RequestInit[] = [];
    const client = new CardCheckout("https://gateway.example/data", {
      token: "a".repeat(43),
      fetch: async (_url, init) => {
        calls.push(init!);
        return new Response(
          JSON.stringify({ status: "pending", checkout_url: "https://checkout.stripe.com/test" }),
          { status: 202 },
        );
      },
    });
    await client.start();
    await client.status();
    await client.resume();
    expect(calls.map((c) => new Headers(c.headers).get("Launa-Payment"))).toEqual([
      "checkout",
      "status",
      "resume",
    ]);
    for (const call of calls) {
      expect(new Headers(call.headers).get("Launa-Payment-Token")).toBe(client.token);
      expect(call.redirect).toBe("error");
    }
  });
  it("rejects unsafe transport and mixed credentials", () => {
    expect(() => new CardCheckout("http://gateway.example/data")).toThrow();
    expect(
      () => new CardCheckout("https://gateway.example/data", { headers: { "X-PAYMENT": "x" } }),
    ).toThrow();
  });
  it("rejects a checkout URL outside Stripe", async () => {
    const client = new CardCheckout("https://gateway.example/data", {
      fetch: async () =>
        new Response(JSON.stringify({ status: "pending", checkout_url: "https://evil.example" }), {
          status: 202,
        }),
    });
    await expect(client.start()).rejects.toThrow("Invalid Stripe");
  });
});
