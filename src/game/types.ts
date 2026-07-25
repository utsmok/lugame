// Core types + grid geometry for lugame.

export const MAX_ENERGY = 3;

export type Dir = 0 | 90 | 180 | 270; // 0=N(up), 90=E(right), 180=S(down), 270=W(left)

export type Command = 'forward' | 'left' | 'right' | 'fan';

export interface Pos {
  c: number;
  r: number;
}

export type AnimalKind = 'cow' | 'pig' | 'sheep' | 'chicken';

export interface AnimalSpawn {
  pos: Pos;
  kind: AnimalKind;
}

export interface Animal {
  id: number;
  spawn: Pos;
  kind: AnimalKind;
  scared: boolean; // scared away by the fan
  fleeT: number; // 0..1 flee animation progress (1 = fully gone)
}

export interface Level {
  id: number;
  name: string;
  cols: number;
  rows: number;
  path: Pos[];
  start: Pos;
  startDir: Dir;
  goals: Pos[];
  animals: AnimalSpawn[];
  energy?: number;
}

export type Phase = 'editing' | 'running' | 'bumped' | 'error' | 'won';

export type GameEvent =
  | 'step'
  | 'turn'
  | 'fan'
  | 'flee'
  | 'bump'
  | 'collect'
  | 'win'
  | 'finish'
  | 'click';

// --- geometry ---

export function dirVec(d: Dir): Pos {
  switch (d) {
    case 0:
      return { c: 0, r: -1 }; // N
    case 90:
      return { c: 1, r: 0 }; // E
    case 180:
      return { c: 0, r: 1 }; // S
    case 270:
      return { c: -1, r: 0 }; // W
  }
}

export function turnLeft(d: Dir): Dir {
  return (((d + 270) % 360) as Dir);
}
export function turnRight(d: Dir): Dir {
  return (((d + 90) % 360) as Dir);
}

export function addPos(a: Pos, b: Pos): Pos {
  return { c: a.c + b.c, r: a.r + b.r };
}
export function samePos(a: Pos, b: Pos): boolean {
  return a.c === b.c && a.r === b.r;
}
export function key(p: Pos): string {
  return `${p.c},${p.r}`;
}

// The 3 cells in front of `pos` along facing `d` (front-left, front, front-right).
// The peacock's fan scares any animal standing in this frontal arc.
export function fanCells(pos: Pos, d: Dir): Pos[] {
  const fwd = dirVec(d);
  const perp = dirVec(turnRight(d));
  const front = addPos(pos, fwd);
  return [
    addPos(front, { c: -perp.c, r: -perp.r }),
    front,
    addPos(front, perp),
  ];
}

export const EMOJI: Record<AnimalKind, string> = {
  cow: '🐮',
  pig: '🐷',
  sheep: '🐑',
  chicken: '🐔',
};

export const COMMAND_EMOJI: Record<Command, string> = {
  forward: '⬆️',
  left: '↺',
  right: '↻',
  fan: '🪶',
};

export const COMMAND_LABEL: Record<Command, string> = {
  forward: 'Stap',
  left: 'Links',
  right: 'Rechts',
  fan: 'Ksst!',
};
