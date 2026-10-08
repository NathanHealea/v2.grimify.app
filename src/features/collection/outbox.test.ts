import { ConvexError } from "convex/values";
import { describe, expect, it, vi } from "vitest";

import type { OutboxEntry, StoredRow } from "./device-store";
import { applyOutbox, enqueue, flushOutbox, removeSent } from "./outbox";

const RED = "citadel-base-mephiston-red";
const BLUE = "citadel-base-macragge-blue";
const GREEN = "citadel-base-caliban-green";

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe("outbox", () => {
  it("collapses changes to one paint", () => {
    const other: OutboxEntry = { paintId: BLUE, wishlisted: true, clientUpdatedAt: 500 };
    const start: OutboxEntry[] = [
      other,
      { paintId: RED, owned: true, favorite: true, clientUpdatedAt: 1_000 },
    ];

    const result = enqueue(start, { paintId: RED, owned: false, clientUpdatedAt: 2_000 });

    expect(result).toHaveLength(2);
    expect(result.filter((entry) => entry.paintId === RED)).toEqual([
      { paintId: RED, owned: false, favorite: true, clientUpdatedAt: 2_000 },
    ]);
    expect(result).toContainEqual(other);
    expect(start).toEqual([
      other,
      { paintId: RED, owned: true, favorite: true, clientUpdatedAt: 1_000 },
    ]);
  });

  it("applies pending changes to rows", () => {
    const rows: StoredRow[] = [
      { paintId: RED, owned: true, wishlisted: false, favorite: true, updatedAt: 100 },
      { paintId: BLUE, owned: true, wishlisted: false, favorite: false, updatedAt: 100 },
    ];
    const outbox: OutboxEntry[] = [
      { paintId: RED, owned: false, clientUpdatedAt: 1_000 },
      { paintId: BLUE, owned: false, clientUpdatedAt: 1_000 },
      { paintId: GREEN, wishlisted: true, clientUpdatedAt: 1_000 },
    ];

    const result = applyOutbox(rows, outbox);

    expect(result.map((row) => row.paintId).sort()).toEqual([GREEN, RED].sort());
    expect(result.find((row) => row.paintId === RED)).toMatchObject({
      owned: false,
      wishlisted: false,
      favorite: true,
    });
    expect(result.find((row) => row.paintId === GREEN)).toMatchObject({
      owned: false,
      wishlisted: true,
      favorite: false,
    });
  });

  it("flushes oldest first and removes after success", async () => {
    let outbox: OutboxEntry[] = [
      { paintId: BLUE, owned: true, clientUpdatedAt: 3_000 },
      { paintId: RED, owned: true, clientUpdatedAt: 1_000 },
      { paintId: GREEN, wishlisted: true, clientUpdatedAt: 2_000 },
    ];
    const sent: string[] = [];
    const pending = new Map<string, ReturnType<typeof deferred>>();
    const send = vi.fn((entry: OutboxEntry) => {
      sent.push(entry.paintId);
      const gate = deferred();
      pending.set(entry.paintId, gate);
      return gate.promise;
    });
    const settle = vi.fn((entry: OutboxEntry, outcome: "sent" | "dropped") => {
      expect(outcome).toBe("sent");
      outbox = removeSent(outbox, entry);
    });

    const flushing = flushOutbox(() => outbox, send, settle);

    await vi.waitFor(() => expect(sent).toEqual([RED]));
    expect(settle).not.toHaveBeenCalled();
    expect(outbox.map((entry) => entry.paintId)).toContain(RED);

    outbox = enqueue(outbox, { paintId: RED, owned: false, clientUpdatedAt: 4_000 });
    pending.get(RED)!.resolve();

    await vi.waitFor(() => expect(sent).toEqual([RED, GREEN]));
    expect(settle).toHaveBeenCalledTimes(1);
    pending.get(GREEN)!.resolve();

    await vi.waitFor(() => expect(sent).toEqual([RED, GREEN, BLUE]));
    pending.get(BLUE)!.resolve();

    await expect(flushing).resolves.toBe("done");
    expect(settle).toHaveBeenCalledTimes(3);
    expect(outbox).toEqual([{ paintId: RED, owned: false, clientUpdatedAt: 4_000 }]);
  });

  it("stops sending entries removed mid-flush", async () => {
    let outbox: OutboxEntry[] = [
      { paintId: RED, owned: true, clientUpdatedAt: 1_000 },
      { paintId: GREEN, owned: true, clientUpdatedAt: 2_000 },
    ];
    const sent: string[] = [];
    const send = vi.fn((entry: OutboxEntry) => {
      sent.push(entry.paintId);
      // Signing out discards the outbox while the first send is in flight.
      outbox = [];
      return Promise.resolve();
    });

    await expect(
      flushOutbox(
        () => outbox,
        send,
        () => {},
      ),
    ).resolves.toBe("done");
    expect(sent).toEqual([RED]);
  });

  it("drops validation errors and keeps the rest", async () => {
    const invalid: OutboxEntry = { paintId: RED, clientUpdatedAt: 1_000 };
    const valid: OutboxEntry = { paintId: GREEN, owned: true, clientUpdatedAt: 2_000 };
    const settled: Array<[string, string]> = [];
    const settle = (entry: OutboxEntry, outcome: "sent" | "dropped") => {
      settled.push([entry.paintId, outcome]);
    };

    const dropResult = await flushOutbox(
      () => [valid, invalid],
      (entry) =>
        entry.paintId === RED ? Promise.reject(new ConvexError("NO_FLAGS")) : Promise.resolve(),
      settle,
    );

    expect(dropResult).toBe("done");
    expect(settled).toEqual([
      [RED, "dropped"],
      [GREEN, "sent"],
    ]);

    for (const failure of [new Error("network down"), new ConvexError("UNAUTHENTICATED")]) {
      settled.length = 0;
      const first: OutboxEntry = { paintId: RED, owned: true, clientUpdatedAt: 1_000 };
      const later: OutboxEntry = { paintId: BLUE, owned: true, clientUpdatedAt: 2_000 };
      const send = vi.fn(() => Promise.reject(failure));

      const result = await flushOutbox(() => [later, first], send, settle);

      expect(result).toBe("stopped");
      expect(send).toHaveBeenCalledTimes(1);
      expect(send).toHaveBeenCalledWith(first);
      expect(settled).toEqual([]);
    }
  });
});
