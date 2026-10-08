import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { findUser, requireIdentity } from "./lib/auth";

/** Creates the caller's `users` row on first sign-in; idempotent. */
export const store = mutation({
  args: {},
  returns: v.id("users"),
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx);
    const existing = await findUser(ctx, identity.tokenIdentifier);
    if (existing) return existing._id;
    return await ctx.db.insert("users", { tokenIdentifier: identity.tokenIdentifier });
  },
});

/** The caller's user ID, or null when signed out or not stored yet. */
export const me = query({
  args: {},
  returns: v.union(v.object({ _id: v.id("users") }), v.null()),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await findUser(ctx, identity.tokenIdentifier);
    return user ? { _id: user._id } : null;
  },
});
