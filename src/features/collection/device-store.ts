import { del, get, set } from "idb-keyval";

import type { FlagChange } from "./use-set-paint-flags";

export type StoredRow = {
  paintId: string;
  owned: boolean;
  wishlisted: boolean;
  favorite: boolean;
  updatedAt: number;
};

export type OutboxEntry = FlagChange & { paintId: string; clientUpdatedAt: number };

/** What this device remembers between launches: whose collection it is, the last copy (once loaded), and unsent changes. */
export type DeviceRecord = { userId: string; rows?: StoredRow[]; outbox: OutboxEntry[] };

const KEY = "grimify-device";

export async function readDeviceRecord(): Promise<DeviceRecord | undefined> {
  return get<DeviceRecord>(KEY);
}

export async function writeDeviceRecord(record: DeviceRecord): Promise<void> {
  return set(KEY, record);
}

export async function clearDeviceRecord(): Promise<void> {
  return del(KEY);
}
