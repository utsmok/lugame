import {
  type Animal,
  type Command,
  type Dir,
  type GameEvent,
  type Level,
  type Phase,
  type Pos,
  addPos,
  dirVec,
  fanCells,
  key,
  samePos,
  turnLeft,
  turnRight,
} from './types';

interface Robot {
  pos: Pos; // logical grid position
  dir: Dir; // logical facing (snapped)
  dc: number; // display column (float, eases toward pos.c)
  dr: number; // display row (float)
  ddir: number; // display facing (float degrees)
}

const STEP_DUR: Record<Command, number> = {
  forward: 0.42,
  left: 0.34,
  right: 0.34,
  fan: 0.95, // long enough for the double peacock call + shake
};
const BUMP_HOLD = 0.55;
const EASE = 13; // positional/angular easing constant

export class GameEngine {
  level: Level;
  pathSet: Set<string>;
  robot: Robot;
  animals: Animal[] = [];
  program: Command[] = [];
  pc = 0;
  phase: Phase = 'editing';

  // animation / fx state (read by the renderer)
  fanT = 0; // 1 right after a fan, decays to 0
  bumpT = 0; // counts up while bumped
  bumpDir: Dir = 0;
  winT = 0;
  private stepElapsed = 0;
  private stepDur = STEP_DUR.forward;
  private animalSeq = 0;

  onEvent: (e: GameEvent) => void = () => {};

  constructor(level: Level) {
    this.level = level;
    this.pathSet = new Set(level.path.map(key));
    this.robot = {
      pos: { ...level.start },
      dir: level.startDir,
      dc: level.start.c,
      dr: level.start.r,
      ddir: level.startDir,
    };
    this.animals = level.animals.map((a) => ({
      id: this.animalSeq++,
      spawn: { ...a.pos },
      kind: a.kind,
      scared: false,
      fleeT: 0,
    }));
  }

  // --- program editing (only while editing) ---
  enqueue(cmd: Command) {
    if (this.phase !== 'editing') return;
    this.program.push(cmd);
    this.emit('click');
  }
  undo() {
    if (this.phase !== 'editing') return;
    this.program.pop();
    this.emit('click');
  }
  clear() {
    if (this.phase !== 'editing') return;
    if (this.program.length === 0) return;
    this.program = [];
    this.resetBoard();
    this.emit('click');
  }

  run() {
    if (this.phase !== 'editing') return;
    if (this.program.length === 0) {
      this.emit('click');
      return;
    }
    this.resetBoard();
    this.phase = 'running';
    this.pc = 0;
    this.stepElapsed = this.stepDur; // fire first command immediately
  }

  /** Reset robot + animals to the level's initial state (keeps the program). */
  private resetBoard() {
    this.robot.pos = { ...this.level.start };
    this.robot.dir = this.level.startDir;
    this.animals.forEach((a) => {
      a.scared = false;
      a.fleeT = 0;
    });
    this.fanT = 0;
    this.bumpT = 0;
    this.winT = 0;
  }

  // --- main update; dt in seconds ---
  update(dt: number) {
    if (this.phase === 'running') {
      this.stepElapsed += dt;
      if (this.stepElapsed >= this.stepDur) {
        this.stepElapsed = 0;
        this.doStep();
      }
    } else if (this.phase === 'bumped') {
      this.bumpT += dt;
      if (this.bumpT >= BUMP_HOLD) {
        this.resetBoard();
        this.pc = 0;
        this.phase = 'editing';
      }
    } else if (this.phase === 'won') {
      this.winT += dt;
    }

    // ease display position toward logical position
    const a = 1 - Math.exp(-dt * EASE);
    this.robot.dc += (this.robot.pos.c - this.robot.dc) * a;
    this.robot.dr += (this.robot.pos.r - this.robot.dr) * a;
    // ease display facing along the shortest arc
    let dd = ((this.robot.dir - this.robot.ddir + 540) % 360) - 180;
    this.robot.ddir += dd * a;

    // decay fan animation
    if (this.fanT > 0) {
      this.fanT = Math.max(0, this.fanT - dt * 1.1);
    }

    // advance fleeing animals
    for (const an of this.animals) {
      if (an.scared && an.fleeT < 1) {
        an.fleeT = Math.min(1, an.fleeT + dt / 0.4);
      }
    }
  }

  private doStep() {
    if (this.pc >= this.program.length) {
      // program finished without reaching the cookie
      this.resetBoard();
      this.phase = 'editing';
      this.emit('finish');
      return;
    }
    const cmd = this.program[this.pc];
    this.stepDur = STEP_DUR[cmd];
    this.pc++;

    switch (cmd) {
      case 'forward': {
        const next = addPos(this.robot.pos, dirVec(this.robot.dir));
        if (!this.pathSet.has(key(next))) {
          this.triggerBump(this.robot.dir);
          return;
        }
        const blocker = this.animals.find(
          (an) => !an.scared && samePos(an.spawn, next),
        );
        if (blocker) {
          this.triggerBump(this.robot.dir);
          return;
        }
        this.robot.pos = next;
        this.emit('step');
        if (samePos(this.robot.pos, this.level.goal)) {
          this.phase = 'won';
          this.winT = 0;
          this.emit('win');
        }
        break;
      }
      case 'left':
        this.robot.dir = turnLeft(this.robot.dir);
        this.emit('turn');
        break;
      case 'right':
        this.robot.dir = turnRight(this.robot.dir);
        this.emit('turn');
        break;
      case 'fan': {
        const cells = fanCells(this.robot.pos, this.robot.dir);
        let scaredAny = false;
        for (const an of this.animals) {
          if (!an.scared && cells.some((c) => samePos(c, an.spawn))) {
            an.scared = true;
            an.fleeT = 0;
            scaredAny = true;
          }
        }
        this.fanT = 1;
        this.emit('fan');
        if (scaredAny) this.emit('flee');
        break;
      }
    }
  }

  private triggerBump(dir: Dir) {
    this.phase = 'bumped';
    this.bumpDir = dir;
    this.bumpT = 0;
    this.emit('bump');
  }

  private emit(e: GameEvent) {
    this.onEvent(e);
  }
}
