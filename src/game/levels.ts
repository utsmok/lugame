import type { Level } from './types';

// Hand-tuned levels of increasing difficulty.
// Coordinate system: c = column (x), r = row (y, grows downward).
// Facing: 0=N, 90=E, 180=S, 270=W.
//
// goal → goals[]: collect EVERY cookie to win. Multiple cookies teach planning
// and backtracking. Solutions are verified inline.

export const LEVELS: Level[] = [
  // 1 — teach Forward. Solution: F F F
  {
    id: 1,
    name: 'Eerste Stapjes',
    cols: 4,
    rows: 1,
    path: [
      { c: 0, r: 0 }, { c: 1, r: 0 }, { c: 2, r: 0 }, { c: 3, r: 0 },
    ],
    start: { c: 0, r: 0 },
    startDir: 90,
    goals: [{ c: 3, r: 0 }],
    animals: [],
  },

  // 2 — teach Turn. Solution: F F R F F F
  {
    id: 2,
    name: 'Om de Hoek',
    cols: 4,
    rows: 4,
    path: [
      { c: 0, r: 0 }, { c: 1, r: 0 }, { c: 2, r: 0 },
      { c: 2, r: 1 }, { c: 2, r: 2 }, { c: 2, r: 3 },
    ],
    start: { c: 0, r: 0 },
    startDir: 90,
    goals: [{ c: 2, r: 3 }],
    animals: [],
  },

  // 3 — teach Fan. Solution: F F SHOO F F
  {
    id: 3,
    name: 'Koe, Wegwezen!',
    cols: 5,
    rows: 1,
    path: [
      { c: 0, r: 0 }, { c: 1, r: 0 }, { c: 2, r: 0 }, { c: 3, r: 0 }, { c: 4, r: 0 },
    ],
    start: { c: 0, r: 0 },
    startDir: 90,
    goals: [{ c: 4, r: 0 }],
    animals: [{ pos: { c: 3, r: 0 }, kind: 'cow' }],
  },

  // 4 — two animals, re-orient between fans. Solution: F SHOO F F R SHOO F F
  {
    id: 4,
    name: 'Twee Vriendjes',
    cols: 4,
    rows: 3,
    path: [
      { c: 0, r: 0 }, { c: 1, r: 0 }, { c: 2, r: 0 }, { c: 3, r: 0 },
      { c: 3, r: 1 }, { c: 3, r: 2 },
    ],
    start: { c: 0, r: 0 },
    startDir: 90,
    goals: [{ c: 3, r: 2 }],
    animals: [
      { pos: { c: 2, r: 0 }, kind: 'cow' },
      { pos: { c: 3, r: 1 }, kind: 'pig' },
    ],
  },

  // 5 — winding path, two animals. Solution: F L F SHOO F L F R F F R SHOO F F
  {
    id: 5,
    name: 'De Lange Weg',
    cols: 5,
    rows: 3,
    path: [
      { c: 0, r: 0 }, { c: 0, r: 1 },
      { c: 1, r: 1 }, { c: 2, r: 1 }, { c: 2, r: 0 },
      { c: 3, r: 0 }, { c: 4, r: 0 }, { c: 4, r: 1 }, { c: 4, r: 2 },
    ],
    start: { c: 0, r: 0 },
    startDir: 180,
    goals: [{ c: 4, r: 2 }],
    animals: [
      { pos: { c: 2, r: 1 }, kind: 'sheep' },
      { pos: { c: 4, r: 1 }, kind: 'chicken' },
    ],
  },

  // 6 — teach multiple cookies. Solution: F F F F F (collects both)
  {
    id: 6,
    name: 'Twee Koekjes',
    cols: 6,
    rows: 1,
    path: [
      { c: 0, r: 0 }, { c: 1, r: 0 }, { c: 2, r: 0 }, { c: 3, r: 0 },
      { c: 4, r: 0 }, { c: 5, r: 0 },
    ],
    start: { c: 0, r: 0 },
    startDir: 90,
    goals: [{ c: 2, r: 0 }, { c: 5, r: 0 }],
    animals: [],
    energy: 1,
  },

  // 7 — branching T-junction, backtracking to grab both cookies.
  //   Solution: F L F F R R F F F F
  {
    id: 7,
    name: 'Het Kruispunt',
    cols: 5,
    rows: 2,
    path: [
      { c: 0, r: 0 }, { c: 1, r: 0 }, { c: 2, r: 0 }, { c: 3, r: 0 }, { c: 4, r: 0 },
      { c: 2, r: 1 },
    ],
    start: { c: 2, r: 1 },
    startDir: 0,
    goals: [{ c: 0, r: 0 }, { c: 4, r: 0 }],
    animals: [],
  },

  // 8 — cow between two cookies on a line.
  //   Solution: F F F F SHOO F F
  {
    id: 8,
    name: 'Tussendoortje',
    cols: 7,
    rows: 1,
    path: [
      { c: 0, r: 0 }, { c: 1, r: 0 }, { c: 2, r: 0 }, { c: 3, r: 0 },
      { c: 4, r: 0 }, { c: 5, r: 0 }, { c: 6, r: 0 },
    ],
    start: { c: 0, r: 0 },
    startDir: 90,
    goals: [{ c: 3, r: 0 }, { c: 6, r: 0 }],
    animals: [{ pos: { c: 5, r: 0 }, kind: 'cow' }],
  },

  // 9 — cross-shaped garden, two cookies on opposite arms, two animals.
  //   Solution: F F L SHOO F F R R SHOO F F F F
  {
    id: 9,
    name: 'Koekjestuin',
    cols: 5,
    rows: 5,
    path: [
      // horizontal arm (row 2)
      { c: 0, r: 2 }, { c: 1, r: 2 }, { c: 2, r: 2 }, { c: 3, r: 2 }, { c: 4, r: 2 },
      // vertical spine (col 2)
      { c: 2, r: 0 }, { c: 2, r: 1 }, { c: 2, r: 3 }, { c: 2, r: 4 },
    ],
    start: { c: 2, r: 4 },
    startDir: 0,
    goals: [{ c: 0, r: 2 }, { c: 4, r: 2 }],
    animals: [
      { pos: { c: 1, r: 2 }, kind: 'cow' },
      { pos: { c: 3, r: 2 }, kind: 'pig' },
    ],
    energy: 2,
  },
];
