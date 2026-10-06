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
CLERK_JWT_ISSUER_DOMAIN=      # from Clerk dashboard → JWT Templates → "convex" template issuer URL
```

### CI / hosting secrets (Cloudflare Pages build settings or GitHub Actions secrets)
```bash
CONVEX_DEPLOY_KEY=            # production deploy key from the Convex dashboard
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

- Never commit real secrets. Commit `.env.example` with empty values only.
- `.env.local` and `.env*.local` are in `.gitignore`
- Never put a secret in a `VITE_` variable
- Keep local and production configuration separate (different Convex deployments, Clerk dev vs. prod instances)
- Document every new variable here in the same pull request that introduces it
