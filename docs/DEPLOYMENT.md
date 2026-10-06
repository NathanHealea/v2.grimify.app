# Deployment

> Status: **Draft v0.2**

## Environments

Development:
`http://localhost:5173` + personal Convex dev deployment

Staging / Preview:
Cloudflare Pages preview deployment per branch/PR (`https://<branch>.<project>.pages.dev`)

Production:
`https://<project>.pages.dev` (**TBD:** project name / custom domain)

---

## Hosting Setup

Frontend: Cloudflare Pages connected to the GitHub repo
- Production branch: `main`
- Build command: `npx convex deploy --cmd 'npm run build'`
  (deploys Convex functions and schema, sets `VITE_CONVEX_URL`, then builds the frontend)
- Output directory: `dist`
- Build env vars: `CONVEX_DEPLOY_KEY` (secret), `VITE_CLERK_PUBLISHABLE_KEY`
- SPA fallback: Cloudflare Pages serves `index.html` for unknown paths when there's no `404.html`. Confirm deep links like `/paints/<id>` load directly.
- Security headers: `public/_headers` (see SECURITY.md §5)

Backend: Convex Cloud (free plan); production deployment created in the Convex dashboard.

CI: GitHub Actions on every pull request: `npm ci` → `npm run check` → `npm run build` (without deploy). E2E optional at first.

---

## Deployment Process

1. Open a PR → CI runs lint, typecheck, tests, catalog validation
2. Cloudflare creates a preview deployment → check it on a phone
3. Merge to `main`
4. Cloudflare builds: Convex deploy → frontend build → publish
5. Smoke test production (see checklist)
6. Installed PWAs pick up the update via the "Update available" prompt

---

## Rollback

- **Frontend:** Cloudflare Pages dashboard → Deployments → "Rollback to this deployment"
- **Convex functions:** revert the commit and redeploy. Convex schema changes must be backward-compatible (optional fields) so a frontend rollback doesn't break.
- **Catalog:** revert the data commit and redeploy. Paint IDs are never removed, so user data is unaffected.

---

## Production Checklist

- [ ] Build succeeds
- [ ] Environment variables configured (Cloudflare, Convex, auth provider in production mode)
- [ ] Convex schema deployed without validation errors
- [ ] Auth provider production instance allows the production domain
- [ ] `catalog.json` is served and cached; the app works offline after the first load
- [ ] Manifest and icons valid (Lighthouse PWA check)
- [ ] Smoke tests pass: search, detail, sign in, own/want, My Paints
- [ ] Tested as an installed PWA on iPhone and Android

---

## Free-Tier Watchlist

Check these monthly in the dashboards:
- Convex: function calls, database bandwidth, storage
- Auth provider: monthly active users
- Cloudflare Pages: builds per month (500 on free)
- **TBD:** confirm whether Convex free deployments are paused after inactivity and whether a keep-alive is needed
