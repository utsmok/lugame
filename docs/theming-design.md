# lugame — Theme System Design

Status: **Design ready for implementation** (2026-07-25). Supersedes the
hard-coded farm theme. Linked ADR: ADR-0006 (append to `decisions.md` on land).

## Goal

Lift the hard-coded farm theme (tiles, decor, obstacles, goal, bgm, colours)
into **editable config files** so themed sets can be defined without touching
game code. Worked example: a **desert** theme (sand/stone tiles, cacti decor,
snakes/dromedaries, dates goal, desert bgm).

## Scope decision (confirmed with user)

- **Player stays global:** the peacock 🦚 and its **"Shoo!" fan** mechanic are
  constant across themes (preserves the game's identity per ADR-0005).
- **Themed layers:** background gradient, ground tiles, decor sprites, obstacle
  animals (kind set + emoji), the goal emoji, bgm, optional colour overrides
  (fan particles, confetti), optional SFX overrides.
- **Text is NOT in the theme file.** All labels (theme name, animal names, goal
  name) live in the **locale files** (`src/locales/*.ts`) keyed by theme/kind,
  so the parallel l10n work stays the single source of text. The theme file is
  visuals + audio + asset refs only.

## Theme config schema

Plain JSON, one folder per theme under `public/themes/<id>/`. Loaded at runtime
via `fetch`, validated against a TS type. Asset paths are **base-relative URLs**
(resolved against `import.meta.env.BASE_URL`), so the default `farm` theme can
reference the existing `assets/img/*` paths with zero asset migration, while new
themes drop assets into their own folder.

```ts
// src/game/theme.ts
export interface ThemeDecorSpec {
  file: string;   // base-relative, e.g. "assets/img/tree.png" or "themes/desert/img/cactus.png"
  h: number;      // display height in cell units (1.0 = one cell)
}

export interface GradientStop { offset: number; color: string; } // 0..1

export interface ThemeConfig {
  id: string;                          // "farm" | "desert" | ... (matches folder name)
  background: { stops: GradientStop[] };      // canvas bg gradient (top→bottom)
  cell: { pathFill: string; grassFill: string }; // procedural fallback when ground tiles absent
  ground?: { grass: string; dirt: string };    // themed ground tile URLs (names are thematic, e.g. sand/stone)
  decor: ThemeDecorSpec[];
  goalEmoji: string;                   // "🍪" | "🌴" | "🍇" ...
  fanColors?: string[];                // optional override of render.ts FAN_COLORS
  confetti?: string[];                 // optional override of CONFETTI emojis
  bgm: string;                         // base-relative, e.g. "assets/audio/music.mp3"
  sfxOverrides?: Record<string, string>; // e.g. { "collect": "themes/desert/audio/crunch.mp3" }
  animals: { id: string; emoji: string }[]; // obstacle kinds; levels reference id; label via i18n
}
```

Text keys the locale files MUST provide for each theme `T` and each animal `a`:
`theme.<T>.name`, `animal.<a>`, `goal.<T>` (e.g. `goal.farm = "koekje"`).
Validation: every `animal.id` used by a level must exist in the active theme.

### Example: `public/themes/farm/theme.json` (migration of current defaults)

```jsonc
{
  "id": "farm",
  "background": { "stops": [
    { "offset": 0,   "color": "#a8e6a3" },
    { "offset": 0.5, "color": "#88d48f" },
    { "offset": 1,   "color": "#6bc269" }
  ]},
  "cell":   { "pathFill": "#caa46a", "grassFill": "#7cc77a" },
  "ground": { "grass": "assets/img/tile_grass.png", "dirt": "assets/img/tile_dirt.png" },
  "decor":  [
    { "file": "assets/img/tree.png",    "h": 1.00 },
    { "file": "assets/img/tree2.png",   "h": 1.05 },
    { "file": "assets/img/pine.png",    "h": 0.78 },
    { "file": "assets/img/bush.png",    "h": 0.62 },
    { "file": "assets/img/flowers.png", "h": 0.34 },
    { "file": "assets/img/flowers2.png","h": 0.34 },
    { "file": "assets/img/grass.png",   "h": 0.30 }
  ],
  "goalEmoji": "🍪",
  "bgm": "assets/audio/music.mp3",
  "animals": [
    { "id": "cow",     "emoji": "🐮" },
    { "id": "pig",     "emoji": "🐷" },
    { "id": "sheep",   "emoji": "🐑" },
    { "id": "chicken", "emoji": "🐔" }
  ]
}
```

### Worked example: `public/themes/desert/theme.json` (NEW)

```jsonc
{
  "id": "desert",
  "background": { "stops": [
    { "offset": 0,   "color": "#fbe6b6" },
    { "offset": 0.5, "color": "#f3cf85" },
    { "offset": 1,   "color": "#e0a95e" }
  ]},
  "cell":   { "pathFill": "#b08a52", "grassFill": "#e7c486" },   // stone / sand
  "ground": { "grass": "themes/desert/img/tile_sand.png", "dirt": "themes/desert/img/tile_stone.png" },
  "decor":  [
    { "file": "themes/desert/img/cactus.png",   "h": 0.95 },
    { "file": "themes/desert/img/cactus2.png",  "h": 0.80 },
    { "file": "themes/desert/img/rock.png",     "h": 0.55 },
    { "file": "themes/desert/img/skull.png",    "h": 0.40 },
    { "file": "themes/desert/img/tumbleweed.png","h": 0.45 }
  ],
  "goalEmoji": "🌴",          // dates palm — or "🍇" / "🍯"; pick on asset sourcing
  "fanColors": [ "#ffd34e", "#ff9f43", "#ff6b6b", "#ffd34e", "#c98a3a" ], // warm desert fan
  "bgm": "themes/desert/audio/desert.mp3",
  "sfxOverrides": { "collect": "themes/desert/audio/crunch.mp3" },
  "animals": [
    { "id": "snake",     "emoji": "🐍" },
    { "id": "dromedary", "emoji": "🐫" },
    { "id": "scorpion",  "emoji": "🦂" },
    { "id": "lizard",    "emoji": "🦎" }
  ]
}
```

Desert assets (CC0, same sourcing policy as farm): OpenGameArt "LPC desert"
packs / Kenney desert tiles. Record sources in `public/themes/desert/CREDITS.md`
mirroring the farm `public/assets/CREDITS.md` pattern. **Fallback rule:** if a
theme's ground/decor/bgm asset 404s, the renderer/audio fall back to the
procedural `cell` colours + no decor + procedural music — the game stays playable.

## Integration points (exact code locations)

| Hard-coded today | File:line | Becomes |
|---|---|---|
| `FarmTileset` colours + `drawBackground` gradient | render.ts:65-103 | `ConfigTileset` driven by `theme.background` / `theme.cell` |
| `DECOR_SPEC` list | render.ts:329-337 | `theme.decor` |
| `loadGround()` tile filenames | render.ts:377-392 | `theme.ground` |
| `loadDecor()` asset base | render.ts:359-375 | unchanged mechanic, reads `theme.decor` |
| Goal emoji `'🍪'` | render.ts:579 | `theme.goalEmoji` |
| `FAN_COLORS` / `CONFETTI` | render.ts:325 / 315 | `theme.fanColors ?? FAN_COLORS`, `theme.confetti ?? CONFETTI` |
| `AnimalKind` union | types.ts:14 | `string` (kind id) — validity checked against active theme at level load |
| `EMOJI: Record<AnimalKind,string>` | types.ts:105 | built from `theme.animals` (`Record<id,emoji>`) |
| `COMMAND_EMOJI` / `COMMAND_LABEL` | types.ts:112/114 | **stay global** (peacock/fan is constant) |
| bgm file `music.mp3` | audio.ts (SFX_FILE/music path) | `theme.bgm` + `theme.sfxOverrides` |
| Renderer ctor `new FarmTileset()` default | render.ts:355 | `new ConfigTileset(theme)` |

The existing `Tileset` interface (render.ts:16-40) and the `Renderer` ctor's
`tileset?` parameter are **already** the extension seam — implementation replaces
`FarmTileset` with a `ConfigTileset(theme)` and threads the theme through
`Renderer.loadDecor/loadGround`.

## Selection UX

- A **theme picker** row in the settings overlay (palette.ts:222-241), mirroring
  the language picker added by the l10n task: one button per available theme
  (theme emoji + localised name), active highlighted.
- Persisted in `localStorage` key `lugame.theme` (default `"farm"`).
- On change: load theme → rebuild engine/renderer/audio state → reload page
  (simplest correct re-render; same tradeoff as locale switching). Levels
  authored for a different theme still load but their animal `id`s must exist in
  the active theme or the level is skipped with a console warning.

## Migration plan (no behavioural change first)

1. **Extract farm theme** to `public/themes/farm/theme.json` (values copied from
   current hard-codes). Implement loader + `ConfigTileset`. Wire default theme =
   `"farm"`. Verify the game looks **identical** (screenshot diff vs current).
2. **Theme-couple the type system:** relax `AnimalKind` to `string`, build
   `EMOJI` from theme, validate level kinds against theme.
3. **Theme-couple audio:** bgm + sfx overrides from theme.
4. **Theme picker UI + persistence.**
5. **Build the desert theme:** source CC0 desert assets, author
   `public/themes/desert/theme.json`, add `nl`/`en` labels, add 2-3 desert
   levels (optional — can reuse farm levels to prove obstacle kinds differ).

## Verification (per step)

- `npm run typecheck` clean; `npm run build` clean.
- Browser smoke (http://localhost:5173): farm theme renders pixel-identical to
  pre-refactor; switch to desert → sand bg, desert decor, snake/dromedary
  obstacles, 🌴 goal, desert bgm all load; switch back. Screenshot both.
- A farm level played under the desert theme (or vice versa) must not crash —
  missing animal ids are reported and the level skipped gracefully.
- Reduced-motion + touch behaviour unchanged.

## Open decisions (flag for confirmation, do not block implementation)

1. **Goal emoji for desert** — 🌴 (date palm) vs 🍇 (grapes) vs 🍯. Suggest 🌴
   unless a better CC0 crunch sound favours a different pick.
2. **Per-level theme override** — proposed: levels MAY specify `theme` field;
   absent = use the global setting. Implement only if trivial; otherwise defer.
3. **Desert levels** — ship 2-3 new desert-authored levels, or just prove the
   theme on existing levels? Suggest: ship the theme first, add levels as a
   follow-up so this task stays bounded.

## Risks

- The `AnimalKind` → `string` relaxation weakens type safety; mitigate with a
  runtime validator (`assertLevelPlayable(level, theme)`) called on every level
  load (engine ctor + editor play + storage load).
- Asset budget: desert sprites + bgm add bundle weight; keep tiles 32×32 and
  bgm a short loop, consistent with the farm budget (~7 KB gz JS today).
- Theming + l10n both add settings rows and i18n keys — sequence l10n first,
  then theming, to reuse the picker pattern and avoid rework.
