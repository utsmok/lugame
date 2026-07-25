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
