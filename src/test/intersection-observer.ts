type Callback = (entries: { isIntersecting: boolean }[]) => void;

const observers = new Set<{ callback: Callback; observed: boolean }>();

/** jsdom has no IntersectionObserver; this records observers so tests can scroll them into view. */
export class FakeIntersectionObserver {
  private readonly entry: { callback: Callback; observed: boolean };

  constructor(callback: Callback) {
    this.entry = { callback, observed: false };
    observers.add(this.entry);
  }

  observe() {
    this.entry.observed = true;
  }

  disconnect() {
    observers.delete(this.entry);
  }

  unobserve() {}

  takeRecords() {
    return [];
  }
}

export function triggerIntersection(isIntersecting = true) {
  for (const { callback, observed } of [...observers]) {
    if (observed) callback([{ isIntersecting }]);
  }
}
