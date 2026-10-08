import { ConvexError } from "convex/values";

import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

/** The caller's Clerk identity; throws UNAUTHENTICATED when signed out. */
export async function requireIdentity(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("UNAUTHENTICATED");
  return identity;
}

export async function findUser(ctx: QueryCtx | MutationCtx, tokenIdentifier: string) {
  return await ctx.db
    .query("users")
    .withIndex("by_tokenIdentifier", (q) => q.eq("tokenIdentifier", tokenIdentifier))
    .unique();
}

/**
 * The caller's `users` row. Every user-data function starts here; the user is never taken from
 * arguments (SECURITY §2). Throws UNAUTHENTICATED when signed out or not yet stored.
 */
export async function requireUser(ctx: QueryCtx | MutationCtx): Promise<Doc<"users">> {
  const identity = await requireIdentity(ctx);
  const user = await findUser(ctx, identity.tokenIdentifier);
  if (!user) throw new ConvexError("UNAUTHENTICATED");
  return user;
}
