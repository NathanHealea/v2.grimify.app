# Deployment

> Status: **Draft v0.2**

## Environments

Development:
`http://localhost:5173` + personal Convex dev deployment

Staging / Preview:
None. The Worker builds only `main` (DECISIONS 041, 043); preview deployments are **TBD**.

Production:
`https://grimify.app` (Cloudflare Worker `v2-grimify-app`)

---

## Hosting Setup

Frontend: Cloudflare Worker `v2-grimify-app` (static assets, no Worker code; DECISIONS 043), built from the GitHub repo by Workers Builds. ENVIRONMENT.md § Production lists every setting.
- Branch: `main` only
- Build command: `npx convex deploy --cmd 'npm run build' --cmd-url-env-var-name VITE_CONVEX_URL`
  (builds the frontend against the production URL, then pushes Convex functions and schema)
- Deploy command: `npx wrangler deploy` (reads `wrangler.json`)
- Build variables: `CONVEX_DEPLOY_KEY` (Secret), `VITE_CLERK_PUBLISHABLE_KEY`
- SPA fallback: `wrangler.json` sets `not_found_handling: "single-page-application"`, so unknown paths get `index.html` with 200. Without it a Worker returns an empty 404. Confirm deep links like `/paints/<id>` load directly.
- Security headers: `public/_headers` (see SECURITY.md §5). The Content-Security-Policy must allow Clerk's Frontend API and script domains (production instance) and the Convex deployment URL, or sign-in and data calls are blocked

Backend: Convex Cloud (free plan); production deployment created in the Convex dashboard.

CI: none yet. Checks run locally at `wi stage` (`npm run check`, `npm run build`); a GitHub Actions workflow is a possible later item (DECISIONS 041).

---

## Deployment Process

1. `wi stage` runs lint, typecheck, tests, catalog validation and the build locally
2. `wi release --push` merges to `main` and pushes
3. Workers Builds runs: frontend build → Convex function push → `wrangler deploy`. If the deploy command fails after the push, the new functions run with the old frontend until the next good deploy
4. Smoke test production (see checklist and TESTING.md production checks)
5. Installed PWAs pick up the update via the "Update available" prompt

---

## Rollback

- **Frontend:** Workers & Pages → `v2-grimify-app` → Deployments → ⋯ next to a version → **Rollback** (or `wrangler rollback`)
- **Convex functions:** revert the commit and redeploy. Convex schema changes must be backward-compatible (optional fields) so a frontend rollback doesn't break.
- **Catalog:** revert the data commit and redeploy. Paint IDs are never removed, so user data is unaffected.

---

## Production Checklist

- [ ] Build succeeds
- [ ] Environment variables configured (Cloudflare, Convex, auth provider in production mode)
- [ ] Convex schema deployed without validation errors
- [ ] Auth provider production instance allows the production domain
- [ ] `catalog.json` is served and cached; the app works offline after the first load
- [ ] Manifest and icons valid (Lighthouse PWA check). Icons pending (GitHub issue #3), so installability fails until then
- [ ] `/sw.js` served with `Cache-Control: no-cache` (add to `public/_headers`), so installed apps can't get stuck on an old service worker
- [ ] Smoke tests pass: search, detail, sign in, own/want, My Paints
- [ ] Tested as an installed PWA on iPhone and Android

---

## Free-Tier Watchlist

Check these monthly in the dashboards:
- Convex: function calls, database bandwidth, storage
- Auth provider: monthly active users
- Cloudflare Workers Builds: build minutes per month (**TBD:** confirm the free allowance)
- **TBD:** confirm whether Convex free deployments are paused after inactivity and whether a keep-alive is needed
