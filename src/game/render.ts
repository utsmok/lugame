import type { GameEngine } from './engine';
import { EMOJI } from './types';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rot: number;
  vr: number;
  color: string;
  life: number;
}

const CONFETTI = [
  '#ffd34e',
  '#4ea8ff',
  '#36c96a',
  '#ff5d6c',
  '#b06bff',
  '#1bbf9e',
] as const;

const FAN_DOTS = 14;
const FAN_COLORS = ['#1bbf9e', '#2e6bff', '#ffd34e', '#1bbf9e', '#b06bff'];

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private confetti: Particle[] = [];
  private prevPhase: string | null = null;
  private prevTime = 0;

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas context unavailable');
    this.ctx = ctx;
  }

  draw(e: GameEngine, now: number) {
    const dt = Math.min(0.05, this.prevTime ? now - this.prevTime : 0.016);
    this.prevTime = now;

    const { ctx, canvas } = this;
    const W = canvas.width;
    const H = canvas.height;
    const L = e.level;
    ctx.clearRect(0, 0, W, H);

    const cell = Math.floor(Math.min(W / L.cols, H / L.rows));
    const ox = Math.floor((W - cell * L.cols) / 2);
    const oy = Math.floor((H - cell * L.rows) / 2);
    const cx = (c: number) => ox + c * cell + cell / 2;
    const cy = (r: number) => oy + r * cell + cell / 2;

    this.drawGrid(ctx, L.cols, L.rows, cell, ox, oy);
    this.drawPath(ctx, e, cell, ox, oy);
    this.drawGoal(ctx, e, cx, cy, cell, now);
    this.drawAnimals(ctx, e, cx, cy, cell, now);
    this.drawRobot(ctx, e, cx, cy, cell, now);

    if (e.phase === 'won') {
      if (this.prevPhase !== 'won') this.spawnConfetti(W, H);
      this.stepConfetti(dt);
      this.drawConfetti(ctx);
    }
    this.prevPhase = e.phase;
  }

  private drawGrid(
    ctx: CanvasRenderingContext2D,
    cols: number,
    rows: number,
    cell: number,
    ox: number,
    oy: number,
  ) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let c = 0; c <= cols; c++) {
      ctx.beginPath();
      ctx.moveTo(ox + c * cell + 0.5, oy);
      ctx.lineTo(ox + c * cell + 0.5, oy + rows * cell);
      ctx.stroke();
    }
    for (let r = 0; r <= rows; r++) {
      ctx.beginPath();
      ctx.moveTo(ox, oy + r * cell + 0.5);
      ctx.lineTo(ox + cols * cell, oy + r * cell + 0.5);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawPath(
    ctx: CanvasRenderingContext2D,
    e: GameEngine,
    cell: number,
    ox: number,
    oy: number,
  ) {
    const pad = Math.max(2, cell * 0.06);
    const rad = Math.max(4, cell * 0.16);
    ctx.save();
    for (const p of e.level.path) {
      const x = ox + p.c * cell + pad;
      const y = oy + p.r * cell + pad;
      const s = cell - pad * 2;
      ctx.fillStyle = '#1a2a55';
      this.roundRect(ctx, x, y, s, s, rad);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      this.roundRect(ctx, x, y, s, s, rad);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawGoal(
    ctx: CanvasRenderingContext2D,
    e: GameEngine,
    cx: (c: number) => number,
    cy: (r: number) => number,
    cell: number,
    now: number,
  ) {
    const pulse = 1 + Math.sin(now * 3) * 0.06;
    const x = cx(e.level.goal.c);
    const y = cy(e.level.goal.r);
    ctx.save();
    // glow
    const g = ctx.createRadialGradient(x, y, 1, x, y, cell * 0.6);
    g.addColorStop(0, 'rgba(255,211,78,0.35)');
    g.addColorStop(1, 'rgba(255,211,78,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, cell * 0.6, 0, Math.PI * 2);
    ctx.fill();
    this.emoji(ctx, '🍪', x, y, cell * 0.6 * pulse);
    ctx.restore();
  }

  private drawAnimals(
    ctx: CanvasRenderingContext2D,
    e: GameEngine,
    cx: (c: number) => number,
    cy: (r: number) => number,
    cell: number,
    now: number,
  ) {
    for (const a of e.animals) {
      if (a.scared && a.fleeT >= 1) continue;
      let x = cx(a.spawn.c);
      let y = cy(a.spawn.r);
      let scale = 1;
      let alpha = 1;
      if (a.scared) {
        // flee: shrink, drift up, fade
        scale = 1 - a.fleeT * 0.7;
        alpha = 1 - a.fleeT;
        y -= a.fleeT * cell * 0.4;
        x += Math.sin(a.fleeT * 12) * cell * 0.08;
      } else {
        y += Math.sin(now * 2 + a.id) * cell * 0.03; // idle bob
      }
      ctx.save();
      ctx.globalAlpha = Math.max(0, alpha);
      this.emoji(ctx, EMOJI[a.kind], x, y, cell * 0.62 * scale);
      ctx.restore();
    }
  }

  private drawRobot(
    ctx: CanvasRenderingContext2D,
    e: GameEngine,
    cx: (c: number) => number,
    cy: (r: number) => number,
    cell: number,
    now: number,
  ) {
    const r = e.robot;
    let x = cx(r.dc);
    let y = cy(r.dr);

    // fan: expanding ring of feather-eyes + wild shake + grow
    if (e.fanT > 0) {
      const p = 1 - e.fanT; // 0..1 as it expands
      const radius = cell * (0.5 + p * 1.05);
      ctx.save();
      ctx.globalAlpha = e.fanT * 0.95;
      for (let i = 0; i < FAN_DOTS; i++) {
        const ang = (i / FAN_DOTS) * Math.PI * 2 + now * 0.6;
        const dx = x + Math.cos(ang) * radius;
        const dy = y + Math.sin(ang) * radius;
        ctx.fillStyle = FAN_COLORS[i % FAN_COLORS.length];
        ctx.beginPath();
        ctx.arc(dx, dy, cell * 0.1 * (0.6 + e.fanT * 0.6), 0, Math.PI * 2);
        ctx.fill();
        // inner "eye" dot
        ctx.fillStyle = 'rgba(20,40,90,0.9)';
        ctx.beginPath();
        ctx.arc(dx, dy, cell * 0.04, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      // wild shake (feather trill)
      const amp = cell * 0.035 * e.fanT;
      x += Math.sin(now * 50) * amp;
      y += Math.cos(now * 47) * amp;
    }

    // bump nudge
    if (e.phase === 'bumped') {
      const k = Math.sin(e.bumpT * 55) * cell * 0.06 * (1 - e.bumpT / 0.55);
      const dv = this.dirVecNum(e.bumpDir);
      x += dv.x * k;
      y += dv.y * k;
    }

    const scale = 1 + e.fanT * 0.14;
    ctx.save();
    this.emoji(ctx, '🦚', x, y, cell * 0.66 * scale);

    // facing chevron (shows where the peacock will go next)
    const dirRad = (r.ddir * Math.PI) / 180;
    const cd = cell * 0.42;
    const ax = x + Math.sin(dirRad) * cd;
    const ay = y - Math.cos(dirRad) * cd;
    ctx.translate(ax, ay);
    ctx.rotate(dirRad);
    ctx.fillStyle = '#ffd34e';
    ctx.beginPath();
    const s = cell * 0.1;
    ctx.moveTo(0, -s);
    ctx.lineTo(s * 0.85, s * 0.7);
    ctx.lineTo(-s * 0.85, s * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private dirVecNum(dir: number) {
    // 0=N,90=E,180=S,270=W  (y grows downward)
    const rad = (dir * Math.PI) / 180;
    return { x: Math.sin(rad), y: -Math.cos(rad) };
  }

  private emoji(
    ctx: CanvasRenderingContext2D,
    ch: string,
    x: number,
    y: number,
    size: number,
  ) {
    ctx.font = `${size}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",system-ui,serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ch, x, y);
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
  ) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  private spawnConfetti(W: number, H: number) {
    this.confetti = [];
    for (let i = 0; i < 70; i++) {
      this.confetti.push({
        x: Math.random() * W,
        y: -Math.random() * H * 0.4,
        vx: (Math.random() - 0.5) * 80,
        vy: 80 + Math.random() * 160,
        size: 6 + Math.random() * 8,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 10,
        color: CONFETTI[i % CONFETTI.length],
        life: 1,
      });
    }
  }

  private stepConfetti(dt: number) {
    for (const p of this.confetti) {
      p.vy += 240 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
    }
  }

  private drawConfetti(ctx: CanvasRenderingContext2D) {
    ctx.save();
    for (const p of this.confetti) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    }
    ctx.restore();
  }
}
