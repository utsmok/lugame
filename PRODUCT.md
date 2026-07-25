# PRODUCT.md — lugame

> Source of truth for **what lugame is, who it's for, and how it works.** Read
> this before designing or building anything. Decision history: `docs/decisions.md`
> (ADRs); visual system: `DESIGN.md` (derived from `docs/audits/ui-ux.md`);
> active audits: `docs/audits/`; theme system: `docs/theming-design.md`.

## What
lugame is a touch-first, **pre-literate** grid-programming game. A child queues
picture commands (forward, turn-left, turn-right, "Shoo!" fan) into a strip,
presses Start, and watches a peacock 🦚 carry them out step by step to reach a
cookie 🍪 — shooing farm animals off the path by fanning its feathers. No
reading required; no harsh failure.

## Who
- **Primary:** pre-literate children, ~4 years old, on a parent's tablet/phone.
- **Secondary:** parents, teachers, older siblings (level editor, settings).
- **Languages:** Dutch today, English next, designed for more (l10n in flight).

## Why
Teach the core ideas of programming — sequencing, debugging, re-orientation,
"turn to face, then act" — to children too young to read or type. Existing
tools (Lightbot, GCompris, Karel) target older kids or need installation;
lugame is zero-install, touch-native, and gentler.

## Core loop
1. Read the level (peacock start + facing, path, cookie goal(s), animals).
2. Build a program: tap command tiles to enqueue chips.
3. Press **Start** → peacock executes step by step, current chip highlighted.
4. Outcomes:
   - Reach all cookies → **win** (confetti, advance to next level).
   - **Bump** (blocked step) → friendly reset; *hold-on-error* pauses on the
     failing step; *easy-mode* shakes and continues.
   - Out of energy on energy levels (fan costs a pip) → blocked.
5. Edit and re-run freely; there is never a penalty.

## Mechanics
- **Commands:** forward, turn-left, turn-right, fan ("Shoo!" — scares animals in
  a 3-cell frontal arc; costs 1 energy pip on energy levels).
- **Energy:** levels 8+ start with pips (max 3); fan spends 1, cookies refill.
- **Collect-all:** from level 6, multiple cookies; every one must be collected.
- **Levels:** 12 hand-tuned, rising difficulty + a custom level editor
  (localStorage CRUD with validation).
- **Settings:** easy-mode, hold-on-error, music, sound — soon language + theme.

## Surfaces
- **Board** (canvas): grid, peacock, animals, cookies, particles, fan fx.
- **Command palette:** 4 big colour-coded buttons.
- **Program queue:** chips (current highlighted) + expandable "all steps" overlay.
- **Controls:** Start, Clear.
- **Topbar:** prev/next level, level-select grid, editor, settings.
- **Overlays:** win, level-select, settings, level editor.

## Constraints (non-negotiable)
- **Pre-literate:** no required reading — picture tiles, big icons.
- **Touch-first:** tap targets ≥48px; usable on tablet/phone.
- **Gentle:** a wrong step is never harsh; always recoverable.
- **Accessible:** high contrast; the 4 command colours distinguishable by
  shape + colour (colour-blind safe); motion respects `prefers-reduced-motion`.
- **Lean:** tiny bundle (~7 KB gz JS), no heavy deps, fast on old devices.
- **Zero-install:** static site, no backend, shareable by URL.

## Success criteria
- A 4-year-old clears level 1 unaided within a minute.
- The whole UI is understandable without reading (icons + affordances).
- Runs at 60 fps on a mid-range tablet.
- A parent can create + save a custom level in the editor.
- A new language is addable by editing one locale file.
- A new theme (tiles/animals/goal/bgm) is addable by dropping one folder + JSON.

## Non-goals (for now)
- Text-based code editing (no syntax).
- Backend accounts; real-time multiplayer (turn-taking is a "maybe").
- 3D, physics, or action/reflex gameplay.
- Monetization.

## Tech
TypeScript 5.6 (strict) + Vite 5.4 + HTML5 Canvas; vanilla DOM (no framework).
Deployed to GitHub Pages. Full rationale: `docs/decisions.md` (ADR-0005).

## Inspirations
**Lightbot** (core loop, step highlight), **GCompris `programmingMaze`**
(instruction set, gentle dead-ends), **Karel the Robot**, **turtle graphics**.
Design inspiration only — no code copied (licensing). See README + ADR-0001.

## Register
**Product.** Design *serves* the product (a playable game), not brand
marketing. Prioritise clarity, delight, and ergonomics for a pre-literate touch
audience over expressive or branded flourishes. (Maps to impeccable's
`reference/product.md` register.)
