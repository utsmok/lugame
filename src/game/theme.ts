// lugame theme system.
//
// A theme is a plain JSON file at `public/themes/<id>/theme.json` describing the
// visual + audio skin of the game: background gradient, ground tiles, decor
// sprites, obstacle animals (kind → emoji), the goal emoji, bgm, and optional
// colour overrides (fan particles, confetti). Text labels (theme name, animal
// names, goal name) live in the locale files — the theme file is visuals +
// audio + asset refs only (see docs/theming-design.md §"Text is NOT in the
// theme file").
//
// Asset paths in the JSON are **base-relative** (e.g. "assets/img/tree.png" or
// "themes/desert/img/cactus.png") and resolved against `import.meta.env.BASE_URL`
// so the default farm theme reuses the existing `assets/img/*` paths with zero
// asset migration, while new themes drop assets into their own folder.

export interface ThemeDecorSpec {
  /** Base-relative image URL, e.g. "assets/img/tree.png". */
  file: string;
  /** Display height in cell units (1.0 = one cell). Width keeps aspect ratio. */
  h: number;
}

export interface GradientStop {
  /** 0..1, top→bottom. */
  offset: number;
  color: string;
}

export interface ThemeAnimal {
  /** Obstacle kind id; levels reference this (e.g. "cow", "snake"). */
  id: string;
  /** Emoji rendered on the board for this kind. */
  emoji: string;
}

export interface ThemeConfig {
  /** Theme id; matches the folder name under public/themes/. */
  id: string;
  /** Canvas background gradient (top→bottom). */
  background: { stops: GradientStop[] };
  /** Procedural fallback colours used only when ground tiles are absent. */
  cell: { pathFill: string; grassFill: string };
  /** Themed ground tile URLs (names are thematic: grass/dirt, sand/stone, …). */
  ground?: { grass: string; dirt: string };
  /** Decor sprites dropped onto non-path cells. */
  decor: ThemeDecorSpec[];
  /** Goal emoji rendered on the board (🍪 / 🌴 / …). */
  goalEmoji: string;
  /** Optional override of the default fan-feather ring colours. */
  fanColors?: string[];
  /** Optional override of the default confetti palette. */
  confetti?: string[];
  /** Base-relative bgm URL (falls back to procedural music if it 404s). */
  bgm: string;
  /** Optional per-SFX overrides, keyed by SfxName (e.g. { collect: "…" }). */
  sfxOverrides?: Record<string, string>;
  /** Obstacle animal kinds; levels reference `id`, the emoji renders on board. */
  animals: ThemeAnimal[];
}

// ─── Theme registry + persistence ────────────────────────────────────

/** One selectable theme, shown in the settings picker. */
export interface ThemeMeta {
  id: string;
  emoji: string;
}

/** All available themes, in picker order. */
export const THEME_REGISTRY: readonly ThemeMeta[] = [
  { id: 'farm', emoji: '🚜' },
  { id: 'desert', emoji: '🏜️' },
];

const STORAGE_KEY = 'lugame.theme';
export const DEFAULT_THEME = 'farm';

/** Stored choice if it names a known theme, else the default. Never throws. */
export function getStoredTheme(): string {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s && THEME_REGISTRY.some((t) => t.id === s)) return s;
  } catch {
    /* localStorage may be unavailable */
  }
  return DEFAULT_THEME;
}

/** Persist the theme choice. Unknown ids are still stored (best-effort). */
export function setStoredTheme(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* localStorage may be unavailable */
  }
}

// ─── Asset URL resolution ────────────────────────────────────────────

const BASE = import.meta.env.BASE_URL; // '/lugame/' in prod, '/' in dev

/** Resolve a base-relative theme path to a fetchable URL. */
export function assetUrl(path: string): string {
  // Avoid a double slash if BASE already ends with '/' and path starts with '/'.
  if (path.startsWith('/')) return `${BASE}${path.slice(1)}`;
  return `${BASE}${path}`;
}

// ─── Structural validation ───────────────────────────────────────────

function isGradientStop(v: unknown): v is GradientStop {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return typeof o.offset === 'number' && typeof o.color === 'string';
}

function isThemeAnimal(v: unknown): v is ThemeAnimal {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return typeof o.id === 'string' && typeof o.emoji === 'string';
}

function isThemeDecorSpec(v: unknown): v is ThemeDecorSpec {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return typeof o.file === 'string' && typeof o.h === 'number';
}

/** Structural check; rejects malformed theme.json so the loader can fall back. */
export function isThemeConfig(v: unknown): v is ThemeConfig {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  if (typeof o.id !== 'string') return false;
  const bg = o.background;
  if (typeof bg !== 'object' || bg === null) return false;
  const bgo = bg as Record<string, unknown>;
  if (!Array.isArray(bgo.stops) || !bgo.stops.every(isGradientStop)) return false;
  const cell = o.cell;
  if (typeof cell !== 'object' || cell === null) return false;
  const co = cell as Record<string, unknown>;
  if (typeof co.pathFill !== 'string' || typeof co.grassFill !== 'string') return false;
  if (o.ground !== undefined) {
    if (typeof o.ground !== 'object' || o.ground === null) return false;
    const g = o.ground as Record<string, unknown>;
    if (typeof g.grass !== 'string' || typeof g.dirt !== 'string') return false;
  }
  if (!Array.isArray(o.decor) || !o.decor.every(isThemeDecorSpec)) return false;
  if (typeof o.goalEmoji !== 'string') return false;
  if (o.fanColors !== undefined && !Array.isArray(o.fanColors)) return false;
  if (o.confetti !== undefined && !Array.isArray(o.confetti)) return false;
  if (typeof o.bgm !== 'string') return false;
  if (o.sfxOverrides !== undefined && typeof o.sfxOverrides !== 'object') return false;
  if (!Array.isArray(o.animals) || !o.animals.every(isThemeAnimal)) return false;
  return true;
}

// ─── Loader ──────────────────────────────────────────────────────────

/**
 * Fetch + structurally validate a theme.json. Throws on fetch/validation
 * failure; callers should catch and fall back to FALLBACK_FARM_THEME.
 */
export async function loadTheme(id: string): Promise<ThemeConfig> {
  const res = await fetch(assetUrl(`themes/${id}/theme.json`));
  if (!res.ok) throw new Error(`theme "${id}" not found (${res.status})`);
  const data: unknown = await res.json();
  if (!isThemeConfig(data)) throw new Error(`theme "${id}" failed validation`);
  return data;
}

// ─── Inline fallback (insurance if themes/farm/theme.json is unreachable) ──
// Mirrors public/themes/farm/theme.json so the game is fully playable even when
// the theme fetch fails; per-asset fetches (ground/decor/bgm) still 404→procedural.

export const FALLBACK_FARM_THEME: ThemeConfig = {
  id: 'farm',
  background: {
    stops: [
      { offset: 0, color: '#a8e6a3' },
      { offset: 0.5, color: '#88d48f' },
      { offset: 1, color: '#6bc269' },
    ],
  },
  cell: { pathFill: '#caa46a', grassFill: '#7cc77a' },
  ground: { grass: 'assets/img/tile_grass.png', dirt: 'assets/img/tile_dirt.png' },
  decor: [
    { file: 'assets/img/tree.png', h: 1.0 },
    { file: 'assets/img/tree2.png', h: 1.05 },
    { file: 'assets/img/pine.png', h: 0.78 },
    { file: 'assets/img/bush.png', h: 0.62 },
    { file: 'assets/img/flowers.png', h: 0.34 },
    { file: 'assets/img/flowers2.png', h: 0.3 },
    { file: 'assets/img/grass.png', h: 0.3 },
  ],
  goalEmoji: '🍪',
  bgm: 'assets/audio/music.mp3',
  animals: [
    { id: 'cow', emoji: '🐮' },
    { id: 'pig', emoji: '🐷' },
    { id: 'sheep', emoji: '🐑' },
    { id: 'chicken', emoji: '🐔' },
  ],
};

// ─── Emoji resolver with cross-theme fallback ────────────────────────

/**
 * Resolve an animal `kind` to the emoji to render, against the active theme.
 *
 * Levels store animal `kind` ids authored under one theme. When played under a
 * theme whose `animals` list lacks that kind (e.g. a farm `cow` under the desert
 * theme), the kind is substituted deterministically by
 * `theme.animals[hash(kind) % len].emoji` and a single `console.warn` is
 * emitted per missing kind — so the 12 farm levels stay playable (and demo-able)
 * under any theme without ever crashing.
 */
export function makeEmojiResolver(theme: ThemeConfig): (kind: string) => string {
  const map = new Map<string, string>();
  for (const a of theme.animals) map.set(a.id, a.emoji);
  const warned = new Set<string>();
  const len = theme.animals.length;
  return (kind: string) => {
    const e = map.get(kind);
    if (e !== undefined) return e;
    if (!warned.has(kind)) {
      warned.add(kind);
      console.warn(
        `[lugame] animal kind "${kind}" is not in theme "${theme.id}"; substituting a stand-in.`,
      );
    }
    if (len === 0) return '❓';
    let h = 0;
    for (let i = 0; i < kind.length; i++) h = (Math.imul(h, 31) + kind.charCodeAt(i)) | 0;
    const sub = theme.animals[Math.abs(h) % len];
    return sub ? sub.emoji : '❓';
  };
}
