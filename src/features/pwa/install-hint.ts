/** UX_FLOWS Flow 1: hint from the 2nd visit or after ~30 s, and "Not now" hides it for 30 days. */
export const HINT_DELAY_MS = 30_000;
export const DISMISS_FOR_MS = 30 * 24 * 60 * 60 * 1000;

const VISITS_KEY = "grimify:visits";
const VISIT_COUNTED_KEY = "grimify:visit-counted";
const DISMISSED_KEY = "grimify:install-dismissed-at";

type KeyValueStore = Pick<Storage, "getItem" | "setItem">;

export function shouldShowIosHint({
  isIos,
  standalone,
  visits,
  elapsedMs,
  dismissedAt,
  now,
}: {
  isIos: boolean;
  standalone: boolean;
  visits: number;
  elapsedMs: number;
  dismissedAt?: number;
  now: number;
}): boolean {
  if (!isIos || standalone || isDismissed(dismissedAt, now)) return false;
  return visits >= 2 || elapsedMs >= HINT_DELAY_MS;
}

export function isDismissed(dismissedAt: number | undefined, now: number): boolean {
  return dismissedAt !== undefined && now - dismissedAt < DISMISS_FOR_MS;
}

/** iPadOS reports itself as a Mac, so a touch-capable "Macintosh" counts as iOS too. */
export function isIosDevice(userAgent: string, maxTouchPoints: number): boolean {
  return /iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1);
}

export function isStandalone(): boolean {
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return iosStandalone || window.matchMedia?.("(display-mode: standalone)").matches === true;
}

/** Counts one visit per browser session; idempotent within a session, so re-renders don't inflate it. */
export function recordVisit(
  local: KeyValueStore | undefined = localStore(),
  session: KeyValueStore | undefined = sessionStore(),
) {
  const visits = Number(read(local, VISITS_KEY) ?? 0) || 0;
  if (read(session, VISIT_COUNTED_KEY)) return visits;
  write(session, VISIT_COUNTED_KEY, "1");
  write(local, VISITS_KEY, String(visits + 1));
  return visits + 1;
}

export function readDismissedAt(
  local: KeyValueStore | undefined = localStore(),
): number | undefined {
  const value = Number(read(local, DISMISSED_KEY));
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

export function rememberDismissal(now: number, local: KeyValueStore | undefined = localStore()) {
  write(local, DISMISSED_KEY, String(now));
}

// Storage can be missing or throw (private mode, blocked site data); the hint is a nicety, so failures are ignored.
function read(store: KeyValueStore | undefined, key: string): string | null {
  try {
    return store?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function write(store: KeyValueStore | undefined, key: string, value: string) {
  try {
    store?.setItem(key, value);
  } catch {
    // See read(): storage is optional here.
  }
}

function localStore(): KeyValueStore | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function sessionStore(): KeyValueStore | undefined {
  try {
    return window.sessionStorage;
  } catch {
    return undefined;
  }
}
