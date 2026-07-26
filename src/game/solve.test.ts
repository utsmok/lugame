import { describe, expect, it } from 'vitest';

import { LEVELS } from './levels';
import { solve } from './solve';
import type { Command, Level } from './types';

// The BFS solver is the canonical spec for "is this level winnable, and how
// (shortest)". These tests pin two contracts: a known-solvable level yields a
// non-null shortest command sequence of the expected length, and a level whose
// goal is unreachable (off the path graph) yields `null`.
describe('solve', () => {
  it('returns the shortest command sequence for a known-solvable level', () => {
    // Level 1 ("Eerste Stapjes"): a straight 4-cell row, peacock at {0,0}
    // facing East, single cookie at {3,0}. The only winning move at every
    // step is `forward`, so the unique shortest solution is forward x3.
    const level = LEVELS.find((l) => l.id === 1);
    expect(level).toBeDefined();

    const solution = solve(level!);
    expect(solution).not.toBeNull();
    expect(Array.isArray(solution)).toBe(true);

    // Exact shortest sequence: three forwards.
    expect(solution).toEqual(['forward', 'forward', 'forward'] as Command[]);
    expect(solution!.length).toBe(3);

    // Every emitted command must be one of the five valid commands.
    const valid: Record<Command, true> = {
      forward: true,
      left: true,
      right: true,
      fan: true,
      turnaround: true,
    };
    for (const cmd of solution!) {
      expect(valid[cmd]).toBe(true);
    }
  });

  it('returns null when the goal is disconnected from the path', () => {
    // Goal at {2,2} is not on the path, so the peacock can never occupy it —
    // BFS exhausts the reachable state space without ever collecting the
    // cookie and must report the level unsolvable.
    const unreachable: Level = {
      id: 9999,
      name: 'Onbereikbaar',
      cols: 3,
      rows: 3,
      path: [
        { c: 0, r: 0 },
        { c: 1, r: 0 },
      ],
      start: { c: 0, r: 0 },
      startDir: 90,
      goals: [{ c: 2, r: 2 }],
      animals: [],
    };

    expect(solve(unreachable)).toBeNull();
  });
});
