import {
  type Animal,
  type Command,
  type Dir,
  type GameEvent,
  MAX_ENERGY,
  type Level,
  type Phase,
  type Pos,
  addPos,
  dirVec,
  fanCells,
  key,
  samePos,
  turnAround,
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
  turnaround: 0.5,
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
  bumpShake = 0; // visual nudge 0..1, decays (used in both bump modes)
  easyMode = false; // when true, a blocked step shakes + plays the error sound but keeps going
  collected: boolean[] = [];
  energy = 0;
  readonly maxEnergy = MAX_ENERGY;
  holdOnError = false;
  errorStep = -1;

  /** Single-step debug: when true, update() does NOT auto-advance — each
   *  command runs only on stepOnce(). Reset on every exit from 'running'. */
  stepMode = false;
  /** Run-speed multiplier applied to every step duration (1 = normal). */
  speedFactor = 1;

  // Execution sequence (a snapshot of the program) and the program-tile index
  // each step came from (for the active-chip highlight).
  private execSeq: Command[] = [];
  private stepTile: number[] = [];
  /** Program-tile index of the step at `pc` (drives the active-chip highlight). */
  get activeTile(): number {
    const i = Math.min(this.pc, this.stepTile.length - 1);
    return i >= 0 ? (this.stepTile[i] ?? -1) : -1;
  }
  private stepElapsed = 0;
  private stepDur = STEP_DUR.forward;
  private animalSeq = 0;

  get energyEnabled(): boolean { return this.level.energy !== undefined; }

  private editable(): boolean { return this.phase === 'editing' || this.phase === 'error'; }

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
    this.collected = level.goals.map(() => false);
    this.energy = level.energy ?? 0;
  }

  // --- program editing (only while editing or error) ---
  enqueue(cmd: Command) {
    if (!this.editable()) return;
    this.program.push(cmd);
    this.emit('click');
  }
  undo() {
    if (!this.editable()) return;
    this.program.pop();
    this.emit('click');
  }
  removeAt(index: number) {
    if (!this.editable()) return;
    if (index < 0 || index >= this.program.length) return;
    this.program.splice(index, 1);
    this.emit('click');
  }
  clear() {
    if (!this.editable()) return;
    if (this.program.length === 0) return;
    this.program = [];
    this.resetBoard();
    this.emit('click');
  }

  run() {
    if (!this.editable()) return;
    if (this.program.length === 0) {
      this.emit('click');
      return;
    }
    this.resetBoard();
    this.prepareSeq();
    this.stepMode = false;
    this.phase = 'running';
    this.pc = 0;
    this.stepElapsed = this.stepDur; // fire first command immediately
  }

  /** Single-step debug entry: like run() but freezes auto-advance after the
   *  first command — subsequent commands fire only on stepOnce(). */
  startStepping() {
    if (!this.editable()) return;
    if (this.program.length === 0) {
      this.emit('click');
      return;
    }
    this.resetBoard();
    this.prepareSeq();
    this.stepMode = true;
    this.phase = 'running';
    this.pc = 0;
    this.doStep(); // execute the first command immediately
  }

  /** Advance one command in step mode (no-op outside step mode / running). */
  stepOnce() {
    if (!this.stepMode || this.phase !== 'running') return;
    this.doStep();
  }

  /** Snapshot the current program into the execution sequence. With repeat
   *  tiles gone the program is already a flat command list; `stepTile` is an
   *  identity map (step i → program tile i) so the active-chip highlight and
   *  hold-on-error marker keep working. */
  private prepareSeq() {
    this.execSeq = this.program.slice();
    this.stepTile = this.execSeq.map((_, i) => i);
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
    this.bumpShake = 0;
    this.winT = 0;
    this.collected = this.level.goals.map(() => false);
    this.energy = this.level.energy ?? 0;
    this.errorStep = -1;
  }

  // --- main update; dt in seconds ---
  update(dt: number) {
    if (this.phase === 'running' && !this.stepMode) {
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
    } else if (this.phase === 'error') {
      /* frozen on the error tile; wait for user reset */
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

    // decay bump shake (visual nudge)
    if (this.bumpShake > 0) {
      this.bumpShake = Math.max(0, this.bumpShake - dt / 0.35);
    }

    // advance fleeing animals
    for (const an of this.animals) {
      if (an.scared && an.fleeT < 1) {
        an.fleeT = Math.min(1, an.fleeT + dt / 0.4);
      }
    }
  }

  private doStep() {
    if (this.pc >= this.execSeq.length) {
      // program finished without reaching the cookie
      this.resetBoard();
      this.stepMode = false;
      this.phase = 'editing';
      this.emit('finish');
      return;
    }
    const cmd = this.execSeq[this.pc]!;
    this.stepDur = STEP_DUR[cmd] * this.speedFactor;
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
        for (let i = 0; i < this.level.goals.length; i++) {
          if (!this.collected[i] && samePos(this.level.goals[i]!, next)) {
            this.collected[i] = true;
            if (this.energyEnabled && this.energy < this.maxEnergy) this.energy++;
            this.emit('collect');
            break;
          }
        }
        if (this.collected.every(Boolean)) {
          this.stepMode = false;
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
      case 'turnaround':
        this.robot.dir = turnAround(this.robot.dir);
        this.emit('turn');
        break;
      case 'fan': {
        // Shoo costs 1 energy on energy-enabled levels (eat cookies to do it more).
        if (this.energyEnabled && this.energy <= 0) {
          // too tired — feedback nudge, no scare, queue continues
          this.bumpShake = 1;
          this.emit('tired');
          break;
        }
        const cells = fanCells(this.robot.pos, this.robot.dir);
        let scaredAny = false;
        for (const an of this.animals) {
          if (!an.scared && cells.some((c) => samePos(c, an.spawn))) {
            an.scared = true;
            an.fleeT = 0;
            scaredAny = true;
          }
        }
        if (this.energyEnabled) this.energy--;
        this.fanT = 1;
        this.emit('fan');
        if (scaredAny) this.emit('flee');
        break;
      }
      default: {
        const _: never = cmd; // F5: exhaustiveness — a new Command fails compile here
        void _;
      }
    }
  }

  private triggerBump(dir: Dir) {
    this.bumpDir = dir;
    this.bumpShake = 1;
    this.emit('bump');
    if (this.easyMode) return;
    if (this.holdOnError) { this.phase = 'error'; this.errorStep = this.stepTile[this.pc - 1] ?? -1; }
    else { this.phase = 'bumped'; this.bumpT = 0; }
  }

  private emit(e: GameEvent) {
    this.onEvent(e);
  }
}
