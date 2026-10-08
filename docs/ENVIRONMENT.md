# Environment Configuration

> Status: **Draft v0.2**. Auth = Clerk.
> Vite only exposes variables prefixed `VITE_` to the browser. **Everything with `VITE_` is public.**

## Public Variables (browser bundle, `.env.local` / Cloudflare Pages)

```bash
VITE_CONVEX_URL=              # https://<deployment>.convex.cloud (set automatically by `npx convex dev` / `convex deploy`)
VITE_CLERK_PUBLISHABLE_KEY=   # pk_test_… (dev) / pk_live_… (prod)
VITE_APP_URL=                 # e.g. http://localhost:5173 / https://<project>.pages.dev
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

### CI / hosting secrets (Cloudflare Pages build settings or GitHub Actions secrets)
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
| Preview | Cloudflare Pages preview URL per branch/PR | **TBD:** Convex preview deployments, or share dev |
| Production | `https://<project>.pages.dev` (custom domain TBD) | production deployment |

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
