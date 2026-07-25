import type { GameEngine } from './engine';
import { EMOJI, key } from './types';

// ─── Tileset interface ──────────────────────────────────────────────

export interface DecorImg {
  img: HTMLImageElement;
  h: number; // display height as a fraction of a cell
}

export interface GroundTiles {
  grass: HTMLImageElement;
  dirt: HTMLImageElement;
}

export interface Tileset {
  /** Fill the entire board background (grass / sky / theme base). */
  drawBackground(ctx: CanvasRenderingContext2D, W: number, H: number): void;
  /** Draw a single cell — kind is 'path' | 'grass'. */
  drawCell(
    ctx: CanvasRenderingContext2D,
    kind: 'path' | 'grass',
    x: number,
    y: number,
    size: number,
    seed: number,
  ): void;
  /** Draw decorative element on a grass cell (bush / flower / tree). Sparse, cute. */
  drawDecor(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    seed: number,
  ): void;
  /** Optional real decor sprites; when present, drawDecor uses them. */
  decorImages?: DecorImg[];
  /** Optional real ground tiles; when present, the grid is filled with them. */
  ground?: GroundTiles;
}

// ─── Seeded pseudo-random (deterministic per cell) ─────────────────

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function cellSeed(c: number, r: number): number {
  // simple string-hash-like from coords — stable across frames
  let h = c * 374761393 + r * 668265263;
  h = (h ^ (h >>> 16)) * 0x45d9f3b;
  h = (h ^ (h >>> 16)) * 0x45d9f3b;
  h = h ^ (h >>> 16);
  return h >>> 0;
}

// ─── FarmTileset ────────────────────────────────────────────────────

class FarmTileset implements Tileset {
  decorImages?: DecorImg[];
  ground?: GroundTiles;
  drawBackground(ctx: CanvasRenderingContext2D, W: number, H: number) {
    // Base grass gradient — warm, inviting greens
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#a8e6a3');
    bg.addColorStop(0.5, '#88d48f');
    bg.addColorStop(1, '#6bc269');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Subtle grass-tuft texture via scattered soft dots
    ctx.save();
    ctx.globalAlpha = 0.18;
    const rng = mulberry32(42);
    for (let i = 0; i < 180; i++) {
      const tx = rng() * W;
      const ty = rng() * H;
      ctx.fillStyle = i % 3 === 0 ? '#55a84b' : '#72c468';
      ctx.beginPath();
      ctx.arc(tx, ty, 1.2 + rng() * 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawCell(
    ctx: CanvasRenderingContext2D,
    kind: 'path' | 'grass',
    x: number,
    y: number,
    size: number,
    seed: number,
  ) {
    if (kind === 'path') {
      this.drawPathCell(ctx, x, y, size, seed);
    }
    // Grass cells are just the background — decor is drawn separately.
  }

  drawDecor(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    seed: number,
  ) {
    const rng = mulberry32(seed);
    const roll = rng();

    if (this.decorImages && this.decorImages.length) {
      if (roll < 0.62) {
        const pick =
          this.decorImages[Math.floor(rng() * this.decorImages.length)];
        if (pick && pick.img.complete && pick.img.naturalWidth > 0) {
          const ih = size * pick.h;
          const iw = (ih * pick.img.naturalWidth) / pick.img.naturalHeight;
          const dx = x + (size - iw) / 2;
          const dy = y + size - ih; // bottom-anchored: stands on the cell
          const smooth = ctx.imageSmoothingEnabled;
          ctx.imageSmoothingEnabled = false; // crisp pixel art
          ctx.drawImage(pick.img, dx, dy, iw, ih);
          ctx.imageSmoothingEnabled = smooth;
        }
      }
      return;
    }

    // procedural fallback (no image decor loaded yet)
    const cx = x + size / 2;
    const cy = y + size / 2;
    if (roll < 0.28) {
      this.drawBush(ctx, cx, cy, size * 0.28, rng);
    } else if (roll < 0.52) {
      this.drawFlower(ctx, cx, cy, size * 0.12, rng);
    } else if (roll < 0.66) {
      this.drawTree(ctx, cx, cy + size * 0.08, size * 0.22, rng);
    }
  }

  private drawPathCell(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    seed: number,
  ) {
    const pad = Math.max(2, size * 0.06);
    const rad = Math.max(4, size * 0.17);
    const sx = x + pad;
    const sy = y + pad;
    const ss = size - pad * 2;

    // Warm dirt/stone tile body
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(sx + rad, sy);
    ctx.arcTo(sx + ss, sy, sx + ss, sy + ss, rad);
    ctx.arcTo(sx + ss, sy + ss, sx, sy + ss, rad);
    ctx.arcTo(sx, sy + ss, sx, sy, rad);
    ctx.arcTo(sx, sy, sx + ss, sy, rad);
    ctx.closePath();

    // Subtle colour variation per tile
    const rng = mulberry32(seed);
    const base = rng() > 0.5 ? 0xd4a85c : 0xc99a50;
    const r = ((base >> 16) & 255) + (rng() * 12 - 6);
    const g = ((base >> 8) & 255) + (rng() * 12 - 6);
    const b = (base & 255) + (rng() * 10 - 5);
    ctx.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`;
    ctx.fill();

    // Inner highlight (top-left edge lighter)
    ctx.clip();
    const hl = ctx.createLinearGradient(sx, sy, sx + ss, sy + ss);
    hl.addColorStop(0, 'rgba(255,245,220,0.30)');
    hl.addColorStop(0.45, 'rgba(255,245,220,0.08)');
    hl.addColorStop(1, 'rgba(120,80,40,0.12)');
    ctx.fillStyle = hl;
    ctx.fillRect(sx, sy, ss, ss);

    // Edge grass tufts / pebbles
    ctx.globalAlpha = 0.35;
    for (let i = 0; i < 5; i++) {
      const edge = Math.floor(rng() * 4); // 0=top 1=right 2=bottom 3=left
      let ex: number, ey: number;
      const margin = size * 0.08 + rng() * size * 0.14;
      if (edge === 0) { ex = sx + margin + rng() * (ss - margin * 2); ey = sy + margin * 0.4; }
      else if (edge === 1) { ex = sx + ss - margin * 0.4; ey = sy + margin + rng() * (ss - margin * 2); }
      else if (edge === 2) { ex = sx + margin + rng() * (ss - margin * 2); ey = sy + ss - margin * 0.4; }
      else { ex = sx + margin * 0.4; ey = sy + margin + rng() * (ss - margin * 2); }

      if (rng() > 0.45) {
        // tiny grass tuft
        ctx.fillStyle = '#6ab062';
        ctx.beginPath();
        ctx.arc(ex, ey, 1.5 + rng() * 2.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // pebble
        ctx.fillStyle = '#9a8876';
        ctx.beginPath();
        ctx.ellipse(ex, ey, 2 + rng() * 2.5, 1.2 + rng() * 1.4, rng() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  private drawBush(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    r: number,
    rng: () => number,
  ) {
    ctx.save();
    ctx.globalAlpha = 0.65;
    const ox = (rng() - 0.5) * r * 0.5;
    const oy = (rng() - 0.5) * r * 0.25;
    // Back layer (darker)
    ctx.fillStyle = '#3a8e38';
    ctx.beginPath();
    ctx.arc(cx + ox * 0.8, cy + oy * 0.6, r * 0.85, 0, Math.PI * 2);
    ctx.fill();
    // Front layer (lighter)
    ctx.fillStyle = '#54b34e';
    ctx.beginPath();
    ctx.arc(cx - ox, cy - oy * 0.4, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawFlower(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    r: number,
    rng: () => number,
  ) {
    ctx.save();
    ctx.globalAlpha = 0.75;
    const petals = 4 + Math.floor(rng() * 3); // 4–6
    const hues = ['#ff7eb3', '#ffd166', '#ff9f43', '#a29bfe', '#fd79a8', '#ffeaa7'];
    const hue = hues[Math.floor(rng() * hues.length)];
    for (let i = 0; i < petals; i++) {
      const ang = (i / petals) * Math.PI * 2 + rng() * 0.3;
      const px = cx + Math.cos(ang) * r * 1.1;
      const py = cy + Math.sin(ang) * r * 1.1;
      ctx.fillStyle = hue;
      ctx.beginPath();
      ctx.arc(px, py, r * 0.75, 0, Math.PI * 2);
      ctx.fill();
    }
    // Center
    ctx.fillStyle = '#ffe066';
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawTree(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    r: number,
    rng: () => number,
  ) {
    ctx.save();
    ctx.globalAlpha = 0.6;
    // Trunk
    ctx.fillStyle = '#8b6914';
    ctx.fillRect(cx - r * 0.14, cy - r * 0.1, r * 0.28, r * 0.65);
    // Canopy (two overlapping circles)
    ctx.fillStyle = '#2d9a3a';
    ctx.beginPath();
    ctx.arc(cx - r * 0.2, cy - r * 0.25, r * 0.72, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3aad48';
    ctx.beginPath();
    ctx.arc(cx + r * 0.18, cy - r * 0.38, r * 0.62, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ─── Particle types ─────────────────────────────────────────────────

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

interface Sparkle {
  x: number;
  y: number;
  life: number; // 1 → 0
  particles: { dx: number; dy: number; size: number; color: string; ang: number; speed: number }[];
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

const DECOR_BASE = import.meta.env.BASE_URL;
// Real CC0 decor sprites (ansimuz "Trees & Bushes"). h = display height / cell.
const DECOR_SPEC: { file: string; h: number }[] = [
  { file: 'tree.png', h: 1.0 },
  { file: 'tree2.png', h: 1.05 },
  { file: 'pine.png', h: 0.78 },
  { file: 'bush.png', h: 0.62 },
  { file: 'flowers.png', h: 0.34 },
  { file: 'flowers2.png', h: 0.3 },
  { file: 'grass.png', h: 0.3 },
];

// ─── Renderer ───────────────────────────────────────────────────────

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private confetti: Particle[] = [];
  private prevPhase: string | null = null;
  private prevTime = 0;
  private prevCollected: boolean[] = []; // tracks last-frame collected state
  private sparkles: Map<number, Sparkle> = new Map(); // goal-index → active sparkle

  tileset: Tileset;

  constructor(private canvas: HTMLCanvasElement, tileset?: Tileset) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas context unavailable');
    this.ctx = ctx;
    this.tileset = tileset ?? new FarmTileset();
  }

  /** Best-effort load of real decor sprites; swaps them into the tileset when ready. */
  loadDecor() {
    const loaded: DecorImg[] = [];
    let settled = 0;
    for (const spec of DECOR_SPEC) {
      const img = new Image();
      img.src = `${DECOR_BASE}assets/img/${spec.file}`;
      img.onload = () => {
        loaded.push({ img, h: spec.h });
        if (++settled === DECOR_SPEC.length) this.tileset.decorImages = loaded;
      };
      img.onerror = () => {
        if (++settled === DECOR_SPEC.length && loaded.length) {
          this.tileset.decorImages = loaded;
        }
      };
    }
  }

  /** Best-effort load of real ground tiles (grass + dirt); swaps into the tileset. */
  loadGround() {
    const grass = new Image();
    const dirt = new Image();
    let done = 0;
    const finish = () => {
      if (++done === 2 && grass.naturalWidth && dirt.naturalWidth) {
        this.tileset.ground = { grass, dirt };
      }
    };
    grass.onload = finish;
    dirt.onload = finish;
    grass.src = `${DECOR_BASE}assets/img/tile_grass.png`;
    dirt.src = `${DECOR_BASE}assets/img/tile_dirt.png`;
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

    // Build path-set for fast lookup
    const pathSet = new Set(L.path.map(key));

    const g = this.tileset.ground;
    const haveGround =
      !!g &&
      g.grass.complete &&
      g.dirt.complete &&
      g.grass.naturalWidth > 0 &&
      g.dirt.naturalWidth > 0;

    // 1+2. Ground: tile the whole canvas with grass, lay dirt on path cells.
    //       Falls back to procedural background/cells when tiles aren't loaded.
    if (haveGround && g) {
      const smooth = ctx.imageSmoothingEnabled;
      ctx.imageSmoothingEnabled = false; // crisp pixel tiles
      for (let y = 0; y < H; y += cell) {
        for (let x = 0; x < W; x += cell) {
          ctx.drawImage(g.grass, x, y, cell + 1, cell + 1); // +1 kills nearest-neighbour seams
        }
      }
      for (let r = 0; r < L.rows; r++) {
        for (let c = 0; c < L.cols; c++) {
          if (pathSet.has(`${c},${r}`)) {
            ctx.drawImage(g.dirt, ox + c * cell, oy + r * cell, cell + 1, cell + 1);
          }
        }
      }
      ctx.imageSmoothingEnabled = smooth;
    } else {
      this.tileset.drawBackground(ctx, W, H);
    }

    // Per-cell: procedural cells (only when no ground tiles) + decor on grass.
    for (let r = 0; r < L.rows; r++) {
      for (let c = 0; c < L.cols; c++) {
        const px = ox + c * cell;
        const py = oy + r * cell;
        const sd = cellSeed(c, r);
        const isPath = pathSet.has(`${c},${r}`);
        if (!haveGround) {
          this.tileset.drawCell(ctx, isPath ? 'path' : 'grass', px, py, cell, sd);
        }
        if (!isPath) {
          this.tileset.drawDecor(ctx, px, py, cell, sd);
        }
      }
    }

    // 3. Goals (cookies) — multiple, with collection sparkle
    this.drawGoals(ctx, e, cx, cy, cell, now, dt);

    // 4. Animals
    this.drawAnimals(ctx, e, cx, cy, cell, now);

    // 5. Robot (peacock)
    this.drawRobot(ctx, e, cx, cy, cell, now);

    // 6. Confetti on win
    if (e.phase === 'won') {
      if (this.prevPhase !== 'won') this.spawnConfetti(W, H);
      this.stepConfetti(dt);
      this.drawConfetti(ctx);
    }
    this.prevPhase = e.phase;
  }

  // ─── Goals / Cookies ──────────────────────────────────────────

  private drawGoals(
    ctx: CanvasRenderingContext2D,
    e: GameEngine,
    cx: (c: number) => number,
    cy: (r: number) => number,
    cell: number,
    now: number,
    dt: number,
  ) {
    const goals = e.level.goals;
    const collected = e.collected;

    // Detect newly-collected goals (transition false→true)
    for (let i = 0; i < goals.length; i++) {
      const was = this.prevCollected[i] ?? false;
      if (!was && collected[i]) {
        // Just collected — spawn sparkle
        this.sparkles.set(i, {
          x: cx(goals[i].c),
          y: cy(goals[i].r),
          life: 1,
          particles: this.makeSparkleParticles(),
        });
      }
    }

    // Update & draw sparkles
    for (const [si, sp] of this.sparkles) {
      sp.life -= dt * 1.8;
      if (sp.life <= 0) {
        this.sparkles.delete(si);
        continue;
      }
      this.drawSparkle(ctx, sp, cell, now);
    }

    // Draw uncollected cookies with staggered pulse
    for (let i = 0; i < goals.length; i++) {
      if (collected[i]) continue; // already collected — skip
      const g = goals[i];
      const phase = now * 3 + i * 0.9; // stagger by index
      const pulse = 1 + Math.sin(phase) * 0.07;
      const x = cx(g.c);
      const y = cy(g.r);
      ctx.save();
      // glow
      const gr = ctx.createRadialGradient(x, y, 1, x, y, cell * 0.58);
      gr.addColorStop(0, 'rgba(255,211,78,0.35)');
      gr.addColorStop(1, 'rgba(255,211,78,0)');
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.arc(x, y, cell * 0.58, 0, Math.PI * 2);
      ctx.fill();
      this.emoji(ctx, '🍪', x, y, cell * 0.56 * pulse);
      ctx.restore();
    }

    // Snapshot collected for next-frame comparison
    this.prevCollected = [...collected];
  }

  private makeSparkleParticles(): Sparkle['particles'] {
    const parts: Sparkle['particles'] = [];
    const colors = ['#ffd34e', '#fff5aa', '#ff9f43', '#ffffff'];
    for (let i = 0; i < 10; i++) {
      const ang = (i / 10) * Math.PI * 2 + Math.random() * 0.5;
      parts.push({
        dx: Math.cos(ang),
        dy: Math.sin(ang),
        size: 3 + Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        ang,
        speed: 20 + Math.random() * 50,
      });
    }
    return parts;
  }

  private drawSparkle(
    ctx: CanvasRenderingContext2D,
    sp: Sparkle,
    cell: number,
    now: number,
  ) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, sp.life);
    const prog = 1 - sp.life; // 0→1 over lifetime
    for (const p of sp.particles) {
      const dist = prog * p.speed * 0.8;
      const sx = sp.x + p.dx * dist;
      const sy = sp.y + p.dy * dist;
      const s = p.size * (1 - prog * 0.6);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      // star-ish shape
      const points = 4;
      for (let j = 0; j < points * 2; j++) {
        const rr = j % 2 === 0 ? s : s * 0.35;
        const a = (j / (points * 2)) * Math.PI * 2 + now * 3;
        const px = sx + Math.cos(a) * rr;
        const py = sy + Math.sin(a) * rr;
        j === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    }
    // central pop flash
    if (sp.life > 0.6) {
      ctx.globalAlpha = (sp.life - 0.6) / 0.4;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, cell * 0.18 * (sp.life - 0.6) / 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // ─── Animals ──────────────────────────────────────────────────

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
        scale = 1 - a.fleeT * 0.7;
        alpha = 1 - a.fleeT;
        y -= a.fleeT * cell * 0.4;
        x += Math.sin(a.fleeT * 12) * cell * 0.08;
      } else {
        y += Math.sin(now * 2 + a.id) * cell * 0.03;
      }
      ctx.save();
      ctx.globalAlpha = Math.max(0, alpha);
      this.emoji(ctx, EMOJI[a.kind], x, y, cell * 0.62 * scale);
      ctx.restore();
    }
  }

  // ─── Robot (Peacock) ──────────────────────────────────────────

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
      const p = 1 - e.fanT;
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
        ctx.fillStyle = 'rgba(20,40,90,0.9)';
        ctx.beginPath();
        ctx.arc(dx, dy, cell * 0.04, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      const amp = cell * 0.035 * e.fanT;
      x += Math.sin(now * 50) * amp;
      y += Math.cos(now * 47) * amp;
    }

    // bump nudge — driven by bumpShake (works in both normal + easy mode)
    if (e.bumpShake > 0) {
      const k = Math.sin(now * 55) * cell * 0.055 * e.bumpShake;
      const dv = dirVecNum(e.bumpDir);
      x += dv.x * k;
      y += dv.y * k;
    }

    const scale = 1 + e.fanT * 0.14;
    ctx.save();
    this.emoji(ctx, '🦚', x, y, cell * 0.66 * scale);

    // facing chevron
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

  // ─── Helpers ─────────────────────────────────────────────────

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

// ─── Pure helper (no engine dependency) ───────────────────────────

function dirVecNum(dir: number) {
  const rad = (dir * Math.PI) / 180;
  return { x: Math.sin(rad), y: -Math.cos(rad) };
}
