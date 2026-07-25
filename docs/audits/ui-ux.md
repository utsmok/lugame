# lugame — UI/UX Audit Report

**Date:** 2026-07-25  
**Auditor:** UIUXAudit (impeccable audit + critique)  
**Scope:** All UI surfaces, desktop (≥900px) + mobile (<900px) viewports  
**Screenshots:** `docs/audits/screenshots/` (18 images)

---

## Executive Summary

lugame delivers a **cohesive, playful dark-theme UI** well-suited to its pre-literate 4-year-old audience. The color-coded command system, generous touch targets on primary actions, and gentle failure feedback are strengths. Two **P0 issues** demand immediate attention: (1) **zero `prefers-reduced-motion` support** — all animations run unconditionally, harming users with vestibular disorders; and (2) **white text on colored command buttons fails WCAG AA** (2.3–3.3:1 ratios), making button labels genuinely hard to read. Several **P1 touch-target and discoverability issues** affect mobile usability. Overall heuristic score: **72/100** — solid foundation with correctable gaps.

---

## Heuristic Scores

| Heuristic | Score /10 | Notes |
|---|---|---|
| Visibility of system status | 8 | Active chip highlighting, step execution feedback excellent; no loading state needed (instant) |
| Match to real world | 9 | Emoji commands (arrow, fan), peacock/cookie metaphors perfectly age-appropriate |
| User control & freedom | 8 | Clear undo (chip tap-to-remove), clear program; editor has close/save |
| Consistency & standards | 7 | Strong internal consistency; command colors used everywhere; but toggle switch is custom (not platform) |
| Error prevention | 7 | Hold-on-error setting helps; gentle bump feedback; but no "are you sure?" on level delete |
| Recognition over recall | 9 | Icon-first design, no reading required; color coding reinforces meaning |
| Flexibility & efficiency | 6 | No keyboard shortcuts; no way to drag-reorder chips; mobile stack is one-size-fits-all |
| Aesthetic & minimalism | 8 | Clean dark theme, good visual hierarchy; no noise or redundant text |
| Help users with errors | 7 | Gentle bump animation; hold-on-error highlights failed chip; but no textual hint *why* it failed |
| Accessibility (a11y) | **4** | **Critical gap:** no reduced-motion, low button contrast, no ARIA on canvas, tiny touch targets |
| **Weighted Total** | ****72/100**** | |

---

## Surface-by-Surface Findings

### 1. Game Board (Canvas)

**Files:** `src/game/render.ts`, `src/style.css:66-100`

| Aspect | Desktop | Mobile | Verdict |
|---|---|---|---|
| Grid clarity | Clean tile rendering, subtle grid lines | Same, scales down proportionally | GOOD |
| Sprite visibility | Peacock 🦚 prominent, cookie 🍪 clear | Slightly smaller but still recognizable | GOOD |
| Hint text (below board) | `--ink-dim` on `--bg` = 9.13:1 PASS | Same | GOOD |
| ARIA / screen reader | None — canvas is opaque to AT | Same | **P1: See a11y deep-dive** |
| Board padding | Comfortable margin inside panel | Adequate | GOOD |

**Screenshots:** `desktop-empty-level1.png`, `mobile-empty-level1.png`

**Finding B-1 (P2):** Canvas element has no `aria-label`, `role="img"`, or `aria-live` region. Screen readers perceive nothing of game state. Mitigation: add `role="application"` + `aria-label="Spelbord"` + an off-screen `aria-live` region updated each step.

---

### 2. Command Palette

**File:** `src/style.css:249-289`

| Aspect | Finding |
|---|---|
| Layout | 4-column grid, `gap: 0.5rem` — balanced |
| Button height | `4.2rem` (~67px) — **exceeds 48px minimum** ✅ |
| Visual design | Emoji (2rem) + uppercase label (0.72rem) on colored bg |
| Active feedback | `scale(0.94)` + `brightness(1.1)` on `:active` — tactile ✅ |
| Color coding | Forward=blue, Left=purple, Right=orange, Fan=teal — consistent everywhere |

**Finding P-1 (P0): White label text on all 4 command backgrounds fails WCAG AA normal (4.5:1):**

| Button | Text/BG | Ratio | AA Normal | AA Large |
|---|---|---|---|---|
| Forward `#fff/#4ea8ff` | white/blue | **2.51:1** | FAIL | FAIL |
| Left `#fff/#b06bff` | white/purple | **3.28:1** | FAIL | PASS |
| Right `#fff/#ff8a3d` | white/orange | **2.35:1** | FAIL | FAIL |
| Fan `#fff/#1bbf9e` | white/teal | **2.34:1** | FAIL | FAIL |

The emoji icon (2rem = 32px) carries primary meaning for pre-literate users, partially mitigating this. However, the labels ("VOORUIT", "LINKS", "RECHTS", "SHOO!") are functionally decorative at this contrast level. **Fix:** darken the button backgrounds by ~15-20%, or use semi-transparent black overlay under the text, or replace text labels with pure-icon design (the emoji alone is sufficient for the audience).

**Screenshots:** `desktop-empty-level1.png`, `mobile-empty-level1.png` (palette visible in both)

---

### 3. Program Queue & Chips

**File:** `src/style.css:154-247`

| Aspect | Finding |
|---|---|
| Container | Horizontal scroll strip, `min-height: 3.6rem`, hidden scrollbar |
| Chip size | `3.2rem × 3.2rem` (~51px) — meets 48px minimum ✅ |
| Active state | `translateY(-3px) scale(1.08)` + accent ring shadow — **clear step indicator** ✅ |
| Error state | Red outline + pulsing glow (`chip-err` keyframe) — **excellent** ✅ |
| Remove hint (✕) | `1.1rem × 1.1rem` (~17px), appears on `:hover`/`:active` |

**Finding Q-1 (P1): Chip remove button is ~17px — far below 44px touch target AND invisible on touch devices (no hover).** On mobile, there is no way to discover or tap the remove action. The `pointer-events: none` until hover means touch users never see it.

**Fix options:** (a) Show remove button always on mobile via `@media (hover:none)`; (b) Make chips tappable to remove (tap chip → remove, with confirmation for single-tap ambiguity); (c) Swipe-to-dismiss gesture.

**Finding Q-2 (P2): Hidden scrollbar (`scrollbar-width: none`) prevents overflow discovery.** Users with long programs (>~8 chips) won't know they can scroll. Consider showing a subtle scrollbar or overflow indicator.

**Screenshots:** `desktop-program-chips.png`, `mobile-program-chips.png`

---

### 4. Controls Row (Run / Clear)

**File:** `src/style.css:291-314`

| Aspect | Run (Start) | Clear (Wissen) |
|---|---|---|
| Background | `--good:#36c96a` | `--bad:#ff5d6c` |
| Text color | `#fff` | `#fff` |
| **Contrast ratio** | **2.16:1 FAIL** | **2.99:1 FAIL** |
| Size | `height: 4rem` (~64px) ✅ | same ✅ |
| Disabled | `opacity: 0.4` | same |

**Finding C-1 (P0): Both control buttons fail WCAG AA.** The "Start" button at 2.16:1 is particularly problematic — white-on-green is a notorious low-contrast combination. In screenshots, the button label appears visibly dim/washed out.

**Fix:** Darken button backgrounds (e.g., `--good: #28a04a`, `--bad: #e03e4c`) OR use dark text with lightened backgrounds. Alternatively, make the buttons icon-only (▶ / ✕ emojis) since the audience is pre-literate — this sidesteps contrast entirely while being more age-appropriate.

**Screenshots:** `desktop-empty-level1.png`, `mobile-empty-level1.png`

---

### 5. Topbar

**File:** `src/ui/palette.ts:49-78`, `src/style.css:42-64`

| Aspect | Finding |
|---|---|
| Level name display | Text with `text-overflow: ellipsis` |
| Settings gear | ⚙️ icon, clear affordance |
| Level-select button | Icon + label combo |

**Finding T-1 (P2): Long level names truncate without tooltip or alternative display.** Screenshot shows "Level 1 — Eerst..." cut off. Pre-literate users don't read level names, so impact is low, but parent/teacher supervisors may want full names.

---

### 6. Win Overlay

**File:** `src/ui/palette.ts:340-380`, `src/style.css:335-344`

| Aspect | Finding |
|---|---|
| Heading | "Gefeliciteerd!" — celebratory, appropriate |
| Message body | Dynamic (short vs long program variants) |
| Actions | "Volgende ▶" (primary) + "Kiezen" (secondary) |
| Confetti | Particle system — delightful ✅ |
| Card style | Centered, rounded, drop shadow, backdrop blur |

**Finding W-1 (P3): Long-program win variant shows chip summary in card body.** Good detail, but the summary uses small badges that may crowd on programs >15 steps. Not a priority fix.

**Screenshots:** `desktop-win-overlay.png`, `desktop-win-longprogram.png`, `mobile-win-overlay.png`

---

### 7. Level Select Overlay

**File:** `src/ui/palette.ts:235-330`

| Aspect | Desktop | Mobile |
|---|---|---|
| Grid layout | 6-column grid of level buttons | 5-column, slightly larger taps |
| Current level | Outline highlight (`outline: 2px solid var(--accent)`) | Same |
| Completed | Checkmark badge | Same |
| Custom levels section | Below grid, with delete buttons | Same |

**Finding L-1 (P1): Custom-level delete button is 34×34px (`src/style.css:567-577`) — below 44px minimum.** Mis-taps likely on mobile. Fix: increase to `44×44px` min.

**Finding L-2 (P2): No confirmation dialog before deleting a custom level.** A child (or accidental tap) can permanently lose a created level. Fix: require double-tap or show "Weet je zeker?" confirmation.

**Screenshots:** `desktop-level-select.png`, `mobile-level-select.png`

---

### 8. Settings Overlay

**File:** `src/ui/palette.ts:382-450`, `src/style.css:481-538`

| Aspect | Finding |
|---|---|
| Toggle rows | Label + hint + switch, `padding: 0.7rem 0.8rem` — good tap area ✅ |
| Switch dimensions | 46×26px — meets 48px width guideline (close enough) ✅ |
| Hint text | `--ink-dim` on `--panel-2` = 7.04:1 PASS ✅ |
| 4 toggles | Easy mode, Hold-on-error, Music, Sound — all clearly described |

**Finding S-1 (P3): Custom CSS toggle switch doesn't match platform native switch (iOS/Android).** Acceptable for a game, but adds cognitive load if child expects platform appearance. Low priority.

**Screenshots:** `desktop-settings.png`, `mobile-settings.png`

---

### 9. Level Editor Overlay

**File:** `src/ui/editor.ts` (full class, lines 1-200+), scoped CSS `.lugame-editor`

| Aspect | Desktop | Mobile |
|---|---|---|
| Tools panel | Left sidebar, organized sections | Top panel, two-column grid — usable |
| Grid area | Large, clear green tiles | Takes remaining space — adequate |
| Action buttons | Play / Save / Close in header | Same location |
| +/- controls | Adjacent to dimension inputs | **Visually estimated < 44px** |

**Finding E-1 (P1): Editor increment/decrement (+/-) buttons appear visually smaller than 44px on mobile.** These are used frequently when adjusting grid dimensions. Fix: enforce `min-width: 44px; min-height: 44px`.

**Finding E-2 (P2): Editor does NOT use `T` i18n strings — hardcoded Dutch strings.** Flagged for the parallel l10n task (not your scope, but noted).

**Screenshots:** `desktop-editor.png`, `mobile-editor.png`

---

### 10. Program Steps Overlay ("Alle stappen")

**File:** `src/style.css:608-618`

| Aspect | Finding |
|---|---|
| Trigger | Expand button (📖 icon) next to program label |
| Layout | Wrapped flex grid of enlarged chips (3.6rem) |
| Max size | `max-width: 560px; max-height: 82vh` — reasonable |
| Close button | ✕ in card header — clear ✅ |

**Finding PO-1 (P3): Disabled state uses `opacity: 0.4` which may reduce contrast below 3:1 for the disabled expand button text.** Minor; button is non-interactive when disabled anyway.

**Screenshots:** `desktop-program-overlay.png`

---

## Findings Summary Table

| ID | Priority | Surface | Issue | Effort |
|---|---|---|---|---|
| **M-1** | **P0** | Global | **No `prefers-reduced-motion` support — all animations unconditionally active** | Small |
| **C-1** | **P0** | Controls | **Run & Clear buttons fail WCAG AA (2.16:1, 2.99:1)** | Small |
| **P-1** | **P0** | Palette | **Command button labels fail WCAG AA (2.34–3.28:1)** | Small |
| Q-1 | P1 | Program | Chip remove button ~17px, invisible on touch devices | Medium |
| L-1 | P1 | Level Select | Custom-level delete button 34px < 44px minimum | Tiny |
| E-1 | P1 | Editor | +/- dimension buttons < 44px on mobile | Tiny |
| B-1 | P1 | Canvas | No ARIA labels or live regions for screen readers | Small |
| Q-2 | P2 | Program | Hidden scrollbar prevents scroll discovery | Tiny |
| T-1 | P2 | Topbar | Level name truncates without alternative | Tiny |
| L-2 | P2 | Level Select | No delete confirmation for custom levels | Small |
| E-2 | P2 | Editor | Hardcoded Dutch strings (i18n flag) | — (separate task) |
| S-1 | P3 | Settings | Custom toggle doesn't match platform native | N/A |
| PO-1 | P3 | Program Overlay | Disabled-button opacity may drop contrast | N/A |
| W-1 | P3 | Win | Long-program chip summary may crowd | N/A |

---

## Themed Deep-Dives

### A. Touch Target Audit (Mobile)

All interactive elements measured against **48px (≈3rem) minimum** guideline:

| Element | Size | Pass? | File:Line |
|---|---|---|---|
| Command buttons | 67px × ~width | ✅ | `style.css:258` |
| Run / Clear buttons | 64px × width | ✅ | `style.css:300` |
| Chips (program queue) | 51px × 51px | ✅ | `style.css:206-207` |
| Toggle row (settings) | full-width × ~43px | ⚠️ close | `style.css:497` |
| Switch | 46px × 26px | ⚠️ narrow | `style.css:519-520` |
| Custom-level delete | **34px × 34px** | ❌ | `style.css:568-569` |
| Chip remove (✕) | **~17px × ~17px** | ❌ | `style.css:231-232` |
| Editor +/- | **est. < 44px** | ❌ | `editor.ts` (scoped CSS) |
| Level select buttons | ~56px × 56px | ✅ | (grid calc) |
| Overlay close (✕) | ~32px est | ⚠️ small | `style.css:397-402` |

**Verdict:** Primary interaction flow (play the game) has excellent touch targets. **Secondary/admin actions** (delete, remove chip, adjust editor values) fall short. This is an acceptable risk distribution for the primary audience, but the chip-remove issue (Q-1) affects core gameplay.

### B. Color Contrast Audit

Computed using relative luminance (WCAG 2.1). **Bold text ≥18px (14px bold) or ≥24px qualifies as "large text" (3:1 threshold).**

**PASSING combinations (≥4.5:1 normal, ≥3:1 large):**
- `--ink/--panel`: 15.73:1 ✅
- `--ink-dim/--panel`: 8.12:1 ✅
- `--ink-dim/--panel-2`: 7.04:1 ✅ (settings hints)
- `--ink/--bg`: 17.70:1 ✅
- `--accent/--bg`: 13.23:1 ✅
- `--ink-dim/--bg`: 9.13:1 ✅ (empty program text)

**FAILING combinations (need fix):**
- White on `--good` (Run): **2.16:1** ❌ — fails even large-text threshold
- White on `--bad` (Clear): **2.99:1** ❌ — passes large only
- White on `--fwd`: **2.51:1** ❌
- White on `--left`: **3.28:1** ❌ — passes large only
- White on `--right`: **2.35:1** ❌
- White on `--fan`: **2.34:1** ❌

**Root cause:** All four command colors plus the two action button colors are mid-to-light saturation levels. White text needs significantly darker backgrounds to reach 4.5:1.

**Recommended palette adjustment** (darken backgrounds, keep hue):
```css
--good:  #2ea050;  /* was #36c96a — ratio becomes ~3.5:1 (large pass) */
--bad:   #d63846;  /* was #ff5d6c — ratio becomes ~3.8:1 (large pass) */
--fwd:   #3a8cd8;  /* was #4ea8ff */
--left:  #9858e0;  /* was #b06bff */
--right: #e87020;  /* was #ff8a3d */
--fan:   #15a08a;  /* was #1bbf9e */
```
For full AA normal compliance on normal-sized text, consider using dark text (`--ink`) on these backgrounds instead of white, or add a semi-transparent black `background: rgba(0,0,0,0.35)` behind the label text span specifically.

### C. Animation & Motion Safety

**Animations found in codebase:**

| Animation | Property | Duration | Trigger | Reduced-motion? |
|---|---|---|---|---|
| Chip active | transform + box-shadow | 0.12s | Step execution | ❌ Unconditional |
| Chip error pulse | box-shadow glow | 0.7s infinite alternate | Hold-on-error | ❌ Unconditional |
| Badge pop | scale + bg-color | 0.36s | Count change | ❌ Unconditional |
| Win confetti | particle system | ~2s | Level complete | ❌ Unconditional |
| Overlay fade | opacity | 0.25s | Open/close | ❌ Unconditional |
| Cmd button press | scale + filter | 0.08s | Tap | ❌ Unconditional |
| Button press | scale | per-btn | Tap | ❌ Unconditional |

**NONE of these respect `prefers-reduced-motion`.**

**Fix pattern** (add to `src/style.css`):
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
  /* Keep essential state changes instant but not animated */
  .chip.active { transform: none; box-shadow: 0 0 0 3px var(--accent); }
}
```
Note: The confetti particle system (`render.ts`) also needs a conditional guard around its `requestAnimationFrame` loop.

### D. Responsive Layout Audit

**Breakpoint:** 900px (`src/style.css:447`)

**Desktop (≥900px):** CSS Grid 2-column layout:
- Left column: Game board (canvas) — takes available height
- Right column: Palette → Program → Controls (vertical stack)
- Result: Excellent space utilization, no wasted horizontal space ✅

**Mobile (<900px):** Single-column vertical stack:
- Board (full width, aspect-ratio constrained)
- Palette (4-col grid)
- Program (horizontal scroll)
- Controls (2-col grid)
- Result: Logical top-to-bottom flow ✅

**Issues:**
- On short viewports (<600px height), the board + palette + program + controls may exceed viewport, requiring scroll. The board canvas has `aspect-ratio` constraint which helps.
- No landscape-specific optimization for mobile — in landscape, the single-column stack leaves empty horizontal space where a 2-column layout could fit.

**Finding R-1 (P2): No landscape media query for mobile.** A child holding a tablet in landscape sees a cramped vertical stack with wasted horizontal space.

---

## Prioritized Recommendations

### P0 — Fix Before Next Release

1. **Add `prefers-reduced-motion` support** [M-1]
   - Add `@media (prefers-reduced-motion: reduce)` block zeroing animations
   - Guard confetti loop in `render.ts`
   - **Effort:** 30min | **Impact:** Prevents motion-sickness triggers

2. **Fix control button contrast** [C-1]
   - Best option: darken `--good` to `#2ea050` and `--bad` to `#d63846`
   - Better option: use icon-only buttons (▶ / ✕ emoji) — eliminates text contrast issue entirely AND is more age-appropriate
   - **Effort:** 15min | **Impact:** Readable primary actions

3. **Fix command button label contrast** [P-1]
   - Darken all 4 `--cmd` colors ~15-20%, OR
   - Add `background: rgba(0,0,0,0.35)` to `.cmd .label` span, OR
   - Drop text labels entirely (emoji sufficient for audience)
   - **Effort:** 30min | **Impact:** Readable command labels

### P1 — This Sprint

4. **Fix chip remove for touch** [Q-1] — Always show on `@media (hover:none)`; enlarge to 24px min
5. **Enlarge delete buttons to 44px** [L-1] [E-1] — `min-width: 44px; min-height: 44px`
6. **Add canvas ARIA** [B-1] — `role="application"`, `aria-label`, off-screen `aria-live` region

### P2 — Backlog

7. **Show subtle scrollbar** on program queue [Q-2] — `scrollbar-width: thin` with styled thumb
8. **Add delete confirmation** for custom levels [L-2]
9. **Landscape mobile layout** [R-1] — Re-enable 2-column grid at `(max-aspect-ratio: 1/1) and (max-width: 900px)`
10. **Connect editor to i18n system** [E-2] — Flagged for parallel l10n task

### P3 — Nice-to-Have

11. **Platform-native toggle** styling (low impact for game context)
12. **Disabled-button contrast verification** (edge case)
13. **Win-overlay chip summary** overflow handling for very long programs

---

## What Works Well

1. **Color-coded command language** — The blue/purple/orange/teal mapping is consistent across palette buttons, program chips, and (for fan) the energy indicator. Children build color-command associations intuitively.

2. **Touch-target excellence on primary path** — Command buttons (67px), controls (64px), chips (51px) all exceed 48px minimum. The core play-loop is touch-optimized.

3. **Gentle failure design** — The bump animation (peacock shakes, no harsh sound), combined with hold-on-error's red-glowing chip, teaches through trial-and-error without frustration. Age-appropriate.

4. **Win celebration** — Confetti particles + "Gefeliciteerd!" creates a moment of delight. The long-program variant showing the full solution is a nice touch for proud children/parents.

5. **Dark theme cohesion** — The `--bg` → `--panel` → `--panel-2` layered hierarchy creates clear depth without needing borders or dividers. Shadow tokens are used consistently.

6. **Font choice** — "Baloo 2" is rounded, friendly, and highly legible at small sizes. Excellent match for the audience.

7. **Mobile stacking logic** — The single-column fallback is logical (board first, then input, then actions). No weird reordering.

8. **Settings hint text** — Each toggle explains itself in simple Dutch ("Laat fouten niet toe" etc.). Parent can configure without guessing.

9. **Program overlay ("Alle stappen")** — Smart solution for reviewing long programs. Wrapped grid of enlarged chips is scannable.

10. **Empty state messaging** — "Klik op een commando..." is direct and actionable, positioned where the program appears.

---

## Not Analysed

- **Audio UX** — All sound design, music volume balance, audio feedback timing (covered by GameplayAudit peer)
- **Game feel / input latency** — Frame timing, touch-to-visual response time (covered by GameplayAudit)
- **Level progression curve** — Difficulty spacing, learning curve across 12 levels (covered by GameplayAudit)
- **Cross-browser testing** — Only Chromium-based rendering verified (Chrome headless via CDP)
- **Performance profiling** — Bundle size, memory usage, canvas render time (covered by CodeQualityAudit peer)
- **Real device testing** — All analysis from headless Chrome screenshots; no physical tablet/phone touch testing
- **Dutch language appropriateness** — Linguistic quality of UI copy (assumed correct; not audited for translation quality)
- **Editor save/load flow** — End-to-end custom level creation and replay not tested dynamically
- **Bump/error state screenshot** — Timing-sensitive capture not achieved; analyzed from CSS rules instead (`src/style.css:579-588`)
- **Hold-on-error interaction flow** — Analyzed statically from `engine.ts` + CSS; not exercised in browser

---

*Report generated by UIUXAudit agent using impeccable audit methodology.*
*All screenshots saved to `docs/audits/screenshots/`.*
