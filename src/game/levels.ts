import type { Level } from './types';

// Hand-tuned levels of increasing difficulty.
// Coordinate system: c = column (x), r = row (y, grows downward).
// Facing: 0=N, 90=E, 180=S, 270=W.
//
// goals → goals[]: collect EVERY cookie to win.
// energy (optional): starting energy pips (max 3). On energy-enabled levels the
// fan/"Ksst!" costs 1 pip — eat cookies to refill — so you must plan shoo use.
// Solutions are BFS-verified (see /tmp/solve.py) and noted inline.

export const LEVELS: Level[] = [
  // 1 — teach Forward.   F F F
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

  // 2 — teach Turn.   F F R F F F
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

  // 3 — teach Fan.   F F SHOO F F
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

  // 4 — two animals, re-orient between fans.   F SHOO F SHOO F R F F
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

  // 5 — winding path, two animals.
  //   F L F SHOO F L F R F F R SHOO F F
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

  // 6 — teach multiple cookies (collect-all).   F F F F F
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
  },

  // 7 — branching T-junction, backtracking to grab both cookies.
  //   F L F F L L F F F F
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

  // 8 — first ENERGY level: one shoo in the bank, eat a cookie to top up.
  //   F F F F SHOO F F   (energy 1)
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
    energy: 1,
  },

  // 9 — cross-shaped garden, two animals. Shoo, eat, return, shoo, eat.
  //   F SHOO F L F F L L F F F F   (energy 1; fan from (2,3) N clears both)
  {
    id: 9,
    name: 'Koekjestuin',
    cols: 5,
    rows: 5,
    path: [
      { c: 0, r: 2 }, { c: 1, r: 2 }, { c: 2, r: 2 }, { c: 3, r: 2 }, { c: 4, r: 2 },
      { c: 2, r: 0 }, { c: 2, r: 1 }, { c: 2, r: 3 }, { c: 2, r: 4 },
    ],
    start: { c: 2, r: 4 },
    startDir: 0,
    goals: [{ c: 0, r: 2 }, { c: 4, r: 2 }],
    animals: [
      { pos: { c: 1, r: 2 }, kind: 'cow' },
      { pos: { c: 3, r: 2 }, kind: 'pig' },
    ],
    energy: 1,
  },

  // 10 — ENERGY: shoo, eat, shoo, eat. Two animals, two cookies, 1 pip.
  //   F SHOO F F F SHOO F F   (energy 1)
  {
    id: 10,
    name: 'Hongerige Pauw',
    cols: 7,
    rows: 1,
    path: [
      { c: 0, r: 0 }, { c: 1, r: 0 }, { c: 2, r: 0 }, { c: 3, r: 0 },
      { c: 4, r: 0 }, { c: 5, r: 0 }, { c: 6, r: 0 },
    ],
    start: { c: 0, r: 0 },
    startDir: 90,
    goals: [{ c: 4, r: 0 }, { c: 6, r: 0 }],
    animals: [
      { pos: { c: 2, r: 0 }, kind: 'cow' },
      { pos: { c: 5, r: 0 }, kind: 'pig' },
    ],
    energy: 1,
  },

  // 11 — ENERGY maze (6×6): two animals across the spiral, eat between shoos.
  //   (27-step solution verified)   (energy 1)
  {
    id: 11,
    name: 'Het Doolhof',
    cols: 6,
    rows: 6,
    path: [
      { c: 0, r: 0 }, { c: 1, r: 0 }, { c: 2, r: 0 }, { c: 3, r: 0 }, { c: 4, r: 0 }, { c: 5, r: 0 },
      { c: 5, r: 1 }, { c: 5, r: 2 }, { c: 4, r: 2 }, { c: 3, r: 2 }, { c: 2, r: 2 }, { c: 1, r: 2 }, { c: 0, r: 2 },
      { c: 0, r: 3 }, { c: 0, r: 4 }, { c: 1, r: 4 }, { c: 2, r: 4 }, { c: 3, r: 4 }, { c: 4, r: 4 }, { c: 5, r: 4 }, { c: 5, r: 5 },
    ],
    start: { c: 0, r: 0 },
    startDir: 90,
    goals: [{ c: 3, r: 2 }, { c: 5, r: 5 }],
    animals: [
      { pos: { c: 2, r: 0 }, kind: 'cow' },
      { pos: { c: 3, r: 4 }, kind: 'pig' },
    ],
    energy: 1,
  },

  // 12 — large garden (7×6), three animals, three cookies, 2 pips to start.
  //   (19-step solution verified)   (energy 2)
  {
    id: 12,
    name: 'Grote Tuin',
    cols: 7,
    rows: 6,
    path: [
      { c: 0, r: 0 }, { c: 1, r: 0 }, { c: 2, r: 0 }, { c: 3, r: 0 }, { c: 4, r: 0 }, { c: 5, r: 0 }, { c: 6, r: 0 },
      { c: 0, r: 1 }, { c: 0, r: 2 }, { c: 0, r: 3 },
      { c: 6, r: 1 }, { c: 6, r: 2 }, { c: 6, r: 3 },
      { c: 1, r: 3 }, { c: 2, r: 3 }, { c: 3, r: 3 }, { c: 4, r: 3 }, { c: 5, r: 3 },
      { c: 3, r: 4 }, { c: 3, r: 5 }, { c: 4, r: 5 }, { c: 5, r: 5 }, { c: 6, r: 5 },
      { c: 1, r: 5 }, { c: 2, r: 5 },
    ],
    start: { c: 3, r: 5 },
    startDir: 0,
    goals: [{ c: 0, r: 0 }, { c: 6, r: 0 }, { c: 0, r: 3 }],
    animals: [
      { pos: { c: 1, r: 0 }, kind: 'cow' },
      { pos: { c: 5, r: 3 }, kind: 'pig' },
      { pos: { c: 3, r: 4 }, kind: 'sheep' },
    ],
    energy: 2,
  },
];
