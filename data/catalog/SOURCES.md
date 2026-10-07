# Catalog data sources

Hex values are approximations of how each paint looks on screen. Paint names and brand names are trademarks of their owners; Grimify is not affiliated with any paint manufacturer.

## Origin

The seed catalog was imported on 2026-10-06 from the earlier Grimify project (`scripts/data/paints/*.json` at commit `c31eacb`) with `scripts/import-legacy-catalog.ts` (DECISIONS 015, 018). That project's `scripts/data/REFERENCES.md` documents where its hex values came from; the summary below is taken from it, and from its Scale75 work item (`docs/02-paint-data-search/scale75-paints.md`).

**Condition of use:** most hex values were collected from [PaintPad.app](https://paintpad.app) in April and May 2026. PaintPad's terms of use couldn't be found, so permission to use the derived values must be requested before Grimify is public (ROADMAP). If it is refused, the hex values get re-sourced and every paint ID stays the same.

## By brand

| Brand | Paints | Hex source | Coverage and gaps |
|---|---|---|---|
| Citadel | 338 | PaintPad, Citadel Painting System pages | 341 of 341 matched in the source. armycrafter.com was a secondary visual reference for Shade |
| The Army Painter | 462 | PaintPad: Warpaints Fanatic, Warpaints, Warpaints Air, Speedpaint 2.0, Masterclass | 460 of 462 matched. Battleship Grey (Speedpaint) kept its earlier hex; Speedpaint Medium is colorless and its hex `#F2EFE9` is a placeholder (typed `technical` so it's never auto-matched) |
| Vallejo | 761 | PaintPad: Model Color, Game Color, Model Air, Game Air, Mecha Color, Metal Color, Xpress Color, Model Wash, Liquid Gold, Panzer Aces, Surface Primer | 716 of 763 matched. 47 kept their earlier hex, mainly Game Color Ink (11), Game Color Wash (1), newer Xpress Color (17+) and abbreviated Model Color names |
| AK Interactive | 607 | PaintPad: AK Interactive, 3rd Gen Acrylics, Acrylics, Real Color | Abteilung 502 (oils) is excluded from this catalog: none of it was PaintPad-sourced. Of the rest, at least one metallic kept its earlier hex |
| Scale75 | 548 | PaintPad individual paint pages, with scale75.com product pages as fallback | Per-paint coverage wasn't recorded. Soilworks washes and pigments were excluded at the source |
| Green Stuff World | 121 | PaintPad, Green Stuff World page | 91 of 122 matched. 31 newer acrylics (e.g., Red Truth, Canary Green) kept their earlier hex |

"Earlier hex" means the value from the first import into the earlier project, whose source isn't documented. Treat those paints as the least reliable.

Not imported: PaintPad hue assignments (Grimify computes hue families itself, DECISIONS 009), the earlier `comparable` links and `description` text, and Army Painter gradient groups.

## Changes made during import

- Same-line duplicates with identical hex were merged; the other spelling became an alias. Citadel: Bugman's Glow, Emperor's Children, Nurgle's Rot. Green Stuff World: Sun-bleached Bone. Vallejo Model Color: Yellow Green and Dark Blue Grey (two entries each with the same name and hex; if Vallejo sells two products under one name, one was lost).
- HTML entities in AK names were decoded (`&amp;` → `&`).

## Not yet in the catalog

- Pro Acryl (Monument Hobbies), a launch brand: no data source yet (ROADMAP).
