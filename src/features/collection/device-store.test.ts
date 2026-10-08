import { describe, expect, it, vi } from "vitest";

import {
  clearDeviceRecord,
  type DeviceRecord,
  readDeviceRecord,
  writeDeviceRecord,
} from "./device-store";

const idb = vi.hoisted(() => new Map<IDBValidKey, unknown>());

vi.mock("idb-keyval", () => ({
  get: (key: IDBValidKey) => Promise.resolve(idb.get(key)),
  set: (key: IDBValidKey, value: unknown) => {
    idb.set(key, value);
    return Promise.resolve();
  },
  del: (key: IDBValidKey) => {
    idb.delete(key);
    return Promise.resolve();
  },
}));

describe("device store", () => {
  it("persists the device record", async () => {
    const record: DeviceRecord = {
      userId: "user_test_1",
      rows: [
        {
          paintId: "citadel-base-mephiston-red",
          owned: true,
          wishlisted: false,
          favorite: true,
          updatedAt: 1_000,
        },
      ],
      outbox: [{ paintId: "citadel-base-mephiston-red", favorite: true, clientUpdatedAt: 2_000 }],
    };

    expect(await readDeviceRecord()).toBeUndefined();

    await writeDeviceRecord(record);
    expect(await readDeviceRecord()).toEqual(record);

    await clearDeviceRecord();
    expect(await readDeviceRecord()).toBeUndefined();
  });
});
