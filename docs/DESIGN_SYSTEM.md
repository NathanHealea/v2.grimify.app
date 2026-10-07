# Design System

> Status: **Draft v0.2.** Direction: clean & neutral.
> Decided: shadcn/ui components restyled with **plain CSS files** (one `.css` per component, no Tailwind, no styles in TSX), design tokens as CSS custom properties in `src/styles/tokens.css`, mobile-first, PWA conventions. See CODE_STYLE.md §5a.
> Values marked *Proposed* are sensible defaults (shadcn's "neutral" theme) that can be replaced once the brand look is chosen.

## 0. Styling Architecture

```text
src/styles/tokens.css   → all design tokens (the only place raw values live)
src/styles/base.css     → reset, html/body, headings, focus defaults
src/styles/index.css    → @import tokens + base; imported once in main.tsx
<component>.css         → styles for exactly one component, imported by its .tsx
```
Component variants use `data-*` attributes (e.g., `data-variant`, `data-size`, `data-state` from Radix), never class maps in TSX.

---

## 1. Design Direction

Style:
**Clean & neutral.** A minimal, modern utility app.

Mood:
Calm, precise, uncluttered. Like a well-organized paint rack: the colors are the decoration, the interface stays quiet.

Design Principles:
- **Paint is the hero.** UI chrome stays neutral (grays) so swatch colors read accurately and aren't distorted by nearby brand colors.
- **One-handed mobile use.** Primary actions sit in the bottom half of the screen.
- **Fast over fancy.** Instant search, minimal animation, no blocking spinners for local data.
- **Honest color.** Always note that on-screen swatches are approximations.

---

## 2. Brand

Brand Name:
**TBD** (see PRD open questions)

Logo:
**TBD.** Needs a square app icon (192px, 512px, 512px maskable, 180px apple-touch-icon).

Brand Voice:
Friendly and concise; standard paint terms only (base, layer, shade, contrast). Short labels, no exclamation marks.

---

## 3. Color Palette

Based on the shadcn "neutral" theme, defined as CSS custom properties in `src/styles/tokens.css` (`--color-primary`, `--color-background`, …; dark values under `@media (prefers-color-scheme: dark)`):

| Token | Light | Dark |
|---|---|---|
| Primary | `#171717` | `#FAFAFA` |
| Secondary | `#F5F5F5` | `#262626` |
| Background | `#FFFFFF` | `#0A0A0A` |
| Surface (card) | `#FFFFFF` | `#171717` |
| Text | `#0A0A0A` | `#FAFAFA` |
| Muted Text | `#737373` | `#A3A3A3` |
| Border | `#E5E5E5` | `#262626` |
| Input border | `#8A8A8A` | `#666666` |
| Swatch edge | `rgb(0 0 0 / 10%)` | `rgb(255 255 255 / 10%)` |
| Overlay (sheet backdrop) | `rgb(0 0 0 / 50%)` | `rgb(0 0 0 / 70%)` |
| Swatch ink (dark / light) | `#0A0A0A` / `#FAFAFA` | same: follows the paint, not the theme |
| Success | `#16A34A` | `#22C55E` |
| Warning | `#D97706` | `#F59E0B` |
| Error | `#DC2626` | `#EF4444` |
| Accent (brand) | none: Primary is the accent | none |
| Primary foreground *(Proposed)* | `#FAFAFA` | `#171717` |
| Primary hover *(Proposed)* | Primary mixed 90% with Background | same |
| Secondary hover *(Proposed)* | Secondary mixed 80% with Background | same |
| Focus ring *(Proposed)* | `#737373` | `#A3A3A3` |
| Error foreground *(Proposed)* | `#FFFFFF` | `#0A0A0A` |

Token names: `--color-primary`, `--color-primary-foreground`, `--color-primary-hover`, `--color-secondary`, `--color-secondary-hover`, `--color-background`, `--color-surface`, `--color-text`, `--color-muted-text`, `--color-border`, `--color-input-border`, `--color-swatch-edge`, `--color-swatch-ink-dark`, `--color-swatch-ink-light`, `--color-ring`, `--color-success`, `--color-warning`, `--color-error`, `--color-error-foreground`.

Contrast notes (WCAG 2.1 AA):
- The light focus ring is `#737373` (4.74:1 on white), not shadcn's `#A3A3A3` (2.52:1, under the 3:1 non-text minimum in SC 1.4.11).
- Error foreground is near-black in dark mode: white on `#EF4444` is 3.76:1, under 4.5:1 for text.
- **Open:** Muted Text on Secondary is 4.35:1, under 4.5:1. Don't put muted text on Secondary surfaces until this is resolved.
- Border on Background is 1.26:1, so `--color-border` is decorative only (cards, dividers, the nav bar). Form controls use `--color-input-border`: `#8A8A8A` is 3.45:1 on Background and 3.17:1 on Secondary; `#666666` is 3.45:1 on Background and 3.12:1 on Surface (SC 1.4.11, DECISIONS 019).

Rules:
- No brand accent hue. Interactive emphasis uses Primary (near-black / near-white), so no UI color competes with paint swatches.
- Status colors (success/warning/error) are only used for status, never decoration.
- Only use tokens (`var(--color-primary)`, `var(--color-muted-text)`…), never raw hex in component CSS. Paint swatches get the paint's hex through the `--swatch-color` custom property set on the element; `paint-swatch.css` uses `background: var(--swatch-color)`.
- Dark mode: follows system preference (`prefers-color-scheme`) in MVP; a manual toggle is in ROADMAP NEXT.
- `theme-color` meta tag matches Background.

---

## 4. Typography

Font Family:
System font stack (no web-font download; good for offline and speed)
`ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`

Heading Font:
Same as body (no display font; keeps the clean look and works offline)

| Style | Size / Weight / Line Height |
|---|---|
| H1 | 24px / 700 / 32px |
| H2 | 20px / 600 / 28px |
| H3 | 16px / 600 / 24px |
| Body | 16px / 400 / 24px (inputs must be ≥16px to prevent iOS zoom) |
| Small | 13px / 400 / 18px |

Token names *(Proposed)*: `--font-sans`; `--text-h1|h2|h3|body|small`; `--leading-h1|h2|h3|body|small`; `--weight-regular|semibold|bold`.

---

## 5. Spacing

Base Unit: 4px
Tokens: `--space-1` (4px), `--space-2` (8px), `--space-3` (12px), `--space-4` (16px), `--space-6` (24px), `--space-8` (32px), `--space-12` (48px), `--space-16` (64px), `--space-24` (96px)
Scale: 4, 8, 12, 16, 24, 32, 48, 64, 96px
Page horizontal padding on mobile: 16px

---

## 6. Border Radius

Tokens: `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-pill`
- Small: 6px (badges)
- Medium: 8px (inputs, buttons)
- Large: 12px (cards, sheets)
- Pill: 9999px (chips, filter toggles)
- Swatch: rounded square, `--radius-md`. Circles are reserved for hue dots, so a filter never looks like a paint (DECISIONS 020)

---

## 6a. Sizing, Layering and Motion *(Proposed)*

| Token | Value | Use |
|---|---|---|
| `--border-width` | 1px | all borders |
| `--focus-ring-width` / `--focus-ring-offset` | 2px / 2px | global `:focus-visible` in `base.css` |
| `--touch-target` / `--touch-target-sm` | 44px / 36px | control heights (see §8) |
| `--header-height` / `--tab-bar-height` | 56px / 56px | app shell |
| `--swatch-size` / `--row-min-height` | 40px / 56px | paint rows (§10) |
| `--icon-size-sm` | 14px | swatch type marker, chip icons |
| `--content-max-width` | 1024px | centered content on wide screens (§14) |
| `--z-header` / `--z-tab-bar` / `--z-sheet` / `--z-toast` | 10 / 20 / 50 / 100 | stacking order; the nav bar sits above the sticky header it overlaps on tablet and desktop |
| `--duration-fast` / `--easing-standard` | 150ms / ease-out | hover and state transitions |
| `--opacity-disabled` | 0.5 | disabled controls |

---

## 7. Shadows

- Small `--shadow-sm`: cards at rest (`0 1px 2px rgb(0 0 0 / 0.05)`)
- Medium `--shadow-md`: popovers, dropdowns (`0 4px 6px -1px rgb(0 0 0 / 0.1)`)
- Large `--shadow-lg`: bottom sheets, dialogs (`0 10px 15px -3px rgb(0 0 0 / 0.1)`)
In dark mode, rely on borders rather than shadows.

---

## 8. Buttons

Use shadcn `<Button>` variants only.
- Primary: `default` variant. One per screen at most.
- Secondary: `secondary` or `outline`
- Danger: `destructive` (e.g., Delete account)
- Disabled: built-in disabled styles; keep the label visible
- Loading: show a spinner icon and keep the button width; disable while pending
- Minimum touch target: 44×44px (`--touch-target`). Exception: the `sm` size (36px, `--touch-target-sm`) is allowed for secondary controls only.

Own/Want toggles: icon toggle buttons (e.g., check and heart/bookmark), filled when active, with an `aria-pressed` state.

---

## 9. Inputs

Use shadcn `<Input>` and `<Select>`. Search uses `<Input type="search">` with suggestion chips below it, not `<Command>`.
- Default: `--color-input-border`, 16px text at every width (shadcn's desktop 14px is dropped)
- Focus: visible ring (`outline: 2px solid var(--color-ring)` on `:focus-visible`)
- Error: destructive border plus a message below
- Disabled: reduced opacity, `cursor-not-allowed`
- Placeholder: muted text. The search box placeholder reads "Search 2,000+ paints…" (live count)

---

## 10. Cards

- Padding `--space-3`–`--space-4`, `1px solid var(--color-border)`, `--radius-lg`, `--shadow-sm`
- **Paint row (list item):** swatch (40px) · name (bold) · brand · line/type (muted) · Own/Want toggles on the right. Row height ≥ 56px.
- **Paint detail header:** large swatch (full width, ~160px tall), name, brand, line, type, finish, hex value (copyable)

### Hue dots
A horizontal, scrollable row of 13 small circles (12 hues + neutral) under the empty search box. Each has a text label below it (don't rely on color alone).

### Search chips
Detected brand / hue / hex appear as removable pill chips under the search box (`Brand: Vallejo ×`); the whole chip is the button, named "Remove Brand: Vallejo". Suggestion chips (outlined) complete a partly typed brand or hue.

### Swatch component (`<PaintSwatch>`)
- Background = paint hex
- Rounded square, `--swatch-size` in rows, `--space-12` for the hex search preview
- 1px inner edge, `--color-swatch-edge`, so pale and dark paints stay visible on any background
- Ink on top of a swatch (the type marker) is black or white by WCAG relative luminance, switching at 0.18
- Metallic (sparkles), wash/shade/ink (droplet) and contrast/speedpaint (layers) get a small corner marker, since hex can't represent them. The swatch is decorative (`aria-hidden`); the type is always in the row text

### Paint row (`<PaintRow>`)
- Swatch · name (semibold) · "Brand · Line · Type" (muted) · match label or "Discontinued" on the right
- Own/Want toggles join the row with the collection item

---

## 11. Navigation

Header:
Compact top bar with the screen title and a contextual action (e.g., filter button). Respect `env(safe-area-inset-top)`.

Navigation bar:
One floating nav bar on every screen and every breakpoint, with three destinations:
1. **Paints** (catalog + smart search: name, hex, brand, hue)
2. **My Paints** (owned / wishlist)
3. **Settings** (account, theme, about)

Position by breakpoint (§14):
- Mobile (< 640px): fixed to the bottom of the screen, inset `--space-3` from the left, right and bottom edges, plus `env(safe-area-inset-bottom)`. Spans the width between the insets.
- Tablet and desktop (≥ 640px): fixed to the top of the screen, inset `--space-3` from the top edge plus `env(safe-area-inset-top)`. Centered, sized to its content, never wider than `--content-max-width`. The screen header sits below it.

Look:
- "Floating" means detached from the screen edges: Surface background, `1px solid var(--color-border)`, `--shadow-md` (border only in dark mode, per §7), `--radius-pill` *(Proposed)*.
- Height `--tab-bar-height`. Each item shows a 24px icon (`--icon-size-tab`) and a visible text label; items are at least 44×44px.
- Active item: `aria-current="page"` and a filled pill: `--color-primary` background, `--radius-pill`, icon and label in `--color-primary-foreground`. Inactive items: `--color-muted-text` on the bar, no background. The active style is keyed on `[aria-current="page"]`, not a router class or data attribute, so the look and the announced state can't disagree.
- Focus ring: drawn outside the item with the global positive offset, on the Surface. On the pill the dark-mode ring (`#A3A3A3` on `#FAFAFA`) is about 2.4:1, under 3:1. The bar's `--space-1` padding leaves room for the ring.
- Contrast (SC 1.4.11, 1.4.3): pill vs. Surface 17.9:1 light / 17.2:1 dark; label on pill 17.2:1; inactive label 4.74:1 light / 7.11:1 dark. Don't use a Secondary background as the marker (1.09:1 on Surface).
- Fallback if the filled pill competes with swatches: an outline pill (Primary border, no fill, Primary text), which still passes 3:1.

Behavior:
- Page content is never hidden behind the bar. On mobile, `main` is padded at the bottom by the bar height, its inset and the bottom safe-area inset. On tablet and desktop, the sticky header grows its top padding by the strip the bar floats in (top safe-area inset, inset, bar height, inset), so its background covers that strip and content never scrolls past above the header.
- The bar is a `<nav aria-label="Main">` that comes before `<main>` in the DOM at every breakpoint, so keyboard focus order matches the desktop layout. Moving it to the bottom on mobile is CSS only.
- No show/hide on scroll in MVP *(Proposed)*.

Sidebar:
None at any breakpoint.

Filters open in a bottom sheet: shadcn `Sheet` (`side="bottom"`) on Radix Dialog, not the vaul-based `Drawer` (DECISIONS 023). It's a modal dialog: focus trap, Escape, focus returns to the trigger. There's no swipe-to-dismiss. Max height `--sheet-max-height`, `--radius-lg` top corners, `--color-overlay` backdrop, a scrolling body with header and footer fixed, and bottom safe-area padding. The sheet edits a draft; the primary "Show N paints" commits it, and any other close discards it.

---

## 12. States

Loading:
Skeleton rows for Convex data. The catalog loads from cache and should be instant; on first visit show a single progress state ("Downloading paint catalog…").

Empty:
Icon, one-line explanation and a primary action. Examples: "No paints match" → Clear all (clears the search box and every filter). "You haven't added any paints yet" → Browse paints.

Error:
Inline message with Retry; toast (shadcn `Sonner`) for failed mutations.

Success:
Optimistic UI; no toast for routine toggles.

Disabled:
Own/Want toggles when signed out still render; tapping them opens the sign-in sheet.

Offline:
Small "Offline" pill in the header.

---

## 13. Icons

Icon Library: lucide-react (shadcn default)
Default Size: 20px (24px in the tab bar); tokens `--icon-size`, `--icon-size-tab`
Icon Style: Outline (stroke 2); filled variant only for active toggles

---

## 14. Responsive Design

Mobile (default): single column, floating nav bar at the bottom (§11)
Tablet: two-column list/detail where useful; floating nav bar at the top
Desktop: max content width ~1024px, centered; floating nav bar at the top

Breakpoints (use in `@media` queries in component CSS; CSS custom properties can't be used in media queries, so use these literal values):
- Mobile: < 640px
- Tablet: 640–1023px
- Desktop: ≥ 1024px

PWA specifics:
- `viewport-fit=cover`; pad with `env(safe-area-inset-*)`
- Disable pull-to-refresh bounce on the app shell where it interferes
- No hover-only interactions

---

## 15. Accessibility

- Use semantic HTML
- Maintain WCAG AA contrast for text (swatch labels auto-pick black or white)
- Support keyboard navigation (desktop)
- Provide visible focus states
- Provide accessible labels (`aria-label="Mark Mephiston Red as owned"`)
- Do not rely only on color: every swatch shows the paint name; match quality has a text label
- Respect `prefers-reduced-motion`
