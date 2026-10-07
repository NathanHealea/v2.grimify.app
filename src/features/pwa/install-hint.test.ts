import { describe, expect, it } from "vitest";

import {
  DISMISS_FOR_MS,
  HINT_DELAY_MS,
  isIosDevice,
  readDismissedAt,
  recordVisit,
  shouldShowIosHint,
} from "./install-hint";

const now = Date.UTC(2026, 9, 7);
const base = { isIos: true, standalone: false, visits: 1, elapsedMs: 0, now };
const DAY = 24 * 60 * 60 * 1000;

function memoryStore() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
  };
}

describe("shouldShowIosHint", () => {
  it("decides when to show the iOS install hint", () => {
    expect(shouldShowIosHint({ ...base, isIos: false, visits: 5 })).toBe(false);
    expect(shouldShowIosHint({ ...base, standalone: true, visits: 5 })).toBe(false);
    expect(shouldShowIosHint({ ...base, elapsedMs: HINT_DELAY_MS - 1 })).toBe(false);
    expect(shouldShowIosHint({ ...base, elapsedMs: HINT_DELAY_MS })).toBe(true);
    expect(shouldShowIosHint({ ...base, visits: 2 })).toBe(true);
    expect(shouldShowIosHint({ ...base, visits: 2, dismissedAt: now - 29 * DAY })).toBe(false);
    expect(shouldShowIosHint({ ...base, visits: 2, dismissedAt: now - 31 * DAY })).toBe(true);
    expect(DISMISS_FOR_MS).toBe(30 * DAY);
  });

  it("recognizes iPhone, iPad and iPadOS-as-Mac", () => {
    expect(isIosDevice("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)", 5)).toBe(true);
    expect(isIosDevice("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 5)).toBe(true);
    expect(isIosDevice("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 0)).toBe(false);
    expect(isIosDevice("Mozilla/5.0 (Linux; Android 14; Pixel 7)", 5)).toBe(false);
  });
});

describe("visit storage", () => {
  it("counts one visit per session", () => {
    const local = memoryStore();
    expect(recordVisit(local, memoryStore())).toBe(1);
    const session = memoryStore();
    expect(recordVisit(local, session)).toBe(2);
    expect(recordVisit(local, session)).toBe(2);
  });

  it("treats broken storage as no history", () => {
    const broken = {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    };
    expect(recordVisit(broken, broken)).toBe(1);
    expect(readDismissedAt(broken)).toBeUndefined();
  });
});
