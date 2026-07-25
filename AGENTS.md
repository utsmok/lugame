# AGENTS.md — lugame

Read this first. It's the short route to being productive in this repo.
Deeper context: `PRODUCT.md` (what/who/why), `docs/decisions.md` (ADR history),
`docs/audits/` (current findings), `docs/theming-design.md` + `docs/l10n-design.md`
(in-flight work).

## What
lugame is a touch-first, **pre-literate** grid-programming game for ~4-year-olds.
Queue picture commands → press Start → a peacock 🦚 executes them step-by-step to
reach a cookie 🍪, shooing farm animals with its fan. No reading; no harsh failure.
TypeScript + Vite + HTML5 Canvas, vanilla DOM (no framework). Deployed to GitHub Pages.

## Commands
```bash
npm run dev          # vite dev server, http://localhost:5173 (host: true)
npm run typecheck    # tsc --noEmit        ← run after every TS change
npm run build        # tsc --noEmit && vite build   ← the CI gate
npm run preview      # preview the production build
```
There is **no test suite and no linter/formatter yet** — verify with `typecheck`
+ `build` + a browser smoke test. (The code-quality audit recommends adding
vitest + eslint; see `docs/audits/code-quality.md`.)

## Architecture map
```
src/main.ts          App orchestrator: game loop (rAF), wires engine↔renderer↔ui,
                     settings persistence, keyboard, editor host.
src/game/
  engine.ts          GameEngine: program queue, step execution, phase machine
                     (editing→running→bumped→error→won), energy, fan arc.
  render.ts          Renderer (~930ln): canvas draw loop. HAS an abstract
                     `Tileset` interface + concrete `FarmTileset`; Renderer ctor
                     accepts a custom tileset — the seam for theming.
  levels.ts          12 hand-tuned levels (BFS-verified solutions in comments).
  types.ts           Dir/Command/Phase unions, AnimalKind, geometry, EMOJI maps.
  audio.ts           AudioBus: procedural Web Audio + bgm + fan.mp3 override.
src/ui/
  palette.ts         PaletteUI (DOM): topbar, command buttons, program queue,
                     overlays (win, level-select, settings, all-steps).
  editor.ts          LevelEditor (DOM, own scoped CSS). ⚠ hardcodes its own
                     Dutch strings — does NOT use i18n yet (l10n will fix).
src/storage.ts       localStorage custom-level CRUD + hand-rolled validators.
src/i18n.ts          Flat Dutch `T` string table (INCOMPLETE — see l10n-design).
src/style.css        Design tokens (`:root` CSS vars) + all styles. 900px breakpoint.
index.html           Mount point, <title>, lang="nl".
public/assets/       audio/*.mp3 + img/*.png (CC0/BY), CREDITS.md.
docs/                decisions.md (ADRs), audits/, theming-design.md, l10n-design.md.
PRODUCT.md           Product brief (read before designing).
```

## Conventions
- **TypeScript strict.** Prefer unions + exhaustiveness over enums; validate
  untrusted data (see `storage.ts` guards). Avoid `any`/loose `as`.
- **No framework.** DOM is built imperatively (`h(tag,cls)` helper in palette.ts).
  Keep it boring and allocation-light (the render loop runs every frame).
- **Emoji on canvas** for characters/goals; CC0 pixel tiles for scenery.
- **Procedural audio** for SFX; real recordings only where synthesis fails
  (peacock call, bgm, crunch). Attribution in `public/assets/CREDITS.md`.
- **Dutch UI** today; all new UI strings go through `src/i18n.ts` `T`
  (l10n in flight — see `docs/l10n-design.md`).
- **CC0 preferred** for assets; CC-BY(-SA) allowed with attribution in CREDITS.md.

## Audience constraints (non-negotiable — see PRODUCT.md)
Pre-literate 4yo · touch-first (tap targets ≥48px) · gentle failure · high
contrast · colour-blind safe (4 command colours) · `prefers-reduced-motion` ·
tiny bundle (~7 KB gz).

## Collaboration
A second agent develops on `main` and **commits its work**. Before editing hot
files (`render.ts`, `types.ts`, `audio.ts`, `palette.ts`, `editor.ts`), check
`git status` — if the tree is clean you're safe to land changes directly. Pull
`docs/decisions.md` for the latest ADRs before architecture changes.

## In-flight (2026-07-25)
- **l10n** — extract all UI strings to `src/locales/{nl,en}.ts`, runtime locale
  switching, language picker. Spec: `docs/l10n-design.md`.
- **theming** — extract tileset/decor/obstacles/goal/bgm to `public/themes/<id>/theme.json`;
  peacock+fan stay global. Spec: `docs/theming-design.md`. **Sequence l10n first**
  (theme labels live in locale files).
- **audits** in `docs/audits/` (code-quality, gameplay, ui-ux) feed a roadmap.
