# Paint Toolbox

A mobile-first PWA for miniature painters: search paints across brands, find cross-brand equivalents, and track owned and wishlisted paints.

**Before any work, read the agent instructions and the docs they point to:**

@docs/AGENTS.md

## Quick facts
- Stack: Vite + React + TypeScript, TanStack Router, shadcn/ui (Radix) + plain CSS files (no Tailwind), vite-plugin-pwa, Convex, Clerk, Cloudflare Pages
- Paint catalog = JSON in `data/catalog/` (NOT in Convex). Paint IDs never change.
- Styling: every component has a matching `.css` file (e.g., `button.tsx` + `button.css`). **No styling in .tsx files**: no Tailwind classes, no inline `style`, no CSS-in-JS.
- Anything marked **TBD** in /docs is undecided. Ask; don't guess.

## Commands
- `npm run dev`: start the frontend (run `npx convex dev` in a second terminal)
- `npm run check`: lint + typecheck + tests + catalog validation
- `npm run build`: production build

## Workflow
1. Plan first. Don't write code until I approve the plan.
2. Make small, focused changes.
3. Run `npm run check` and `npm run build` before saying you're done.
4. Update /docs when behavior, schema or decisions change.
