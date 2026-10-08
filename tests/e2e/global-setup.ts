import { existsSync } from "node:fs";

import { clerkSetup } from "@clerk/testing/playwright";

/** A Clerk test address: Clerk never emails +clerk_test addresses (DECISIONS 032). */
export const E2E_EMAIL = "grimify-e2e+clerk_test@example.com";

const CLERK_API = "https://api.clerk.com/v1";

export default async function globalSetup() {
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    throw new Error("CLERK_SECRET_KEY is not set; add it to .env.local (see .env.example)");
  }
  process.env.CLERK_PUBLISHABLE_KEY ??= process.env.VITE_CLERK_PUBLISHABLE_KEY;

  await clerkSetup();
  await ensureTestUser(secretKey);
}

/** Creates the E2E user in the Clerk development instance once; later runs find it. */
async function ensureTestUser(secretKey: string) {
  const headers = { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/json" };
  const found = await fetch(`${CLERK_API}/users?email_address=${encodeURIComponent(E2E_EMAIL)}`, {
    headers,
  });
  if (!found.ok) throw new Error(`Clerk user lookup failed: HTTP ${found.status}`);
  if (((await found.json()) as unknown[]).length > 0) return;

  const created = await fetch(`${CLERK_API}/users`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email_address: [E2E_EMAIL], skip_password_requirement: true }),
  });
  if (!created.ok) {
    throw new Error(
      `Creating the Clerk E2E user failed: HTTP ${created.status} ${await created.text()}`,
    );
  }
}
