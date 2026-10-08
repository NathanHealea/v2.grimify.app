import { ConvexError } from "convex/values";

import type { OutboxEntry, StoredRow } from "./device-store";

// userPaints.set rejects these for the change itself, so retrying can never succeed.
const VALIDATION_CODES: ReadonlySet<unknown> = new Set([
  "INVALID_PAINT_ID",
  "NO_FLAGS",
  "CLOCK_IN_FUTURE",
]);

/** Adds a change, merging it into the paint's pending entry so each paint is sent once. */
export function enqueue(outbox: readonly OutboxEntry[], change: OutboxEntry): OutboxEntry[] {
  const existing = outbox.find((entry) => entry.paintId === change.paintId);
  if (!existing) return [...outbox, change];
  const merged: OutboxEntry = {
    ...existing,
    ...change,
    clientUpdatedAt: Math.max(existing.clientUpdatedAt, change.clientUpdatedAt),
  };
  return outbox.map((entry) => (entry === existing ? merged : entry));
}

/** Removes a sent entry unless the paint was changed again while it was in flight. */
export function removeSent(outbox: readonly OutboxEntry[], sent: OutboxEntry): OutboxEntry[] {
  return outbox.filter(
    (entry) => entry.paintId !== sent.paintId || entry.clientUpdatedAt !== sent.clientUpdatedAt,
  );
}

/** The rows as they'll be once the outbox is sent, using userPaints.set's merge rule. */
export function applyOutbox(
  rows: readonly StoredRow[],
  outbox: readonly OutboxEntry[],
): StoredRow[] {
  const byPaint = new Map(rows.map((row) => [row.paintId, row]));
  for (const entry of outbox) {
    const row = byPaint.get(entry.paintId);
    byPaint.set(entry.paintId, {
      paintId: entry.paintId,
      owned: entry.owned ?? row?.owned ?? false,
      wishlisted: entry.wishlisted ?? row?.wishlisted ?? false,
      favorite: entry.favorite ?? row?.favorite ?? false,
      updatedAt: entry.clientUpdatedAt,
    });
  }
  return [...byPaint.values()].filter((row) => row.owned || row.wishlisted || row.favorite);
}

/** Sends pending entries oldest first; stops at the first failure that a retry could fix. */
export async function flushOutbox(
  getOutbox: () => readonly OutboxEntry[],
  send: (entry: OutboxEntry) => Promise<void>,
  settle: (entry: OutboxEntry, outcome: "sent" | "dropped") => void,
): Promise<"done" | "stopped"> {
  const pending = [...getOutbox()].sort((a, b) => a.clientUpdatedAt - b.clientUpdatedAt);
  for (const entry of pending) {
    // Gone means discarded (sign-out, another user) or replaced by a newer change sent later.
    const current = getOutbox().some(
      (queued) =>
        queued.paintId === entry.paintId && queued.clientUpdatedAt === entry.clientUpdatedAt,
    );
    if (!current) continue;
    try {
      await send(entry);
    } catch (error) {
      if (error instanceof ConvexError && VALIDATION_CODES.has(error.data)) {
        settle(entry, "dropped");
        continue;
      }
      return "stopped";
    }
    settle(entry, "sent");
  }
  return "done";
}
