import type { Level } from './types';

// Five hand-tuned levels of increasing difficulty.
// Coordinate system: c = column (x), r = row (y, grows downward).
// Facing: 0=N, 90=E, 180=S, 270=W.
//
// Each level is verified solvable (see inline solution comments).

export const LEVELS: Level[] = [
  // 1 — teach Forward. Solution: F F F
  {
    id: 1,
    name: 'First Steps',
    cols: 4,
    rows: 1,
    path: [
      { c: 0, r: 0 },
      { c: 1, r: 0 },
      { c: 2, r: 0 },
      { c: 3, r: 0 },
    ],
    start: { c: 0, r: 0 },
    startDir: 90,
    goal: { c: 3, r: 0 },
    animals: [],
  },

  // 2 — teach Turn. Solution: F F R F F F
  {
    id: 2,
    name: 'Around the Corner',
    cols: 4,
    rows: 4,
    path: [
      { c: 0, r: 0 },
      { c: 1, r: 0 },
      { c: 2, r: 0 },
      { c: 2, r: 1 },
      { c: 2, r: 2 },
      { c: 2, r: 3 },
    ],
    start: { c: 0, r: 0 },
    startDir: 90,
    goal: { c: 2, r: 3 },
    animals: [],
  },

  // 3 — teach Fan. Solution: F F SHOO F F
  {
    id: 3,
    name: 'Shoo, Cow!',
    cols: 5,
    rows: 1,
    path: [
      { c: 0, r: 0 },
      { c: 1, r: 0 },
      { c: 2, r: 0 },
      { c: 3, r: 0 },
      { c: 4, r: 0 },
    ],
    start: { c: 0, r: 0 },
    startDir: 90,
    goal: { c: 4, r: 0 },
    animals: [{ pos: { c: 3, r: 0 }, kind: 'cow' }],
  },

  // 4 — two animals, must re-orient between fans.
  //   Solution: F SHOO F F R SHOO F F
  {
    id: 4,
    name: 'Two Friends',
    cols: 4,
    rows: 3,
    path: [
      { c: 0, r: 0 },
      { c: 1, r: 0 },
      { c: 2, r: 0 },
      { c: 3, r: 0 },
      { c: 3, r: 1 },
      { c: 3, r: 2 },
    ],
    start: { c: 0, r: 0 },
    startDir: 90,
    goal: { c: 3, r: 2 },
    animals: [
      { pos: { c: 2, r: 0 }, kind: 'cow' },
      { pos: { c: 3, r: 1 }, kind: 'pig' },
    ],
  },

  // 5 — winding path, two animals, requires turns to face each.
  //   Solution (one of): F L F SHOO F L F R F F R SHOO F F
  {
    id: 5,
    name: 'The Long Way',
    cols: 5,
    rows: 3,
    path: [
      { c: 0, r: 0 },
      { c: 0, r: 1 },
      { c: 1, r: 1 },
      { c: 2, r: 1 },
      { c: 2, r: 0 },
      { c: 3, r: 0 },
      { c: 4, r: 0 },
      { c: 4, r: 1 },
      { c: 4, r: 2 },
    ],
    start: { c: 0, r: 0 },
    startDir: 180,
    goal: { c: 4, r: 2 },
    animals: [
      { pos: { c: 2, r: 1 }, kind: 'sheep' },
      { pos: { c: 4, r: 1 }, kind: 'chicken' },
    ],
  },
];
