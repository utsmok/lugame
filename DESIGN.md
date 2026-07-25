# DESIGN.md — lugame visual system

> Canonical reference for lugame's visual language. **Register: product** — design
> serves a playable game for a pre-literate touch audience, not brand marketing.
> Derived from `src/style.css` tokens + `docs/audits/ui-ux.md`. Product brief:
> [`PRODUCT.md`](PRODUCT.md). Decisions: [`docs/decisions.md`](docs/decisions.md).

## Foundations

### Colour

Dark, layered navy panels with a saturated command palette. Single source of
truth in `:root` (`src/style.css:1-17`); the canvas reads some colours via
hard-coded hex today (code-quality F14 — to be unified via the theme system).

| Token | Value | Role |
|---|---|---|
| `--bg` | `#0b1020` | App background (deep navy) |
| `--panel` | `#161c33` | Surface 1 — topbar, cards |
| `--panel-2` | `#1f2747` | Surface 2 — raised/active |
| `--ink` | `#f5f7ff` | Primary text (15.7:1 on `--panel` ✅) |
| `--ink-dim` | `#aab3d6` | Secondary text |
| `--accent` | `#ffd34e` | Gold — highlight, chevrons, sparkle |
| `--good` | `#248546` | Green — Run, success (4.65:1 ✅) |
| `--bad` | `#eb0016` | Red — Clear/danger (4.62:1 ✅) |
| `--fwd` | `#0073e3` | Blue — Forward command (4.60:1 ✅) |
| `--left` | `#9941ff` | Purple — Turn-left (4.61:1 ✅) |
| `--right` | `#c74f00` | Orange — Turn-right (4.62:1 ✅) |
| `--fan` | `#13846e` | Teal — Fan/"Shoo!" (4.61:1 ✅) |
| `--shadow` | `0 6px 18px rgba(0,0,0,.35)` | Elevation |

The four command colours are **colour-blind-distinct** by hue (blue/purple/
orange/teal) — but currently rely on colour alone; adding **shape glyphs** to
chips is a planned colour-blind hardening (roadmap B6).

**Contrast status (WCAG 2.1):** ✅ **Passing** (fixed 2026-07-25). All six
command/control tokens above were darkened — hue preserved, lightness reduced
— so white text clears 4.5:1 normal-text AA, verified live at 4.60–4.65:1
(previously 2.16–3.28:1). Body text (`--ink`/`--panel`) was already 15.7:1.
The farm palette reads slightly darker as a result. Remaining a11y gaps
(custom-delete + editor ± targets, overlay dialog semantics) are in the roadmap.

### Typography

- **Family:** `Baloo 2` (rounded, friendly, excellent legibility for young
  readers) → fallbacks `Comic Sans MS`, `Nunito`, system-ui.
- **Scale:** large by default — controls ~1rem+ bold, chips ~1.3rem emoji,
  win-card emoji 3.4rem. Pre-literate UI leans on **size + emoji**, not prose.
- Body line length is naturally short (mobile-first, `max-width: 760px` shell).

### Layout & spacing

- Mobile-first single column; `min-width: 900px` flips to a 2-column grid
  (board left · queue+palette+controls right). Shell centred at `max-width: 760px`.
- `env(safe-area-inset-*)` padding honours notches. `overscroll-behavior:none`,
- `user-select:none`, canvas `touch-action:none` — solid mobile hygiene.
- Spacing is ad-hoc rem values (`0.5rem` gaps, `4.2rem` controls, `16px`
  radii). A named spacing/radius scale is deferred until the design grows.
- **z-index is ad-hoc** (10/20/25/100) — roadmap: introduce `--z-overlay`,
  `--z-modal`, `--z-editor` tokens.

### Motion

Deliberate, gentle, exponential eases (no bounce/elastic). Current set: idle
peacock breathe, walk hop, fan feather ring, bump shake, cookie/trail sparkles,
win bounce + 70-particle confetti (canvas); `chip-err` + `badge-pop` keyframes (CSS).

**⚠ Known issue (P0):** none of this respects `prefers-reduced-motion`. The
reduced-motion path must keep the **step highlight** (information, not
decoration) while suppressing hops/shake/confetti/sparkles. See roadmap P0-1.

## Components

- **Command palette** — 4 large (≥67px) colour-coded buttons, each
  `emoji + label`. Icon-dominant after P0-2. `:active{scale(.97)}` press feel.
- **Program queue** — horizontal chip strip, current chip highlighted, `×N`
  run-length badges, expandable "all steps" overlay. Chip-remove ✕ is
  hover-only today (invisible on touch — roadmap N1).
- **Controls** — Run (`--good`) / Clear (`--bad`), ≥64px. Icon-only after P0-2.
- **Overlays** — win, level-select, settings, all-steps. Currently plain
  `.overlay` divs; roadmap N5 promotes them to real `role=dialog` +
  `aria-modal` + focus trap/restore.
- **Topbar** — brand, level nav (‹ name ›), level-select/editor/settings buttons.
- **Level editor** — own scoped CSS (`.lugame-editor .ed-*`), good isolation;
  paint-based grid tools, dir picker, copy/paste JSON share.

## States

`editing → running → bumped → error → won`. Visual cues: current-chip
highlight (information), bump shake + soft glow on hold-on-error (gentle, never
harsh), win confetti + overlay. Empty program shows a Dutch hint sentence
(pre-literate gap — roadmap B3 adds a no-reading onboarding demo). Disabled
controls use `opacity:.4` (watch contrast — roadmap).

## Accessibility posture (targets)

- **Touch:** primary targets ≥48px ✅ (67/64px); secondary targets (chip-remove,
  custom-delete, editor ±) below threshold — roadmap N1/N2.
- **Contrast:** AA everywhere — currently failing on command/control buttons (P0-2).
- **Motion:** `prefers-reduced-motion` honoured — currently nowhere (P0-1).
- **Screen reader:** icon buttons have `aria-label`s; canvas has no
  `role`/`aria-label`/`aria-live` (roadmap); overlays need dialog semantics (N5).
- **Keyboard:** arrows/WASD/F to add commands, Enter/Space run, Backspace undo.

## Iconography & voice

- **Emoji-first** for all characters/objects (🦚🍪🐮🐷🐑🐔) — cross-platform,
  zero-asset, pre-literate-readable. Pixel CC0 tiles only for scenery.
- **Copy:** Dutch today, l10n-ready (ADR-0007). Short, friendly, imperative.
  Pre-literate-first: prefer icons over text; text is for parents/teachers.

## What works well (preserve)

Colour-coded command language consistent across palette/chips/energy · generous
primary touch targets · gentle failure feedback · dark-theme panel layering ·
Baloo 2 choice · responsive two-column desktop layout · scoped editor CSS.

## Evolution

Theming (ADR-0006) will externalise colours/tiles/decor into per-theme JSON; the
`:root` tokens above become the **farm theme's** defaults, and `ConfigTileset`
reads them. When adding a token, prefer extending the theme config over a new
hard-coded value.
