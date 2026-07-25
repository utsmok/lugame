import './style.css';

import { AudioBus, type SfxName } from './game/audio';
import { GameEngine } from './game/engine';
import { LEVELS } from './game/levels';
import { Renderer } from './game/render';
import { PaletteUI } from './ui/palette';
import type { Command, GameEvent } from './game/types';

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

class App {
  private audio = new AudioBus();
  private engine = new GameEngine(LEVELS[0]);
  private renderer: Renderer;
  private ui: PaletteUI;
  private levelIndex = 0;
  private easy = false;
  private last = performance.now();

  constructor() {
    const mount = document.getElementById('app')!;
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
      onToggleEasy: (b) => { this.easy = b; this.engine.easyMode = b; },
      onToggleMute: (b) => this.audio.setMuted(b),
      onRemoveChip: (i) => this.engine.removeAt(i),
      onSelectLevel: (i) => this.changeLevel(i),
    });
    this.renderer = new Renderer(this.ui.canvas);

    this.engine.onEvent = (e) => this.audio.play(EVENT_SFX[e]);

    this.ui.setLevelInfo(0, LEVELS.length, this.engine.level.name);

    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.bindKeyboard();
    this.bindFirstGesture();

    requestAnimationFrame((t) => this.loop(t));
  }

  private changeLevel(index: number) {
    if (index < 0 || index >= LEVELS.length) return;
    this.levelIndex = index;
    this.engine = new GameEngine(LEVELS[index]);
    this.engine.onEvent = (e) => this.audio.play(EVENT_SFX[e]);
    this.engine.easyMode = this.easy;
    this.ui.setLevelInfo(index, LEVELS.length, this.engine.level.name);
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
      this.audio.startMusic();
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
