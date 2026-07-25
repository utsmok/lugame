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
  onToggleEasy?: (easy: boolean) => void;
  onToggleMute?: (muted: boolean) => void;
  onRemoveChip?: (index: number) => void;
  onSelectLevel?: (index: number) => void;
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
  // New feature state
  private easyBtn!: HTMLButtonElement;
  private muteBtn!: HTMLButtonElement;
  private levelSelectBtn!: HTMLButtonElement;
  private levelSelectOverlay!: HTMLElement;
  private levelSelectGrid!: HTMLElement;
  private muted = false;

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
    title.textContent = '\uD83E\uDD98 lugame';
    const spacer = h('span', 'spacer');

    // Level-select grid button
    this.levelSelectBtn = document.createElement('button');
    this.levelSelectBtn.className = 'topbar-btn lvl-grid';
    this.levelSelectBtn.textContent = '\u2630';
    this.levelSelectBtn.setAttribute('aria-label', 'Level select');

    // Easy mode toggle
    this.easyBtn = document.createElement('button');
    this.easyBtn.className = 'topbar-btn easy-toggle';
    this.easyBtn.textContent = 'Easy';
    this.easyBtn.setAttribute('aria-label', 'Toggle easy mode');

    // Mute toggle
    this.muteBtn = document.createElement('button');
    this.muteBtn.className = 'topbar-btn mute-toggle';
    this.muteBtn.textContent = '\uD83D\uDD0A';
    this.muteBtn.setAttribute('aria-label', 'Toggle sound');

    this.prevBtn = document.createElement('button');
    this.prevBtn.className = 'lvl-btn prev';
    this.prevBtn.textContent = '\u2039';
    this.prevBtn.setAttribute('aria-label', 'Previous level');
    this.lvlName = h('span', 'lvl-name');
    this.nextBtn = document.createElement('button');
    this.nextBtn.className = 'lvl-btn next';
    this.nextBtn.textContent = '\u203A';
    this.nextBtn.setAttribute('aria-label', 'Next level');
    topbar.append(
      title,
      spacer,
      this.levelSelectBtn,
      this.easyBtn,
      this.muteBtn,
      this.prevBtn,
      this.lvlName,
      this.nextBtn,
    );

    const stage = h('div', 'stage');
    const canvas = document.createElement('canvas');
    canvas.id = 'board';
    this.overlay = h('div', 'overlay');
    const card = h('div', 'card');
    const emojiEl = h('div', 'emoji');
    emojiEl.textContent = '\uD83E\uDD98\uD83C\uDF89\uD83C\uDF6A';
    const msg = h('div', 'msg');
    msg.textContent = 'Cookie time!';
    this.overlayBtn = document.createElement('button');
    this.overlayBtn.className = 'again';
    this.overlayBtn.textContent = 'Next \u25B6';
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
    this.clearBtn.textContent = '\u21BA Clear';
    this.runBtn = document.createElement('button');
    this.runBtn.className = 'btn run';
    this.runBtn.textContent = '\u25B6 Run';
    controls.append(this.clearBtn, this.runBtn);

    // Level select overlay
    this.levelSelectOverlay = h('div', 'overlay lvl-select-overlay');
    const lsCard = h('div', 'card lvl-select-card');
    const lsHeader = h('div', 'lvl-select-header');
    const lsTitle = h('span', 'lvl-select-title');
    lsTitle.textContent = 'Pick a level';
    const lsClose = document.createElement('button');
    lsClose.className = 'lvl-select-close';
    lsClose.textContent = '\u2715';
    lsClose.setAttribute('aria-label', 'Close level select');
    lsHeader.append(lsTitle, lsClose);
    this.levelSelectGrid = h('div', 'lvl-select-grid');
    lsCard.append(lsHeader, this.levelSelectGrid);
    this.levelSelectOverlay.appendChild(lsCard);

    root.append(topbar, stage, this.programEl, palette, controls, this.levelSelectOverlay);

    // Event listeners
    this.runBtn.addEventListener('click', () => this.cb.onRun());
    this.clearBtn.addEventListener('click', () => this.cb.onClear());
    this.prevBtn.addEventListener('click', () => this.cb.onPrevLevel());
    this.nextBtn.addEventListener('click', () => this.cb.onNextLevel());
    this.overlayBtn.addEventListener('click', () => {
      if (this.levelIndex + 1 < this.levelTotal) this.cb.onNextLevel();
      else this.cb.onPlayAgain();
    });
    this.easyBtn.addEventListener('click', () => {
      this.easyBtn.classList.toggle('on');
      this.cb.onToggleEasy?.(this.easyBtn.classList.contains('on'));
    });
    this.muteBtn.addEventListener('click', () => {
      this.muted = !this.muted;
      this.muteBtn.textContent = this.muted ? '\uD83D\uDD07' : '\uD83D\uDD0A';
      this.cb.onToggleMute?.(this.muted);
    });
    this.levelSelectBtn.addEventListener('click', () => this.openLevelSelect());
    lsClose.addEventListener('click', () => this.closeLevelSelect());
    this.levelSelectOverlay.addEventListener('click', (ev) => {
      if (ev.target === this.levelSelectOverlay) this.closeLevelSelect();
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
      index + 1 < total ? 'Next \u25B6' : 'Play again \u21BB';
    this.rebuildLevelGrid();
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

    // Sync easy toggle from engine
    this.easyBtn.classList.toggle('on', e.easyMode);

    const won = e.phase === 'won';
    this.overlay.classList.toggle('show', won);
  }

  setMuted(m: boolean) {
    this.muted = m;
    this.muteBtn.textContent = m ? '\uD83D\uDD07' : '\uD83D\uDD0A';
  }

  private rebuildChips(program: Command[]) {
    this.programEl.innerHTML = '';
    this.chips = [];
    if (program.length === 0) {
      const empty = h('span', 'empty');
      empty.textContent = 'Tap the buttons below to add steps\u2026';
      this.programEl.appendChild(empty);
      return;
    }
    for (let i = 0; i < program.length; i++) {
      const cmd = program[i];
      const chip = h('div', `chip ${cmd}`);
      chip.innerHTML = `${COMMAND_EMOJI[cmd]}<span class="chip-remove">\u2715</span>`;
      chip.dataset.index = String(i);
      chip.addEventListener('click', () => {
        if (this.cb.onRemoveChip) this.cb.onRemoveChip(i);
      });
      this.programEl.appendChild(chip);
      this.chips.push(chip);
    }
  }

  private openLevelSelect() {
    this.rebuildLevelGrid();
    this.levelSelectOverlay.classList.add('show');
  }

  private closeLevelSelect() {
    this.levelSelectOverlay.classList.remove('show');
  }

  private rebuildLevelGrid() {
    this.levelSelectGrid.innerHTML = '';
    for (let i = 0; i < this.levelTotal; i++) {
      const btn = document.createElement('button');
      btn.className =
        'lvl-pick' + (i === this.levelIndex ? ' current' : '');
      btn.textContent = `${i + 1}`;
      btn.setAttribute('aria-label', `Level ${i + 1}`);
      btn.addEventListener('click', () => {
        this.cb.onSelectLevel?.(i);
        this.closeLevelSelect();
      });
      this.levelSelectGrid.appendChild(btn);
    }
  }
}
