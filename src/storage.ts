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

function isAnimalKind(v: unknown): v is AnimalKind {
  return v === 'cow' || v === 'pig' || v === 'sheep' || v === 'chicken';
}

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
