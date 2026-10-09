# Deployment

> Status: **Draft v0.2**

## Environments

| Environment | Branch | Site | Deploy |
|---|---|---|---|
| Local | any | `http://localhost:5173` + personal Convex dev deployment | `npm run dev` |
| Dev | `dev` | `https://dev.grimify.app` (Worker `v2-grimify-app-dev`) | `npm run deploy:dev` |
| Stage | `stage` | `https://stage.grimify.app` (Worker `v2-grimify-app-stage`) | `npm run deploy:stage` |
| Production | `main` | `https://grimify.app` (Worker `v2-grimify-app`) | `npm run deploy:prod` |

Dev and stage each have their own Convex deployment and sign in with production Clerk accounts. ENVIRONMENT.md § Environments and § Deploying have the details and the one-time setup.

---

## Hosting Setup

Frontend: three assets-only Cloudflare Workers (no Worker code; DECISIONS 043), defined in `wrangler.json` and deployed from your machine by `npm run deploy:<env>` (DECISIONS 044). Workers Builds isn't used; the repo's Git connection is off.
- Each Worker serves `./dist` with `not_found_handling: "single-page-application"`, so unknown paths get `index.html` with 200. Confirm deep links like `/paints/<id>` load directly.
- Custom domains are declared in `wrangler.json` (`routes` with `custom_domain: true`); `wrangler deploy` creates their DNS records and certificates.
- Wrangler is a pinned dev dependency, so every deploy uses the lockfile's version.
- Security headers: `public/_headers` (see SECURITY.md §5). The build fills in the environment's Convex host; the CSP must allow Clerk's Frontend API and script domains (production instance), or sign-in is blocked.

Backend: Convex Cloud (free plan). One project with three production-type deployments: `nautical-toucan-398` (production), `develop` and `stage`.

CI: none. Checks run locally at `wi stage` (`npm run check`, `npm run build`), and deploys run from a clean, pushed branch.

---

## Branches

```
story/… bug/… task/…  →  dev  →  stage  →  main
                                  hotfix/…  →  main
```

- Work items (`wi start`) branch from `dev` and `wi release` merges them into `dev` (`base_branch: dev`). Deploy dev to try them.
- Promote dev to stage when it's ready for a final check:
  ```bash
  git switch stage && git pull && git merge --no-ff dev && git push && npm run deploy:stage
  ```
- Promote stage to production:
  ```bash
  git switch main && git pull && git merge --no-ff stage && git push && npm run deploy:prod
  ```
- Hotfix: `wi` supports one base branch, so a hotfix is done by hand. Branch from `main`, fix, run `npm run check` and `npm run build`, merge into `main`, push, `npm run deploy:prod`. Then merge `main` into `stage` and `stage` into `dev` so the fix isn't lost on the next promotion.
- Version tags come from `wi release`, so they sit on merges into `dev`; promotion carries those commits up unchanged.

---

## Deployment Process

1. `wi stage` runs lint, typecheck, tests, catalog validation and the build locally
2. `wi release --push` merges into `dev` and pushes
3. `npm run deploy:dev` (from `dev`): build → Convex function push → build check → `wrangler deploy --env dev`. If the Worker upload fails after the push, the new functions run with the old frontend until the next good deploy
4. Smoke test dev (TESTING.md § Deployed checks), then promote to stage and production as above, checking each
5. Installed PWAs pick up the update via the "Update available" prompt

---

## Rollback

- **Frontend:** `npx wrangler rollback [--env dev|stage]` (or Workers & Pages → the Worker → Deployments → Rollback)
- **Convex functions:** revert the commit on the branch and redeploy that environment. Convex schema changes must be backward-compatible (optional fields) so a frontend rollback doesn't break.
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
- **TBD:** confirm whether Convex free deployments are paused after inactivity and whether a keep-alive is needed (more likely now for `develop` and `stage`)
