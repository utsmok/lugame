import type { GameEngine } from '../game/engine';
import {
  COMMAND_EMOJI,
  COMMAND_LABEL,
  type Command,
} from '../game/types';

export interface PaletteCallbacks {
  onAdd: (cmd: Command) => void;
  onRun: () => void;
  onClear: () => void;
  onUndo: () => void;
  onPrevLevel: () => void;
  onNextLevel: () => void;
  onPlayAgain: () => void;
}

interface Built {
  el: HTMLElement;
  canvas: HTMLCanvasElement;
}

function h(tag: string, cls: string): HTMLElement {
  const el = document.createElement(tag);
  el.className = cls;
  return el;
}

export class PaletteUI {
  readonly canvas: HTMLCanvasElement;
  private root!: HTMLElement;
  private programEl!: HTMLElement;
  private runBtn!: HTMLButtonElement;
  private clearBtn!: HTMLButtonElement;
  private prevBtn!: HTMLButtonElement;
  private nextBtn!: HTMLButtonElement;
  private cmdButtons: HTMLButtonElement[] = [];
  private overlay!: HTMLElement;
  private overlayBtn!: HTMLButtonElement;
  private lvlName!: HTMLElement;
  private chips: HTMLElement[] = [];
  private cachedProgram = '';
  private levelIndex = 0;
  private levelTotal = 1;

  constructor(mount: HTMLElement, private cb: PaletteCallbacks) {
    const built = this.build();
    this.root = built.el;
    this.canvas = built.canvas;
    mount.appendChild(this.root);
  }

  private build(): Built {
    const root = h('div', 'app-shell');

    const topbar = h('div', 'topbar');
    const title = h('span', 'title');
    title.textContent = '🦚 lugame';
    const spacer = h('span', 'spacer');
    this.prevBtn = document.createElement('button');
    this.prevBtn.className = 'lvl-btn prev';
    this.prevBtn.textContent = '‹';
    this.prevBtn.setAttribute('aria-label', 'Previous level');
    this.lvlName = h('span', 'lvl-name');
    this.nextBtn = document.createElement('button');
    this.nextBtn.className = 'lvl-btn next';
    this.nextBtn.textContent = '›';
    this.nextBtn.setAttribute('aria-label', 'Next level');
    topbar.append(title, spacer, this.prevBtn, this.lvlName, this.nextBtn);

    const stage = h('div', 'stage');
    const canvas = document.createElement('canvas');
    canvas.id = 'board';
    this.overlay = h('div', 'overlay');
    const card = h('div', 'card');
    const emojiEl = h('div', 'emoji');
    emojiEl.textContent = '🦚🎉🍪';
    const msg = h('div', 'msg');
    msg.textContent = 'Cookie time!';
    this.overlayBtn = document.createElement('button');
    this.overlayBtn.className = 'again';
    this.overlayBtn.textContent = 'Next ▶';
    card.append(emojiEl, msg, this.overlayBtn);
    this.overlay.appendChild(card);
    stage.append(canvas, this.overlay);

    this.programEl = h('div', 'program');

    const palette = h('div', 'palette');
    (['forward', 'left', 'right', 'fan'] as Command[]).forEach((cmd) => {
      const b = document.createElement('button');
      b.className = `cmd ${cmd}`;
      b.innerHTML = `<span>${COMMAND_EMOJI[cmd]}</span><span class="label">${COMMAND_LABEL[cmd]}</span>`;
      b.setAttribute('aria-label', COMMAND_LABEL[cmd]);
      b.addEventListener('click', () => this.cb.onAdd(cmd));
      palette.appendChild(b);
      this.cmdButtons.push(b);
    });

    const controls = h('div', 'controls');
    this.clearBtn = document.createElement('button');
    this.clearBtn.className = 'btn clear';
    this.clearBtn.textContent = '↺ Clear';
    this.runBtn = document.createElement('button');
    this.runBtn.className = 'btn run';
    this.runBtn.textContent = '▶ Run';
    controls.append(this.clearBtn, this.runBtn);

    root.append(topbar, stage, this.programEl, palette, controls);

    this.runBtn.addEventListener('click', () => this.cb.onRun());
    this.clearBtn.addEventListener('click', () => this.cb.onClear());
    this.prevBtn.addEventListener('click', () => this.cb.onPrevLevel());
    this.nextBtn.addEventListener('click', () => this.cb.onNextLevel());
    this.overlayBtn.addEventListener('click', () => {
      if (this.levelIndex + 1 < this.levelTotal) this.cb.onNextLevel();
      else this.cb.onPlayAgain();
    });

    return { el: root, canvas };
  }

  setLevelInfo(index: number, total: number, name: string) {
    this.levelIndex = index;
    this.levelTotal = total;
    this.lvlName.textContent = `Level ${index + 1} — ${name}`;
    this.prevBtn.disabled = index <= 0;
    this.nextBtn.disabled = index + 1 >= total;
    this.overlayBtn.textContent =
      index + 1 < total ? 'Next ▶' : 'Play again ↻';
  }

  sync(e: GameEngine) {
    const sig = e.program.join(',');
    if (sig !== this.cachedProgram) {
      this.cachedProgram = sig;
      this.rebuildChips(e.program);
    }
    const active = e.phase === 'running';
    this.chips.forEach((chip, i) => {
      chip.classList.toggle('active', active && i === e.pc);
    });

    const editing = e.phase === 'editing';
    const hasProgram = e.program.length > 0;
    this.runBtn.disabled = !(editing && hasProgram);
    this.clearBtn.disabled = !(editing && hasProgram);
    this.cmdButtons.forEach((b) => (b.disabled = !editing));

    const won = e.phase === 'won';
    this.overlay.classList.toggle('show', won);
  }

  private rebuildChips(program: Command[]) {
    this.programEl.innerHTML = '';
    this.chips = [];
    if (program.length === 0) {
      const empty = h('span', 'empty');
      empty.textContent = 'Tap the buttons below to add steps…';
      this.programEl.appendChild(empty);
      return;
    }
    for (const cmd of program) {
      const chip = h('div', `chip ${cmd}`);
      chip.textContent = COMMAND_EMOJI[cmd];
      this.programEl.appendChild(chip);
      this.chips.push(chip);
    }
  }
}
