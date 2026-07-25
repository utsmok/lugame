// Custom-level persistence for lugame.
// Levels live in localStorage under key `lugame.customLevels`.

import type { Level, Pos, Dir, AnimalKind } from './game/types';

const KEY = 'lugame.customLevels';

function isPos(v: unknown): v is Pos {
  if (typeof v !== 'object' || v === null) return false;
  if (!('c' in v) || typeof v.c !== 'number') return false;
  return 'r' in v && typeof v.r === 'number';
}

function isDir(v: unknown): v is Dir {
  return v === 0 || v === 90 || v === 180 || v === 270;
}

// Structural-only: any non-empty string is a valid kind id. The active theme
// decides whether it has an emoji for it (cross-theme fallback in theme.ts),
// so a farm level stored under the farm theme still loads under the desert theme.
function isAnimalKind(v: unknown): v is AnimalKind {
  return typeof v === 'string' && v.length > 0;
}

/** Structural check: an animal spawn is `{ pos, kind }` with a valid pos + non-empty kind id. */
function isValidAnimalSpawn(v: unknown): boolean {
  if (typeof v !== 'object' || v === null) return false;
  if (!('pos' in v) || !isPos(v.pos)) return false;
  return 'kind' in v && isAnimalKind(v.kind);
}

function isValidLevel(v: unknown): v is Level {
  if (typeof v !== 'object' || v === null) return false;
  if (!('id' in v) || typeof v.id !== 'number') return false;
  if (!('cols' in v) || typeof v.cols !== 'number') return false;
  if (!('rows' in v) || typeof v.rows !== 'number') return false;
  if (!('startDir' in v) || !isDir(v.startDir)) return false;
  if (!('path' in v) || !Array.isArray(v.path) || !v.path.every(isPos)) return false;
  if (!('goals' in v) || !Array.isArray(v.goals) || !v.goals.every(isPos)) return false;
  if (!('animals' in v) || !Array.isArray(v.animals) || !v.animals.every(isValidAnimalSpawn)) return false;
  if (!('start' in v) || !isPos(v.start)) return false;
  return 'name' in v && typeof v.name === 'string';
}

/** Read + validate custom levels; return [] on any error / missing. */
export function loadCustomLevels(): Level[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const out: Level[] = [];
    for (const item of parsed) {
      if (isValidLevel(item)) out.push(item);
    }
    return out;
  } catch {
    return [];
  }
}

/** Upsert by id, persist, return the new full list. */
export function saveCustomLevel(level: Level): Level[] {
  const list = loadCustomLevels();
  const idx = list.findIndex((l) => l.id === level.id);
  if (idx >= 0) {
    list[idx] = level;
  } else {
    list.push(level);
  }
  localStorage.setItem(KEY, JSON.stringify(list));
  return list;
}

/** Remove by id, persist, return new list. */
export function deleteCustomLevel(id: number): Level[] {
  const list = loadCustomLevels().filter((l) => l.id !== id);
  localStorage.setItem(KEY, JSON.stringify(list));
  return list;
}

/** 1 + max id over loaded custom levels (fallback Date.now()). */
export function nextCustomId(): number {
  const list = loadCustomLevels();
  if (list.length === 0) return Math.floor(Date.now());
  let max = -Infinity;
  for (const l of list) {
    if (l.id > max) max = l.id;
  }
  return max + 1;
}

const CLEARED_KEY = 'lugame.cleared';

/** Ids of cleared built-in levels (feathers = plumage total). [] on any error. */
export function getClearedLevels(): number[] {
  try {
    const raw = localStorage.getItem(CLEARED_KEY);
    if (!raw) return [];
    const p = JSON.parse(raw) as unknown;
    return Array.isArray(p) ? p.filter((x): x is number => typeof x === 'number') : [];
  } catch {
    return [];
  }
}

/** Record a cleared level id (idempotent). */
export function markCleared(id: number): void {
  try {
    const ids = getClearedLevels();
    if (!ids.includes(id)) {
      ids.push(id);
      localStorage.setItem(CLEARED_KEY, JSON.stringify(ids));
    }
  } catch {
    /* storage may be unavailable */
  }
}

const ONBOARD_KEY = 'lugame.onboard';

/** Has the player seen the no-reading demo for this level's mechanic? */
export function isOnboarded(id: number): boolean {
  try {
    return localStorage.getItem(`${ONBOARD_KEY}.${id}`) === '1';
  } catch {
    return false;
  }
}

/** Mark the demo for `id` as seen (so it won't auto-play again). */
export function markOnboarded(id: number): void {
  try {
    localStorage.setItem(`${ONBOARD_KEY}.${id}`, '1');
  } catch {
    /* storage may be unavailable */
  }
}
