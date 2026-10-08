import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Only the Clerk identity: email and name stay in Clerk and are read on the device (DECISIONS 028).
  users: defineTable({
    tokenIdentifier: v.string(),
  }).index("by_tokenIdentifier", ["tokenIdentifier"]),
});
