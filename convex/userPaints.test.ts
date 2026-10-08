/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const ISSUER = "https://actual-squirrel-9784.clerk.accounts.dev";
const RED = "citadel-base-mephiston-red";

async function signedIn(subject: string) {
  const t = convexTest(schema, modules);
  const as = t.withIdentity({ subject, issuer: ISSUER });
  await as.mutation(api.users.store, {});
  return { t, as };
}

describe("userPaints.set", () => {
  it("inserts, updates and deletes a user's paint flags", async () => {
    const { as } = await signedIn("a");

    await as.mutation(api.userPaints.set, { paintId: RED, owned: true, clientUpdatedAt: 1 });
    expect(await as.query(api.userPaints.listMine, {})).toEqual([
      { paintId: RED, owned: true, wishlisted: false, favorite: false, updatedAt: 1 },
    ]);

    await as.mutation(api.userPaints.set, { paintId: RED, wishlisted: true, clientUpdatedAt: 2 });
    expect(await as.query(api.userPaints.listMine, {})).toEqual([
      { paintId: RED, owned: true, wishlisted: true, favorite: false, updatedAt: 2 },
    ]);

    await as.mutation(api.userPaints.set, {
      paintId: RED,
      owned: false,
      wishlisted: false,
      clientUpdatedAt: 3,
    });
    expect(await as.query(api.userPaints.listMine, {})).toEqual([]);

    await as.mutation(api.userPaints.set, { paintId: RED, favorite: true, clientUpdatedAt: 4 });
    expect(await as.query(api.userPaints.listMine, {})).toEqual([
      { paintId: RED, owned: false, wishlisted: false, favorite: true, updatedAt: 4 },
    ]);

    await as.mutation(api.userPaints.set, { paintId: RED, owned: true, clientUpdatedAt: 5 });
    await as.mutation(api.userPaints.set, { paintId: RED, favorite: false, clientUpdatedAt: 6 });
    expect(await as.query(api.userPaints.listMine, {})).toEqual([
      { paintId: RED, owned: true, wishlisted: false, favorite: false, updatedAt: 6 },
    ]);

    await as.mutation(api.userPaints.set, { paintId: RED, owned: false, clientUpdatedAt: 7 });
    expect(await as.query(api.userPaints.listMine, {})).toEqual([]);
  });

  it("applies last-write-wins and is idempotent", async () => {
    const { t, as } = await signedIn("a");

    await as.mutation(api.userPaints.set, { paintId: RED, owned: true, clientUpdatedAt: 20 });
    await as.mutation(api.userPaints.set, {
      paintId: RED,
      owned: false,
      wishlisted: true,
      clientUpdatedAt: 10,
    });
    expect(await as.query(api.userPaints.listMine, {})).toEqual([
      { paintId: RED, owned: true, wishlisted: false, favorite: false, updatedAt: 20 },
    ]);

    await as.mutation(api.userPaints.set, { paintId: RED, owned: true, clientUpdatedAt: 20 });
    expect(await t.run((ctx) => ctx.db.query("userPaints").collect())).toHaveLength(1);
    expect(await as.query(api.userPaints.listMine, {})).toEqual([
      { paintId: RED, owned: true, wishlisted: false, favorite: false, updatedAt: 20 },
    ]);
  });

  it("validates arguments", async () => {
    const { as } = await signedIn("a");
    const now = Date.now();

    await expect(
      as.mutation(api.userPaints.set, { paintId: "Bad ID", owned: true, clientUpdatedAt: 1 }),
    ).rejects.toThrow("INVALID_PAINT_ID");
    await expect(
      as.mutation(api.userPaints.set, { paintId: RED, clientUpdatedAt: 1 }),
    ).rejects.toThrow("NO_FLAGS");
    await expect(
      as.mutation(api.userPaints.set, {
        paintId: RED,
        owned: true,
        clientUpdatedAt: now + 6 * 60_000,
      }),
    ).rejects.toThrow("CLOCK_IN_FUTURE");
    await as.mutation(api.userPaints.set, {
      paintId: RED,
      owned: true,
      clientUpdatedAt: now + 4 * 60_000,
    });
    expect(await as.query(api.userPaints.listMine, {})).toHaveLength(1);

    await as.mutation(api.userPaints.set, {
      paintId: "citadel-base-macragge-blue",
      favorite: true,
      clientUpdatedAt: 1,
    });
    expect(await as.query(api.userPaints.listMine, {})).toHaveLength(2);
  });

  it("treats rows saved before favorites as not favorite", async () => {
    const { t, as } = await signedIn("a");
    await t.run(async (ctx) => {
      const user = await ctx.db.query("users").first();
      await ctx.db.insert("userPaints", {
        userId: user!._id,
        paintId: RED,
        owned: true,
        wishlisted: false,
        updatedAt: 1,
      });
    });

    expect(await as.query(api.userPaints.listMine, {})).toEqual([
      { paintId: RED, owned: true, wishlisted: false, favorite: false, updatedAt: 1 },
    ]);
    await as.mutation(api.userPaints.set, { paintId: RED, owned: false, clientUpdatedAt: 2 });
    expect(await as.query(api.userPaints.listMine, {})).toEqual([]);
  });

  it("keeps users apart and requires sign-in", async () => {
    const { t, as: asA } = await signedIn("a");
    const asB = t.withIdentity({ subject: "b", issuer: ISSUER });
    await asB.mutation(api.users.store, {});

    await expect(
      t.mutation(api.userPaints.set, { paintId: RED, owned: true, clientUpdatedAt: 1 }),
    ).rejects.toThrow("UNAUTHENTICATED");
    expect(await t.query(api.userPaints.listMine, {})).toEqual([]);

    await asA.mutation(api.userPaints.set, { paintId: RED, owned: true, clientUpdatedAt: 1 });
    expect(await asB.query(api.userPaints.listMine, {})).toEqual([]);
    await asB.mutation(api.userPaints.set, { paintId: RED, wishlisted: true, clientUpdatedAt: 2 });
    expect(await asA.query(api.userPaints.listMine, {})).toEqual([
      { paintId: RED, owned: true, wishlisted: false, favorite: false, updatedAt: 1 },
    ]);
  });
});
