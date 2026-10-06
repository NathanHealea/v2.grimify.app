# Testing

> Status: **Draft v0.2**

## 1. Testing Goals

Critical functionality:
- Catalog data is valid (IDs unique and immutable, hex valid, references resolve)
- Search and filters return the correct paints
- Color equivalents are computed correctly and ranked sensibly
- Own/Want state saves, syncs and is only visible to its owner
- The app installs and works offline as a PWA

---

## 2. Test Types

### Unit Testing
Test:
- `features/matching`: hex → Lab conversion, Delta-E, `findEquivalents` (type-family filtering, "show all" toggle, ranking, thresholds)
- `features/collection`: outbox (queue, collapse duplicates, flush order, keep on network error, drop on validation error)
- `features/catalog`: query parser (`parse-query`): hex detection (`#abc`, `abc123`, invalid hex), brand detection (case/alias), hue names (`red-orange`, `red orange`), combinations, plain text fallback
- `features/catalog`: search (fuzzy, aliases), filter combinations, URL search-param parsing
- `features/matching`: hue classification (known reference colors → expected family; neutral threshold; `hueOverride` wins)
- `scripts/build-catalog`: validation rules (duplicate ID, bad hex, missing brand, removed ID → fail)
- Small components where the logic is non-trivial (e.g., `PaintSwatch` black/white label choice)

### Integration Testing
Test (with `convex-test`):
- `users.store` is idempotent
- `userPaints.set` inserts, then updates (no duplicate rows); owned and wishlisted are independent
- `userPaints.set` deletes the row when both flags are false
- `userPaints.set` ignores an older `clientUpdatedAt` (last-write-wins); replaying is idempotent
- Unauthenticated calls throw `UNAUTHENTICATED`
- User A cannot read or modify user B's data
- `users.deleteAccount` removes all of the user's data

### End-to-End Testing
Test critical user journeys (Playwright with mobile device emulation: iPhone 15 and Pixel 7 profiles):
- Search → open paint → see equivalents
- Type a hex code → closest paints across brands appear
- Type a brand name → brand chip + only that brand's paints
- Tap a hue dot → only that hue family
- Filter by brand/type → URL updates → reload keeps filters
- Sign in (test-mode auth) → mark owned → appears in My Paints
- Offline: load app, go offline (`context.setOffline(true)`), search still works
- Offline toggle: go offline, mark a paint owned, go online → change synced (visible after reload)

### Manual Testing (real devices, before each release)
Automated tools can't fully cover installed iOS PWA behavior:
- [ ] iPhone: Add to Home Screen → opens standalone, safe areas correct
- [ ] iPhone installed PWA: sign in with email code works without leaving the app
- [ ] iPhone installed PWA: airplane mode → catalog and search work
- [ ] iPhone installed PWA: airplane mode → mark paint owned → turn off airplane mode → synced to another device
- [ ] Android: install prompt → standalone
- [ ] Update prompt appears after a new deploy

---

## 3. Testing Tools

Unit: Vitest (+ @testing-library/react for components)
Integration: Vitest + `convex-test`
E2E: Playwright
PWA audit: Lighthouse (Chrome DevTools or `@lhci/cli` in CI, optional)

---

## 4. Test File Structure

```text
src/**/*.test.ts(x)     # unit tests colocated next to the code
convex/**/*.test.ts     # Convex integration tests (convex-test)
scripts/**/*.test.ts    # catalog build/validation tests
tests/
└── e2e/                # Playwright specs
    ├── catalog.spec.ts
    ├── collection.spec.ts
    └── offline.spec.ts
```

---

## 5. Critical User Flows

Flow: Find an equivalent
Steps:
1. Open `/paints`
2. Search "Mephiston"
3. Open "Mephiston Red"
Expected result: the detail page shows equivalents from at least one other brand, ranked closest first.

Flow: Save a paint
Steps:
1. Sign in as the test user
2. Mark a paint as Own
3. Open My Paints → Owned
Expected result: the paint is listed; after a reload it's still listed.

Flow: Offline catalog
Steps:
1. Load the app once online
2. Go offline and reload
3. Search for a paint
Expected result: results appear; the "Offline" indicator is visible.

---

## 6. Coverage

Target: no global % target. Aim for ~90% on `features/matching`, `features/catalog` and `convex/`.

Prioritize:
- Color-matching logic
- Catalog validation
- Authorization in Convex functions
- Data mutations
- The three critical flows above

---

## 7. Commands

| Purpose | Command |
|---|---|
| Unit + integration tests | `npm test` (Vitest) |
| E2E | `npm run test:e2e` (Playwright) |
| Lint | `npm run lint` |
| Type check | `npm run typecheck` (`tsc -b`) |
| Validate catalog | `npm run catalog:validate` |
| Build | `npm run build` (runs `catalog:build` first) |
| All checks | `npm run check` (lint + typecheck + test + catalog:validate) |

---

## 8. Definition of Done

- Tests pass
- Build passes
- Lint passes
- Type checking passes
- Catalog validates
- Critical flow verified (E2E, or manually on a phone for PWA-specific changes)
- No blocking console errors
