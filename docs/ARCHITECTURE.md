# Architecture

> Status: **Draft v0.2**. Rationale for each choice is recorded in `DECISIONS.md`.

## 1. System Overview

A client-side single-page app (SPA), installable as a Progressive Web App (PWA), and hosted as static files on Cloudflare Pages.

The system has two kinds of data:

1. **Paint catalog (public, read-only).** It lives in the Git repo as JSON files, is validated at build time, and ships to the browser as a static `catalog.json`. The service worker caches it for offline use. All search, filtering and color matching runs in the browser.
2. **User data (private).** User records and owned/wishlist entries are stored in Convex. The browser talks to Convex directly over its real-time client, and every Convex function checks authentication.

There is no custom server. Convex functions act as the backend.

---

## 2. Architecture Pattern

Pattern:
Static SPA + Backend-as-a-Service (serverless functions via Convex). One repo, organized like a modular monolith.

Reason:
- $0 hosting: static files plus free tiers
- No servers to maintain
- TypeScript end to end
- The catalog is small and changes rarely, so shipping it as a static file is the simplest, fastest and most offline-friendly option, and it uses no Convex quota

---

## 3. Technology Stack

Frontend:
- Vite + React + TypeScript (strict)
- TanStack Router (file-based routes, typed search params)
- shadcn/ui components (Radix primitives), restyled with plain CSS: one `.css` file per component, design tokens as CSS custom properties. No Tailwind, no CSS-in-JS.
- `vite-plugin-pwa` (Workbox) for the manifest and service worker
- Fuse.js for fuzzy search
- culori for color math (OKLab/Lab conversion, CIEDE2000 Delta-E)
- Zod for schema validation (catalog data, URL search params)

Backend:
- Convex (queries, mutations, schema, real-time sync)

Database:
- Convex document database (user data only)
- Git-versioned JSON files (paint catalog)

Authentication:
- Clerk (free tier) via `ConvexProviderWithClerk`; primary method is an email one-time code. See DECISIONS 005.

Storage:
- None for MVP (swatches are rendered from hex values in CSS). Convex file storage is available later if needed.

Hosting:
- Cloudflare Pages (static frontend)
- Convex Cloud (backend)

Payments:
- None

Email:
- Handled by Clerk (one-time code emails)

Analytics:
- **TBD:** optional Cloudflare Web Analytics (free, cookieless)

Other Services:
- GitHub (repo, Actions CI)

---

## 4. System Components

### Frontend (SPA / PWA)

Responsibilities:
- Render the UI and routing
- Load and cache `catalog.json`; build the search index in memory
- Parse the search query (name / hex / brand / hue) and run it; filter; compute equivalents (all client-side)
- Manage sign-in state
- Read/write user data through Convex hooks, with a local IndexedDB cache and outbox for offline use
- Handle offline state and update prompts through the service worker

### Backend (Convex functions)

Responsibilities:
- Authenticate every request (`ctx.auth.getUserIdentity()`)
- Create or look up the user record
- CRUD on `userPaints` for the signed-in user only
- Validate arguments with Convex validators

### Database (Convex)

Responsibilities:
- Persist `users` and `userPaints`
- Enforce indexes for per-user lookups

### Catalog Pipeline (build time)

Responsibilities:
- `data/catalog/*.json` → Zod validation → precompute Lab/LCh values, hue family and value band → emit `public/catalog.json` (with a version hash)
- Fail the build on invalid data, duplicate IDs or changed IDs

---

## 5. Architecture Diagram

```text
                 ┌──────────────────────────────┐
                 │  User's phone (installed PWA) │
                 │                              │
                 │  React SPA                   │
                 │   ├─ Catalog + Fuse index    │◄── catalog.json (static, cached by SW)
                 │   ├─ Color matching (culori) │
                 │   └─ Convex client  ─────────┼──► Convex (auth check → users / userPaints)
                 │  Service worker (Workbox)    │
                 └──────────────┬───────────────┘
                                │ static files
                                ▼
                       Cloudflare Pages (CDN)
                                ▲
                                │ build & deploy
                    GitHub repo (code + data/catalog)

Clerk issues the session JWT → Convex verifies it (auth.config.ts).
```

---

## 6. Data Flow

### Browse / search (no backend)
1. The app loads; the service worker serves `catalog.json` from cache (or the network on first visit)
2. The app builds the Fuse index in memory
3. The user types or filters → the URL search params update → the query parser (`src/features/catalog/parse-query.ts`) splits the input into:
   - hex code → rank all paints by Delta-E to that color
   - brand name(s) → brand filter
   - hue family name(s) → hue filter
   - remaining text → Fuse.js fuzzy name search
   → results are recomputed client-side
4. The user opens a paint → equivalents are computed client-side from precomputed Lab values

### Mark a paint as owned
1. The user taps "Own"
2. The UI updates optimistically
3. The change is written to the local outbox (IndexedDB) and the cached collection; if online, the Convex mutation `userPaints.set({ paintId, owned: true, clientUpdatedAt })` is called right away. If offline, it's sent automatically on reconnect.
4. Convex verifies the auth identity → resolves `userId`
5. The arguments are validated; the row is upserted
6. The Convex query `userPaints.listMine` re-runs automatically; all devices update
7. On a non-network error (e.g., validation) → revert the optimistic update, drop the outbox entry, and show a toast. Network errors leave the entry queued for retry.

---

## 7. Project Structure

```text
grimify/
├── convex/                  # Convex backend
│   ├── _generated/          # generated — never edit
│   ├── schema.ts
│   ├── users.ts
│   ├── userPaints.ts
│   ├── auth.config.ts       # Clerk issuer config
│   └── lib/auth.ts          # requireUser() helper
├── data/
│   └── catalog/             # source-of-truth paint data (one file per brand)
│       ├── citadel.json
│       ├── army-painter.json
│       ├── vallejo.json
│       └── published-ids.json  # ledger of permanent paint IDs (DECISIONS 016)
├── scripts/
│   ├── build-catalog.ts     # CLI: --validate | --build | --record-ids
│   └── catalog/             # pure validate / compile / ledger logic + tests
├── public/                  # static assets, icons, generated catalog.json (gitignored)
├── src/
│   ├── routes/              # TanStack Router file routes
│   ├── styles/
│   │   ├── tokens.css       # design tokens (colors, spacing, radius, shadows, type)
│   │   ├── base.css         # reset, body, typography defaults
│   │   └── index.css        # imports tokens + base (imported once in main.tsx)
│   ├── components/
│   │   ├── ui/              # shadcn/ui, converted: button.tsx + button.css, card.tsx + card.css…
│   │   └── …                # app components, each with its own .css (paint-row.tsx + paint-row.css)
│   ├── features/
│   │   ├── catalog/         # schema.ts (shared with scripts/), loading, query parsing, search, filters
│   │   ├── matching/        # color distance, equivalents, hue classification
│   │   ├── collection/      # owned / wishlist / favorites, offline outbox + cache
│   │   └── pwa/             # install banner, update prompt, offline status
│   ├── lib/                 # shared utils (formatters)
│   ├── types/               # shared TS types (Paint, Brand…)
│   └── main.tsx
├── lint/                    # local ESLint rule + lint config tests
├── tests/
│   └── e2e/                 # unit tests are colocated (TESTING.md §4)
├── docs/
└── package.json
```

---

## 8. Dependency Rules

- UI components never call Convex directly. They use hooks in `src/features/*` (e.g., `useMyPaints()`).
- Catalog data is read only through `src/features/catalog` (never import JSON directly in components).
- Color math lives only in `src/features/matching` as pure functions with no React imports.
- `src/components/ui` (shadcn) must not import from `src/features`.
- Convex functions must not import from `src/`. Shared types go in `convex/` or a shared `types` file that has no browser APIs.
- Paint IDs are the only link between catalog and user data.

---

## 9. Key Technical Decisions

See `DECISIONS.md`, entries 001–009: Vite SPA over Next.js, PWA, Convex, static catalog, Clerk auth, TanStack Router, Cloudflare Pages, client-side color matching, unified smart search.

---

## 10. Performance Considerations

- `catalog.json` should stay under ~500 KB gzipped (precompute Lab values; keep field names short if needed)
- Build the search index once; memoize filter results
- Virtualize long result lists (e.g., TanStack Virtual) if the list exceeds a few hundred rows
- First load: Lighthouse PWA and performance score of 90 or higher on mobile
- Equivalents: pre-filter by type, then compute Delta-E (a few thousand comparisons, well under 16 ms)

---

## 11. Scalability Considerations

- Catalog growth: when it passes ~10k paints or ~1 MB, split per brand and lazy-load
- Convex free-tier limits (function calls, bandwidth): avoid polling; rely on reactive queries; never store the catalog in Convex for MVP
- Monitor usage in the Convex dashboard

---

## 12. Failure Scenarios

| Scenario | Expected behavior |
|---|---|
| Offline | Catalog, search and equivalents work. The collection shows its cached state. Own/Want toggles are queued in the outbox and synced on reconnect. An "Offline" indicator and "n changes waiting to sync" are shown. |
| Convex unavailable / times out | Collection features show an inline error with Retry; the catalog is unaffected |
| Auth provider fails | Sign-in screen shows an error; browsing still works |
| `catalog.json` fails to load (first visit, offline) | Full-screen error: "Connect to the internet once to download the paint catalog" |
| New app version deployed | Service worker detects it → "Update available — Reload" toast |
| Unknown `paintId` in the user's collection | Hide it from lists; log a warning |
