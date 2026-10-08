import { useUser } from "@clerk/react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useToast } from "@/features/feedback/toast-provider";

import { api } from "../../../convex/_generated/api";
import {
  clearDeviceRecord,
  type DeviceRecord,
  readDeviceRecord,
  writeDeviceRecord,
} from "./device-store";
import { applyOutbox, enqueue, flushOutbox, removeSent } from "./outbox";
import type { FlagChange } from "./use-set-paint-flags";

export type PaintFlags = { owned: boolean; wishlisted: boolean; favorite: boolean };

const NO_FLAGS: PaintFlags = { owned: false, wishlisted: false, favorite: false };

function save(record: DeviceRecord | undefined) {
  (record ? writeDeviceRecord(record) : clearDeviceRecord()).catch((error: unknown) => {
    console.error("Couldn't save the device record", error);
  });
}

export const DROPPED_MESSAGE = "Couldn't save that change.";

export type CollectionState = {
  /** True until a cached or live collection exists for the device's user. */
  loading: boolean;
  flags: ReadonlyMap<string, PaintFlags>;
  owned: ReadonlySet<string>;
  wishlisted: ReadonlySet<string>;
  favorites: ReadonlySet<string>;
  /** Changes in the device user's outbox not yet sent. */
  pending: number;
};

const EMPTY: CollectionState = {
  loading: false,
  flags: new Map(),
  owned: new Set(),
  wishlisted: new Set(),
  favorites: new Set(),
  pending: 0,
};

const CollectionContext = createContext<CollectionState>(EMPTY);

type Writer = (paintId: string, change: FlagChange) => void;

const WriterContext = createContext<{
  write: Writer;
  clear: () => void;
  userId: string | undefined;
}>({
  write: () => {
    throw new Error("useSetPaintFlags must be used inside CollectionProvider");
  },
  clear: () => {
    throw new Error("useClearDevice must be used inside CollectionProvider");
  },
  userId: undefined,
});

/**
 * Holds the device user's collection for the whole app: the live listMine answer or the copy stored
 * on the device, with unsent outbox changes applied on top, and sends the outbox when it can.
 */
export function CollectionProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, user } = useUser();
  const { isAuthenticated } = useConvexAuth();
  const toast = useToast();
  // Skipped until Convex has the session: an unauthenticated listMine answers [] and would show a
  // signed-in user an empty collection for a moment after every load.
  const rows = useQuery(api.userPaints.listMine, isAuthenticated ? {} : "skip");
  const me = useQuery(api.users.me, isAuthenticated ? {} : "skip");
  const send = useMutation(api.userPaints.set);

  const [stored, setStored] = useState<{ read: boolean; record?: DeviceRecord }>({ read: false });
  // The latest record without waiting for a render, so back-to-back changes and flush results stack.
  const recordRef = useRef<DeviceRecord | undefined>(undefined);

  useEffect(() => {
    let mounted = true;
    void readDeviceRecord()
      .catch((error: unknown) => {
        console.error("Couldn't read the device record", error);
        return undefined;
      })
      .then((record) => {
        if (!mounted) return;
        const early = recordRef.current;
        // A change made before the read finished goes on top of what was stored for the same user.
        const merged =
          early && record?.userId === early.userId
            ? {
                userId: early.userId,
                rows: early.rows ?? record.rows,
                outbox: early.outbox.reduce(enqueue, record.outbox),
              }
            : (early ?? record);
        recordRef.current = merged;
        setStored({ read: true, record: merged });
        if (merged && merged !== record) save(merged);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const commit = useCallback((next: DeviceRecord | undefined) => {
    recordRef.current = next;
    setStored((previous) => ({ read: previous.read, record: next }));
    save(next);
  }, []);

  const clerkUserId = isSignedIn ? user?.id : undefined;
  // Offline, Clerk never loads, so the stored user stands in until it does (DECISIONS 036).
  const deviceUserId = isLoaded ? clerkUserId : stored.record?.userId;
  const mine = stored.record?.userId === deviceUserId ? stored.record : undefined;

  useEffect(() => {
    const record = recordRef.current;
    if (clerkUserId && record && record.userId !== clerkUserId) commit(undefined);
  }, [clerkUserId, stored, commit]);

  // Set by sign-out until Clerk drops the user, so a late listMine answer can't re-save their record.
  const signingOut = useRef(false);
  useEffect(() => {
    signingOut.current = false;
  }, [clerkUserId]);

  useEffect(() => {
    if (!rows || !clerkUserId || !stored.read || signingOut.current) return;
    const record = recordRef.current;
    commit({
      userId: clerkUserId,
      rows,
      outbox: record?.userId === clerkUserId ? record.outbox : [],
    });
  }, [rows, clerkUserId, stored.read, commit]);

  const canFlush = isAuthenticated && !!me && !!clerkUserId && stored.read;
  const canFlushRef = useRef(canFlush);
  useEffect(() => {
    canFlushRef.current = canFlush;
  }, [canFlush]);
  const flushing = useRef(false);
  const flushAgain = useRef(false);

  const flush = useCallback(async () => {
    if (flushing.current) {
      flushAgain.current = true;
      return;
    }
    flushing.current = true;
    try {
      let result: "done" | "stopped";
      do {
        flushAgain.current = false;
        result = await flushOutbox(
          () => recordRef.current?.outbox ?? [],
          async (entry) => {
            await send(entry);
          },
          (entry, outcome) => {
            const record = recordRef.current;
            if (record) commit({ ...record, outbox: removeSent(record.outbox, entry) });
            if (outcome === "dropped") toast(DROPPED_MESSAGE);
          },
        );
      } while (result === "done" && flushAgain.current && canFlushRef.current);
    } finally {
      flushing.current = false;
    }
  }, [send, commit, toast]);

  useEffect(() => {
    if (!canFlush) return;
    void flush();
    const onOnline = () => void flush();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [canFlush, flush]);

  const write = useCallback<Writer>(
    (paintId, change) => {
      if (!deviceUserId) throw new Error("useSetPaintFlags called with no signed-in user");
      const record = recordRef.current;
      const base = record?.userId === deviceUserId ? record : { userId: deviceUserId, outbox: [] };
      const entry = { paintId, ...change, clientUpdatedAt: Date.now() };
      commit({ ...base, outbox: enqueue(base.outbox, entry) });
      if (canFlushRef.current) void flush();
    },
    [deviceUserId, commit, flush],
  );

  const clear = useCallback(() => {
    signingOut.current = true;
    commit(undefined);
  }, [commit]);
  const writer = useMemo(
    () => ({ write, clear, userId: deviceUserId }),
    [write, clear, deviceUserId],
  );

  const base = rows ?? mine?.rows;
  const outbox = mine?.outbox;
  const state = useMemo((): CollectionState => {
    const list = applyOutbox(base ?? [], outbox ?? []);
    return {
      loading: !stored.read || (deviceUserId === undefined ? !isLoaded : base === undefined),
      flags: new Map(
        list.map(({ paintId, owned, wishlisted, favorite }) => [
          paintId,
          { owned, wishlisted, favorite },
        ]),
      ),
      owned: new Set(list.filter((row) => row.owned).map((row) => row.paintId)),
      wishlisted: new Set(list.filter((row) => row.wishlisted).map((row) => row.paintId)),
      favorites: new Set(list.filter((row) => row.favorite).map((row) => row.paintId)),
      pending: outbox?.length ?? 0,
    };
  }, [base, outbox, stored.read, deviceUserId, isLoaded]);

  return (
    <WriterContext.Provider value={writer}>
      <CollectionContext.Provider value={state}>{children}</CollectionContext.Provider>
    </WriterContext.Provider>
  );
}

export function usePaintFlags(paintId: string): PaintFlags {
  return useContext(CollectionContext).flags.get(paintId) ?? NO_FLAGS;
}

export function useCollection(): CollectionState {
  return useContext(CollectionContext);
}

/** The outbox writer behind useSetPaintFlags; components use that hook, not this. */
export function useCollectionWriter(): Writer {
  return useContext(WriterContext).write;
}

/** Forgets this device's stored collection and unsent changes, for signing out. */
export function useClearDevice(): () => void {
  return useContext(WriterContext).clear;
}

/** The user whose collection this device holds: Clerk's, or the stored one while Clerk can't load. */
export function useDeviceUserId(): string | undefined {
  return useContext(WriterContext).userId;
}
