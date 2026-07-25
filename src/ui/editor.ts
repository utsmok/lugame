// Level Editor for lugame — self-contained UI with own styles.
// UI strings go through T (i18n); scoped CSS under `.lugame-editor`.

import type { Level, Pos, Dir, AnimalKind } from '../game/types';
import { nextCustomId } from '../storage';
import { T } from '../i18n';
import { solve } from '../game/solve';

/* ------------------------------------------------------------------ */
/*  Styles (injected once)                                             */
/* ------------------------------------------------------------------ */

const CSS = `
.lugame-editor {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: var(--bg);
  color: var(--ink);
  font-family: "Baloo 2", "Comic Sans MS", "Nunito", system-ui, sans-serif;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.lugame-editor .ed-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: var(--panel);
  border-bottom: 2px solid var(--panel-2);
  flex-shrink: 0;
  flex-wrap: wrap;
}
.lugame-editor .ed-title {
  font-size: 1.15rem;
  font-weight: 700;
  margin-right: auto;
}
.lugame-editor .ed-body {
  flex: 1;
  display: flex;
  overflow: hidden;
  min-height: 0;
}
/* ── Sidebar ─────────────────────────────── */
.lugame-editor .ed-sidebar {
  width: 260px;
  min-width: 200px;
  background: var(--panel);
  border-right: 2px solid var(--panel-2);
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
  flex-shrink: 0;
}
.lugame-editor .ed-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.lugame-editor .ed-label {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--ink-dim);
  font-weight: 600;
}
.lugame-editor .ed-tools {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 5px;
}
.lugame-editor .ed-tool {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 8px;
  border: 2px solid transparent;
  border-radius: 10px;
  background: var(--panel-2);
  color: var(--ink);
  cursor: pointer;
  font-family: inherit;
  font-size: 0.85rem;
  transition: border-color 0.15s, background 0.15s;
  user-select: none;
  -webkit-user-select: none;
  touch-action: manipulation;
}
.lugame-editor .ed-tool:hover { background: #28335f; }
.lugame-editor .ed-tool.active {
  border-color: var(--accent);
  background: #28335f;
}
.lugame-editor .ed-tool .ed-tool-icon { font-size: 1.25rem; line-height: 1; }
/* ── Steppers ────────────────────────────── */
.lugame-editor .ed-stepper {
  display: flex;
  align-items: center;
  gap: 6px;
}
.lugame-editor .ed-stepper button {
  min-width: 48px;
  min-height: 48px;
  border-radius: 8px;
  border: 2px solid var(--panel-2);
  background: var(--panel-2);
  color: var(--ink);
  font-size: 1.1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: inherit;
  touch-action: manipulation;
}
.lugame-editor .ed-stepper button:active { transform: scale(0.93); }
.lugame-editor .ed-stepper span {
  min-width: 28px;
  text-align: center;
  font-weight: 700;
  font-size: 1rem;
}
/* ── Dir buttons ─────────────────────────── */
.lugame-editor .ed-dirs {
  display: flex;
  gap: 4px;
}
.lugame-editor .ed-dir-btn {
  flex: 1;
  padding: 7px 2px;
  border-radius: 8px;
  border: 2px solid transparent;
  background: var(--panel-2);
  color: var(--ink);
  cursor: pointer;
  font-size: 0.9rem;
  font-family: inherit;
  touch-action: manipulation;
}
.lugame-editor .ed-dir-btn.active {
  border-color: var(--accent);
  background: #28335f;
}
/* ── Inputs ──────────────────────────────── */
.lugame-editor .ed-input,
.lugame-editor .ed-select {
  width: 100%;
  padding: 8px 10px;
  border-radius: 8px;
  border: 2px solid var(--panel-2);
  background: var(--panel-2);
  color: var(--ink);
  font-family: inherit;
  font-size: 0.95rem;
  outline: none;
}
.lugame-editor .ed-input:focus,
.lugame-editor .ed-select:focus {
  border-color: var(--accent);
}
/* ── Action buttons ──────────────────────── */
.lugame-editor .ed-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 5px;
  margin-top: auto;
  padding-top: 8px;
  border-top: 1px solid var(--panel-2);
}
.lugame-editor .ed-btn {
  padding: 10px 8px;
  border-radius: 10px;
  border: none;
  color: #111;
  font-weight: 700;
  font-size: 0.88rem;
  font-family: inherit;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  touch-action: manipulation;
}
.lugame-editor .ed-btn:active { transform: scale(0.96); }
.lugame-editor .ed-btn.play   { background: var(--fwd); }
.lugame-editor .ed-btn.save   { background: var(--good); }
.lugame-editor .ed-btn.copy  { background: var(--accent); color: #111; }
.lugame-editor .ed-btn.paste { background: var(--left); color: #fff; }
.lugame-editor .ed-btn.clear { background: var(--bad); }
.lugame-editor .ed-btn.close { background: var(--panel-2); color: var(--ink); grid-column: span 2; }
/* ── Error / feedback ────────────────────── */
.lugame-editor .ed-error {
  color: var(--bad);
  font-size: 0.85rem;
  font-weight: 600;
  min-height: 1.2em;
  text-align: center;
}
.lugame-editor .ed-copy-feedback {
  color: var(--good);
  font-size: 0.85rem;
  font-weight: 600;
  text-align: center;
  min-height: 1.2em;
}
.lugame-editor .ed-solvable {
  font-size: 0.85rem;
  font-weight: 600;
  text-align: center;
  min-height: 1.2em;
}
.lugame-editor .ed-solvable.ok { color: var(--good); }
.lugame-editor .ed-solvable.bad { color: var(--bad); }
/* ── Grid area ───────────────────────────── */
.lugame-editor .ed-grid-area {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  min-width: 0;
  overflow: hidden;
}
.lugame-editor .ed-grid {
  display: grid;
  gap: 2px;
  background: #222;
  padding: 2px;
  border-radius: 8px;
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;
}
.lugame-editor .ed-cell {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0;
  cursor: pointer;
  transition: background 0.1s;
  border-radius: 3px;
}
.lugame-editor .ed-cell.path  { background: #8B6914; }
.lugame-editor .ed-cell.grass { background: #3a7d44; }
.lugame-editor .ed-cell .ed-marker {
  font-size: clamp(14px, 2.2vmin, 32px);
  line-height: 1;
  pointer-events: none;
  text-shadow: 0 1px 3px rgba(0,0,0,0.55);
}
/* ── Responsive sidebar collapse ─────────── */
@media (max-width: 680px) {
  .lugame-editor .ed-body {
    flex-direction: column;
    overflow-y: auto;
  }
  .lugame-editor .ed-sidebar {
    width: 100%;
    min-width: unset;
    border-right: none;
    border-bottom: 2px solid var(--panel-2);
    flex-shrink: 0;
    max-height: 50vh;
  }
  .lugame-editor .ed-grid-area {
    min-height: 300px;
  }
}
`;

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface EditorCallbacks {
  onPlay(level: Level): void;
  onSave(level: Level): void;
  onClose(): void;
}

type Tool =
  | 'pad'
  | 'eraser'
  | 'start'
  | 'goal'
  | 'cow'
  | 'pig'
  | 'sheep'
  | 'chicken'
  | 'wipe';

const DIRS: readonly Dir[] = [0, 90, 180, 270];

// Editor authors farm-style levels; markers mirror the farm animal tool set.
// (The board renderer resolves emoji from the active theme — see theme.ts.)
const EDITOR_ANIMAL_EMOJI: Record<string, string> = {
  cow: '\u{1F42E}',
  pig: '\u{1F437}',
  sheep: '\u{1F411}',
  chicken: '\u{1F414}',
};

const TOOL_DEF: readonly { t: Tool; icon: string }[] = [
  { t: 'pad',     icon: '\u{1F7E9}' },
  { t: 'eraser',  icon: '\u2B1C' },
  { t: 'start',   icon: '\u{1F99A}' },
  { t: 'goal',    icon: '\u{1F36A}' },
  { t: 'cow',     icon: '\u{1F42E}' },
  { t: 'pig',     icon: '\u{1F437}' },
  { t: 'sheep',   icon: '\u{1F411}' },
  { t: 'chicken', icon: '\u{1F414}' },
  { t: 'wipe',    icon: '\u{1F9FC}' },
];

/* ------------------------------------------------------------------ */
/*  LevelEditor                                                        */
/* ------------------------------------------------------------------ */

export class LevelEditor {
  private root!: HTMLElement;
  private gridEl!: HTMLElement;
  private nameInput!: HTMLInputElement;
  private energySelect!: HTMLSelectElement;
  private colsVal!: HTMLSpanElement;
  private rowsVal!: HTMLSpanElement;
  private errorEl!: HTMLElement;
  private solvableEl!: HTMLElement;
  private copyFeedback!: HTMLElement;

  private cols = 5;
  private rows = 5;
  private pathSet = new Set<string>();
  private start: Pos | null = null;
  private startDir: Dir = 0;
  private goals: Pos[] = [];
  private animals: { pos: Pos; kind: AnimalKind }[] = [];

  private activeTool: Tool = 'pad';
  private painting = false;
  private copyTid = 0;

  constructor(private mount: HTMLElement, private cb: EditorCallbacks) {}

  open(seed?: Level): void {
    this.ensureStyles();
    this.root?.remove();

    this.root = document.createElement('div');
    this.root.className = 'lugame-editor';

    if (seed) {
      this.cols = seed.cols;
      this.rows = seed.rows;
      this.pathSet = new Set(seed.path.map((p) => `${p.c},${p.r}`));
      this.start = { ...seed.start };
      this.startDir = seed.startDir;
      this.goals = seed.goals.map((g) => ({ ...g }));
      this.animals = seed.animals.map((a) => ({ pos: { ...a.pos }, kind: a.kind }));
    } else {
      this.resetState();
    }

    this.buildDOM();
    if (seed && seed.energy !== undefined) {
      this.energySelect.value = String(seed.energy);
    }
    this.mount.appendChild(this.root);
    this.renderGrid();
  }

  close(): void {
    this.root?.remove();
    this.root = null as unknown as HTMLElement;
  }

  /* ---- internal ------------------------------------------------ */

  private ensureStyles(): void {
    if (document.getElementById('lugame-editor-css')) return;
    const s = document.createElement('style');
    s.id = 'lugame-editor-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  private resetState(): void {
    this.cols = 5;
    this.rows = 5;
    this.pathSet.clear();
    this.start = null;
    this.startDir = 0;
    this.goals = [];
    this.animals = [];
  }

  private buildDOM(): void {
    // Header
    const hdr = document.createElement('div');
    hdr.className = 'ed-header';
    hdr.innerHTML = `<span class="ed-title">${T.editorTitle}</span>`;

    // Sidebar
    const side = document.createElement('div');
    side.className = 'ed-sidebar';

    side.appendChild(this.sectionLabel(T.edTools));
    const toolsDiv = document.createElement('div');
    toolsDiv.className = 'ed-tools';
    const TOOL_LABEL: Record<Tool, string> = {
      pad: T.toolPad, eraser: T.toolEraser, start: T.toolStart, goal: T.toolGoal,
      cow: T.toolCow, pig: T.toolPig, sheep: T.toolSheep, chicken: T.toolChicken, wipe: T.toolWipe,
    };
    for (const def of TOOL_DEF) {
      const b = document.createElement('button');
      b.className = 'ed-tool' + (def.t === this.activeTool ? ' active' : '');
      b.dataset.tool = def.t;
      b.innerHTML = `<span class="ed-tool-icon">${def.icon}</span>${TOOL_LABEL[def.t]}`;
      b.addEventListener('click', () => this.setTool(def.t));
      toolsDiv.appendChild(b);
    }
    side.appendChild(toolsDiv);

    // Size steppers
    side.appendChild(this.sectionLabel(T.edSize));
    side.appendChild(this.stepperRow('cols', T.edCols, this.cols, (v) => this.resizeCols(v)));
    side.appendChild(this.stepperRow('rows', T.edRows, this.rows, (v) => this.resizeRows(v)));

    // Direction
    side.appendChild(this.sectionLabel(T.edStartDir));
    const dirsDiv = document.createElement('div');
    dirsDiv.className = 'ed-dirs';
    const DIR_LABEL: Record<Dir, string> = { 0: T.dirN, 90: T.dirE, 180: T.dirS, 270: T.dirW };
    for (const d of DIRS) {
      const b = document.createElement('button');
      b.className = 'ed-dir-btn' + (d === this.startDir ? ' active' : '');
      b.textContent = DIR_LABEL[d];
      b.addEventListener('click', () => this.setStartDir(d));
      dirsDiv.appendChild(b);
    }
    side.appendChild(dirsDiv);

    // Name
    side.appendChild(this.sectionLabel(T.edName));
    this.nameInput = document.createElement('input');
    this.nameInput.className = 'ed-input';
    this.nameInput.type = 'text';
    this.nameInput.placeholder = T.edNamePlaceholder;
    side.appendChild(this.nameInput);

    // Energy
    side.appendChild(this.sectionLabel(T.edEnergy));
    this.energySelect = document.createElement('select');
    this.energySelect.className = 'ed-select';
    const energyOpts: { v: string; t: string }[] = [
      { v: 'none', t: T.edEnergyNone },
      { v: '1', t: '1' },
      { v: '2', t: '2' },
      { v: '3', t: '3' },
    ];
    for (const opt of energyOpts) {
      const o = document.createElement('option');
      o.value = opt.v;
      o.textContent = opt.t;
      this.energySelect.appendChild(o);
    }
    side.appendChild(this.energySelect);
    this.energySelect.addEventListener('change', () => this.updateSolvable());

    // Error + copy feedback
    this.errorEl = document.createElement('div');
    this.errorEl.className = 'ed-error';
    side.appendChild(this.errorEl);

    this.copyFeedback = document.createElement('div');
    this.copyFeedback.className = 'ed-copy-feedback';
    side.appendChild(this.copyFeedback);
    this.solvableEl = document.createElement('div');
    this.solvableEl.className = 'ed-solvable';
    side.appendChild(this.solvableEl);

    // Actions
    const actions = document.createElement('div');
    actions.className = 'ed-actions';
    actions.innerHTML = `
      <button class="ed-btn play" data-act="play">${T.edPlay}</button>
      <button class="ed-btn save" data-act="save">${T.edSave}</button>
      <button class="ed-btn copy" data-act="copy">${T.edCopy}</button>
      <button class="ed-btn paste" data-act="paste">${T.edPaste}</button>
      <button class="ed-btn clear" data-act="clear">${T.edClear}</button>
      <button class="ed-btn close" data-act="close">${T.edClose}</button>
    `;
    actions.addEventListener('click', (e) => {
      const tgt = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
      if (!tgt) return;
      switch (tgt.dataset.act) {
        case 'play':  this.doPlay();  break;
        case 'save':  this.doSave();  break;
        case 'copy':  this.doCopy();  break;
        case 'paste': this.doPaste(); break;
        case 'clear': this.doClear(); break;
        case 'close': this.cb.onClose(); this.close(); break;
      }
    });
    side.appendChild(actions);

    // Grid area
    const gridArea = document.createElement('div');
    gridArea.className = 'ed-grid-area';
    this.gridEl = document.createElement('div');
    this.gridEl.className = 'ed-grid';
    gridArea.appendChild(this.gridEl);

    const body = document.createElement('div');
    body.className = 'ed-body';
    body.appendChild(side);
    body.appendChild(gridArea);

    this.root.append(hdr, body);
  }

  private sectionLabel(text: string): HTMLElement {
    const l = document.createElement('div');
    l.className = 'ed-label';
    l.textContent = text;
    return l;
  }

  private stepperRow(
    which: 'cols' | 'rows',
    label: string,
    value: number,
    onChange: (v: number) => void,
  ): HTMLElement {
    const row = document.createElement('div');
    row.className = 'ed-stepper';
    const lbl = document.createElement('span');
    lbl.style.cssText = 'font-size:0.82rem;color:var(--ink-dim);width:72px;flex-shrink:0';
    lbl.textContent = label;
    const minus = document.createElement('button');
    minus.textContent = '\u2212';
    const valSpan = document.createElement('span');
    valSpan.textContent = String(value);
    if (which === 'cols') this.colsVal = valSpan; else this.rowsVal = valSpan;
    const plus = document.createElement('button');
    plus.textContent = '+';
    minus.addEventListener('click', () => {
      const nv = Math.max(2, value - 1);
      valSpan.textContent = String(nv);
      onChange(nv);
    });
    plus.addEventListener('click', () => {
      const nv = Math.min(10, value + 1);
      valSpan.textContent = String(nv);
      onChange(nv);
    });
    row.append(lbl, minus, valSpan, plus);
    return row;
  }

  /* ---- tool / state ------------------------------------------- */

  private setTool(t: Tool): void {
    this.activeTool = t;
    this.root.querySelectorAll('.ed-tool').forEach((b) => {
      const el = b as HTMLElement;
      el.classList.toggle('active', el.dataset.tool === t);
    });
  }

  private setStartDir(d: Dir): void {
    this.startDir = d;
    this.root.querySelectorAll('.ed-dir-btn').forEach((b, i) =>
      b.classList.toggle('active', DIRS[i] === d),
    );
    this.updateSolvable();
  }

  private resizeCols(v: number): void {
    this.cols = v;
    this.trimToFit();
    this.renderGrid();
  }

  private resizeRows(v: number): void {
    this.rows = v;
    this.trimToFit();
    this.renderGrid();
  }

  private trimToFit(): void {
    const ok = (p: Pos) => p.c >= 0 && p.c < this.cols && p.r >= 0 && p.r < this.rows;
    for (const k of [...this.pathSet]) {
      const [c, r] = k.split(',').map(Number) as [number, number];
      if (!ok({ c, r })) this.pathSet.delete(k);
    }
    if (this.start && !ok(this.start)) this.start = null;
    this.goals = this.goals.filter(ok);
    this.animals = this.animals.filter((a) => ok(a.pos));
  }

  /* ---- grid rendering & interaction -------------------------- */

  private renderGrid(): void {
    this.gridEl.innerHTML = '';
    const size = this.calcCellSize();
    this.gridEl.style.gridTemplateColumns = `repeat(${this.cols}, ${size}px)`;
    this.gridEl.style.gridTemplateRows = `repeat(${this.rows}, ${size}px)`;

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = document.createElement('div');
        cell.className = 'ed-cell';
        cell.style.width = `${size}px`;
        cell.style.height = `${size}px`;
        cell.dataset.c = String(c);
        cell.dataset.r = String(r);

        const k = `${c},${r}`;
        cell.classList.add(this.pathSet.has(k) ? 'path' : 'grass');

        const marker = document.createElement('span');
        marker.className = 'ed-marker';
        if (this.start && this.start.c === c && this.start.r === r) {
          marker.textContent = '\u{1F99A}';
        } else if (this.goals.some((g) => g.c === c && g.r === r)) {
          marker.textContent = '\u{1F36A}';
        } else {
          const animal = this.animals.find((a) => a.pos.c === c && a.pos.r === r);
          if (animal) marker.textContent = EDITOR_ANIMAL_EMOJI[animal.kind]!;
        }
        if (marker.textContent) cell.appendChild(marker);

        cell.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          this.painting = true;
          this.applyTool(c, r);
          cell.setPointerCapture(e.pointerId);
        });
        cell.addEventListener('pointerenter', () => {
          if (this.painting) this.applyTool(c, r);
        });
        cell.addEventListener('pointerup', () => { this.painting = false; });

        this.gridEl.appendChild(cell);
      }
    }

    this.gridEl.addEventListener('pointerup', () => { this.painting = false; }, { once: true });

    this.updateSolvable();
  }

  /** Live solvability + optimal-step (par) indicator, re-run on every edit
   *  via renderGrid. Uses the pure BFS solver (B1). */
  private updateSolvable(): void {
    if (this.validate()) {
      this.solvableEl.textContent = '';
      this.solvableEl.className = 'ed-solvable';
      return;
    }
    try {
      const sol = solve(this.buildLevel(0));
      if (sol) {
        this.solvableEl.className = 'ed-solvable ok';
        this.solvableEl.textContent = T.edSolvable.replace('{n}', String(sol.length));
      } else {
        this.solvableEl.className = 'ed-solvable bad';
        this.solvableEl.textContent = T.edUnsolvable;
      }
    } catch {
      this.solvableEl.textContent = '';
    }
  }

  private calcCellSize(): number {
    const area = this.gridEl.parentElement!;
    const aw = area.clientWidth - 40;
    const ah = area.clientHeight - 40;
    const maxW = Math.floor(aw / this.cols);
    const maxH = Math.floor(ah / this.rows);
    return Math.max(28, Math.min(maxW, maxH, 64));
  }

  private applyTool(c: number, r: number): void {
    const k = `${c},${r}`;
    switch (this.activeTool) {
      case 'pad':
        this.pathSet.add(k);
        break;
      case 'eraser':
        this.pathSet.delete(k);
        this.clearCell(c, r);
        break;
      case 'start':
        if (this.pathSet.has(k)) this.start = { c, r };
        break;
      case 'goal':
        if (this.pathSet.has(k) && !this.goals.some((g) => g.c === c && g.r === r))
          this.goals.push({ c, r });
        break;
      case 'cow': case 'pig': case 'sheep': case 'chicken':
        if (this.pathSet.has(k) && !this.animals.some((a) => a.pos.c === c && a.pos.r === r))
          this.animals.push({ pos: { c, r }, kind: this.activeTool as AnimalKind });
        break;
      case 'wipe':
        this.clearCell(c, r);
        break;
    }
    this.renderGrid();
  }

  private clearCell(c: number, r: number): void {
    if (this.start && this.start.c === c && this.start.r === r) this.start = null;
    this.goals = this.goals.filter((g) => !(g.c === c && g.r === r));
    this.animals = this.animals.filter((a) => !(a.pos.c === c && a.pos.r === r));
  }

  /* ---- validation -------------------------------------------- */

  private validate(): string | null {
    if (this.pathSet.size === 0) return T.edErrPath;
    if (!this.start) return T.edErrStart;
    if (!this.pathSet.has(`${this.start.c},${this.start.r}`)) return T.edErrStartOnPath;
    if (this.goals.length === 0) return T.edErrGoal;
    for (const g of this.goals) {
      if (!this.pathSet.has(`${g.c},${g.r}`)) return T.edErrGoalOnPath;
    }
    for (const a of this.animals) {
      if (!this.pathSet.has(`${a.pos.c},${a.pos.r}`)) return T.edErrAnimalOnPath;
    }
    if (this.goals.some((g) => g.c === this.start!.c && g.r === this.start!.r))
      return T.edErrStartGoal;
    return null;
  }

  /* ---- build Level ------------------------------------------- */

  private buildLevel(tempId?: number): Level {
    return {
      id: tempId ?? 0,
      name: this.nameInput.value.trim() || T.edNamePlaceholder,
      cols: this.cols,
      rows: this.rows,
      path: [...this.pathSet].map((k) => { const [c, r] = k.split(',').map(Number) as [number, number]; return { c, r }; }),
      start: { ...this.start! },
      startDir: this.startDir,
      goals: this.goals.map((g) => ({ ...g })),
      animals: this.animals.map((a) => ({ pos: { ...a.pos }, kind: a.kind })),
      energy: this.energySelect.value === 'none' ? undefined : Number(this.energySelect.value),
    };
  }

  /* ---- actions ----------------------------------------------- */

  private doPlay(): void {
    const err = this.validate();
    this.errorEl.textContent = err ?? '';
    if (err) return;
    this.cb.onPlay(this.buildLevel(0));
  }

  private doSave(): void {
    const err = this.validate();
    this.errorEl.textContent = err ?? '';
    if (err) return;
    const level = this.buildLevel(nextCustomId());
    this.cb.onSave(level);
  }

  private doCopy(): void {
    try {
      navigator.clipboard.writeText(JSON.stringify(this.buildLevel(0), null, 2)).then(() => {
        this.copyFeedback.textContent = T.edCopied;
        clearTimeout(this.copyTid);
        this.copyTid = window.setTimeout(() => { this.copyFeedback.textContent = ''; }, 1500);
      });
    } catch { /* clipboard unavailable */ }
  }

  private doPaste(): void {
    try {
      const raw = window.prompt(T.edPastePrompt);
      if (!raw) return;
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed !== 'object' || parsed === null) return;
      const o = parsed;

      // Helper: safely read a number property
      const num = (key: string): number | undefined => {
        if (!(key in o)) return undefined;
        const v = (o as Record<string, unknown>)[key];
        return typeof v === 'number' ? v : undefined;
      };
      const str = (key: string): string | undefined => {
        if (!(key in o)) return undefined;
        const v = (o as Record<string, unknown>)[key];
        return typeof v === 'string' ? v : undefined;
      };

      const nc = num('cols');
      if (nc != null) this.cols = Math.min(10, Math.max(2, Math.trunc(nc)));
      const nr = num('rows');
      if (nr != null) this.rows = Math.min(10, Math.max(2, Math.trunc(nr)));
      const nm = str('name');
      if (nm != null) this.nameInput.value = nm;

      const sd = num('startDir');
      if (sd === 0 || sd === 90 || sd === 180 || sd === 270) this.startDir = sd as Dir;
    const en = num('energy');
    if (en === 1 || en === 2 || en === 3) this.energySelect.value = String(en);
    else this.energySelect.value = 'none';

      this.pathSet.clear();
      if ('path' in o && Array.isArray(o.path)) {
        for (const p of o.path) {
          if (typeof p !== 'object' || p === null) continue;
          if (!('c' in p) || typeof p.c !== 'number') continue;
          if (!('r' in p) || typeof p.r !== 'number') continue;
          this.pathSet.add(`${p.c},${p.r}`);
        }
      }

      this.start = null;
      if ('start' in o && typeof o.start === 'object' && o.start !== null) {
        const s = o.start;
        if ('c' in s && 'r' in s && typeof s.c === 'number' && typeof s.r === 'number')
          this.start = { c: s.c, r: s.r };
      }

      this.goals = [];
      if ('goals' in o && Array.isArray(o.goals)) {
        for (const g of o.goals) {
          if (typeof g !== 'object' || g === null) continue;
          if (!('c' in g) || typeof g.c !== 'number') continue;
          if (!('r' in g) || typeof g.r !== 'number') continue;
          this.goals.push({ c: g.c, r: g.r });
        }
      }

      this.animals = [];
      if ('animals' in o && Array.isArray(o.animals)) {
        for (const a of o.animals) {
          if (typeof a !== 'object' || a === null) continue;
          if (!('pos' in a) || typeof a.pos !== 'object' || a.pos === null) continue;
          if (!('kind' in a)) continue;
          const ap = a.pos;
          if (!('c' in ap) || !('r' in ap) || typeof ap.c !== 'number' || typeof ap.r !== 'number') continue;
          const k = a.kind;
          if (k !== 'cow' && k !== 'pig' && k !== 'sheep' && k !== 'chicken') continue;
          this.animals.push({ pos: { c: ap.c, r: ap.r }, kind: k });
        }
      }

      if (this.colsVal) this.colsVal.textContent = String(this.cols);
      if (this.rowsVal) this.rowsVal.textContent = String(this.rows);
      this.renderGrid();
    } catch { /* invalid JSON — ignore */ }
  }

  private doClear(): void {
    this.resetState();
    this.errorEl.textContent = '';
    this.renderGrid();
  }
}
