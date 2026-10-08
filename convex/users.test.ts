/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const ISSUER = "https://actual-squirrel-9784.clerk.accounts.dev";

describe("users", () => {
  it("stores one user per identity", async () => {
    const t = convexTest(schema, modules);
    const asA = t.withIdentity({ subject: "a", issuer: ISSUER });

    const first = await asA.mutation(api.users.store, {});
    const second = await asA.mutation(api.users.store, {});

    expect(second).toBe(first);
    const rows = await t.run((ctx) => ctx.db.query("users").collect());
    expect(rows).toHaveLength(1);
    const { _id, _creationTime, ...fields } = rows[0];
    expect(_id).toBe(first);
    expect(_creationTime).toEqual(expect.any(Number));
    expect(fields).toEqual({ tokenIdentifier: `${ISSUER}|a` });
  });

  it("keeps identities apart", async () => {
    const t = convexTest(schema, modules);
    const a = await t.withIdentity({ subject: "a", issuer: ISSUER }).mutation(api.users.store, {});
    const b = await t.withIdentity({ subject: "b", issuer: ISSUER }).mutation(api.users.store, {});

    expect(b).not.toBe(a);
  });

  it("rejects unauthenticated calls", async () => {
    const t = convexTest(schema, modules);

    await expect(t.mutation(api.users.store, {})).rejects.toThrow("UNAUTHENTICATED");
  });

  it("returns only the caller from me", async () => {
    const t = convexTest(schema, modules);
    const asA = t.withIdentity({ subject: "a", issuer: ISSUER });
    const asB = t.withIdentity({ subject: "b", issuer: ISSUER });

    expect(await t.query(api.users.me, {})).toBeNull();
    const id = await asA.mutation(api.users.store, {});
    expect(await asA.query(api.users.me, {})).toEqual({ _id: id });
    expect(await asB.query(api.users.me, {})).toBeNull();
  });
});
