import './style.css';

import { AudioBus, type SfxName } from './game/audio';
import { GameEngine, expandTiles } from './game/engine';
import { LEVELS } from './game/levels';
import { solve, solveFrom, createSolveContext, initialSolveState, step } from './game/solve';
import { Renderer } from './game/render';
import {
  FALLBACK_FARM_THEME,
  type ThemeConfig,
  getStoredTheme,
  loadTheme,
  setStoredTheme,
} from './game/theme';
import { PaletteUI, type SettingsState } from './ui/palette';
import { LevelEditor } from './ui/editor';
import {
  deleteCustomLevel,
  getClearedLevels,
  isOnboarded,
  loadCustomLevels,
  markCleared,
  markOnboarded,
  saveCustomLevel,
} from './storage';
import { T, getLocale, tr } from './i18n';
import type { Command, GameEvent, Level } from './game/types';

const EVENT_SFX: Record<GameEvent, SfxName> = {
  step: 'step',
  turn: 'turn',
  fan: 'fan',
  flee: 'flee',
  win: 'win',
  bump: 'bump',
  collect: 'collect',
  // "finish" reuses the soft click cue (program ended without winning)
  finish: 'click',
  click: 'click',
  tired: 'tired',
};

const SETTINGS_KEY = 'lugame.settings';
const INTRO_LEVELS: readonly number[] = [1, 2, 3];

function loadSettings(): SettingsState {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const s = JSON.parse(raw) as unknown;
      if (typeof s === 'object' && s !== null) {
        const o = s as Record<string, unknown>;
        return {
          easy: !!o.easy,
          holdOnError: !!o.holdOnError,
          music: o.music !== false,
          sound: o.sound !== false,
          freePlay: !!o.freePlay,
        };
      }
    }
  } catch {
    /* ignore corrupt settings */
  }
  return { easy: false, holdOnError: false, music: true, sound: true, freePlay: false };
}

class App {
  private audio = new AudioBus();
  private levels: Level[] = [...LEVELS, ...loadCustomLevels()];
  private levelIndex = 0;
  private engine!: GameEngine;
  private renderer!: Renderer;
  private ui!: PaletteUI;
  private theme!: ThemeConfig;
  private editor?: LevelEditor;
  private settings: SettingsState = loadSettings();
  /** Cleared built-in level ids (drives unlocking + feather count). */
  private cleared = new Set<number>(getClearedLevels());
  private last = performance.now();

  constructor() {
    void this.init();
  }

  private async init() {
    try {
      this.theme = await loadTheme(getStoredTheme());
    } catch (e) {
      console.warn('[lugame] theme load failed; using built-in farm fallback.', e);
      this.theme = FALLBACK_FARM_THEME;
    }

    document.title = T.docTitle;
    document.documentElement.lang = getLocale();
    const mount = document.getElementById('app');
    if (!mount) throw new Error('lugame: mount element #app not found');
    this.engine = new GameEngine(this.levels[0]!);
    this.ui = new PaletteUI(mount, {
      onAdd: (c) => this.engine.enqueue(c),
      onRun: () => {
        this.audio.resume();
        this.engine.run();
      },
      onStep: () => {
        this.audio.resume();
        if (this.engine.stepMode && this.engine.phase === 'running') this.engine.stepOnce();
        else this.engine.startStepping();
      },
      onClear: () => this.engine.clear(),
      onUndo: () => this.engine.undo(),
      onPrevLevel: () => this.changeLevel(this.levelIndex - 1),
      onNextLevel: () => this.changeLevel(this.levelIndex + 1),
      onPlayAgain: () => this.changeLevel(this.levelIndex),
      onRemoveChip: (i) => this.engine.removeAt(i),
      onSelectLevel: (i) => this.changeLevel(i),
      onDeleteCustomLevel: (id) => this.deleteCustom(id),
      onOpenEditor: (seed) => this.openEditor(seed),
      onToggleEasy: (b) => this.setSetting('easy', b),
      onToggleHoldOnError: (b) => this.setSetting('holdOnError', b),
      onToggleMusic: (b) => this.setSetting('music', b),
      onToggleSound: (b) => this.setSetting('sound', b),
      onToggleFreePlay: (b) => this.setSetting('freePlay', b),
      onSetTheme: (id) => this.setTheme(id),
      onHint: () => this.onHint(),
      onOnboarded: () => this.onOnboarded(),
      onReplayTutorial: () => this.onReplayTutorial(),
    });
    this.renderer = new Renderer(this.ui.canvas, this.theme);
    this.renderer.loadDecor();
    this.renderer.loadGround();
    this.renderer.loadPlayer();
    this.applyProgress();

    this.applySettings();

    this.refreshLevelList();
    this.ui.setLevelInfo(this.levelIndex, this.levels.length, this.levelName(this.engine.level));
    this.updatePar();
    this.maybeOnboard();
    this.ui.setSettings(this.settings);

    this.resize();
    let resizeTimer: number | undefined;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => this.resize(), 120);
    });
    this.bindKeyboard();
    this.bindFirstGesture();

    requestAnimationFrame((t) => this.loop(t));
  }

  /** Persist the theme choice and reload so the new skin takes effect. */
  private setTheme(id: string) {
    setStoredTheme(id);
    window.location.reload();
  }

  /** Bind the engine's event bus to audio, gated by the sound setting. */
  private wireAudio() {
    this.engine.onEvent = (e) => {
      if (this.settings.sound) this.audio.play(EVENT_SFX[e]);
      if (e === 'win') this.onWin();
    };
  }

  /** Apply persisted settings to engine + audio. */
  private applySettings() {
    this.engine.easyMode = this.settings.easy;
    this.engine.holdOnError = this.settings.holdOnError;
    this.audio.setMuted(!this.settings.sound);
    this.audio.setMusicEnabled(this.settings.music);
    this.wireAudio();
  }

  /** Mark the current built-in level cleared on win (feathers + unlocking). */
  private onWin() {
    const lvl = this.engine.level;
    if (LEVELS.includes(lvl) && !this.cleared.has(lvl.id)) {
      this.cleared.add(lvl.id);
      markCleared(lvl.id);
      this.applyProgress();
    }
  }

  /** Recompute level-unlock flags + feather count and push to the UI. */
  private applyProgress() {
    const n = LEVELS.length;
    const unlocked = Array.from({ length: n }, (_, i) =>
      i === 0 || this.settings.freePlay || (i > 0 && this.cleared.has(LEVELS[i - 1]!.id)),
    );
    this.ui.setProgress(unlocked, this.cleared.size, n);
  }

  private setSetting<K extends keyof SettingsState>(
    key: K,
    value: SettingsState[K],
  ) {
    this.settings[key] = value;
    if (key === 'easy') this.engine.easyMode = value;
    else if (key === 'holdOnError') this.engine.holdOnError = value;
    else if (key === 'music') this.audio.setMusicEnabled(value);
    else if (key === 'sound') this.audio.setMuted(!value);
    else if (key === 'freePlay') this.applyProgress();
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    } catch {
      /* storage may be unavailable */
    }
    this.ui.setSettings(this.settings);
  }

  /** Localized name for a level: built-ins resolve via `lvl<id>` locale keys;
   *  custom levels (and any missing key) fall back to their stored name. */
  private levelName(l: Level): string {
    if (!LEVELS.includes(l)) return l.name;
    const k = `lvl${l.id}`;
    const v = tr(k);
    return v === k ? l.name : v;
  }

  private refreshLevelList() {
    this.ui.setLevelList(
      this.levels.map((l) => this.levelName(l)),
      LEVELS.length,
      this.levels.map((l) => l.id),
    );
  }

  private changeLevel(index: number) {
    if (index < 0 || index >= this.levels.length) return;
    this.levelIndex = index;
    this.engine = new GameEngine(this.levels[index]!);
    this.engine.easyMode = this.settings.easy;
    this.engine.holdOnError = this.settings.holdOnError;
    this.wireAudio();
    this.ui.setLevelInfo(index, this.levels.length, this.levelName(this.engine.level));
    this.updatePar();
    this.maybeOnboard();
  }

  /** 💡 hint: pulse the next optimal command given the program planned so far. */
  private onHint() {
    const lvl = this.engine.level;
    const ctx = createSolveContext(lvl);
    let state = initialSolveState(lvl);
    for (const t of expandTiles(this.engine.program)) state = step(state, t.cmd, ctx);
    const suffix = solveFrom(ctx, state);
    this.ui.pulseCommand(suffix && suffix.length ? (suffix[0] ?? null) : null);
  }

  /** Show the current level's par (optimal step count). */
  private updatePar() {
    const sol = solve(this.engine.level);
    this.ui.setPar(sol ? sol.length : null);
  }

  /** First encounter of an intro level (forward/turn/fan) auto-plays a
   *  no-reading demo, once per mechanic. */
  private maybeOnboard() {
    const lvl = this.engine.level;
    if (!INTRO_LEVELS.includes(lvl.id) || isOnboarded(lvl.id)) return;
    window.setTimeout(() => this.ui.playOnboarding(solve(lvl) ?? []), 700);
  }

  private onOnboarded() {
    markOnboarded(this.engine.level.id);
  }

  private onReplayTutorial() {
    this.changeLevel(0);
    window.setTimeout(() => this.ui.playOnboarding(solve(this.engine.level) ?? []), 450);
  }

  // ── editor ──────────────────────────────────────────────
  private openEditor(seed?: Level) {
    if (!this.editor) {
      this.editor = new LevelEditor(document.body, {
        onPlay: (lvl) => this.playTransient(lvl),
        onSave: (lvl) => this.saveCustom(lvl),
        onClose: () => {},
      });
    }
    this.editor.open(seed);
  }

  private playTransient(level: Level) {
    this.engine = new GameEngine(level);
    this.engine.easyMode = this.settings.easy;
    this.engine.holdOnError = this.settings.holdOnError;
    this.wireAudio();
    this.ui.setLevelInfo(this.levelIndex, this.levels.length, this.levelName(level));
  }

  private saveCustom(level: Level) {
    const list = saveCustomLevel(level);
    this.levels = [...LEVELS, ...list];
    this.refreshLevelList();
    const idx = this.levels.findIndex((l) => l.id === level.id);
    if (idx >= 0) this.changeLevel(idx);
  }

  private deleteCustom(id: number) {
    const list = deleteCustomLevel(id);
    this.levels = [...LEVELS, ...list];
    this.refreshLevelList();
    const idx = this.levelIndex < this.levels.length ? this.levelIndex : this.levels.length - 1;
    this.changeLevel(idx);
  }

  private resize() {
    const canvas = this.ui.canvas;
    const stage = canvas.parentElement!;
    const rect = stage.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
  }

  private bindKeyboard() {
    const map: Record<string, Command> = {
      ArrowUp: 'forward',
      KeyW: 'forward',
      ArrowLeft: 'left',
      KeyA: 'left',
      ArrowRight: 'right',
      KeyD: 'right',
      KeyF: 'fan',
    };
    window.addEventListener('keydown', (ev) => {
      if (ev.code in map) {
        ev.preventDefault();
        this.engine.enqueue(map[ev.code]!);
      } else if (ev.code === 'Enter' || ev.code === 'Space') {
        ev.preventDefault();
        this.audio.resume();
        this.engine.run();
      } else if (ev.code === 'Backspace') {
        ev.preventDefault();
        this.engine.undo();
      }
    });
  }

  private bindFirstGesture() {
    const unlock = () => {
      this.audio.resume();
      void this.audio.loadOverrides(this.theme);
      if (this.settings.music) this.audio.startMusic();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
  }

  private loop(now: number) {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.engine.update(dt);
    this.renderer.draw(this.engine, now / 1000);
    this.ui.sync(this.engine);
    requestAnimationFrame((t) => this.loop(t));
  }
}

void new App();
