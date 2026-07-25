# lugame — Code-Quality & Best-Practices Audit

**Scope:** all of `src/` (`main.ts`, `game/{engine,render,levels,types,audio}.ts`, `ui/{palette,editor}.ts`, `storage.ts`, `i18n.ts`), `src/style.css`, `index.html`, `tsconfig.json`, `vite.config.ts`, `package.json`, `.github/workflows/deploy.yml`.
**Mode:** read-only. No source edited, no formatters/linters/tests run (there are none to run).
**Date:** 2026-07-25. **HEAD:** `a1d07ca` (clean tree, `main`).

---

## 1. Executive summary

lugame is a **well-built, genuinely polished** small TypeScript game. `strict: true` is on, there is **zero `any`**, the `as unknown as T` double-cast pattern is used correctly where casts are unavoidable, and defensive guards are thorough on every risky boundary — `localStorage` (`main.ts:47`, `storage.ts:53`), `AudioContext` (`audio.ts:32-39`, `56-69`), canvas context (`render.ts:353`), `devicePixelRatio` clamp (`main.ts:197`), and `dt` clamp (`main.ts:244`, `render.ts:394`). The per-frame `ui.sync(engine)` is **not** a perf problem — it is signature-cached and only rebuilds DOM when the program changes (`palette.ts:355-359`). The procedural-audio fallback (zero-asset-playable) and the `Tileset` interface (`render.ts:16-40`) are elegant seams.

The weaknesses are **process and future-proofing, not correctness**: there are no tests, no linter/formatter, and CI only builds; several union switches lack exhaustiveness assertions; `prefers-reduced-motion` is honoured **nowhere** despite being an explicit audience constraint; the farm/peacock theme is hard-coded across `render.ts`/`types.ts`/`audio.ts` (blocking the parallel theme task); and `render.ts` (~930 ln) bundles four concerns. None of these are bugs in the shipped game — they are debts that will bite during the in-flight l10n and theme work. Verdict: **ship-ready code, invest-before-extend tooling**.

---

## 2. Findings table

| # | Finding | Severity | Category | Effort | Evidence (file:line) | Conf. |
|---|---------|----------|----------|--------|----------------------|-------|
| F1 | `prefers-reduced-motion` honoured nowhere (canvas anim + CSS keyframes) | **P1** | a11y / motion | M | grep repo-wide: 0 matches; `render.ts:708-792`, `style.css:585,624` | high |
| F2 | Farm/peacock theme hard-coded in render/types/audio (blocks theme task) | **P1** | theme-readiness | L | `render.ts:579,685,800`, `490-514,810`; `types.ts:14,100`; `audio.ts:146,482` | high |
| F3 | No tests / no harness; BFS solver is throwaway `/tmp/solve.py` | **P1** | tooling | M | `package.json:13-16` (no dev test deps); `levels.ts:10` | high |
| F4 | i18n leaks: Dutch in `types.ts`; editor ignores `T`; literal `"Level"` concat; no locale/RTL dim | **P2** | i18n-readiness | M | `types.ts:114-119`; `editor.ts:393-466`; `palette.ts:314,501,527`; `i18n.ts:4-45` | high |
| F5 | Union switches have no `never` exhaustiveness check (silent no-op on extension) | **P2** | TS | S | `types.ts:57-68`; `engine.ts:201-263`; `audio.ts:137-168` | high |
| F6 | A11y: overlays lack `role=dialog`/`aria-modal`/focus mgmt; toggles lack `aria-pressed`; canvas unlabeled; no `:focus-visible`; zoom disabled | **P2** | a11y | M | grep: 0 `role=`/`aria-modal`/`focus-visible`; `palette.ts:283-309`; `index.html:7` | high |
| F7 | Per-frame allocs: `pathSet` rebuilt every frame (dups `engine.pathSet`); `collected` spread every frame | **P2** | perf | S | `render.ts:410,584` vs `engine.ts:38,69` | high |
| F8 | Editor rebuilds entire grid + re-attaches all listeners on every painted cell during drag | **P2** | perf / DOM | S | `editor.ts:662`→`580-626` | high |
| F9 | `tsconfig` missing `noUnusedLocals/Params`, `noImplicitReturns`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax` | **P2** | tooling | S | `tsconfig.json:1-17` | high |
| F10 | No linter/formatter; CI runs build only — no lint/test/typecheck-on-PR gate | **P2** | tooling / CI | M | `package.json:7-12`; `deploy.yml:28` | high |
| F11 | `storage.ts` guards duplicated inline in `editor.ts doPaste` (~60 ln) | **P2** | structure / DRY | S | `storage.ts:8-39`; `editor.ts:742-805` | high |
| F12 | Engine exposes ~20 mutable public fields; renderer reaches into internals (no read-only view) | **P2** | architecture / coupling | M | `engine.ts:37-65`; `render.ts:393-519` | high |
| F13 | `render.ts` (~930 ln) mixes tileset impl + particles + renderer + helper | **P2** | structure | M | `render.ts:1-930` | high |
| F14 | Two color sources: hex literals in render duplicate `:root` vars, unsynced | **P2** | theme / consistency | S | `render.ts:490,514,810` vs `style.css:7-9` | high |
| F15 | Dead code: confetti methods + `prevPhase` field + `chips` field + dangling "6. Confetti" comment | **P3** | maintainability | S | `render.ts:343-344,521-522,884-921`; `palette.ts:61` | high |
| F16 | Cast smells: `undefined as unknown as HTMLElement` ×4; redundant cast after `closest<>`; `Object.keys as SfxName[]` | **P3** | TS | S | `palette.ts:80-83`; `editor.ts:470,541`; `audio.ts:96` | high |
| F17 | `turnLeft/turnRight` use `as Dir` on modulo; `Record<Dir,Dir>` table would be cast-free + exhaustive | **P3** | TS | S | `types.ts:70-75` | high |
| F18 | `h()` helper inconsistent (used ~10×, raw `createElement` ~25×); not generic over element type | **P3** | DOM | S | `palette.ts:43-47` vs `107-201` | high |
| F19 | `palette.ts` field declarations split (49-90, then 346-352 mid-class) | **P3** | readability | S | `palette.ts:49-90,346-352` | high |
| F20 | `resize` listener anonymous (can't remove) + no debounce | **P3** | perf / lifecycle | S | `main.ts:99` | high |
| F21 | `dt` clamp duplicated in main loop and renderer (two computations) | **P3** | structure | S | `main.ts:244`; `render.ts:394` | high |
| F22 | Two CSS naming conventions (flat vs `.lugame-editor .ed-*`); z-index ad-hoc (10/20/25/100), not tokenized | **P3** | CSS arch | S | `style.css` throughout; `editor.ts:16` | high |
| F23 | `editor.setTool` matches active state by text-content suffix (fragile, locale-breaking) | **P3** | DOM / i18n | S | `editor.ts:540-545` | high |
| F24 | Editor inline `style.cssText` instead of a class | **P3** | CSS | S | `editor.ts:513` | high |
| F25 | Unnamed magic numbers throughout render animation tuning | **P3** | readability | S | `render.ts:472,566,710,751,783` | med |
| F26 | Engine double-init: field initializer + constructor both `new GameEngine` | **P3** | waste | S | `main.ts:55,57` vs `67` | high |
| F27 | `void new App()` bootstrap; `getElementById('app')!` no error path | **P3** | robustness | S | `main.ts:66,253` | med |

---

## 3. Detailed sections by category

### 3.1 TypeScript

**Strengths.** `strict: true` is enabled (`tsconfig.json:12`). The codebase contains **no `any`** (grep confirms). Where casts are genuinely needed, the idiomatic `as unknown as T` double-cast is used (`main.ts:36-38`, `audio.ts:34`, `editor.ts:366,744,749`). The union types are well-chosen and narrow: `Dir = 0|90|180|270`, `Command`, `Phase`, `GameEvent`, `AnimalKind`, `SfxName` are all finite string/number-literal unions, and `Record<Union, T>` maps (`STEP_DUR`, `EVENT_SFX`, `EMOJI`, `COMMAND_EMOJI`, `COMMAND_LABEL`, `SFX_FILE`) give compile-time exhaustiveness of *tables* — adding a `Command` member forces updating `STEP_DUR` or it's a type error. That is the single best type-design pattern in the repo.

**F5 — Exhaustiveness of *switches* is missing.** The table pattern above is applied to data, but the *behavioural* switches are not protected:

- `dirVec` (`types.ts:57-68`) switches over `Dir` and returns in every case — compiles, but adding a 5th `Dir` value silently makes `dirVec` return `undefined` (the function is declared `: Pos`, so at runtime it returns `undefined` and downstream `.c`/`.r` access throws). 
- `doStep` (`engine.ts:201-263`) switches over `Command`; a new command silently no-ops.
- `play` (`audio.ts:137-168`) switches over `SfxName`; a new sfx is silent.

`noFallthroughCasesInSwitch` (`tsconfig.json:13`) does **not** catch missing cases — it only forbids fall-through. The fix is a one-line `never` assertion per switch:

```ts
// types.ts — dirVec
export function dirVec(d: Dir): Pos {
  switch (d) {
    case 0:   return { c: 0, r: -1 };
    case 90:  return { c: 1, r: 0 };
    case 180: return { c: 0, r: 1 };
    case 270: return { c: -1, r: 0 };
    default:
      const _exhaustive: never = d;
      throw new Error(`unhandled Dir: ${_exhaustive}`);
  }
}
```

The same `default: const _: never = x;` should be added to `engine.ts:201` and `audio.ts:137`. This is the highest-leverage TS change in the repo: it converts three silent-failure sites into compile errors the moment a union grows.

**F17 — `as Dir` casts in `turnLeft`/`turnRight`** (`types.ts:70-75`):

```ts
export function turnLeft(d: Dir): Dir {
  return (((d + 270) % 360) as Dir);   // unchecked cast on modulo arithmetic
}
```

The cast is "safe" today only because the input is typed `Dir` and the arithmetic happens to land on a Dir value — but the compiler is not actually verifying it. A lookup table is cast-free *and* exhaustive *and* self-documenting, and it will fail to compile if `Dir` grows without the table being updated:

```ts
const LEFT: Record<Dir, Dir>  = { 0: 270, 90: 0, 180: 90, 270: 180 };
const RIGHT: Record<Dir, Dir> = { 0: 90,  90: 180, 180: 270, 270: 0 };
export const turnLeft  = (d: Dir): Dir => LEFT[d];
export const turnRight = (d: Dir): Dir => RIGHT[d];
```

**F16 — cast smells.** `palette.ts:80-83` initialises a `Record<ToggleKey, HTMLElement>` with four `undefined as unknown as HTMLElement` entries — a smell that signals the wrong type. The map is really partial until `build()` runs:

```ts
// today
private toggles: Record<ToggleKey, HTMLElement> = {
  easy: undefined as unknown as HTMLElement, // ×4
};
// better
private toggles: Partial<Record<ToggleKey, HTMLElement>> = {};
// or keep the `!` definite-assignment idiom already used elsewhere:
private toggles!: Record<ToggleKey, HTMLElement>;
```

Also: `editor.ts:470` casts `e.target as HTMLElement` *and* calls `.closest<HTMLElement>(...)` — the generic already returns `HTMLElement | null`, so the outer cast is redundant. `editor.ts:541` does `b as HTMLElement` on a `querySelectorAll` result; prefer `this.root.querySelectorAll<HTMLElement>('.ed-tool')`. `audio.ts:96` does `Object.keys(SFX_FILE) as SfxName[]` — acceptable, but a typed `const SFX_NAMES = Object.keys(SFX_FILE) as SfxName[]` constant declared once is cleaner than re-deriving.

**F9 — tsconfig flags to add** (full rationale in §6): `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `noUncheckedIndexedAccess` (highest value — would flag `this.toggles[k]` at `palette.ts:339` as `HTMLElement | undefined`), `exactOptionalPropertyTypes`, `verbatimModuleSyntax`.

**Type design verdict.** The unions are good. The one design question worth flagging: `Phase` and `GameEvent` are *string* unions used in `switch`/comparisons, not *tagged-object* discriminated unions. For this app's size that is the right call (tagged objects would be over-engineering). If the engine grows, a tagged `type EngineState = { kind:'running'; pc:number; … } | …` reducer would make illegal states unrepresentable (today `phase='running'` while `winT>0` is representable but meaningless).

### 3.2 Vanilla JS / DOM patterns

**The `h(tag, cls)` helper** (`palette.ts:43-47`) is minimal — it sets only tag + class. Consequently `palette.ts` uses `h()` ~10× but falls back to raw `document.createElement` ~25× (`palette.ts:107,112,117,122,127,144,152,163,178,188,198,201,212,228,…`). Two idioms for one job hurts consistency (F18). A slightly richer helper removes most of the raw calls and the later `setAttribute`/`textContent` noise:

```ts
function h<T extends HTMLElement>(
  tag: string, cls: string, opts: { text?: string; aria?: string; html?: string } = {},
): T {
  const el = document.createElement(tag) as T;
  el.className = cls;
  if (opts.text) el.textContent = opts.text;
  if (opts.html) el.innerHTML = opts.html;
  if (opts.aria) el.setAttribute('aria-label', opts.aria);
  return el;
}
// call site: const btn = h<HTMLButtonElement>('button', 'topbar-btn', { text:'⚙', aria: T.settings });
```

**F19 — split field declarations.** `palette.ts` declares most fields at `49-90` but then declares *more* fields mid-class at `346-352` (`programWrap`, `programExpandBtn`, `programOverlay`, `programOverlayGrid`, `programOverlayClose`, `allChips`, `prevGroups`). The `!` definite-assignment assertion is used heavily and consistently — that part is fine — but the split declaration makes the class shape hard to scan. Consolidate all fields at the top.

**F8 — editor grid rebuild storm.** `LevelEditor.applyTool` calls `this.renderGrid()` unconditionally at the end (`editor.ts:662`), and `renderGrid` does `gridEl.innerHTML = ''` then recreates every cell with fresh `pointerdown`/`pointerenter`/`pointerup` listeners (`editor.ts:580-626`). During a paint drag, `pointerenter` fires per cell → `applyTool` → full grid rebuild. On a 10×10 board that is 100 element creations + ~300 listener attachments *per painted cell*. It works (the new cells get new listeners synchronously before the next event fires, and `this.painting` persists), but on a low-end tablet this is avoidable jank. Fix: separate *model* mutation (`applyTool` updates `pathSet`/`goals`/`animals` only) from *view* mutation, and in `renderGrid` either (a) update only the touched cell's class/marker, or (b) debounce the full rebuild until `pointerup`. At minimum, move the `this.renderGrid()` out of the per-cell hot path.

**Listener lifecycle.** `App` is a singleton (`void new App()`, `main.ts:253`) that lives for the page lifetime, so the anonymous listeners on `window` (`main.ts:99,216,239-240`) never truly leak in practice — but `main.ts:99`'s resize handler is anonymous (cannot be removed) and **undebounced**, so a window resize fires `getBoundingClientRect` + canvas resize dozens of times per second during a drag (F20). Wrap in a 100-150 ms debounce. The first-gesture unlock (`main.ts:231-241`) correctly removes itself — good pattern, worth reusing. `pulseBadge` correctly uses `{ once: true }` (`palette.ts:463-467`).

**App lifecycle.** `App` constructs `new GameEngine(LEVELS[0])` as a *field initializer* (`main.ts:57`) and then **again** in the constructor (`main.ts:67`) — the first instance is immediately discarded (F26). Harmless but wasteful and confusing; drop the field initializer and keep only the constructor line (or vice-versa). `getElementById('app')!` (`main.ts:66`) asserts non-null with no error path; if the mount ever moves, this throws an opaque `Cannot read properties of null`. A one-line guard with a clear message is cheap (F27).

### 3.3 CSS architecture

**Token system — good.** `:root` (`style.css:1-17`) centralises the palette (`--bg --panel --panel-2 --ink --ink-dim --accent --good --bad`) and the four command colors (`--fwd --left --right --fan`), plus `--shadow`. Command colors are correctly color-blind-distinct (blue/purple/orange/teal). Mobile hygiene is solid: `overscroll-behavior:none` (`style.css:30`), `user-select:none`, `touch-action:none` on canvas (`style.css:151`), `env(safe-area-inset-*)` padding (`style.css:44`).

**F14 — two color sources of truth.** The renderer hard-codes hex literals that *duplicate* the `:root` vars but are not linked: `#36c96a` (`render.ts:490`, `good`-pip), `#ff5d6c` (`render.ts:514`, error ring = `--bad`), `#ffd34e` (`render.ts:810`, chevron = `--accent`), `rgba(255,211,78,…)` glow (`render.ts:573-574`). Change `--good` in CSS and the canvas pips don't follow. A theme system (F2) must read these from CSS custom properties via `getComputedStyle` (or accept a typed color config) so canvas and DOM share one source.

**F22 — two naming conventions + ad-hoc z-index.** Main CSS is flat BEM-lite (`.topbar`, `.topbar .title`, `.chip.forward`, `.lvl-pick.current` — no `__element`/`--modifier` syntax). Editor CSS (`editor.ts:13-265`) is scoped-prefix (`.lugame-editor .ed-*`). Neither is wrong; the editor's prefix-scoping is actually good isolation practice — but the project has two conventions and no documented rule. z-index is ad-hoc across both files: `10` (overlay base, `style.css:328`), `20` (level-select `:367`, settings `:482`), `25` (program-overlay `:609`), `100` (editor `editor.ts:16`). No `--z-*` tokens. Introduce `--z-overlay`, `--z-modal`, `--z-editor` in `:root` so the stacking order is named and unfragmented.

**Responsive strategy.** Mobile-first with a single `min-width: 900px` breakpoint to a two-column CSS grid (`style.css:447-479`) — appropriate for phone/tablet-primary. The editor has its own `max-width: 680px` collapse (`editor.ts:249-265`). Magic numbers are pervasive (`gap: 0.5rem`, `height: 4.2rem`, `border-radius: 16px`, etc.) — acceptable at this scale; a spacing/size scale (`--space-1`, `--radius-md`) would only pay off if the design grows.

**F1 — `prefers-reduced-motion` is honoured nowhere.** This is the most important CSS/motion finding. The audience spec says *"Motion should delight but MUST respect prefers-reduced-motion."* Repo-wide grep for `prefers-reduced-motion|matchMedia` returns **0 matches**. The canvas runs continuous animation — idle breathe (`render.ts:743-747`), walk hop (`:749-757`), fan ring (`:708-727`), bump shake (`:730-735`), sparkles (`:759-773`), win bounce (`:788-792`) — and CSS runs `chip-err` (`style.css:585`) and `badge-pop` (`:624`) keyframes. None of these are gated. Minimal fix:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
  }
}
```
```ts
// main.ts — read once, pass to renderer
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
// in Renderer.draw: skip sparkles/trail, freeze breathe/hop at neutral pose when reduceMotion
```

### 3.4 Module / file structure & separation of concerns

**F13 — `render.ts` (~930 ln) bundles four concerns.** It contains (1) the `Tileset`/`DecorImg`/`GroundTiles` *interfaces* + the `FarmTileset` *implementation* + procedural decor (`1-292`), (2) `Particle`/`Sparkle` types + confetti (`294-337`), (3) the `Renderer` class with draw orchestration + six private draw helpers (`339-921`), and (4) a `dirVecNum` helper (`924-929`). Natural split:

- `src/game/tileset.ts` — `Tileset` interface, `FarmTileset`, `mulberry32`, `cellSeed`, `DECOR_SPEC`. (The `Tileset` interface at `render.ts:16-40` is **already** the clean theme seam — moving it out makes that explicit.)
- `src/game/particles.ts` — `Particle`, `Sparkle`, `CONFETTI`, `FAN_DOTS`, `FAN_COLORS`.
- `src/game/render.ts` — only the `Renderer` class.

This also makes the theme-extraction task (F2) a concrete file boundary rather than a search-and-replace.

**F12 — engine coupling.** `GameEngine` exposes ~20 mutable public fields (`engine.ts:37-65`: `level`, `pathSet`, `robot`, `animals`, `program`, `pc`, `phase`, `fanT`, `bumpT`, `bumpDir`, `winT`, `bumpShake`, `easyMode`, `collected`, `energy`, `holdOnError`, `errorStep`), with only `stepElapsed`/`stepDur`/`animalSeq` private. The renderer reads directly and deeply (`render.ts:393-519` reaches `e.robot.dc`, `e.level.goals`, `e.collected`, `e.fanT`, `e.bumpShake`, `e.bumpDir`, `e.energy`, …). This is an anemic/exposed-state design: the renderer is coupled to engine *internals*, not a contract. Two non-disruptive options:

1. **Cheapest:** add a `readonly view()` / `getSnapshot()` method returning a frozen read-only projection the renderer consumes — keeps internals mutable but publishes a narrow contract.
2. **Cleaner:** introduce a tiny typed event/state pattern (see §5) so the renderer subscribes to *changes* rather than polling fields every frame.

Either way, `pathSet` should not be rebuilt in the renderer (F7) — `engine.pathSet` already exists (`engine.ts:38,69`).

**F11 — duplicated validation.** `storage.ts` has correct, hand-rolled guards (`isPos`, `isDir`, `isAnimalKind`, `isValidAnimalSpawn`, `isValidLevel`, `8-39`). `editor.ts doPaste` then **re-implements the same structural validation inline** (`editor.ts:742-805`, ~60 lines) instead of importing those guards. Extract the guards to `src/game/validate.ts` (or `src/storage.ts` re-exports) and reuse. On "is there a better pattern than hand-rolled guards?": given the hard constraint to keep the bundle tiny (~7 KB gz), **`zod` / `io-ts` / `valibot` are not worth the kB** here. Hand-rolled `unknown`-guards with `value is T` predicates are the right call for this bundle size — the problem is purely the duplication, not the technique. A 20-line `validators.ts` shared module fixes it.

### 3.5 State management

**Phase machine.** `GameEngine.update` (`engine.ts:143-187`) drives the `Phase` state via an `if/else-if` chain on the string `phase`, with transitions scattered across `doStep`, `triggerBump`, and `update`. It is correct and readable at this size. The risk (F5-adjacent) is that nothing enforces *legal* transitions — `phase='running'` with `winT>0` is representable, and adding a phase does not produce a compile error at the transition sites. If the engine grows, a reducer with a typed `Action` discriminated union and a `default: never` would make illegal states unrepresentable. For 12 levels + editor this is optional, not urgent.

**App→UI sync loop — efficient, do not "fix".** The prompt flags `ui.sync(engine)` every frame (`main.ts:248`) as a possible perf concern. It is **not**: `PaletteUI.sync` (`palette.ts:354-380`) caches a `cachedProgram` signature (`:355-356`) and only calls `rebuildChips` when the program actually changes; the per-frame work is just `classList.toggle` over `allChips` (`:362-368`) plus a few `disabled`/`overlay` toggles. This is cheap and correct. The only micro-nit: it toggles `active`/`error` on every chip every frame even when unchanged — a per-chip "did it change?" short-circuit would save a handful of DOM writes, but it is not worth the complexity at this scale.

**Settings persistence.** `loadSettings`/`setSetting` (`main.ts:32-51,122-137`) correctly try/catch `localStorage` and fall back to defaults; `setSetting` applies the change to engine+audio immediately *and* persists *and* reconciles the UI (`:136`). Clean. One gap: `loadSettings` trusts `o.music !== false` / `o.sound !== false` (`main.ts:42-43`) — a stored `music: "false"` (string) would be treated as truthy. Low risk (only this app writes the key) but `typeof o.music === 'boolean' ? o.music : true` is more defensive.

### 3.6 Error handling & edge cases — a strength

This area is consistently good and worth calling out:

- `localStorage` access wrapped in `try/catch` with silent fallback in all three sites (`main.ts:47-49,131-135`, `storage.ts:43-55,67,74`).
- `AudioContext` constructor resolved via runtime guards, not an unchecked cast (`audio.ts:32-39`); context creation wrapped in `try/catch` (`audio.ts:58-67`); `resume()` after user gesture (`main.ts:231-241`) — the correct pattern for autoplay policies.
- `decodeAudioData` failures fall back to procedural synthesis (`audio.ts:103-107,123-125`).
- Canvas 2D context null-checked (`render.ts:353`).
- `devicePixelRatio` clamped to ≤2 (`main.ts:197`) — prevents 3× retina canvases from OOMing.
- `dt` clamped to 0.05 s in both the engine feed and the renderer (`main.ts:244`, `render.ts:394`) so a tab-throttle or debugger pause can't teleport the peacock across the board.
- `overscroll-behavior: none` + `touch-action: none` prevent pull-to-refresh interfering with the game.

The two minor gaps: `getElementById('app')!` (F27) and the `music:"false"`-string trust above. Otherwise this is exemplar defensive code for a browser game.

### 3.7 Performance

**F7 — per-frame allocations in the render loop.** `Renderer.draw` does `const pathSet = new Set(L.path.map(key))` on **every frame** (`render.ts:410`), allocating a new `Set` and a backing array 60×/s — and it duplicates `engine.pathSet` which is built once in the constructor (`engine.ts:69`). Replace with `e.pathSet` (the `GameEngine` already exposes it, `engine.ts:38`). Separately, `this.prevCollected = [...collected]` (`render.ts:584`) spreads a new array every frame even when nothing was collected; only re-snapshot when a transition is detected. These are the two clear, safe wins.

**Canvas redraw strategy.** The whole canvas is `clearRect`'d and redrawn every frame (`render.ts:401,425-459`) — full repaint. For a board this small (≤7×6 = 42 cells) that is fine; layering/caching would be premature. The grass-tile loop (`render.ts:425-429`) tiles the *entire canvas* with `drawImage` every frame even though grass is static — a single offscreen canvas blit of the static background+decor layer (invalidated only on `resize`/level-change) would cut the majority of per-frame `drawImage` calls. Worth doing *if* profiling shows it; not urgent for ≤42-cell boards.

**F8 — editor rebuild storm** (see §3.2) is the more impactful DOM-side perf issue.

**`Math.random()` per frame** for trail sparkles (`render.ts:760`) is negligible. `mulberry32` + `cellSeed` for deterministic decor (`render.ts:44-61`) is a nice touch — stable visuals across frames without per-cell state.

### 3.8 Accessibility (code-level hygiene)

**Good primitives present.** Icon-only buttons carry `aria-label`s (`palette.ts:110,115,120,125,130,166,215,231`). All interactive elements are semantic `<button>`s (keyboard-focusable, Enter/Space-activatable) — not `<div onclick>`. Keyboard input is supported (`main.ts:206-229`: arrows/WASD/F to add commands, Enter/Space to run, Backspace to undo). The canvas is the only non-DOM surface.

**F6 — the gaps.**

1. **Overlays are not dialogs.** The win, level-select, settings, and program overlays are `.overlay` divs (`palette.ts:146,173,207,223`) with **no** `role="dialog"`, **no** `aria-modal="true"`, **no** focus management (grep finds zero `role=`/`aria-modal`/`.focus()`). When the win overlay appears, focus stays on whatever had it; a screen-reader/keyboard user has no announcement and the underlying board remains theoretically reachable. Each overlay should, on `.show`: set `role="dialog" aria-modal="true"`, move focus to its primary button (`overlayBtn.focus()`), trap Tab within, and restore focus on close.
2. **Toggles don't expose state.** `buildToggle` (`palette.ts:283-309`) is a `<button>` whose on/off is communicated only by the `.on` class — invisible to AT. Add `role="switch" aria-checked="${next}"` (or `aria-pressed`). This is a 2-line change with real impact.
3. **Canvas is unlabeled.** `canvas#board` (`palette.ts:144`) has no `role="img"`/`aria-label`. For a sighted-only game the canvas is inherently inaccessible, but a brief text alternative (`aria-label="Speelbord: pauw op een pad naar een koekje"`) at least announces it.
4. **No `:focus-visible` styles.** Grep finds none. The browser default focus ring is present (no global `outline:none`), which is *acceptable*, but for a kids'/touch UI a deliberate `:focus-visible` ring (bigger, high-contrast) is better — especially since `* { -webkit-tap-highlight-color: transparent }` (`style.css:21`) removes the mobile tap highlight.
5. **Zoom disabled.** `index.html:7` sets `maximum-scale=1, user-scalable=no`. For a touch game this is a deliberate choice to stop accidental pinch-zoom, but it violates WCAG 1.4.4 (Reflow / text resize). Low-vision parents can't zoom. Consider dropping `maximum-scale=1, user-scalable=no` and relying on `touch-action` to prevent gesture interference instead.
6. **Chip remove is click-only.** Tap-to-remove (`palette.ts:478`) has no keyboard equivalent or aria hint; the `✕` is `pointer-events:none` decoration (`style.css:241`). Keyboard users can use Backspace (undo), so this is partial — but the per-chip affordance is mouse/touch only.

### 3.9 i18n-readiness

**F4.** The in-flight l10n task will hit these code-level issues:

- **Dutch lives in `types.ts`.** `COMMAND_LABEL` (`types.ts:114-119`) hardcodes `'Stap'/'Links'/'Rechts'/'Ksst!'` in the *types/geometry* module, not in `i18n.ts`. This mixes presentation with data and means the command labels bypass the `T` table entirely. Move these into `T` (e.g. `T.cmdForward`, …) and have `types.ts`/`palette.ts` read from `T`.
- **The editor ignores `T` entirely.** `editor.ts` hardcodes every Dutch string inline: `'Level Bewerker'` (`:393`), `'Gereedschap'` (`:399`), `'Grootte'`/`'Kolommen'`/`'Rijen'` (`:412-414`), `'Start-richting'` (`:417`), `'Naam'` (`:430`), `'Energie'`/`'Geen'` (`:438,441`), action buttons (`:462-467`), and all `validate()` messages (`:674-685`). None of these are in `T`. The prompt notes this is expected (don't extract yourself) — **flagging it here as the single biggest i18n debt.**
- **Literal `"Level"` concatenation.** `setLevelInfo` builds `Level ${index + 1} — ${name}` (`palette.ts:314`) and the level grid sets `aria-label = \`Level ${i + 1}\`` (`:501`) with the English/Latin word "Level" baked in (Dutch also uses "Level", but the *word* is not in `T`, so it can't be translated/wrapped differently). `'Verwijder level'` (`:527`) is also a raw literal.
- **`i18n.ts` has no locale dimension.** `T` is a flat `as const` object (`i18n.ts:4-45`) with no `locale` key, no `dir`/RTL flag, no pluralization. For a single-locale app this is fine; for the l10n work it needs to become `Record<Locale, Strings>` (or a `t(key, locale)` lookup) so an English table can drop in. Add a `dir: 'ltr'` (and `'rtl'` when relevant) field now even if unused — it documents the assumption.

**RTL readiness.** The grid math is coordinate-based (`c`/`r`, `Dir`), so it is RTL-agnostic at the model level — good. The canvas chevron (`render.ts:802-818`) derives facing from `ddir` directly, so an RTL *visual* mirror would need a sign flip in `dirVecNum` (`render.ts:926-928`). DOM layout is standard flex (LTR). No `dir` attribute is set or flipped anywhere. For a Dutch-only game RTL is N/A; flagging only so the l10n task knows the canvas-facing code is the one RTL-sensitive spot.

### 3.10 Theme-readiness (for the parallel theme task)

**F2 — where the farm/peacock theme is hard-coded and must be parameterised.**

A theme system needs to externalise at least: **avatar**, **goal**, **animal set**, **decor sprites + colors**, **ground tileset**, **SFX**, **BGM**. Today these are scattered and partly duplicated with CSS:

| Theme element | Hard-coded location | Notes |
|---|---|---|
| Avatar emoji `🦚` | `render.ts:800` (literal) | not in any table |
| Goal emoji `🍪` | `render.ts:579` (literal) | not in any table |
| Animal kinds + emoji | `types.ts:14` (`AnimalKind`), `:100-105` (`EMOJI`) | kinds are farm-specific (`cow/pig/sheep/chicken`) |
| Command emoji/label | `types.ts:107-119` | locale-coupled (see §3.9) |
| Decor sprites | `render.ts:329-337` (`DECOR_SPEC`), `FarmTileset` `:63-292` | entirely farm flora |
| Procedural tile/decor colors | `render.ts:68-291` (hardcoded greens/browns) | not derived from any config |
| Canvas accent colors | `render.ts:490,495,511-514,573-574,590,605,717,721,810,825` | duplicate `:root` vars, unsynced (F14) |
| Signature SFX | `audio.ts:146-150` (`peacockCall`), `:312-364` | peacock wail is farm-specific |
| BGM | `audio.ts:420-555` (`buildMusicBuffer`) | C-major "kid-friendly" phrase, key/tempo hardcoded |
| Asset paths | `audio.ts:19-28` (`SFX_FILE`), `render.ts:327,364,389-390` | partially config-shaped already |

**The good news:** the `Tileset` interface (`render.ts:16-40`) is **already** the right abstraction seam — `FarmTileset` is one `implements Tileset`, and `Renderer` takes an optional `tileset?` (`render.ts:351`) defaulting to `FarmTileset`. The theme task can extend this pattern to: a `Theme` config object `{ avatar, goal, animals: Record<Kind,string>, tileset: Tileset, colors, sfx, bgm }` threaded through `Renderer` and `AudioBus`. Concretely:

1. Lift `🦚`/`🍪` out of `render.ts:579,800` into the `Theme` (or at minimum into the `EMOJI`-style tables in `types.ts`).
2. Make `AnimalKind` theme-derived (or generic, e.g. `kind: string` with a per-theme emoji map) so a space theme can have asteroids instead of cows without changing `types.ts`.
3. Replace the hardcoded canvas hex literals (F14) with colors read from the `Theme`/`getComputedStyle(--var)` so canvas and DOM share one palette.
4. Give `AudioBus` an injectable synth table (map `SfxName → synth fn`) instead of the fixed `switch` in `play` (`audio.ts:137-168`), and make `buildMusicBuffer`'s key/tempo/melody `Theme`-driven.

---

## 4. Quick wins (low-conflict, safe alongside the active agent)

These are isolated, mostly mechanical, and touch files the active agent is unlikely to be editing simultaneously:

1. **Add `never` exhaustiveness defaults** to `dirVec` (`types.ts:57`), `doStep` (`engine.ts:201`), `play` (`audio.ts:137`). ~3 lines each. (F5)
2. **Reuse `engine.pathSet`** in `Renderer.draw` instead of rebuilding — delete `render.ts:410`, use `e.pathSet`. (F7)
3. **Snapshot `prevCollected` only on change** — move `render.ts:584` inside the `if (!was && collected[i])` transition block (or guard with a change check). (F7)
4. **Delete dead code**: `confetti` field + `spawnConfetti`/`stepConfetti`/`drawConfetti` (`render.ts:343,884-921`), the dangling `// 6. Confetti on win` comment (`:521`), unused `prevPhase` (`:344`), unused `chips` field (`palette.ts:61`). (F15)
5. **Add `prefers-reduced-motion` CSS block** (`style.css` head) + a one-time `matchMedia` read in `main.ts` passed to the renderer to skip sparkles/trail. (F1)
6. **Replace `turnLeft/turnRight` modulo+cast with `Record<Dir,Dir>` tables.** (F17)
7. **Add `role="switch" aria-checked` to toggles** (`palette.ts:297-306`) and `role="dialog" aria-modal="true"` + `.focus()` to overlays (`palette.ts:415-430`). (F6)
8. **Drop engine double-init** — remove the `new GameEngine(LEVELS[0])` field initializer at `main.ts:57`. (F26)
9. **Extract shared validators** to `src/game/validate.ts`, import in both `storage.ts` and `editor.ts doPaste`. (F11)
10. **Move `COMMAND_LABEL`** Dutch strings from `types.ts:114-119` into `i18n.ts` `T`. (F4)

---

## 5. Larger refactors (proposals for the active agent)

1. **Split `render.ts`** into `tileset.ts` (interface + `FarmTileset` + RNG), `particles.ts` (types + confetti), and `render.ts` (Renderer only). Makes the theme seam a file boundary. (F13, F2)
2. **Introduce a `Theme` config** threaded through `Renderer`/`AudioBus`/`types` (avatar, goal, animals, tileset, colors, sfx, bgm) — the natural extension of the existing `Tileset` interface. Coordinate with the parallel theme task. (F2, F14)
3. **Add ESLint (flat config) + Prettier + a `check` CI job.** Enforces the exhaustiveness/cast/no-unused conventions mechanically so they don't regress. (F10) — exact config in §6.
4. **Add a minimal Vitest harness** with tests for the pure geometry (`dirVec`/`turnLeft`/`turnRight`/`fanCells`/`addPos`/`samePos`), the storage validators, and the engine step/phase logic; plus a permanent port of the throwaway BFS solver (`levels.ts:10` → `levels.test.ts`) so the "all 12 levels remain solvable" invariant is checked in CI, not in `/tmp`. (F3) — sketch in §6.
5. **Narrow engine's exposed surface** — either a `getSnapshot()` read-only projection or a small typed event bus (`type EngineEvt = {type:'step';…}|…`) the renderer subscribes to, instead of reaching into ~20 public mutable fields every frame. (F12)
6. **Editor model/view split** — separate `applyTool` (mutate `pathSet`/`goals`/`animals`) from DOM update; render only the touched cell during a drag, full rebuild on `pointerup`. (F8)
7. **Tokenise z-index** (`--z-overlay/--z-modal/--z-editor`) and document the CSS naming rule (flat for app, `.lugame-*` scoped prefix for self-contained overlays like the editor). (F22)

---

## 6. Tooling recommendations

### 6.1 `tsconfig.json` — flags to add

```jsonc
{
  "compilerOptions": {
    /* existing */
    "strict": true,
    "noFallthroughCasesInSwitch": true,
    /* ADD: */
    "noUnusedLocals": true,            // catches dead fields (prevPhase, chips) at compile time
    "noUnusedParameters": true,        // pair with argsIgnorePattern in eslint for `_`-prefixed
    "noImplicitReturns": true,         // every code path of a valued fn must return
    "noUncheckedIndexedAccess": true,  // arr[i]/obj[k] → T | undefined (catches toggles[k] at palette.ts:339)
    "exactOptionalPropertyTypes": true,// `energy?: number` forbids explicit `undefined`
    "verbatimModuleSyntax": true       // stricter, clearer type-only imports (supersedes isolatedModules habit)
  }
}
```

`noUncheckedIndexedAccess` is the single most valuable addition — it would immediately flag the `this.toggles[k]` access (`palette.ts:339`) and every `program[i]` as potentially undefined, forcing guards that prevent a real class of runtime `TypeError`. Expect a moderate number of new errors on first enable; fix forward.

### 6.2 ESLint (flat config, ESLint 9 + typescript-eslint)

```js
// eslint.config.js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: { project: './tsconfig.json', tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error', // enforces F5 mechanically
      '@typescript-eslint/consistent-type-imports': 'error',      // pairs with verbatimModuleSyntax
      '@typescript-eslint/no-non-null-assertion': 'warn',         // flag the many `!` definite-assignments
      'no-console': ['warn', { allow: [] }],
    },
  },
  { ignores: ['dist/**', 'node_modules/**'] },
);
```

`@typescript-eslint/switch-exhaustiveness-check` is the lint-level enforcement of finding F5 — it turns "missing `Command` case in `doStep`" into a CI failure. Pair with Prettier (`prettier --write src`) using defaults; the existing code is already close to a standard format.

`package.json`:
```json
"scripts": {
  "lint": "eslint .",
  "format": "prettier --write .",
  "typecheck": "tsc --noEmit",
  "test": "vitest run"
}
```

### 6.3 Minimal Vitest setup

```bash
npm i -D vitest
```

`package.json` adds `"test": "vitest run"`, `"test:watch": "vitest"`.

**Example test path — `src/game/types.test.ts`** (geometry is pure and the highest-value first target):

```ts
import { describe, it, expect } from 'vitest';
import { dirVec, turnLeft, turnRight, addPos, samePos, fanCells } from './types';

describe('dirVec', () => {
  it('maps each Dir to its unit step', () => {
    expect(dirVec(0)).toEqual({ c: 0, r: -1 });   // N
    expect(dirVec(90)).toEqual({ c: 1, r: 0 });   // E
    expect(dirVec(180)).toEqual({ c: 0, r: 1 });  // S
    expect(dirVec(270)).toEqual({ c: -1, r: 0 }); // W
  });
});

describe('turnLeft / turnRight', () => {
  it('rotates by 90° and stays within the Dir union', () => {
    expect(turnLeft(0)).toBe(270);
    expect(turnLeft(270)).toBe(180);
    expect(turnRight(0)).toBe(90);
    expect(turnRight(turnRight(90))).toBe(270);
  });
});

describe('fanCells', () => {
  it('returns the 3 cells in the frontal arc', () => {
    const cells = fanCells({ c: 2, r: 2 }, 90); // facing E
    expect(cells).toHaveLength(3);
    expect(cells).toContainEqual({ c: 3, r: 2 }); // front
    expect(samePos(addPos({ c: 2, r: 2 }, dirVec(90)), { c: 3, r: 2 })).toBe(true);
  });
});
```

Follow-up tests: `src/storage.test.ts` (validators reject malformed levels), `src/game/engine.test.ts` (step/bump/win/energy transitions), and `src/game/levels.test.ts` (BFS-port: every level in `LEVELS` is solvable — replaces the throwaway `/tmp/solve.py` referenced at `levels.ts:10`).

### 6.4 GitHub Actions additions

Add a `check` job (run on PRs and on push to any branch) **separate from** the Pages `deploy` job, so PRs are gated without deploying:

```yaml
# .github/workflows/ci.yml   (or append a job to deploy.yml)
name: check
on: [pull_request, push]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test
```

Today `deploy.yml` runs only `npm run build` (= `tsc --noEmit && vite build`) on `main` (`deploy.yml:28`). Adding `lint` + `test` as PR-required gives mechanical enforcement of F5 (exhaustiveness), F9 (unused), and F3 (regression) before merge. The existing `build` already typechecks, so `typecheck` is partially redundant but makes the gate explicit and fast-failing.

---

## 7. Not analysed

- **`public/assets/`** audio `.mp3`s and `img/` pixel tiles (binary assets; only their *paths* and loading code were reviewed — `render.ts:327,364,389`, `audio.ts:19-28,100-115`).
- **`public/CREDITS.md`** and licence attribution correctness for the CC0 assets.
- **`docs/decisions.md`** ADR content (only noted that ADR-0005 documents the final build; not evaluated for accuracy against the code).
- **`README.md`**, **`LICENSE`**, **`.gitignore`**, **`package-lock.json`** — not reviewed.
- **Runtime behaviour / actual gameplay** — no browser session; findings are static (code reading + grep). Visual/UX correctness (e.g. whether the win celebration reads well, whether animations feel good) was not exercised.
- **Bundle size** measurement — the ~7 KB gz claim was not verified by a build.
- **Cross-browser / device testing** — Safari `webkitAudioContext` handling was read (`audio.ts:32-39`) but not executed; `backdrop-filter` fallback (`style.css:324`) noted but not tested.
- **The in-flight l10n task's own design** — only code-level i18n-readiness was assessed; the chosen l10n architecture is out of scope.
- **Security** — no network/auth surface; `localStorage` only stores user-created levels/settings (validated on load, `storage.ts:42-56`). Not a meaningful attack surface for a static client-only kids' game; not deeply analysed.
