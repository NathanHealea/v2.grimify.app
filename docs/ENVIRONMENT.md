# Environment Configuration

> Status: **Draft v0.2**. Auth = Clerk.
> Vite only exposes variables prefixed `VITE_` to the browser. **Everything with `VITE_` is public.**

## Public Variables (browser bundle, `.env.local` / Cloudflare Worker build)

```bash
VITE_CONVEX_URL=              # https://<deployment>.convex.cloud (set automatically by `npx convex dev` / `convex deploy`)
VITE_CLERK_PUBLISHABLE_KEY=   # pk_test_… (dev) / pk_live_… (prod)
VITE_APP_URL=                 # e.g. http://localhost:5173 / https://grimify.app
```

---

## Private Variables

### Convex deployment environment (set in the Convex dashboard or `npx convex env set`)
```bash
CLERK_JWT_ISSUER_DOMAIN=      # Clerk Frontend API URL, shown when you activate Clerk dashboard → Integrations → Convex
                              # (e.g. https://<name>.clerk.accounts.dev). Read by convex/auth.config.ts.
                              # Keep a copy in .env.local for reference; Convex reads only the deployment's value.
                              # Symptom if the Convex integration isn't active: Clerk signs in, but
                              # .../tokens/convex returns 404 and Convex treats everyone as signed out.
```

### CI / hosting secrets (Cloudflare Worker build settings or GitHub Actions secrets)
```bash
CONVEX_DEPLOY_KEY=            # production deploy key from the Convex dashboard
```

### Local only, and CI secrets
```bash
CLERK_SECRET_KEY=             # sk_test_… from the Clerk dev instance; Playwright's signed-in E2E only.
                              # Never VITE_-prefixed (that would ship it to the browser). In CI: a GitHub Actions secret.
```

### Local only
`CONVEX_DEPLOYMENT` is written to `.env.local` by `npx convex dev`. Don't commit it.

---

## Environments

| Environment | Frontend | Convex deployment |
|---|---|---|
| Local | `npm run dev` (localhost:5173) | personal dev deployment (`npx convex dev`) |
| Preview | Off: the Worker builds only `main` (DECISIONS 041, 043) | **TBD:** Convex preview deployments, or share dev |
| Production | `https://grimify.app` | `nautical-toucan-398` |

---

## Production

Pushing `main` deploys production (DECISIONS 041, 043). The site is the Cloudflare Worker `v2-grimify-app`, an assets-only Worker configured by `wrangler.json`. Workers Builds runs two commands on each commit:
1. The build command builds the frontend against the production Convex URL, then pushes the functions (`npx convex deploy --help`). If either step fails, the build stops.
2. The deploy command (`npx wrangler deploy`) uploads `dist/` to the Worker. The functions are already live by then, so they briefly serve the old frontend; if the deploy command fails, they keep serving it until the next good deploy.

First-time setup, in this order (connecting the repo starts a build of `main` straight away, and the function push fails while the issuer is unset):
1. Clerk production instance: domain and Convex integration (below).
2. `npx convex env set --prod CLERK_JWT_ISSUER_DOMAIN` (below).
3. Create the Worker from the repo with the settings and variables below. Its first build is the first production deploy.

### Cloudflare Worker (`v2-grimify-app`)

Workers & Pages → `v2-grimify-app` → Settings → Build:

| Setting | Value |
|---|---|
| Git repository | `NathanHealea/v2.grimify.app` |
| Branch control | `main`. Builds for other branches stay off (Settings → Build → Branch control and the Previews Base tab): every build runs `convex deploy` with the production key, so a branch build would deploy that branch's functions to production. |
| Build command | `npx convex deploy --cmd 'npm run build' --cmd-url-env-var-name VITE_CONVEX_URL` |
| Deploy command | `npx wrangler deploy` (reads `wrangler.json`: assets from `./dist`, single-page-app fallback) |
| Root directory | `/` |
| Node.js | From `.nvmrc` (`24`) |
| Custom domain | `grimify.app` (Settings → Domains & Routes). An apex domain must be a zone on the same Cloudflare account. `www.grimify.app` redirects to it with a Cloudflare redirect rule rather than serving the app, so there's one origin for sign-in, storage and the installed app. |

Build variables (Settings → Build → Variables and secrets). Only these two:

| Name | Type | Value |
|---|---|---|
| `CONVEX_DEPLOY_KEY` | Secret | Convex dashboard → `nautical-toucan-398` → Settings → generate a production deploy key |
| `VITE_CLERK_PUBLISHABLE_KEY` | Variable | `pk_live_…` from the Clerk production instance. The part after `pk_live_` decodes (base64) to `clerk.grimify.app$`. |

Don't set `VITE_CONVEX_URL`, `CONVEX_DEPLOYMENT`, `CLERK_SECRET_KEY` or `CLERK_JWT_ISSUER_DOMAIN` here: `convex deploy` passes the URL to the build, the issuer lives on the Convex deployment, and the browser build never needs a Clerk secret. The deploy key must be a Secret, never a plain Variable.

`wrangler.json`'s `name` must stay `v2-grimify-app`; another name makes `wrangler deploy` create a second Worker without the domains.

### Convex production

Set the issuer once (the CLI prompts for the value when it's left off):

```bash
npx convex env set --prod CLERK_JWT_ISSUER_DOMAIN   # https://clerk.grimify.app
npx convex env list --prod                          # check it
npx convex function-spec --prod                     # after a deploy: lists the app's functions
```

`npx convex deploy` from a laptop also deploys production (it targets the project's production deployment when `CONVEX_DEPLOYMENT` is set), but production deploys normally come from the Worker's build.

### Clerk production instance

Same settings as dev (see Rules), plus:
- Domain `grimify.app`, with the DNS records from Clerk dashboard → Domains. The Frontend API host (`clerk.grimify.app`) is in `public/_headers`; if it differs, change the CSP there.
- Integrations → Convex activated, or `.../tokens/convex` returns 404 and everyone looks signed out.

### Content-Security-Policy

`public/_headers` names the production Convex deployment and Clerk host. Moving to another Convex deployment or Clerk domain means editing it and `scripts/static-files.test.ts`. `vite dev` and `vite preview` don't apply it, so check the console on grimify.app after changing it, in a private window or with the service worker unregistered. The service worker serves `index.html` from its cache with the headers it was cached with, so an installed app keeps the old policy until a release changes `index.html` and the user taps Reload.

---

## Rules

- Never commit real secrets. `.env.example` lists every variable with empty values; copy it to `.env.local`.
- The app refuses to start without `VITE_CLERK_PUBLISHABLE_KEY` and `VITE_CONVEX_URL`, and shows the missing name.
- Clerk dashboard (dev and prod instances): enable Email address with Email verification code; turn off password, email links and social connections (DECISIONS 027).
- Clerk dashboard (dev and prod instances): allow users to delete their own accounts (User & authentication settings). Delete account calls `user.delete()` from the browser (DECISIONS 037); when it's off, Settings shows "Account deletion isn't available right now."
- `.env.local` and `.env*.local` are in `.gitignore`
- Never put a secret in a `VITE_` variable
- Keep local and production configuration separate (different Convex deployments, Clerk dev vs. prod instances)
- Document every new variable here in the same pull request that introduces it
