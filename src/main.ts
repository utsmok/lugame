import './style.css';

import { AudioBus, type SfxName } from './game/audio';
import { GameEngine } from './game/engine';
import { LEVELS } from './game/levels';
import { Renderer } from './game/render';
import { PaletteUI, type SettingsState } from './ui/palette';
import { LevelEditor } from './ui/editor';
import {
  deleteCustomLevel,
  loadCustomLevels,
  saveCustomLevel,
} from './storage';
import { T } from './i18n';
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
};

const SETTINGS_KEY = 'lugame.settings';

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
        };
      }
    }
  } catch {
    /* ignore corrupt settings */
  }
  return { easy: false, holdOnError: false, music: true, sound: true };
}

class App {
  private audio = new AudioBus();
  private levels: Level[] = [...LEVELS, ...loadCustomLevels()];
  private levelIndex = 0;
  private engine = new GameEngine(LEVELS[0]);
  private renderer!: Renderer;
  private ui!: PaletteUI;
  private editor?: LevelEditor;
  private settings: SettingsState = loadSettings();
  private last = performance.now();

  constructor() {
    document.title = T.docTitle;
    const mount = document.getElementById('app')!;
    this.engine = new GameEngine(this.levels[0]);
    this.ui = new PaletteUI(mount, {
      onAdd: (c) => this.engine.enqueue(c),
      onRun: () => {
        this.audio.resume();
        this.engine.run();
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
    });
    this.renderer = new Renderer(this.ui.canvas);
    this.renderer.loadDecor();
    this.renderer.loadGround();

    this.applySettings();

    this.refreshLevelList();
    this.ui.setLevelInfo(this.levelIndex, this.levels.length, this.engine.level.name);
    this.ui.setSettings(this.settings);

    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.bindKeyboard();
    this.bindFirstGesture();

    requestAnimationFrame((t) => this.loop(t));
  }

  /** Bind the engine's event bus to audio, gated by the sound setting. */
  private wireAudio() {
    this.engine.onEvent = (e) => {
      if (this.settings.sound) this.audio.play(EVENT_SFX[e]);
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

  private setSetting<K extends keyof SettingsState>(
    key: K,
    value: SettingsState[K],
  ) {
    this.settings[key] = value;
    if (key === 'easy') this.engine.easyMode = value;
    else if (key === 'holdOnError') this.engine.holdOnError = value;
    else if (key === 'music') this.audio.setMusicEnabled(value);
    else if (key === 'sound') this.audio.setMuted(!value);
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    } catch {
      /* storage may be unavailable */
    }
    this.ui.setSettings(this.settings);
  }

  private refreshLevelList() {
    this.ui.setLevelList(
      this.levels.map((l) => l.name),
      LEVELS.length,
      this.levels.map((l) => l.id),
    );
  }

  private changeLevel(index: number) {
    if (index < 0 || index >= this.levels.length) return;
    this.levelIndex = index;
    this.engine = new GameEngine(this.levels[index]);
    this.engine.easyMode = this.settings.easy;
    this.engine.holdOnError = this.settings.holdOnError;
    this.wireAudio();
    this.ui.setLevelInfo(index, this.levels.length, this.engine.level.name);
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
    this.ui.setLevelInfo(this.levelIndex, this.levels.length, level.name);
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
        this.engine.enqueue(map[ev.code]);
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
      void this.audio.loadOverrides();
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
