import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Only the Clerk identity: email and name stay in Clerk and are read on the device (DECISIONS 028).
  users: defineTable({
    tokenIdentifier: v.string(),
  }).index("by_tokenIdentifier", ["tokenIdentifier"]),

  // One row per user and paint; owned and wishlisted are independent (DECISIONS 011).
  userPaints: defineTable({
    userId: v.id("users"),
    paintId: v.string(),
    owned: v.boolean(),
    wishlisted: v.boolean(),
    // The client's clock when the change was made; drives last-write-wins (DECISIONS 010).
    updatedAt: v.number(),
  }).index("by_userId_and_paintId", ["userId", "paintId"]),
});
