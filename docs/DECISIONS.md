# Architecture Decisions

> Status values: **Accepted** (decided) · **Proposed** (recommended, awaiting confirmation) · **Superseded**

## Decision 001 — Vite + React SPA instead of Next.js

Date: 2026-10-05
Status: Accepted

Context:
The app is primarily an installed mobile tool, not a content site. Convex acts as the backend, so a server framework adds little.

Decision:
Vite + React + TypeScript single-page app.

Alternatives:
- Next.js (App Router)
- Astro + React islands
- Hugo (rejected: Go templates, not JS/TS; too static for an interactive app)

Reason:
A simpler mental model for AI-generated code (no server/client components, no hydration bugs), static output hosts free anywhere, and it's the best fit for a PWA.

Consequences:
Positive: simple, fast dev, free static hosting.
Trade-off: weak SEO for individual paint pages. Revisit with Astro or prerendering if search traffic matters.

---

## Decision 002 — Progressive Web App (installable, offline)

Date: 2026-10-05
Status: Accepted

Context:
The goal is an app users open on their phone and save to the home screen, without app stores.

Decision:
Build as a PWA using `vite-plugin-pwa` (Workbox), with an offline-cached catalog.

Alternatives:
- Native apps (React Native/Expo): app store costs and review
- Plain website: no install, no offline

Consequences:
Positive: free distribution, one codebase.
Trade-off: iOS quirks (no install prompt, auth redirects leave the app, storage rules) need specific handling.

---

## Decision 003 — Convex for backend and user data

Date: 2026-10-05
Status: Accepted

Context:
Need a free database, auth integration and real-time sync with strong TypeScript support for AI-assisted coding.

Decision:
Convex (schema, queries, mutations) for user data.

Alternatives:
- Supabase (Postgres + Auth + Storage): SQL is more flexible, but free projects pause after ~1 week of inactivity, and RLS is harder to get right
- Cloudflare D1 + Workers + Better Auth: more wiring

Reason:
All TypeScript, end-to-end types, reactive queries, authorization in plain TS, and AI rules available.

Consequences:
Positive: fast development; real-time sync across devices.
Trade-off: no SQL; higher vendor lock-in (mitigated: the backend is open source and self-hostable). Free-tier usage limits must be watched.

---

## Decision 004 — Paint catalog as static JSON in Git (not in the database)

Date: 2026-10-05
Status: Proposed

Context:
The catalog is a few thousand public, rarely changing records. It must work offline, and search and color matching should be instant.

Decision:
Store the catalog in `data/catalog/*.json`, validate it at build time, and ship it as `public/catalog.json`, cached by the service worker. Convex stores only user data, referencing paints by immutable string ID.

Alternatives:
- Store the catalog in Convex (uses function calls and bandwidth on every browse; offline is harder)
- Hybrid (catalog in both)

Reason:
Zero backend cost for browsing; fully offline; version history and pull-request review for data corrections.

Consequences:
Positive: fast, free, offline, auditable.
Trade-off: catalog updates require a redeploy; no in-app catalog editing; paint IDs must never change.

---

## Decision 005 — Clerk for authentication

Date: 2026-10-05
Status: Accepted

Context:
Need free auth that works inside an installed iOS PWA and integrates with Convex.

Decision:
Clerk, using its official Convex integration (`ConvexProviderWithClerk`). The primary method is an **email one-time code**.

Alternatives:
- Convex Auth: everything in Convex, but more setup and needs a separate email service
- Better Auth: open source, more wiring

Reason:
Most polished option, with prebuilt sign-in UI, a generous free tier, and less code for an AI agent to get wrong.

Consequences:
Positive: fast to set up; production-grade sessions.
Trade-off: an extra external service; users live in Clerk and are mirrored into Convex `users` via `users.store`. Magic links aren't used (they open Safari, not the installed PWA).

---

## Decision 006 — TanStack Router

Date: 2026-10-05
Status: Accepted

Context:
The main screen is a filterable list; filter state should live in the URL.

Decision:
TanStack Router with file-based routes and Zod-validated search params.

Alternatives:
React Router v7 (more examples available, but weaker typing and API churn across versions)

Consequences:
Positive: type-safe links, params and search params.
Trade-off: smaller ecosystem; a slightly steeper start.

---

## Decision 007 — Cloudflare Pages hosting

Date: 2026-10-05
Status: Proposed

Context:
Free static hosting.

Decision:
Cloudflare Pages, deployed from GitHub.

Alternatives:
- Vercel Hobby (personal/non-commercial use only)
- Netlify, GitHub Pages

Reason:
Generous free tier, unlimited static bandwidth, commercial use allowed, preview deployments.

---

## Decision 008 — Client-side color matching with CIEDE2000

Date: 2026-10-05
Status: Proposed

Context:
Cross-brand equivalents are a core feature.

Decision:
Precompute Lab values at build time; compute Delta-E (CIEDE2000, via culori) in the browser. Compare within the same type family by default (opaque, tint, wash, metallic; see DATABASE.md), with a "Show all types" toggle. Allow optional curated overrides in the catalog.

Alternatives:
- Simple RGB distance (perceptually poor)
- Precompute all equivalents at build time (larger JSON; less flexible)

Consequences:
Positive: instant, offline, no backend cost.
Trade-off: hex is only an approximation; metallics, washes and contrast paints match poorly, so a disclaimer is shown.

---

## Decision 009 — Unified smart search (name, hex, brand, hue)

Date: 2026-10-05
Status: Accepted

Context:
Users want to find paints by name, by hex color, by brand, and by color name (e.g., "red-orange").

Decision:
One search box with client-side query parsing: hex → color-distance search; brand name → brand filter; hue name → hue-family filter; remaining text → fuzzy name search. Hue families use the **12-hue artist's color wheel** (Red, Red-Orange, Orange, Yellow-Orange, Yellow, Yellow-Green, Green, Blue-Green, Blue, Blue-Violet, Violet, Red-Violet) plus **Neutral**, because those names are familiar to painters (true Munsell names were considered and rejected). Each paint's hue family (and light/dark value) is computed from its hex at build time and stored in `catalog.json`.

Alternatives:
- Separate screens or tabs for each search type (more navigation)
- Manually tagging each paint's color family (slow and inconsistent)

Consequences:
Positive: one fast, offline search for everything; replaces a separate "Match" tab.
Trade-off: computed hue families from approximate hex can misclassify borderline colors (e.g., browns and muted tones). A per-paint override field (`hueOverride`) allows corrections.

---

## Decision 010 — Offline Own/Want via a local outbox (last-write-wins)

Date: 2026-10-05
Status: Accepted

Context:
A key use case is checking and updating your collection in a hobby store with poor signal. Convex mutations don't persist across reloads while offline.

Decision:
Queue Own/Want changes in an IndexedDB outbox with a client timestamp; replay them on reconnect via the idempotent `userPaints.set` mutation, which applies last-write-wins on `clientUpdatedAt`.

Alternatives:
- Block changes while offline (simpler, worse in-store experience)
- A full offline-sync engine (overkill for two boolean flags)

Consequences:
Positive: works in the store; small, testable code.
Trade-off: conflict handling is simple last-write-wins; device clocks matter (a 5-minute future-skew guard limits abuse).

---

## Decision 011 — Owned and wishlisted are independent flags

Date: 2026-10-05
Status: Accepted

Context:
Painters may own a pot and still want another (running low, replacement).

Decision:
One `userPaints` row per user and paint, with two booleans (`owned`, `wishlisted`). No quantity or notes in MVP.

Consequences:
Positive: simple model, matches real use.
Trade-off: "running low" and quantity are deferred (PRD Nice to Have).

---

## Decision 012 — Plain CSS files per component (no Tailwind, no styles in TSX)

Date: 2026-10-05
Status: Accepted

Context:
Nathan wants styling kept out of .tsx files, with each component's styles in its own CSS file (e.g., `button.css` referenced by `button.tsx`).

Decision:
- Keep shadcn/ui for component structure, Radix behavior and accessibility, but convert every component to plain CSS
- One sibling `.css` file per component, imported by the component
- Design tokens as CSS custom properties in `src/styles/tokens.css`
- Variants and states via `data-*` attributes
- Remove Tailwind, `cva` and `cn()`
- The only `style` prop allowed sets a CSS custom property for data values (e.g., `--swatch-color`)

Alternatives:
- Tailwind classes in TSX (shadcn default): rejected by preference
- Tailwind `@apply` inside CSS files: keeps a Tailwind dependency and is discouraged in Tailwind v4
- CSS Modules (`button.module.css`): scoped class names, but adds `styles.x` references throughout TSX. Could be adopted later if global class collisions become a problem.

Consequences:
Positive: clean TSX; styles live in one predictable place; no build-time CSS framework.
Trade-off: new shadcn components must be converted by hand (or by the agent) after adding them; AI tools default to Tailwind, so AGENTS.md, CODE_STYLE.md and lint rules must enforce this; global class names need the `ui-` / component-name prefix convention.

---

## Decision 013 — Product name: Grimify

Date: 2026-10-06
Status: Accepted

Context:
The PRD left the product name TBD, and the scaffold used "Paint Toolbox" as a placeholder.

Decision:
The product is named Grimify. The package name is `grimify`, and the name appears in the page title and project docs.

Consequences:
The PWA manifest, icons and any Cloudflare Pages project use Grimify when those items land. The repository directory is already `grimify-v2`.

---

## Decision 014 — Floating nav bar: bottom on mobile, top on tablet and desktop

Date: 2026-10-06
Status: Accepted

Context:
The app is mobile-first, but it also has to work on a desktop. DESIGN_SYSTEM §11 left desktop navigation TBD, with a left rail as the working idea.

Decision:
One floating nav bar (Paints, My Paints, Settings) on every screen. Below 640px it is fixed to the bottom of the screen. At 640px and up it is fixed to the top, centered. It is detached from the screen edges by a small inset. It is a single `<nav aria-label="Main">` that comes before `<main>` in the DOM, and only CSS moves it. Details are in DESIGN_SYSTEM §11.

Alternatives:
- Left rail on desktop (the earlier TBD): uses horizontal space well on wide screens, but means a second navigation component and layout for only three destinations
- Bottom bar at every breakpoint: one layout, but a bottom bar on a desktop monitor is far from the content and unfamiliar
- Top bar at every breakpoint: familiar on desktop, but puts navigation out of thumb reach on phones, against the one-handed design principle

Reason:
Keeps navigation in thumb reach on phones and where desktop users expect it, with one component and one DOM order.

Consequences:
Positive: one nav component; the left rail TBD is closed; keyboard focus order is the same at every breakpoint.
Trade-off: on phones the nav is announced and focused before the content even though it sits at the bottom (mitigate with a skip link if testing shows it is a problem). The app shell needs a 640px media query, and the sticky header must sit below the bar on tablet and desktop. The active item is a Primary-filled pill (DESIGN_SYSTEM §11).
