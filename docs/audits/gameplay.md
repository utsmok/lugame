# lugame — Gameplay, Mechanics & Interaction-Model Audit

**Read-only analysis.** Scope read: `src/game/{engine,levels,types,audio}.ts`, `src/main.ts`,
`src/ui/palette.ts`, `src/ui/editor.ts` (full), `src/storage.ts`, `src/i18n.ts`, `src/style.css`
(tokens), `src/game/render.ts` (win/fx paths), `docs/decisions.md` (ADRs 0001/0003/0005), `README.md`.
Not analysed in depth: `render.ts` tile/draw plumbing beyond fx, `audio.ts` music synthesis (lines
301+), `.github/` workflow. No code was edited; no formatters/linters/test suites run (there is no
test suite — ADR-0005 verification was `tsc --noEmit` + manual browser smoke).

All file:line references are to the tree at HEAD `a1d07ca` on `main`.

---

## 1. Executive summary

lugame is a genuinely well-built core loop. The four commands (`forward` / `left` / `right` /
`fan`) plus the frontal-arc "Shoo!" give the game a real identity beyond a Lightbot clone
(ADR-0005), the gentle-fail contract is honoured end-to-end, and the bundle stays ~6.8 KB gzipped.
The step-by-step execution with eased animation, per-command chip grouping (`×N` badges), and the
expandable "all steps" overlay are thoughtful, age-aware touches.

The game's weaknesses are **not in the mechanics it has, but in the scaffolding and progression
around them**:

1. **Zero onboarding for a pre-literate player.** A 4-year-old lands on Level 1 facing four buttons,
   a queue, and a Run button — no demo, no first-run cue, no "tap this" nudge. The only instruction
   is the text hint `Tik op de knoppen hieronder…` (`i18n.ts:9`), which a non-reader cannot read.
2. **No progression feel.** All 12 levels are unlocked and selectable from the grid
   (`main.ts onSelectLevel`). No stars, no collection, no unlock moment. A kid who finishes L12 has
   nothing to show for it and no reason to revisit.
3. **Two mechanics are introduced with no teaching.** Collect-all cookies (L6) and energy pips (L8)
   both appear silently. Energy especially: the rule "fan costs 1, cookies refill" is never shown —
   a child must infer it from the fan failing silently when empty (`engine.ts:144-150`).
4. **One accessibility constraint in the brief is unmet:** `prefers-reduced-motion` is not checked
   anywhere (grep clean). Confetti (70 particles), walk-hop, fan shake, and sparkles all run
   unconditionally.
5. **Mechanic depth plateaus.** With only four flat commands, Levels 5, 11, and 12 demand 15–27
   linear chips — exactly the repetition that loops/procedures exist to compress (ADR-0003 "Out
   (later)"). The game has no abstraction to offer once programs get long, and no hint to help a
   stuck child debug.

The highest-leverage moves are: (a) **honour reduced-motion + add chip shapes** (correctness gaps,
cheap), (b) **a no-reading onboarding demo** (closes the biggest pre-literate gap), (c) **a
per-level solver** that powers both a ghost-path hint *and* an editor solvability check (one
primitive, two wins), and (d) **a `Repeat ×N` tile** as the age-appropriate loop form that
compresses the long late-game programs. Progression feel (unlocking + feather collection) is the
motivation layer that makes the whole thing worth replaying.

---

## 2. Current-mechanics assessment

### 2.1 Strengths

- **Identity mechanic done right.** The fan's 3-cell frontal arc (`types.ts:99-107` `fanCells`),
  the double peacock call + feather-trill noise burst (`audio.ts` `fan` case), and the
  feather-eye ring (`render.ts:707-712`) make "turn to face, then act" the game's signature. This
  is the single best teaching affordance: turning has an *observable consequence* beyond movement.
- **Gentle fail, end-to-end.** `triggerBump` (`engine.ts:182-187`) never produces a harsh state:
  `bumped` auto-resets after `BUMP_HOLD = 0.55s`, `error` (opt-in via `holdOnError`) freezes on the
  failing tile but keeps the controls live so a parent can debug with the child. No score, no shame
  (ADR-0001/0003 honoured).
- **Two failure-mode settings that genuinely differ.** `easyMode` shakes-and-continues past a
  blocked step; `holdOnError` freezes for inspection (`engine.ts:182-187`, `palette.ts:sync`). These
  are real tools, not checkbox features.
- **Queue UX is non-reader-friendly.** Chips are icon + colour-coded (`--fwd/--left/--right/--fan`,
  `style.css:11-14`) + `×N` run-badge (`palette.ts:makeChip`), and consecutive identical commands
  condense into one chip (`groupsOf`). The expandable "all steps" overlay (`programOverlay`) handles
  long programs without forcing horizontal scroll. This is the right model for pre-literate play.
- **Tiny, dependency-free stack.** ~6.84 KB JS gz (ADR-0005). Procedural audio means the game is
  fully playable with zero asset files except `fan.mp3`. Emoji-on-canvas dodges the sprite-licensing
  problem entirely (ADR-0005 art revision).
- **Editor is genuinely usable.** Paint-style path editing, animal placement, energy selector,
  clipboard copy/paste of level JSON, save/play/delete with localStorage CRUD and runtime shape
  validation (`storage.ts isValidLevel`). Good seed-and-edit flow (`openEditor(seed)`).

### 2.2 Gaps

| # | Gap | Evidence | Severity |
|---|-----|----------|----------|
| G1 | **No onboarding / first-run.** No demo, no "tap Forward" nudge, no per-mechanic teach moment. | grep for `tutorial\|onboard\|firstRun` → only an ADR reference to GCompris's "show tutorial once" pattern, never implemented. | High |
| G2 | **`prefers-reduced-motion` ignored.** Confetti (70 particles), walk-hop, fan shake, sparkles run unconditionally. | grep `reduced-motion\|matchMedia` → 0 hits. Stated constraint in the project brief, unmet. | High (accessibility) |
| G3 | **Energy introduced with no teaching.** L8 silently adds 1 pip; "fan costs 1, cookies refill" is never shown. Empty-fan just shakes + plays the `bump` sound and continues. | `engine.ts:144-150` (empty-fan path emits `'bump'`); `levels.ts` L8 has no teach framing. | High |
| G4 | **Collect-all introduced with no teaching.** L6 adds a second cookie but the level is a straight line — the "you must collect *every* cookie" rule is never exercised or explained; a child can finish without realising the rule changed. | `levels.ts` L6 path is a single row; win check `collected.every(Boolean)` (`engine.ts:166`). | Med |
| G5 | **No progression feel.** All levels unlocked; no stars, no collection, no unlock moment, no replay reward. | `main.ts onSelectLevel: (i) => this.changeLevel(i)` jumps anywhere; win overlay is static text + "Volgende". | High (motivation) |
| G6 | **Win feedback is one-note.** Same 70-particle confetti + 4-note arpeggio + bounce for L1 and L12. Peacock doesn't eat the cookie, strut, or fan triumphantly; no "perfect run" distinction. | `render.ts:884 spawnConfetti`, `audio.ts win` case, `render.ts:788-792`. | Med |
| G7 | **No incremental test.** Editing is all-or-nothing Run; you cannot step the program one command at a time to debug mid-build. `holdOnError` helps *after* a full run but not during construction. | `engine.ts run()` flips straight to `running`; no single-step API. | Med |
| G8 | **No hint when stuck.** A child who can't find the next step has no recourse but trial-and-error or a parent. | No solver, no ghost-path, no "show one step". | Med |
| G9 | **Chip remove affordance is weak on touch.** The `✕` is hover/active-only (`style.css:226` "remove hint on chips — visible on hover/active"). Tap-to-remove works (click handler in `makeChip`) but isn't discoverable. | `style.css:226-231`, `palette.ts:makeChip`. | Low |
| G10 | **Editor has no solvability check.** `isValidLevel` validates *shape* only — a saved level can be unsolvable (start isolated from a goal, or animals block all routes). Shipped levels claim BFS-verification (`levels.ts` header) but the editor doesn't reproduce that check. | `storage.ts isValidLevel`; `editor.ts validate()` only checks presence/on-path. | Med |
| G11 | **Empty-fan cue is ambiguous.** On energy levels, a fan with 0 pips shakes + plays the `bump` sound — indistinguishable from a wall collision. A child reads "I hit something" when the real state is "I'm too tired." | `engine.ts:144-150`. | Low–Med |
| G12 | **i18n-readiness hole.** `editor.ts` hardcodes its own Dutch strings (tool labels, validation messages, action buttons) instead of using `T` — flagged as known in the brief; the parallel l10n task will hit this. | `editor.ts TOOL_LABEL`, `validate()` Dutch returns, `buildDOM` button text. | Med (blocks l10n) |

### 2.3 Difficulty-curve observations (by level)

The first three levels are a model of one-thing-at-a-time teaching. After that the curve has two
real spikes and one under-exercised introduction:

| Level | Teaches | Observation |
|-------|---------|-------------|
| **1** Eerste Stapjes | Forward | Clean. 3-chip straight line. |
| **2** Om de Hoek | Turn | Clean. Introduces re-orientation in a simple L. |
| **3** Koe, Wegwezen! | Fan | Clean. One animal, straight line, frontal arc obvious. |
| **4** Twee Vriendjes | Fan + re-orient between fans | **First small spike.** Combines turn + fan + sequencing with no rehearsal level for "fan, then turn, then fan." A bridge level (single animal around one corner) would ease this. |
| **5** De Lange Weg | Winding path, 2 animals, 2 re-orientations | **Big spike.** 15-chip solution (`F L F SHOO F L F R F F R SHOO F F`) — the longest program in the first half, and the first level requiring *planning* across multiple re-orientations. For a 4yo this is a wall. |
| **6** Twee Koekjes | Collect-all | **Under-exercised.** Straight line, 2 cookies — the new win condition is introduced but can't actually be failed (you walk through both). The rule "collect *every* cookie" is never tested. |
| **7** Het Kruispunt | Branching / backtracking | Good. First level where collect-all is *meaningful* (T-junction, must visit both arms). |
| **8** Tussendoortje | **Energy** | **Teaching gap (G3).** Energy appears with no explanation; the shoo-eat-refill loop is implicit. The level itself is a fair first energy puzzle (1 pip, 1 animal, 2 cookies). |
| **9** Koekjestuin | Energy + cross shape, 2 animals | Good step up. Re-uses the L8 pattern in a richer shape. |
| **10** Hongerige Pauw | Shoo-eat-shoo-eat rhythm | Good. Drills the energy loop. |
| **11** Het Doolhof | 6×6 maze, 2 animals, energy | **Late spike.** 27-step verified solution. Building and debugging a 27-chip linear program with no loop, no hint, and no incremental step is very hard for the target age. This is where the absence of loops/procedures (ADR-0003 "Out") is most felt. |
| **12** Grote Tuin | 7×6, 3 animals, 3 cookies, 2 pips | 19-step solution. Large board; long program. Same depth-of-mechanic ceiling as L11. |

**Curve verdict:** excellent 1→3; a spike at 4→5 that wants a bridge level; a non-teaching
introduction at 6 (collect-all) and 8 (energy); and a depth ceiling at 11–12 where the four flat
commands can't compress the required program length. The two teaching gaps (G3, G4) and the missing
loop primitive are the three things most worth fixing for the target audience.

---

## 3. Opportunities table

`Dev effort`: S ≈ ≤1 day, M ≈ 2–4 days, L ≈ ≥1 week. `Theme-fit`: how well it lands on
peacock/farm. `Age-fit`: the youngest band it genuinely serves. `Confidence`: how sure I am it's
the right call grounded in this codebase.

| # | Opportunity | Player value | Dev | Theme-fit | Age-fit | Confidence |
|---|-------------|--------------|-----|-----------|---------|------------|
| 1 | **`Repeat ×N` tile** (fixed 2×/3× loop) | Compresses long L5/L11/L12 programs; first taste of abstraction | M | med | 4–5 | High |
| 2 | **No-reading onboarding demo** (ghost-hand + auto-Run) | Closes the biggest pre-literate gap (G1) | M | high | 3–5 | High |
| 3 | **Per-level solver → ghost-path hint + editor solvability check** | Stuck-kid aid (G8) *and* editor correctness (G10) from one primitive | M | high | 4–6 | High |
| 4 | **Level unlocking + feather 🪶 collection** | Progression feel, replay motivation (G5) | M | high | 4–6 | High |
| 5 | **Honour `prefers-reduced-motion`** | Meets a stated, currently-unmet accessibility constraint (G2) | S | n/a | all | Very high |
| 6 | **Colour-blind chip shapes** (circle/triangle/square/diamond behind emoji) | Redundant cue beyond colour + platform-varying emoji (G2-adjacent) | S | n/a | all | High |
| 7 | **Step speed control** (🐢/🚀 slider) | Lets a parent slow steps for a young kid; accessibility | S | n/a | all | High |
| 8 | **Single-step / "step once" debug button** | Incremental testing during build (G7) | S | med | 5–6 | Med-High |
| 9 | **Distinct "too tired" cue** for empty-fan | Removes the fan/collision ambiguity (G11) | S | high | 3–5 | High |
| 10 | **Win-juice depth**: peacock eats cookie, triumphant fan, level-varied confetti, "perfect run" sparkle | Reward depth (G6) | M | high | 3–6 | High |
| 11 | **Star ratings** (par-based, from solver) | Replay incentive; pairs with #4 | S–M | med | 5–6 | Med |
| 12 | **Gallery of saved programs** ("my peacock's tricks") | Motivation + ownership | M | high | 4–6 | Med |
| 13 | **New obstacle: pond/water tile** (visual block, forces detour) | Spatial variety without a new command | M | high | 4–6 | Med |
| 14 | **Hay bale / fence** (destructible-by-fan or blocking obstacle) | Variant of #13; "shoo through" extension | M | high | 4–6 | Med |
| 15 | **Sleeping animal** (wakes after N steps → must time the shoo) | Conditional-lite; timing puzzle | M | high | 5–6 | Med |
| 16 | **Roaming animal** (wanders 1 cell/K steps along path) | Dynamic solvability; richer puzzle | L | high | 5–6 | Low-Med |
| 17 | **Peek / look-ahead command** (flash the frontal arc without spending energy) | Reduces fan guesswork | S | med | 4–6 | Low-Med |
| 18 | **Share level via URL hash** (not just clipboard JSON) | One-tap share for grandparents/class | S | n/a | (parent) | High |
| 19 | **Sandbox/free-play flag** in editor (no win condition) | Free-form play for the youngest | S | high | 3–4 | Med |
| 20 | **Switch/scan input** (single-switch step-by-step input) | Motor-difficulty accessibility | L | n/a | all | Low-Med (niche) |
| 21 | **Side-by-side turn-taking** (two peacocks, sibling play) | Social/co-play | L | med | 4–6 | Low-Med |
| 22 | **Theme variants** (desert/ice/jungle) as a gameplay vector | New tile mechanics per theme | L | high | 4–6 | Low (overlaps parallel theming task — coordinate) |
| 23 | **Procedures P1/P2** (Lightbot-style) | Real abstraction; compresses L11/L12 | L | med | 5–6 | Low for 4yo (defer) |
| 24 | **Conditional "if animal ahead"** | Branching logic | L | med | 5–6 | Low for 4yo (defer) |
| 25 | **Daily level** (seeded) | Return-visits | M | low | (parent) | Low (needs seed + content) |
| 26 | **Parent/teacher dashboard** (progress, time, settings lock) | Classroom use | L | n/a | (adult) | Low (scope creep) |

---

## 4. Detailed proposals (top 8)

### Proposal A — `Repeat ×N` tile (Opportunity 1)

**Mechanic.** A fifth command `repeat` that, when placed immediately before another command, causes
that command to execute N times (N chosen from a fixed 2 or 3 via two distinct tiles, or a single
tile that opens a 2/3 picker). Age-appropriate loop form: no counter variable, no body block, just
"do-the-next-thing N times." This is the GCompris `execute-loop` pattern stripped to its minimum.

**Why it fits a 4yo + theme.** The peacock's late-game programs are dominated by long runs of
`forward` (L5, L11, L12 are 15–27 chips, mostly walking). A 4yo can grasp "walk three times" with a
numeral tile far earlier than a general loop with a body. The mental model already exists in the
UI: chips already show `×N` badges (`palette.ts:makeChip`) — a `Repeat` tile makes that badge
*executable*, not just visual.

**Rough impl shape.**
- `types.ts`: extend `Command` union with `'repeat2' | 'repeat3'` (two fixed tiles — simpler than a
  counter for pre-literate UI); add `COMMAND_EMOJI` / `COMMAND_LABEL` / colour var `--repeat`.
- `engine.ts`: in `doStep`, when the command is `repeatN`, peek the *next* command and execute it N
  times by advancing `pc` only once past the repeat tile but looping the effect. Add a `STEP_DUR`
  entry. The fan arc + energy interaction must be defined (recommend: a repeated fan still costs N
  energy — teaches "don't repeat expensive things").
- `palette.ts`: two new buttons; `groupsOf` already handles run-condensing.
- `editor.ts` + `storage.ts`: no schema change needed (it's just a new `Command` value in the
  program — but the editor doesn't author programs, so only `isValidLevel`/`Level` are unaffected).
- `levels.ts`: introduce around L7–8 *after* sequencing is solid; add 1–2 levels whose intended
  solution is shorter with a repeat than without.

**Level-design implications.** Introduces the single biggest depth increase in the game. Pairs
naturally with energy (repeat a `forward`, never repeat a `fan`). Requires the solver (Proposal C)
to also handle repeats for hint/par.

**Age-appropriateness check.** ✅ for 4–5 with fixed 2/3 numerals (concrete, no variable). ❌ a
general "repeat N" with a counter is 5–6+. Two tiles is the right call.

**Risks.** Two-command semantics ("repeat applies to the *next* tile") is an abstraction a 4yo must
learn — needs the onboarding demo (Proposal B) to teach it. Engine must guard repeat-at-end-of-
program (no following command) gracefully.

---

### Proposal B — No-reading onboarding / first-run demo (Opportunity 2)

**Mechanic.** A ghost-hand tutorial: on first launch and on entering a level that introduces a new
mechanic, an animated translucent finger taps the relevant palette button, a chip appears in the
queue, Run auto-presses, and the peacock executes — all with no text. A localStorage flag
(`lugame.seen.<mechanic>`) ensures it shows once.

**Why it fits a 4yo + theme.** The single biggest gap (G1): the only instruction today is a Dutch
sentence a non-reader cannot read (`i18n.ts:9`). A pre-literate player learns by watching. The
peacock theme already centres on *visible* action (fan arc, flee animation) — a demo plays to the
game's strengths.

**Rough impl shape.**
- `palette.ts`: a `Tutorial` state machine — overlay a translucent 👆 that animates to a target
  element's bounding rect, then calls the existing callback (`cb.onAdd(cmd)`, `cb.onRun()`). Drives
  the *same* code path as a real tap, so no engine change.
- `main.ts`: on `changeLevel`, check which mechanics the level first introduces (forward=1, turn=2,
  fan=3, collect-all=6, energy=8, repeat=~8) and trigger the matching demo if unseen.
- `storage.ts`: extend the settings shape (or a new `lugame.seen` object) with per-mechanic flags.
- No engine change required — the demo is purely a UI driver of existing callbacks.

**Level-design implications.** Lets the game *teach* collect-all (L6) and energy (L8) explicitly,
closing G3 and G4. A demo for energy ("watch the pip go down when you fan, up when you eat") is the
single highest-value teach moment in the game.

**Age-appropriateness check.** ✅ Strongest possible fit for 3–5. Pure observation, zero reading.

**Risks.** Must be skippable and re-triggerable from settings (a parent whose kid is stuck should be
able to replay the demo). Must respect reduced-motion (Proposal E) — the ghost finger should still
appear but without bouncy easing.

---

### Proposal C — Per-level solver → ghost-path hint + editor solvability check (Opportunity 3)

**Mechanic.** A BFS/DFS solver over the (peacock, animals-scared-set, energy, collected-set) state
space, returning a minimal command sequence from the current state. Two consumers:
1. **Ghost-path hint (💡 button):** on tap, draw a translucent chevron on the next path cell the
   peacock should move to, *or* pulse the next correct palette button. No text.
2. **Editor solvability check:** on Save, run the solver from the start; refuse to save (with a
   gentle icon, not text) if no solution exists.

**Why it fits a 4yo + theme.** Closes G8 (stuck child has no recourse) and G10 (editor can save
unsolvable levels). The shipped levels already claim BFS-verification (`levels.ts` header comment
references `/tmp/solve.py`) — promoting that script into the codebase is low-risk and high-leverage.

**Rough impl shape.**
- New `src/game/solve.ts`: pure function `solve(level, fromState?): Command[] | null`. State key =
  `${pos}|${dir}|${scared-bitfield}|${energy}|${collected-bitfield}`. Branching factor is small
  (4 commands) and boards are ≤7×6, so this is cheap. Must model the energy cost of fan and the
  collect-refill rule (`engine.ts:155-160`) exactly.
- `render.ts`: a `drawHint(engine, nextCell)` that paints a faint chevron; or `palette.ts` pulses
  the next button.
- `editor.ts doSave()`: call `solve(buildLevel())`; if `null`, show an icon warning and don't save.
- `main.ts`: wire a 💡 button → compute next step from current engine state → trigger the hint
  render.

**Level-design implications.** Unlocks star ratings (Proposal K) "for free" — the solver's
solution length is the par. Also enables a "perfect run" win-juice trigger.

**Age-appropriateness check.** ✅ Hint is ideal for 4–6 (visual, no reading). The solver itself is
invisible to the player.

**Risks.** "Next correct step" is ambiguous when many solutions exist — pick *any* valid one and be
consistent. Solver must stay in sync with engine semantics (especially energy + fan arc); a drift
bug would mislead. With `Repeat ×N` (Proposal A) the solver's branching grows — solve over the
*expanded* program space, not the compressed one, to keep correctness simple.

---

### Proposal D — Level unlocking + feather 🪶 collection (Opportunity 4)

**Mechanic.** Levels beyond the highest-cleared are locked (padlock icon). On win, award a peacock
feather to that level's cell in the grid; feathers accumulate into a "plumage" total shown in the
topbar. A parent toggle restores free-play (all unlocked) for kids who want to roam.

**Why it fits a 4yo + theme.** Closes G5 (no progression feel). The peacock's plumage is the most
on-theme reward object imaginable — collecting feathers *is* growing the peacock. Unlocking gives
the "I did it → new thing opens" loop that the current flat grid entirely lacks.

**Rough impl shape.**
- `storage.ts`: new `lugame.progress` = `{ cleared: number[], feathers: Record<levelId, number> }`
  with the same shape-validation discipline as `isValidLevel`.
- `main.ts`: on win (`engine.onEvent('win')`), record clearance; gate `onSelectLevel` by the
  cleared-set unless a `freePlay` setting is on.
- `palette.ts rebuildLevelGrid`: render padlocks on locked cells, feather counts on cleared cells;
  the grid already rebuilds on level change.
- `i18n.ts`: a feather/plumage label (and route through the parallel l10n task).

**Level-design implications.** None to the levels themselves; pure progression layer. The parent
"free play" toggle is important — gating frustrates a kid who wants a specific level.

**Age-appropriateness check.** ✅ 4–6. Padlock + feather are iconographic; no reading.

**Risks.** Must not lock a kid out of replaying favourites (free-play toggle). Custom levels
(created in the editor) should be exempt from locking.

---

### Proposal E — Honour `prefers-reduced-motion` + chip shapes + speed control (Opportunities 5, 6, 7)

**Mechanic.** Three small accessibility fixes bundled because they share a home in settings/render:
1. **Reduced motion:** check `matchMedia('(prefers-reduced-motion: reduce)')` once at startup and on
   change; when active, zero out confetti count, fan shake, walk-hop amplitude, and sparkle counts;
   keep the peacock visible and the step highlight.
2. **Chip shapes:** render a distinct background shape per command (○ forward, △ left, □ right, ◇
   fan) behind the emoji so the four commands are distinguishable without colour *and* without
   relying on platform-varying emoji glyphs.
3. **Speed control:** a 🐢/🚀 toggle (or 3-stop slider) multiplying `STEP_DUR` (and `BUMP_HOLD`),
   letting a parent slow the peacock for a young child or speed it for an experienced one.

**Why it fits a 4yo + theme.** G2 is a stated, currently-unmet constraint — this is correctness, not
feature creep. Chip shapes serve the colour-blind safety requirement explicitly named in the brief.
Speed control serves both very-young players (slow = watchable) and accessibility.

**Rough impl shape.**
- `render.ts`: a `reducedMotion` flag gating `spawnConfetti` count (→ 0), hop amplitude (→ 0), fan
  shake, sparkle counts; `matchMedia` listener in `main.ts` or `Renderer`.
- `style.css` + `palette.ts makeChip`: per-command `border-radius` / clip-path shape classes.
- `engine.ts`: make `STEP_DUR` a function of a `speedMul` field set from settings; `main.ts`
  `applySettings` already wires engine fields from settings.
- `i18n.ts` + settings overlay: new toggle labels.

**Level-design implications.** None.

**Age-appropriateness check.** ✅ All ages; the three changes are pure-accessibility wins.

**Risks.** Reduced-motion must not remove the *step highlight* (that's information, not decoration).
Speed multiplier must cap so steps can't become unreadably fast.

---

### Proposal F — Win-juice depth (Opportunity 10)

**Mechanic.** Make winning feel different per level and reward mastery:
- Peacock visibly *eats* the last cookie (chomp animation already exists as audio — `audio.ts
  chomp` — surface it visually).
- Triumphant fan on win (re-trigger the fan arc/feather-eye ring, `render.ts:707`).
- Confetti density/colour varies by level (L1 = gentle, L12 = full); a "perfect run" (matches
  solver par, Proposal C) adds a gold sparkle burst.
- The peacock's plumage grows with collected feathers (ties to Proposal D) — a persistent visual
  reward visible on the board.

**Why it fits a 4yo + theme.** Closes G6. The peacock's whole identity is display (fan, plumage);
a triumphant fan-on-win is the most thematically resonant celebration possible. Variable reward is
a well-known motivation driver and currently entirely absent.

**Rough impl shape.** Almost entirely in `render.ts` (win-phase branch, `:788-792`) and `audio.ts`
(reuse `fan`/`chomp` on the `win` event). Feather-plumage state from Proposal D's storage.

**Level-design implications.** None directly; "perfect run" needs the solver (Proposal C) for par.

**Age-appropriateness check.** ✅ 3–6. Pure visual/auditory delight.

**Risks.** Keep it short — a 4yo's attention window is small; a 4-second celebration is better than
8. Respect reduced-motion (Proposal E).

---

### Proposal G — New obstacles: pond + hay bale/fence (Opportunities 13, 14)

**Mechanic.** Two new tile types, both theme-fitting:
- **Pond 🌊:** impassable (like off-path) but visually distinct, so the board reads as a *garden
  with features* rather than "path vs. void." Forces detours; adds spatial variety without a new
  command.
- **Hay bale 🌾 / fence:** a block that the fan can *destroy* (shoo through it) — extending the
  fan's identity from "scare animals" to "clear the way," teaching that the same action has multiple
  effects.

**Why it fits a 4yo + theme.** Farm/garden theme; ponds and hay bales are exactly the objects a
child expects. The destructible hay bale deepens the fan mechanic (the game's signature) without a
new button.

**Rough impl shape.**
- `types.ts`: `Level` gains optional `ponds?: Pos[]` and `bales?: Pos[]`; `pathSet` membership
  already gates movement, so ponds are simply non-path cells rendered distinctly. Bales need state
  (destroyed?) — model as a third blocker type checked in `doStep`'s forward branch
  (`engine.ts:113-121`), cleared by the fan arc in the `fan` case (`engine.ts:151-170`).
- `render.ts`: distinct tile drawing.
- `editor.ts`: two new tools (the tool palette already supports extension; `TOOL_DEF`).
- `solve.ts` (Proposal C): must model bales in the state space.

**Level-design implications.** Introduce ponds ~L5 (visual variety during the first spike), hay
bales ~L9 (extends fan mastery after energy is taught).

**Age-appropriateness check.** ✅ 4–6. Pond = "don't go there" (intuitive); hay bale = "shoo it"
(reuses a known action).

**Risks.** Bales add solver state-space size; keep boards small. Coordinate with the parallel
theming task — theme variants (Opportunity 22) may want their own obstacle flavours.

---

### Proposal H — Distinct "too tired" cue + single-step debug (Opportunities 9, 8)

**Mechanic.** Two small feel fixes:
1. **Too-tired cue:** when a fan fires with 0 energy (`engine.ts:144-150`), play a *different* sound
   (a soft "phew"/deflate, not the collision `bump`) and show a distinct visual (peacock droops, or
   a greyed fan icon) — removing the G11 ambiguity.
2. **Single-step debug:** a "step once" button (▶|) that executes exactly one queued command from
   the current `pc`, then returns to editing — enabling incremental testing during build (G7).

**Why they fit a 4yo + theme.** The too-tired cue makes the energy rule *legible* without text
(pairs with Proposal B's energy demo). Single-step is a gentle debugging tool for the long L11/L12
programs — a parent can step through with the child.

**Rough impl shape.**
- `audio.ts`: a new `tired` Sfx (procedural downward sigh); `main.ts EVENT_SFX` maps a new
  `'tired'` GameEvent; `engine.ts` emits it instead of `'bump'` on the empty-fan path.
- `engine.ts`: a `stepOnce()` public method that runs one `doStep` and returns to `editing` (only
  valid in `editing`/`error`); `palette.ts` adds a ▶| button; `main.ts` wires it.

**Level-design implications.** None for too-tired (pure clarity). Single-step changes how kids
*approach* levels — worth introducing gently via the onboarding demo.

**Age-appropriateness check.** ✅ 4–6. Too-tired is pre-literate clarity; single-step is
parent-supported.

**Risks.** Single-step must keep the program intact and resume cleanly; the existing
`editable()`/phase gating makes this safe but it needs a clear "you are mid-program" indicator.

---

## 5. Suggested roadmap

Dependencies are noted; items within a tier can largely proceed in parallel.

### Now — alpha polish (correctness gaps + cheapest high-value wins)
- **E1. Honour `prefers-reduced-motion`** (Proposal E). *Standalone.* Fixes a stated-unmet
  constraint. No deps.
- **E2. Colour-blind chip shapes** (Proposal E). *Standalone.* No deps.
- **E3. Speed control** (Proposal E). *Standalone.* No deps.
- **H1. Distinct "too tired" cue** (Proposal H). *Standalone.* Tiny engine+audio change.
- **D0. Level unlocking + feathers — scaffold only** (Proposal D). Can ship the storage + grid
  rendering before the win-juice; gives immediate progression feel. *Depends on: nothing.*
- **B1. First-run onboarding for Level 1 (forward)** (Proposal B). Smallest slice of the tutorial
  state machine; proves the pattern. *Depends on: nothing.*

### Next — beta (teaching + depth)
- **C1. Per-level solver in `src/game/solve.ts`** (Proposal C). *No deps.* Unlocks C2, C3, K, F-par.
- **B2. Onboarding demos for fan (L3), collect-all (L6), energy (L8)** (Proposal B). *Depends on:
  B1.* Closes G3/G4 directly.
- **C2. Ghost-path hint (💡)** (Proposal C). *Depends on: C1.* Closes G8.
- **C3. Editor solvability check** (Proposal C). *Depends on: C1.* Closes G10.
- **A1. `Repeat ×N` tile** (Proposal A). *Depends on: nothing engine-side, but should land after B2
  so its demo exists.* The single biggest depth increase.
- **H2. Single-step debug** (Proposal H). *Depends on: nothing.* Pairs with A1 for long programs.
- **F1. Win-juice depth** (Proposal F). *Depends on: D0 (feathers) for plumage; C1 for "perfect
  run" par.*
- **K. Star ratings** (Opportunity 11). *Depends on: C1 (par).* Pairs with D0.
- **18. Share level via URL hash** (Opportunity 18). *Standalone.* Small, high-value for sharing.

### Later — v1 (content + ambition)
- **G. Pond + hay-bale obstacles** (Proposal G). *Depends on: C1 (solver must model bales); coordi-
  nate with theming task.*
- **15/16. Sleeping / roaming animals** (Opportunities 15, 16). *Depends on: C1 (dynamic solver).*
  Age skews 5–6.
- **12. Gallery of saved programs** (Opportunity 12). *Depends on: D0.* Motivation layer.
- **19. Sandbox/free-play editor flag** (Opportunity 19). *Standalone.*
- **22. Theme variants as gameplay vector** (Opportunity 22). **Coordinate with the parallel
  theming task** — do not duplicate.
- **20/21. Switch/scan input + side-by-side play** (Opportunities 20, 21). Largest scope; revisit
  after v1 core is stable.
- **23/24. Procedures P1/P2 + conditionals** (Opportunities 23, 24). Revisit age-fit; likely a
  "harder mode" for 5–6, not the core 4yo path.

---

## 6. Rejected / deferred (so future agents don't re-propose)

| Idea | One-line reason |
|------|-----------------|
| **Text hints / instructions** | Audience is pre-literate; reading is a non-starter. Use icons + demos (Proposal B). |
| **Timer or move-count score pressure** | Violates the gentle/no-shame contract (ADR-0001/0003). Star-*par* (Opportunity 11) is opt-in and after-the-fact, not a live timer. |
| **Hard game-over / "you lose" state** | Directly contradicts the gentle-fail design. |
| **Accounts, cloud save, leaderboards, online level-sharing backend** | lugame is a static GitHub Pages site (ADR-0005) with no backend; localStorage + URL-hash share (Opportunity 18) cover the real need. |
| **Voice narration in Dutch** | Asset-heavy, TTS quality varies by device, and the onboarding demo (Proposal B) teaches without audio language. Defer unless a voiced-character direction is chosen. |
| **General `repeat N` with a variable counter (loops as in Lightbot)** | Too abstract for a 4yo; fixed 2×/3× tiles (Proposal A) are the age-appropriate form. Revisit as a "harder mode" for 5–6. |
| **Procedures P1/P2 (Lightbot-style) at core difficulty** | Same abstraction ceiling as general loops; defer to a 5–6 "harder mode" (Opportunity 23). |
| **`if animal ahead` conditional at core difficulty** | Branching logic needs a readable icon convention a 4yo won't infer; defer (Opportunity 24). |
| **Daily level with server seeding** | Needs a content pipeline + seed source the static site doesn't have; replay value is better served by unlocking (Proposal D) + gallery (Opportunity 12). |
| **Parent/teacher dashboard** | Scope creep; the settings panel + a future progress readout cover classroom needs without a dashboard surface. |
| **Jump command** | Overlaps with the bridge/detour space; the pond (Proposal G) + existing turn serve the same puzzle role without a fifth movement verb. |
| **Tractor / vehicle obstacle** | Theming-flavoured blocker; a pond/hay bale (Proposal G) is simpler and more general. Revisit only if a farm-vehicle theme is chosen. |
| **Day/night cycle as pure cosmetics** | No gameplay effect; overlaps the parallel theming task. Only worth it if tied to a mechanic (e.g. sleeping animals, Opportunity 15). |
| **In-app purchases / "unlock all" paywall** | Antithetical to a free CC0-ish educational game for 4-year-olds. |
