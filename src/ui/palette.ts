import type { GameEngine } from '../game/engine';
import {
  TILE_EMOJI,
  REPEAT_COUNT,
  isRepeat,
  type Command,
  type ProgramTile,
  type Level,
} from '../game/types';
import { T, availableLocales, getLocale, setLocale, tr } from '../i18n';
import { THEME_REGISTRY, getStoredTheme } from '../game/theme';

export interface PaletteCallbacks {
  onAdd: (cmd: ProgramTile) => void;
  onRun: () => void;
  onClear: () => void;
  onStep?: () => void;
  onUndo: () => void;
  onPrevLevel: () => void;
  onNextLevel: () => void;
  onPlayAgain: () => void;
  onRemoveChip?: (index: number) => void;
  onSelectLevel?: (index: number) => void;
  onDeleteCustomLevel?: (id: number) => void;
  onOpenEditor?: (seed?: Level) => void;
  // settings
  onToggleEasy?: (easy: boolean) => void;
  onToggleHoldOnError?: (hold: boolean) => void;
  onToggleMusic?: (on: boolean) => void;
  onToggleSound?: (on: boolean) => void;
  onToggleFreePlay?: (on: boolean) => void;
  onSetTheme?: (id: string) => void;
  onHint?: () => void;
  onOnboarded?: () => void;
  onReplayTutorial?: () => void;
}

export interface SettingsState {
  easy: boolean;
  holdOnError: boolean;
  music: boolean;
  sound: boolean;
  freePlay: boolean;
}

interface Built {
  el: HTMLElement;
  canvas: HTMLCanvasElement;
}

type ToggleKey = 'easy' | 'hold' | 'music' | 'sound' | 'freeplay';

function h(tag: string, cls: string): HTMLElement {
  const el = document.createElement(tag);
  el.className = cls;
  return el;
}

// --- modal focus-trap & dialog semantics (N5) ---
interface ModalHandle {
  el: HTMLElement;
  previouslyFocused: HTMLElement | null;
  dismissible: boolean;
  onClose?: () => void;
}

const modalStack: ModalHandle[] = [];
let modalKeydownInstalled = false;

const FOCUSABLE_SEL = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function focusableIn(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SEL)).filter(
    (el) => el.offsetWidth > 0 || el.offsetHeight > 0,
  );
}

function trapTab(modal: HTMLElement, ev: KeyboardEvent): void {
  if (ev.key !== 'Tab') return;
  const items = focusableIn(modal);
  if (items.length === 0) {
    ev.preventDefault();
    modal.focus();
    return;
  }
  const first = items[0]!;
  const last = items[items.length - 1]!;
  const active = document.activeElement;
  if (ev.shiftKey && (active === first || !modal.contains(active))) {
    ev.preventDefault();
    last.focus();
  } else if (!ev.shiftKey && (active === last || !modal.contains(active))) {
    ev.preventDefault();
    first.focus();
  }
}

function onModalKeydown(ev: KeyboardEvent): void {
  const top = modalStack[modalStack.length - 1];
  if (!top) return;
  if (ev.key === 'Escape' && top.dismissible) {
    ev.preventDefault();
    top.onClose?.();
    return;
  }
  trapTab(top.el, ev);
}

/** Open `el` as a modal: capture the current focus, push it on the stack,
 *  move focus into it, and trap Tab/Shift-Tab + Escape (when dismissible). */
function openModal(
  el: HTMLElement,
  opts: { dismissible?: boolean; onClose?: () => void } = {},
): void {
  if (modalStack.some((m) => m.el === el)) return;
  if (!modalKeydownInstalled) {
    modalKeydownInstalled = true;
    document.addEventListener('keydown', onModalKeydown);
  }
  const previouslyFocused =
    document.activeElement instanceof HTMLElement ? document.activeElement : null;
  modalStack.push({
    el,
    previouslyFocused,
    dismissible: opts.dismissible ?? false,
    onClose: opts.onClose,
  });
  const first = focusableIn(el)[0];
  (first ?? el).focus();
}

/** Close `el`: pop it from the stack and restore focus to its opener. */
function closeModal(el: HTMLElement): void {
  const idx = modalStack.findIndex((m) => m.el === el);
  if (idx < 0) return;
  const [handle] = modalStack.splice(idx, 1);
  handle?.previouslyFocused?.focus();
}

export class PaletteUI {
  readonly canvas: HTMLCanvasElement;
  private root!: HTMLElement;
  private programEl!: HTMLElement;
  private runBtn!: HTMLButtonElement;
  private clearBtn!: HTMLButtonElement;
  private stepBtn!: HTMLButtonElement;
  private prevBtn!: HTMLButtonElement;
  private nextBtn!: HTMLButtonElement;
  private cmdButtons: HTMLButtonElement[] = [];
  private overlay!: HTMLElement;
  private overlayBtn!: HTMLButtonElement;
  private lvlName!: HTMLElement;
  private featherEl!: HTMLElement;
  private parEl!: HTMLElement;
  private hintBtn!: HTMLButtonElement;
  private fingerEl?: HTMLElement;
  private onboardGen = 0;
  private cachedProgram = '';
  private levelIndex = 0;
  private levelTotal = 1;
  private wasWon = false;

  // level picker state
  private levelNames: string[] = [];
  private customStart = 0; // combined-list index where custom levels begin
  private customIds: number[] = [];
  private unlocked: boolean[] = [];
  private levelSelectBtn!: HTMLButtonElement;
  private levelSelectOverlay!: HTMLElement;
  private levelSelectGrid!: HTMLElement;
  private customListEl!: HTMLElement;

  // settings
  private settingsBtn!: HTMLButtonElement;
  private editorBtn!: HTMLButtonElement;
  private settingsOverlay!: HTMLElement;
  private toggles: Record<ToggleKey, HTMLElement> = {
    easy: undefined as unknown as HTMLElement,
    hold: undefined as unknown as HTMLElement,
    music: undefined as unknown as HTMLElement,
    sound: undefined as unknown as HTMLElement,
    freeplay: undefined as unknown as HTMLElement,
  };

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
    title.textContent = T.brand;
    const spacer = h('span', 'spacer');

    this.levelSelectBtn = document.createElement('button');
    this.levelSelectBtn.className = 'topbar-btn lvl-grid';
    this.levelSelectBtn.textContent = '\u2630';
    this.levelSelectBtn.setAttribute('aria-label', T.levelSelect);

    this.editorBtn = document.createElement('button');
    this.editorBtn.className = 'topbar-btn editor-btn';
    this.editorBtn.textContent = '\u270F\uFE0F';
    this.editorBtn.setAttribute('aria-label', T.openEditor);

    this.hintBtn = document.createElement('button');
    this.hintBtn.className = 'topbar-btn hint-btn';
    this.hintBtn.textContent = '💡';
    this.hintBtn.setAttribute('aria-label', T.hint);

    this.settingsBtn = document.createElement('button');
    this.settingsBtn.className = 'topbar-btn settings-btn';
    this.settingsBtn.textContent = '\u2699\uFE0F';
    this.settingsBtn.setAttribute('aria-label', T.settings);

    this.prevBtn = document.createElement('button');
    this.prevBtn.className = 'lvl-btn prev';
    this.prevBtn.textContent = '\u2039';
    this.prevBtn.setAttribute('aria-label', T.prevLevel);
    this.lvlName = h('span', 'lvl-name');
    this.parEl = h('span', 'par');
    this.featherEl = h('span', 'feathers');
    this.nextBtn = document.createElement('button');
    this.nextBtn.className = 'lvl-btn next';
    this.nextBtn.textContent = '\u203A';
    this.nextBtn.setAttribute('aria-label', T.nextLevel);

    topbar.append(
      title,
      this.featherEl,
      spacer,
      this.levelSelectBtn,
      this.editorBtn,
      this.hintBtn,
      this.settingsBtn,
      this.prevBtn,
      this.lvlName,
      this.parEl,
      this.nextBtn,
    );

    const stage = h('div', 'stage');
    const canvas = document.createElement('canvas');
    canvas.id = 'board';
    this.overlay = h('div', 'overlay');
    this.overlay.setAttribute('role', 'dialog');
    this.overlay.setAttribute('aria-modal', 'true');
    this.overlay.setAttribute('aria-label', T.winMsg);
    this.overlay.setAttribute('tabindex', '-1');
    const card = h('div', 'card');
    const emojiEl = h('div', 'emoji');
    emojiEl.textContent = T.winEmoji;
    const msg = h('div', 'msg');
    msg.textContent = T.winMsg;
    this.overlayBtn = document.createElement('button');
    this.overlayBtn.className = 'again';
    this.overlayBtn.textContent = T.next;
    card.append(emojiEl, msg, this.overlayBtn);
    this.overlay.appendChild(card);
    stage.append(canvas, this.overlay);

    this.programWrap = h('div', 'program-wrap');
    const programHead = h('div', 'program-head');
    const programLabel = h('span', 'program-label');
    programLabel.textContent = T.steps;
    this.programExpandBtn = document.createElement('button');
    this.programExpandBtn.className = 'program-expand';
    this.programExpandBtn.innerHTML = '\u{1F4D6}';
    this.programExpandBtn.setAttribute('aria-label', T.showAllSteps);
    this.programExpandBtn.disabled = true;
    programHead.append(programLabel, this.programExpandBtn);
    this.programEl = h('div', 'program');
    this.programWrap.append(programHead, this.programEl);

    // expandable overlay: all steps shown over the play area
    this.programOverlay = h('div', 'overlay program-overlay');
    this.programOverlay.setAttribute('role', 'dialog');
    this.programOverlay.setAttribute('aria-modal', 'true');
    this.programOverlay.setAttribute('aria-label', T.allSteps);
    this.programOverlay.setAttribute('tabindex', '-1');
    const poCard = h('div', 'card program-card');
    const poHead = h('div', 'lvl-select-header');
    const poTitle = h('span', 'lvl-select-title');
    poTitle.textContent = T.allSteps;
    this.programOverlayClose = document.createElement('button');
    this.programOverlayClose.className = 'lvl-select-close';
    this.programOverlayClose.textContent = '\u2715';
    this.programOverlayClose.setAttribute('aria-label', T.closeAllSteps);
    poHead.append(poTitle, this.programOverlayClose);
    this.programOverlayGrid = h('div', 'program-overlay-grid');
    poCard.append(poHead, this.programOverlayGrid);
    this.programOverlay.appendChild(poCard);

    const palette = h('div', 'palette');
    const TILE_LABEL: Record<ProgramTile, string> = {
      forward: T.cmdForward,
      left: T.cmdLeft,
      right: T.cmdRight,
      fan: T.cmdFan,
      repeat2: T.cmdRepeat2,
      repeat3: T.cmdRepeat3,
    };
    (['forward', 'left', 'right', 'fan', 'repeat2', 'repeat3'] as ProgramTile[]).forEach((tile) => {
      const b = document.createElement('button');
      b.className = `cmd ${tile}`;
      b.innerHTML = `<span>${TILE_EMOJI[tile]}</span><span class="label">${TILE_LABEL[tile]}</span>`;
      b.setAttribute('aria-label', TILE_LABEL[tile]);
      b.addEventListener('click', () => this.cb.onAdd(tile));
      palette.appendChild(b);
      this.cmdButtons.push(b);
    });

    const controls = h('div', 'controls');
    this.clearBtn = document.createElement('button');
    this.clearBtn.className = 'btn clear';
    this.clearBtn.textContent = T.clear;

    this.stepBtn = document.createElement('button');
    this.stepBtn.className = 'btn step';
    this.stepBtn.textContent = T.step;
    this.runBtn = document.createElement('button');
    this.runBtn.className = 'btn run';
    this.runBtn.textContent = T.run;
    controls.append(this.clearBtn, this.stepBtn, this.runBtn);

    // Level-select overlay
    this.levelSelectOverlay = h('div', 'overlay lvl-select-overlay');
    this.levelSelectOverlay.setAttribute('role', 'dialog');
    this.levelSelectOverlay.setAttribute('aria-modal', 'true');
    this.levelSelectOverlay.setAttribute('aria-label', T.pickLevel);
    this.levelSelectOverlay.setAttribute('tabindex', '-1');
    const lsCard = h('div', 'card lvl-select-card');
    const lsHeader = h('div', 'lvl-select-header');
    const lsTitle = h('span', 'lvl-select-title');
    lsTitle.textContent = T.pickLevel;
    const lsClose = document.createElement('button');
    lsClose.className = 'lvl-select-close';
    lsClose.textContent = '\u2715';
    lsClose.setAttribute('aria-label', T.closeLevelSelect);
    lsHeader.append(lsTitle, lsClose);
    this.levelSelectGrid = h('div', 'lvl-select-grid');
    this.customListEl = h('div', 'lvl-select-custom');
    lsCard.append(lsHeader, this.levelSelectGrid, this.customListEl);
    this.levelSelectOverlay.appendChild(lsCard);

    // Settings overlay
    this.settingsOverlay = h('div', 'overlay settings-overlay');
    this.settingsOverlay.setAttribute('role', 'dialog');
    this.settingsOverlay.setAttribute('aria-modal', 'true');
    this.settingsOverlay.setAttribute('aria-label', T.settingsTitle);
    this.settingsOverlay.setAttribute('tabindex', '-1');
    const sCard = h('div', 'card settings-card');
    const sHeader = h('div', 'lvl-select-header');
    const sTitle = h('span', 'lvl-select-title');
    sTitle.textContent = T.settingsTitle;
    const sClose = document.createElement('button');
    sClose.className = 'lvl-select-close';
    sClose.textContent = '\u2715';
    sClose.setAttribute('aria-label', T.closeSettings);
    sHeader.append(sTitle, sClose);
    const sBody = h('div', 'settings-body');
    sBody.append(
      this.buildToggle('easy', T.easy, T.easyHint),
      this.buildToggle('hold', T.holdOnError, T.holdOnErrorHint),
      this.buildToggle('music', T.music, ''),
      this.buildToggle('sound', T.sound, ''),
      this.buildToggle('freeplay', T.freePlay, T.freePlayHint),
    );
    sBody.appendChild(this.buildLanguageRow());
    sBody.appendChild(this.buildThemeRow());
    const replay = document.createElement('button');
    replay.type = 'button';
    replay.className = 'replay-btn';
    replay.textContent = T.replayTutorial;
    replay.addEventListener('click', () => {
      this.closeSettings();
      this.cb.onReplayTutorial?.();
    });
    sBody.appendChild(replay);
    sCard.append(sHeader, sBody);
    this.settingsOverlay.appendChild(sCard);

    root.append(
      topbar,
      stage,
      this.programWrap,
      this.programOverlay,
      palette,
      controls,
      this.levelSelectOverlay,
      this.settingsOverlay,
    );

    // --- events ---
    this.runBtn.addEventListener('click', () => this.cb.onRun());
    this.stepBtn.addEventListener('click', () => this.cb.onStep?.());
    this.clearBtn.addEventListener('click', () => this.cb.onClear());
    this.prevBtn.addEventListener('click', () => this.cb.onPrevLevel());
    this.nextBtn.addEventListener('click', () => this.cb.onNextLevel());
    this.overlayBtn.addEventListener('click', () => this.advanceOrReplay());
    this.levelSelectBtn.addEventListener('click', () => this.openLevelSelect());
    this.editorBtn.addEventListener('click', () => this.cb.onOpenEditor?.());
    this.hintBtn.addEventListener('click', () => this.cb.onHint?.());
    this.settingsBtn.addEventListener('click', () => this.openSettings());
    lsClose.addEventListener('click', () => this.closeLevelSelect());
    sClose.addEventListener('click', () => this.closeSettings());
    this.levelSelectOverlay.addEventListener('click', (ev) => {
      if (ev.target === this.levelSelectOverlay) this.closeLevelSelect();
    });
    this.settingsOverlay.addEventListener('click', (ev) => {
      if (ev.target === this.settingsOverlay) this.closeSettings();
    });
    this.programExpandBtn.addEventListener('click', () => this.openProgramOverlay());
    this.programOverlayClose.addEventListener('click', () => this.closeProgramOverlay());
    this.programOverlay.addEventListener('click', (ev) => {
      if (ev.target === this.programOverlay) this.closeProgramOverlay();
    });

    return { el: root, canvas };
  }

  private buildToggle(key: ToggleKey, label: string, hint: string): HTMLElement {
    const row = document.createElement('button');
    row.className = 'toggle-row';
    row.type = 'button';
    const lab = h('span', 'tog-label');
    lab.textContent = label;
    row.append(lab);
    if (hint) {
      const hn = h('span', 'tog-hint');
      hn.textContent = hint;
      row.append(hn);
    }
    const sw = h('span', 'switch');
    row.append(sw);
    row.addEventListener('click', () => {
      // optimistic flip; main reconciles via setSettings
      const next = !row.classList.contains('on');
      row.classList.toggle('on', next);
      sw.classList.toggle('on', next);
      if (key === 'easy') this.cb.onToggleEasy?.(next);
      else if (key === 'hold') this.cb.onToggleHoldOnError?.(next);
      else if (key === 'music') this.cb.onToggleMusic?.(next);
      else if (key === 'sound') this.cb.onToggleSound?.(next);
      else this.cb.onToggleFreePlay?.(next);
    });
    this.toggles[key] = row;
    return row;
  }
  /** Language picker row — mirrors the toggle pattern. Switching locale reloads
   * the page: the simplest correct re-render (a live in-place relocalize()
   * pass is a P2 enhancement, out of scope here). */
  private buildLanguageRow(): HTMLElement {
    const row = h('div', 'lang-row');
    const lab = h('span', 'tog-label');
    lab.textContent = T.language;
    const btns = h('div', 'lang-btns');
    for (const loc of availableLocales()) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'lang-btn' + (loc.code === getLocale() ? ' active' : '');
      b.textContent = `${loc.flag} ${loc.label}`;
      b.addEventListener('click', () => {
        setLocale(loc.code);
        window.location.reload();
      });
      btns.appendChild(b);
    }
    row.append(lab, btns);
    return row;
  }

  /** Theme picker row — mirrors the language picker. Switching theme reloads
   * the page (simplest correct re-render, same tradeoff as locale switching). */
  private buildThemeRow(): HTMLElement {
    const row = h('div', 'lang-row');
    const lab = h('span', 'tog-label');
    lab.textContent = T.theme;
    const btns = h('div', 'lang-btns');
    const active = getStoredTheme();
    for (const th of THEME_REGISTRY) {
      const key = `theme${th.id.charAt(0).toUpperCase()}${th.id.slice(1)}Name`;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'lang-btn' + (th.id === active ? ' active' : '');
      b.textContent = `${th.emoji} ${tr(key)}`;
      b.addEventListener('click', () => {
        this.cb.onSetTheme?.(th.id);
      });
      btns.appendChild(b);
    }
    row.append(lab, btns);
    return row;
  }

  setLevelInfo(index: number, total: number, name: string) {
    this.levelIndex = index;
    this.levelTotal = total;
    this.lvlName.textContent = `${T.levelWord} ${index + 1} — ${name}`;
    this.prevBtn.disabled = index <= 0;
    this.nextBtn.disabled = index + 1 >= total;
    this.overlayBtn.textContent =
      index + 1 < total ? T.next : T.playAgain;
    this.rebuildLevelGrid();
  }

  /** Feed the full level list (built-in + custom) for the picker. */
  setLevelList(names: string[], customStart: number, ids: number[]) {
    this.levelNames = names;
    this.customStart = customStart;
    this.customIds = ids;
    this.rebuildLevelGrid();
  }

  /** Push level-unlock flags + feather (plumage) count; rebuilds the picker. */
  setProgress(unlocked: boolean[], feathers: number, total: number) {
    this.unlocked = unlocked;
    this.featherEl.textContent = `🪶 ${feathers}/${total}`;
    this.featherEl.setAttribute('aria-label', `${T.feathers}: ${feathers} / ${total}`);
    this.rebuildLevelGrid();
  }

  /** Show the level's par (optimal step count); null hides it. */
  setPar(n: number | null) {
    this.parEl.textContent = n === null ? '' : `🎯 ${n}`;
    this.parEl.setAttribute('aria-label', n === null ? '' : `${T.par}: ${n}`);
  }

  /** Briefly pulse the command button matching `cmd` (the hint's suggestion). */
  pulseCommand(cmd: Command | null) {
    const btn = cmd ? this.cmdButtons.find((b) => b.className.includes(`cmd ${cmd}`)) : null;
    if (!btn) return;
    btn.classList.remove('hint-pulse');
    void btn.offsetWidth; // restart the animation
    btn.classList.add('hint-pulse');
    btn.addEventListener('animationend', () => btn.classList.remove('hint-pulse'), { once: true });
  }

  /** No-reading onboarding: a translucent finger auto-taps each program tile
   *  in turn, then Run, so a brand-new player sees the gameplay loop. Any real
   *  pointer down cancels it (the player has taken over). */
  async playOnboarding(program: ProgramTile[]) {
    const gen = ++this.onboardGen;
    const finger = this.ensureFinger();
    finger.style.display = 'block';
    const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
    const alive = () => gen === this.onboardGen;
    const tap = async (btn: HTMLElement) => {
      if (!alive()) return;
      const r = btn.getBoundingClientRect();
      finger.style.left = `${r.left + r.width / 2 - 22}px`;
      finger.style.top = `${r.top + r.height / 2 - 6}px`;
      await sleep(500);
      if (!alive()) return;
      finger.classList.add('press');
      btn.classList.add('demo-tap');
      await sleep(200);
      finger.classList.remove('press');
      btn.classList.remove('demo-tap');
    };
    const cancel = () => this.cancelOnboarding();
    document.addEventListener('pointerdown', cancel);
    for (const tile of program) {
      if (!alive()) break;
      const btn = this.cmdButtons.find((b) => b.className.includes(`cmd ${tile}`));
      if (btn) {
        await tap(btn);
        if (alive()) this.cb.onAdd(tile);
        await sleep(350);
      }
    }
    document.removeEventListener('pointerdown', cancel);
    if (!alive()) return;
    await tap(this.runBtn);
    if (!alive()) return;
    this.cb.onRun();
    this.finishOnboarding();
  }

  /** Cancel any running onboarding demo (player took over, or a replay). */
  cancelOnboarding() {
    this.onboardGen++;
    this.finishOnboarding();
  }

  private finishOnboarding() {
    if (this.fingerEl) this.fingerEl.style.display = 'none';
    this.cb.onOnboarded?.();
  }

  private ensureFinger(): HTMLElement {
    if (!this.fingerEl) {
      const f = document.createElement('div');
      f.className = 'onboard-finger';
      f.textContent = '\u{1F446}';
      f.setAttribute('aria-hidden', 'true');
      document.body.appendChild(f);
      this.fingerEl = f;
    }
    return this.fingerEl;
  }

  setSettings(s: SettingsState) {
    const map: Record<ToggleKey, boolean> = {
      easy: s.easy,
      hold: s.holdOnError,
      music: s.music,
      sound: s.sound,
      freeplay: s.freePlay,
    };
    (Object.keys(map) as ToggleKey[]).forEach((k) => {
      const row = this.toggles[k];
      const sw = row.querySelector('.switch');
      row.classList.toggle('on', map[k]);
      sw?.classList.toggle('on', map[k]);
    });
  }

  private programWrap!: HTMLElement;
  private programExpandBtn!: HTMLButtonElement;
  private programOverlay!: HTMLElement;
  private programOverlayGrid!: HTMLElement;
  private programOverlayClose!: HTMLButtonElement;
  private allChips: HTMLElement[] = [];
  private prevGroups: { cmd: ProgramTile; len: number }[] = [];

  sync(e: GameEngine) {
    const sig = e.program.join(',');
    if (sig !== this.cachedProgram) {
      this.cachedProgram = sig;
      this.rebuildChips(e.program);
    }
    const active = e.phase === 'running';
    const errIdx = e.phase === 'error' ? e.errorStep : -1;
    this.allChips.forEach((chip) => {
      const first = Number(chip.dataset.first);
      const last = Number(chip.dataset.last);
      const inRange = (n: number) => n >= first && n <= last;
      chip.classList.toggle('active', active && inRange(e.activeTile));
      chip.classList.toggle('error', errIdx >= 0 && inRange(errIdx));
    });

    // editing OR held-on-error → controls stay usable (that's how you reset)
    const editing = e.phase === 'editing' || e.phase === 'error';
    const hasProgram = e.program.length > 0;
    this.runBtn.disabled = !(editing && hasProgram);
    this.stepBtn.disabled = !((editing && hasProgram) || (e.phase === 'running' && e.stepMode));
    this.clearBtn.disabled = !(editing && hasProgram);
    this.cmdButtons.forEach((b) => (b.disabled = !editing));
    this.programExpandBtn.disabled = !hasProgram;

    const won = e.phase === 'won';
    if (won !== this.wasWon) {
      this.overlay.classList.toggle('show', won);
      if (won) {
        openModal(this.overlay, {
          dismissible: true,
          onClose: () => this.advanceOrReplay(),
        });
      } else {
        closeModal(this.overlay);
      }
    }
    this.wasWon = won;
  }

  private rebuildChips(program: ProgramTile[]) {
    this.programEl.innerHTML = '';
    this.programOverlayGrid.innerHTML = '';
    this.allChips = [];
    if (program.length === 0) {
      const empty = h('span', 'empty');
      empty.textContent = T.emptyHint;
      this.programEl.appendChild(empty);
      this.prevGroups = [];
      return;
    }
    const groups = this.groupsOf(program);
    // overlay (big chips) — full rebuild
    for (const g of groups) {
      const chip = this.makeChip(g.cmd, g.start, g.len, true);
      this.programOverlayGrid.appendChild(chip);
      this.allChips.push(chip);
    }
    // compact row — rebuild, pulsing chips whose count just changed
    const aligned = this.cmdsAligned(this.prevGroups, groups);
    for (let k = 0; k < groups.length; k++) {
      const g = groups[k]!;
      const chip = this.makeChip(g.cmd, g.start, g.len, false);
      this.programEl.appendChild(chip);
      this.allChips.push(chip);
      const pulse =
        aligned && (k >= this.prevGroups.length || this.prevGroups[k]!.len !== g.len);
      if (pulse) this.pulseBadge(chip);
    }
    this.prevGroups = groups.map((g) => ({ cmd: g.cmd, len: g.len }));
    this.programEl.scrollLeft = this.programEl.scrollWidth;
  }

  private openLevelSelect() {
    this.rebuildLevelGrid();
    this.levelSelectOverlay.classList.add('show');
    openModal(this.levelSelectOverlay, {
      dismissible: true,
      onClose: () => this.closeLevelSelect(),
    });
  }

  private closeLevelSelect() {
    this.levelSelectOverlay.classList.remove('show');
    closeModal(this.levelSelectOverlay);
  }

  private openSettings() {
    this.settingsOverlay.classList.add('show');
    openModal(this.settingsOverlay, {
      dismissible: true,
      onClose: () => this.closeSettings(),
    });
  }

  private closeSettings() {
    this.settingsOverlay.classList.remove('show');
    closeModal(this.settingsOverlay);
  }

  /** Win-overlay action: advance, or replay on the last level. */
  private advanceOrReplay() {
    if (this.levelIndex + 1 < this.levelTotal) this.cb.onNextLevel();
    else this.cb.onPlayAgain();
  }

  /** Group consecutive identical commands into runs (for condensing). */
  private groupsOf(program: ProgramTile[]): { cmd: ProgramTile; start: number; len: number }[] {
    const groups: { cmd: ProgramTile; start: number; len: number }[] = [];
    for (let i = 0; i < program.length;) {
      const tile = program[i]!;
      let len = 1;
      // only condense consecutive identical PLAIN commands; repeats stay solo
      while (!isRepeat(tile) && i + len < program.length && program[i + len] === tile) len++;
      groups.push({ cmd: tile, start: i, len });
      i += len;
    }
    return groups;
  }

  /** True if prev and current groups share the same command at each index (safe to animate counts). */
  private cmdsAligned(
    a: { cmd: ProgramTile; len: number }[],
    b: { cmd: ProgramTile; len: number }[],
  ): boolean {
    const n = Math.min(a.length, b.length);
    for (let k = 0; k < n; k++) {
      if (a[k]!.cmd !== b[k]!.cmd) return false;
    }
    return true;
  }

  private pulseBadge(chip: HTMLElement) {
    const badge = chip.querySelector('.chip-badge');
    if (!(badge instanceof HTMLElement)) return;
    badge.classList.remove('pulse');
    void badge.offsetWidth; // force reflow so the animation restarts
    badge.classList.add('pulse');
    badge.addEventListener(
      'animationend',
      () => badge.classList.remove('pulse'),
      { once: true },
    );
  }

  private makeChip(tile: ProgramTile, first: number, len: number, big: boolean): HTMLElement {
    const chip = h('div', `chip ${tile}` + (big ? ' big' : ''));
    const badgeN = isRepeat(tile) ? REPEAT_COUNT[tile] : len;
    let inner = TILE_EMOJI[tile];
    inner += `<span class="chip-badge" aria-hidden="true">\u00D7${badgeN}</span>`;
    inner += `<span class="chip-remove" aria-label="${T.removeStep}">\u2715</span>`;
    chip.innerHTML = inner;
    chip.dataset.first = String(first);
    chip.dataset.last = String(first + len - 1);
    chip.addEventListener('click', () => {
      if (this.cb.onRemoveChip) this.cb.onRemoveChip(first + len - 1);
    });
    return chip;
  }

  private openProgramOverlay() {
    this.programOverlay.classList.add('show');
    openModal(this.programOverlay, {
      dismissible: true,
      onClose: () => this.closeProgramOverlay(),
    });
  }

  private closeProgramOverlay() {
    this.programOverlay.classList.remove('show');
    closeModal(this.programOverlay);
  }

  private rebuildLevelGrid() {
    this.levelSelectGrid.innerHTML = '';
    this.customListEl.innerHTML = '';
    const builtCount = Math.min(this.customStart, this.levelNames.length);
    for (let i = 0; i < builtCount; i++) {
      const btn = document.createElement('button');
      const locked = !this.unlocked[i];
      btn.className =
        'lvl-pick' + (i === this.levelIndex ? ' current' : '') + (locked ? ' locked' : '');
      btn.textContent = locked ? '🔒' : `${i + 1}`;
      btn.title = this.levelNames[i] ?? '';
      btn.disabled = locked;
      btn.setAttribute(
        'aria-label',
        `${T.levelWord} ${i + 1}` + (locked ? ` (${T.locked})` : ''),
      );
      if (!locked) {
        btn.addEventListener('click', () => {
          this.cb.onSelectLevel?.(i);
          this.closeLevelSelect();
        });
      }
      this.levelSelectGrid.appendChild(btn);
    }

    // custom levels section
    if (this.levelNames.length > builtCount) {
      const heading = h('div', 'lvl-select-subhead');
      heading.textContent = T.myLevels;
      this.customListEl.appendChild(heading);
      for (let i = builtCount; i < this.levelNames.length; i++) {
        const row = h('div', 'custom-lvl');
        const pick = document.createElement('button');
        pick.className =
          'custom-lvl-pick' + (i === this.levelIndex ? ' current' : '');
      pick.textContent = `\u2728 ${this.levelNames[i] ?? T.levelWord}`;
        pick.addEventListener('click', () => {
          this.cb.onSelectLevel?.(i);
          this.closeLevelSelect();
        });
        const del = document.createElement('button');
        del.className = 'custom-lvl-del';
        del.textContent = '\u2715';
      del.setAttribute('aria-label', T.deleteCustomLevel);
        del.addEventListener('click', (ev) => {
          ev.stopPropagation();
          const id = this.customIds[i];
          if (id !== undefined && window.confirm(T.confirmDeleteLevel)) {
            this.cb.onDeleteCustomLevel?.(id);
          }
        });
        row.append(pick, del);
        this.customListEl.appendChild(row);
      }
    }
  }
}
