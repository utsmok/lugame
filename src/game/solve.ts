// Pure BFS solver for lugame.
//
// Returns a shortest `Command[]` that collects every goal cookie (a win), or
// `null` if the level is unsolvable. The transition rules in `step()` mirror
// `GameEngine.doStep` exactly (forward/left/right/fan, animal-block + animal-flee,
// energy cost on fan, cookie refill, all-collected win condition) so any sequence
// `solve` returns is valid against the real engine.
//
// State is logical only — no DOM, no animation. It is serialized to a string key
// so BFS can deduplicate; a blocked forward / out-of-energy fan is a no-op whose
// resulting key equals the current one, so the visited set collapses those edges.

import {
  type Command,
  type Dir,
  type Level,
  type Pos,
  MAX_ENERGY,
  addPos,
  dirVec,
  fanCells,
  key,
  samePos,
  turnLeft,
  turnRight,
} from './types';

/** Immutable logical state of a play-through (no display/animation fields). */
export interface SolveState {
  c: number;
  r: number;
  dir: Dir;
  collected: number; // bitmask over level.goals (bit i = goals[i] collected)
  scared: number; // bitmask over level.animals (bit i = animals[i] fled)
  energy: number; // current pips (0..MAX_ENERGY); constant 0 when energy disabled
}

/** Precomputed, level-derived lookup tables shared across every transition. */
export interface SolveCtx {
  pathSet: Set<string>;
  goals: Pos[];
  animals: Pos[]; // spawn positions, indexed to match SolveState.scared bits
  energyEnabled: boolean;
  allCollected: number; // bitmask of "every goal collected" — the win target
}

const COMMANDS: readonly Command[] = ['forward', 'left', 'right', 'fan'] as const;

export function createSolveContext(level: Level): SolveCtx {
  const goalCount = level.goals.length;
  return {
    pathSet: new Set(level.path.map(key)),
    goals: level.goals,
    animals: level.animals.map((a) => a.pos),
    energyEnabled: level.energy !== undefined,
    allCollected: goalCount === 0 ? 0 : (1 << goalCount) - 1,
  };
}

export function initialSolveState(level: Level): SolveState {
  return {
    c: level.start.c,
    r: level.start.r,
    dir: level.startDir,
    collected: 0,
    scared: 0,
    energy: level.energy ?? 0,
  };
}

/** True once every goal cookie has been collected (the engine's win condition). */
export function isWin(s: SolveState, ctx: SolveCtx): boolean {
  return s.collected === ctx.allCollected;
}

/**
 * Apply one command, returning the next logical state.
 *
 * A blocked `forward` (off-path, or an unscared animal on the target cell) and an
 * out-of-energy `fan` are no-ops: they return a state equal to the input, matching
 * the engine's bump/tired-shake behavior where the robot and world are unchanged.
 */
export function step(s: SolveState, cmd: Command, ctx: SolveCtx): SolveState {
  switch (cmd) {
    case 'forward': {
      const next = addPos({ c: s.c, r: s.r }, dirVec(s.dir));
      if (!ctx.pathSet.has(key(next))) return s; // off-path: bump
      for (let i = 0; i < ctx.animals.length; i++) {
        if (!(s.scared & (1 << i)) && samePos(ctx.animals[i]!, next)) return s; // blocked: bump
      }
      const ns: SolveState = { ...s, c: next.c, r: next.r };
      for (let i = 0; i < ctx.goals.length; i++) {
        if (!(ns.collected & (1 << i)) && samePos(ctx.goals[i]!, next)) {
          ns.collected |= (1 << i);
          if (ctx.energyEnabled && ns.energy < MAX_ENERGY) ns.energy++; // eat to refill
          break; // at most one cookie per cell
        }
      }
      return ns;
    }
    case 'left':
      return { ...s, dir: turnLeft(s.dir) };
    case 'right':
      return { ...s, dir: turnRight(s.dir) };
    case 'fan': {
      if (ctx.energyEnabled && s.energy <= 0) return s; // too tired: no-op
      const cells = fanCells({ c: s.c, r: s.r }, s.dir);
      let scared = s.scared;
      for (let i = 0; i < ctx.animals.length; i++) {
        if (!(scared & (1 << i)) && cells.some((cell) => samePos(cell, ctx.animals[i]!))) {
          scared |= (1 << i);
        }
      }
      return { ...s, scared, energy: ctx.energyEnabled ? s.energy - 1 : s.energy };
    }
    default: {
      const _: never = cmd; // exhaustiveness — a new Command forces a case here
      return _;
    }
  }
}

function serialize(s: SolveState): string {
  return `${s.c},${s.r},${s.dir},${s.collected},${s.scared},${s.energy}`;
}

/**
 * Breadth-first search over the four commands. The first time a winning state is
 * reached it is via a shortest command sequence, which is reconstructed from the
 * parent pointers and returned. Returns `null` if no sequence wins.
 */
export function solve(level: Level): Command[] | null {
  const ctx = createSolveContext(level);
  const start = initialSolveState(level);
  if (isWin(start, ctx)) return []; // trivially won (no goals)

  const startKey = serialize(start);
  const visited = new Set<string>([startKey]);
  const parent = new Map<string, { from: string; cmd: Command }>();
  const queue: SolveState[] = [start];
  const queueKeys: string[] = [startKey];

  for (let head = 0; head < queue.length; head++) {
    const cur = queue[head]!;
    const curKey = queueKeys[head]!;
    for (const cmd of COMMANDS) {
      const nxt = step(cur, cmd, ctx);
      const nk = serialize(nxt);
      if (visited.has(nk)) continue; // shorter/equal path already found (self-loops collapse here)
      visited.add(nk);
      parent.set(nk, { from: curKey, cmd });
      if (isWin(nxt, ctx)) {
        const path: Command[] = [];
        let k = nk;
        for (;;) {
          const p = parent.get(k);
          if (!p) break;
          path.push(p.cmd);
          k = p.from;
        }
        path.reverse();
        return path;
      }
      queue.push(nxt);
      queueKeys.push(nk);
    }
  }
  return null;
}
