# lugame — Decision Log

Living document. Append-only; strike decisions when superseded.

---

## ADR-0001 — Project shape & inspirations (2026-07-25)

**Context.** Building a programming game for a **4-year-old** audience in the
vein of Karel the Robot / turtle graphics / Lightbot / GCompris's penguin-fish
activity.

**Researched open-source references:**

### 1. `haan/Lightbot` (MIT) — https://github.com/haan/Lightbot
- Closest analog. JavaScript + browser, plays at https://lightbot.lu.
- Player builds a **program** from icon instructions (walk, turn, jump, light,
  repeat, procedure P1/P2), then runs it; each step highlights as it executes.
- **Borrow:** the build-then-run core loop, the icon-strip "program" UI, the
  per-step execution highlight, the robot + tile aesthetic.
- Robot artwork by *surt*; music by *hektikmusic* (their assets are NOT MIT
-licensed for our reuse — we'll source our own CC0 art; see ADR-0004).

### 2. GCompris `programmingMaze` (GPL-3.0-or-later)
- Tux the penguin → fish. QML/Qt. Instruction set: `move-forward`,
  `turn-left`, `turn-right`, `call-procedure`, `execute-loop`.
- Notable mechanics: facing direction (N/E/S/W = 0/90/180/270), tile-centering
  math (`x*stepX + (stepX-w)/2`), `isRunCodeEnabled` gate (disable run while
  executing), dead-end detection (off-path step → friendly stop, not crash),
  procedure/loop tutorial overlays shown once.
- **Borrow (design only — no code, GPL is viral):** facing-direction model,
  run-button gating, gentle dead-end handling, "show tutorial once" pattern.

### 3. `asweigart/botbright` (MIT)
- Single-file JS Lightbot clone. Good reference for the minimal isometric grid
  + command queue.

**Decision.** Target the Lightbot/GCompris core loop for the MVP: a top-down
grid, a character with a facing, an icon command palette, a queued program
strip, a Run button, and step-by-step animated execution to a goal.

---

## ADR-0002 — Tech stack *(PENDING USER CONFIRMATION — 2026-07-25)*

**Recommendation: Web — TypeScript + Vite + HTML5 Canvas, deployed to GitHub
Pages.**

| Criterion | Web (TS+Vite+Canvas) | Python (pygame) |
| --- | --- | --- |
| Install friction for a 4yo's device | **None** — a URL works on tablet/phone/Chromebook | High — Python + deps on each device |
| Touch input (4yo tap/drag) | **First-class** | Weak/awkward in pygame |
| Shareability (grandparents, class) | **URL** | Must distribute an app |
| Reference impls match | **haan/Lightbot, botbright are JS** | Few good pygame analogs |
| Rich animation + audio | **CSS/SVG/Canvas/Web Audio** | Doable, more work |
| Type safety (user values this) | **TypeScript** | Python type hints |
| Free hosting + auto-deploy | **GitHub Pages** | None built-in |

**Counter-argument acknowledged:** the user stated a preference for Python. If
that preference is strong, the viable path is **pygame + pygbag** (compiles
pygame to WASM so it still ships to a browser URL). This keeps Python as the
authoring language while solving the distribution/touch problems — at the cost
of a less mainstream toolchain and tighter asset budgets (WASM payload).

**My call: go Web.** For a pre-literate, tablet-using audience, zero-install +
native touch + one-click share outweigh the familiarity of Python. TypeScript
delivers the type safety the user wanted from Python. pygbag remains a fallback
if the user insists on Python.

**Status: awaiting user thumbs-up before initializing the project.**

---

## ADR-0003 — MVP scope (2026-07-25)

**In (v0.1):**
- 2D top-down grid (start ~6×6), rendered on canvas.
- Character with a **facing direction** (4-way), default a friendly robot.
- A **goal tile**, default a star (swappable to fish for penguin theme).
- **Command palette** — big touch buttons: Forward, Turn Left, Turn Right.
- **Program strip** — queued commands shown as a horizontal row of icons.
- **Run** button (big, green) + **Clear** button.
- Execution: one command at a time, ~400ms/step, **active command highlighted**,
  step sound on each move.
- **Win** — reach goal → celebration sound + sparkle/confetti, "Play again".
- **Gentle fail** — step off the path / off-grid → friendly "whoops" + reset to
  start (no score, no shame).
- 3–5 hand-designed levels of increasing length.
- Keyboard shortcuts for grown-ups testing (arrows add commands, Enter runs);
  UI is fully usable by touch alone.

**Out (later):**
- Loops, procedures (P1/P2), conditionals.
- Multiple goals, obstacles, walls, ice/sliding tiles.
- Level editor, level packs, scoring/stars, localization, voice cues.

---

## ADR-0004 — Art & sound sourcing (2026-07-25)

**Policy:** CC0 (public domain) only, so we can ship without attribution
bookkeeping and never collide with a viral license.

**Sources (planned):**
- **Kenney.nl** — CC0 game asset packs; "Toon Characters", "1-Bit Pack",
  "Platformer", cute robots & tiles. Ideal for kids.
- **OpenGameArt.org** — filter CC0; robots, tiles, UI.
- **Freesound.org** — CC0 SFX (step, win, whoops, button).
- **Google Fonts (OFL)** or CC0 icon font for any text (kept minimal — 4yo).

**Method:** browse via browser tool, visually inspect each candidate with the
image-understanding tool, download CC0 assets into `assets/`, record the source
URL + license + author in `assets/CREDITS.md` per asset.

**Explicitly NOT reused** (license mismatch, inspiration only):
- haan/Lightbot's *surt* robot sprites and *hektikmusic* audio.
- GCompris's Tux/fish/Qt artwork (GPL).

---

## Open questions for the user (2026-07-25)

1. **Stack** — Web (TS+Vite+Canvas, my rec) or Python (pygame, optionally via
   pygbag→WASM)? *[I recommend Web.]*
2. **Character/theme** — friendly robot → star (my default), or penguin → fish
   (GCompris style), or something your kid is into?
3. **Deploy** — want it live on GitHub Pages on first push so it's playable by
   URL right away? *[Default: yes.]*

Everything else (MVP scope, CC0-only art, level count) I've defaulted above;
redirect any of it freely.

## ADR-0005 — Final decisions & build (2026-07-25) — RESOLVED

All open questions answered; MVP built, verified, and deployed.

- **ADR-0002 → Web adopted.** TypeScript + Vite 5 + HTML5 Canvas. Confirmed over
  Python/pygame for the 4yo tablet audience (zero-install, native touch, URL
  share). TypeScript delivers the type safety Python would have. *pygbag kept as
  a future fallback only.*
- **Theme → peacock 🦚 → cookie 🍪**, with farm-animal obstacles
  (cow/pig/sheep/chicken) — per the kid's favourite animal.
- **Special mechanic → "Shoo!" fan.** The peacock fans its feathers, shakes
  wildly, and belts its call, scaring any farm animal in the 3-cell frontal arc.
  This gives the game its own identity beyond a Lightbot clone and teaches
  "turn to face, then act."
- **MVP scope shipped:** 4 commands (Forward / Left / Right / Shoo!), big touch
  palette, queued program strip, Run with step-by-step highlight + eased
  animation, gentle bump (no harsh failure), win = confetti + overlay, 5 levels
  of increasing difficulty.
- **Deploy → GitHub Pages via Actions** (build_type = `workflow`; Vite
  `base: '/lugame/'`). Live at **https://utsmok.github.io/lugame/**.

### Art & sound — revised from ADR-0004

- **Graphics:** emoji rendered on Canvas (no image assets) — consistent across
  platforms, keeps the bundle ~7 KB JS gzipped. ADR-0004's CC0-sprite plan was
  dropped: emoji look better for this audience than a mixed sprite set would.
- **Sound:** procedural Web Audio for every SFX *except* the peacock call — a
  bird's call can't be synthesized convincingly. `fan.mp3` = **Peacock2.ogg** by
  **Secretlondon**, **CC BY-SA 3.0** (Wikimedia Commons), trimmed to the first
  two of its three calls (1.8 s) + loudness normalization + fade. Attributed in
  `public/assets/CREDITS.md`. The synthesized peacock call remains as a fallback
  if the file is ever missing. *(ADR-0004's strict-CC0 policy was relaxed to
  CC-BY-SA for this one asset, with attribution — the only real recording.)*
- Tooling note: the host `ffmpeg` lacks `libvorbis`, so assets are `.mp3`
  (`libmp3lame`); the engine expects `public/assets/audio/*.mp3`.

### Verification

- `tsc --noEmit` clean; `vite build` clean (19.3 KB JS / 6.84 KB gz).
- Browser smoke test: Level 1 win + confetti confirmed; `fan.mp3` decodes
  (1.8 s mono); fan mechanic (scare animal → reach cookie) confirmed manually.
- Pages Actions run #30151046499: both build + deploy jobs green.


---

## ADR-0006 — Theme system (2026-07-25) — ACCEPTED, landed

**Context.** ADR-0005 hard-codes the farm/peacock theme across `render.ts`,
`types.ts`, `audio.ts`. The code-quality audit (F2, P1) confirms this blocks
themed variants and independently flags the existing `Tileset` interface
(`render.ts:16-40`) as the right seam.

**Decision.** Lift tileset/decor/obstacles/goal/bgm/colours into editable
per-theme JSON at `public/themes/<id>/theme.json`, rendered by a new
`ConfigTileset(theme)`. **Player + "Shoo!" fan stay global** (preserves
identity per ADR-0005); only the environment is themed. Text labels live in
the locale files (ADR-0007), keyed by theme/animal/goal id — theme files carry
visuals + audio only. Selection via a settings picker; persisted in
`lugame.theme`. Default farm theme references existing `assets/img/*` paths
(zero asset migration). Desert is the worked example: real CC0 desert tiles
(sand/stone/cactus/rock/skull/bush) + emoji animals (🐍🐫🦂🦎) + 🌴 goal shipped;
desert bgm/sfx stay procedural (no `desert.mp3`/`crunch.mp3` yet — 404→fallback).
Cross-theme fallback: farm-authored levels stay playable under any theme via
deterministic animal-kind substitution + a one-time `console.warn` per kind.

**Spec:** [`docs/theming-design.md`](theming-design.md). **Sequenced after l10n.**

---

## ADR-0007 — Localization / l10n (2026-07-25) — ACCEPTED, in flight

**Context.** Only `src/i18n.ts` exists (flat Dutch `T`), and it is incomplete —
`src/ui/editor.ts` hardcodes its own Dutch strings and never imports `T`
(code-quality F4, ui-ux E-2). `COMMAND_LABEL` lives in `types.ts`, mixing
presentation with data.

**Decision.** `src/locales/{nl,en,types}.ts` + a rewritten `src/i18n.ts` runtime:
`T` becomes a **Proxy** over the current locale's dict so runtime switching works
with **zero call-site churn**; `getLocale`/`setLocale` (persisted in
`lugame.locale`, `navigator.language` detection); a language picker in settings;
`document.documentElement.lang` set on load. Every user-visible string —
including all of `editor.ts` and `COMMAND_LABEL` moved out of `types.ts` — flows
through `T`. English (`en`) is the first new locale. `satisfies Record<string,
Translation>` makes missing EN keys a compile error.

**Spec:** [`docs/l10n-design.md`](l10n-design.md). **Sequenced before theming**
(theme labels live here).

---

## ADR-0008 — Audit-driven quality plan (2026-07-25) — ACCEPTED

**Context.** Three parallel audits (code-quality, gameplay, ui-ux) produced
~67 findings; two converged across all three. Heuristic score 72/100.

**Decision — adopt the prioritized roadmap** ([`docs/roadmap.md`](roadmap.md)):
- **P0 before next release:** honour `prefers-reduced-motion` (canvas + CSS +
  confetti); fix WCAG-AA contrast on Run/Clear + command labels (icon-dominant
  preferred for the pre-literate audience).
- **Now (alpha polish):** chip-remove touch fix, ≥44px secondary targets,
  exhaustiveness `never`-checks, kill per-frame `pathSet` rebuild, overlays →
  real dialogs, delete-confirm, tsconfig flags (`noUncheckedIndexedAccess` first).
- **Next (beta):** promote the throwaway BFS solver to `src/game/solve.ts`
  (powers hint + editor solvability + par), no-reading onboarding demo,
  `Repeat ×N` tile, level unlocking + feather collection, ESLint+Prettier+
  Vitest + CI, split `render.ts`.
- **Later (v1):** pond + hay-bale obstacles, win-juice, engine view-model,
  editor model/view split, real desert theme assets.

**Audits:** [`docs/audits/`](audits/). Strengths preserved: strict TS, zero
`any`, exemplar defensive error handling, cached `ui.sync` (not a perf issue).