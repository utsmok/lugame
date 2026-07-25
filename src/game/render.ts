import type { GameEngine } from './engine';
import { type ThemeConfig, assetUrl, makeEmojiResolver } from './theme';
import { ConfigTileset, cellSeed, type DecorImg, type Tileset } from './tileset';
import { CONFETTI, FAN_DOTS, FAN_COLORS, type Particle, type Sparkle } from './particles';

// P0-1: prefers-reduced-motion. Read once at module load + a change listener so
// toggling the OS/browser setting applies live without a reload.
const REDUCED_MQ: MediaQueryList | null =
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null;
let REDUCED = REDUCED_MQ?.matches ?? false;
REDUCED_MQ?.addEventListener('change', (ev) => {
  REDUCED = ev.matches;
});

// Peacock directional sprite maps (GLOBAL player visual — not themed).
// facing index (from round(dir/90)): 0=Up, 1=Right, 2=Down, 3=Left.
// peacock-walk.png: 4 cols (R,D,U,L) × 3 walk-cycle rows, 32×32 — fanned tail.
const WALK_COL = [2, 0, 1, 3]; // facing → column on the fanned walk sheet
const WALK_FRAMES = 3;

// ─── Renderer ───────────────────────────────────────────────────────

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private confetti: Particle[] = [];
  private confettiColors: readonly string[] = CONFETTI;
  private prevPhase: string | null = null;
  private prevTime = 0;
  private prevCollected: boolean[] = []; // tracks last-frame collected state
  private sparkles: Map<number, Sparkle> = new Map(); // goal-index → active sparkle
  private peacockWalk: HTMLImageElement | null = null;

  private goalEmoji: string;
  private fanColors: readonly string[];
  private emojiFor: (kind: string) => string;
  private theme: ThemeConfig;

  tileset: Tileset;

  constructor(private canvas: HTMLCanvasElement, theme: ThemeConfig) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas context unavailable');
    this.ctx = ctx;
    this.theme = theme;
    this.tileset = new ConfigTileset(theme);
    this.goalEmoji = theme.goalEmoji;
    this.fanColors = theme.fanColors ?? FAN_COLORS;
    this.confettiColors = theme.confetti ?? CONFETTI;
    this.emojiFor = makeEmojiResolver(theme);
  }

  /** Best-effort load of the (global) peacock directional walk sprite.
   *  (peacock-folded.png is reserved for a future low-energy state; unused now.) */
  loadPlayer() {
    const walk = new Image();
    walk.src = assetUrl('assets/img/peacock-walk.png');
    walk.onload = () => { this.peacockWalk = walk; };
  }

  /** Best-effort load of real decor sprites; swaps them into the tileset when ready. */
  loadDecor() {
    const specs = this.theme.decor;
    const loaded: DecorImg[] = [];
    let settled = 0;
    for (const spec of specs) {
      const img = new Image();
      img.src = assetUrl(spec.file);
      img.onload = () => {
        loaded.push({ img, h: spec.h });
        if (++settled === specs.length) this.tileset.decorImages = loaded;
      };
      img.onerror = () => {
        if (++settled === specs.length && loaded.length) {
          this.tileset.decorImages = loaded;
        }
      };
    }
  }

  /** Best-effort load of real ground tiles (grass + dirt); swaps into the tileset. */
  loadGround() {
    const g = this.theme.ground;
    if (!g) return; // no themed ground → procedural cell colours stay in place
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
    grass.src = assetUrl(g.grass);
    dirt.src = assetUrl(g.dirt);
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
    const pathSet = e.pathSet; // F7: reuse engine's set — was new Set(L.path.map(key)) every frame

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
    // 2b. Tile borders — bevel gradient strokes so each cell reads as a distinct raised tile.
    this.drawGrid(ctx, e, ox, oy, cell);


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

    // 5b. Energy pips — float above/below the peacock
    if (e.energyEnabled) {
      const radius = Math.max(6, cell * 0.12);
      const spacing = radius * 2.4;
      const totalW = (e.maxEnergy - 1) * spacing + radius * 2;
      const rx = cx(e.robot.dc);
      const ry = cy(e.robot.dr);
      const aboveY = ry - cell * 0.46;
      const belowY = ry + cell * 0.46;
      const py = aboveY - radius * 1.4 < 0 ? belowY : aboveY;
      const px = rx - totalW / 2;
      ctx.save();
      // backdrop pill
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      this.roundRect(ctx, px - totalW * 0.15, py - radius * 1.3, totalW * 1.3, radius * 2.6, radius * 0.8);
      ctx.fill();
      // pips
      for (let i = 0; i < e.maxEnergy; i++) {
        const cx2 = px + i * spacing + radius;
        if (i < e.energy) {
          ctx.fillStyle = '#36c96a';
          ctx.beginPath();
          ctx.arc(cx2, py, radius, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.strokeStyle = 'rgba(255,255,255,0.35)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(cx2, py, radius, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      ctx.restore();
    }


    // 5c. Error highlight
    if (e.phase === 'error') {
      const pos = e.robot.pos;
      const ex = ox + pos.c * cell;
      const ey = oy + pos.r * cell;
      const alpha = 0.45 + 0.35 * Math.sin(now * 6);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = '#ff5d6c';
      ctx.lineWidth = Math.max(2, cell * 0.04);
      this.roundRect(ctx, ex + 2, ey + 2, cell - 4, cell - 4, cell * 0.1);
      ctx.stroke();
      ctx.restore();
    }

    // 6. Confetti on win
    if (e.phase === 'won' && this.prevPhase !== 'won') this.spawnConfetti(W, H);
    this.prevPhase = e.phase;
    if (this.confetti.length) {
      this.stepConfetti(dt, H);
      this.drawConfetti(ctx);
    }
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
      if (!was && collected[i] && !REDUCED) { // P0-1: skip collection sparkle under reduced-motion
        // Just collected — spawn sparkle
        this.sparkles.set(i, {
        x: cx(goals[i]!.c),
        y: cy(goals[i]!.r),
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
      const g = goals[i]!;
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
      this.emoji(ctx, this.goalEmoji, x, y, cell * 0.56 * pulse);
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
        color: colors[Math.floor(Math.random() * colors.length)]!,
        ang,
        speed: 20 + Math.random() * 50,
      });
    }
    return parts;
  }
  private makeTrailSparkleParticles(): Sparkle['particles'] {
    const parts: Sparkle['particles'] = [];
    const colors = ['#ffd34e', '#fff5aa', '#4ea8ff', '#ffffff'];
    for (let i = 0; i < 5; i++) {
      const ang = Math.random() * Math.PI * 2;
      parts.push({
        dx: Math.cos(ang) * 0.6,
        dy: -Math.abs(Math.sin(ang)) * 0.8 - 0.3, // bias upward
        size: 1.5 + Math.random() * 3,
        color: colors[Math.floor(Math.random() * colors.length)]!,
        ang,
        speed: 10 + Math.random() * 20,
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
      this.emoji(ctx, this.emojiFor(a.kind), x, y, cell * 0.62 * scale);
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
    let scaleX = 1;
    let scaleY = 1;
    let rot = 0;

    // ── Fan feather-eye ring (drawn in world space before transform) ──
    if (e.fanT > 0) {
      const p = 1 - e.fanT;
      const radius = cell * (0.5 + p * 1.05);
      ctx.save();
      ctx.globalAlpha = e.fanT * 0.95;
      for (let i = 0; i < FAN_DOTS; i++) {
        const ang = (i / FAN_DOTS) * Math.PI * 2 + now * 0.6;
        const dx = x + Math.cos(ang) * radius;
        const dy = y + Math.sin(ang) * radius;
        ctx.fillStyle = this.fanColors[i % this.fanColors.length]!;
        ctx.beginPath();
        ctx.arc(dx, dy, cell * 0.1 * (0.6 + e.fanT * 0.6), 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(20,40,90,0.9)';
        ctx.beginPath();
        ctx.arc(dx, dy, cell * 0.04, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // ── Bump nudge (world-space offset) ──
    if (e.bumpShake > 0 && !REDUCED) { // P0-1: zero bump shake under reduced-motion
      const k = Math.sin(now * 55) * cell * 0.055 * e.bumpShake;
      const dv = dirVecNum(e.bumpDir);
      x += dv.x * k;
      y += dv.y * k;
    }

    // ── Phase-driven animations (applied via canvas transform) ──
    const phase = e.phase;
    const fanning = e.fanT > 0;

    if (!fanning && (phase === 'editing' || phase === 'won')) {
      // Idle breathe / bob
      y += Math.sin(now * 2.2) * cell * 0.02;
      const breathe = 1 + Math.sin(now * 1.6) * 0.015;
      scaleX *= breathe;
      scaleY *= breathe;
    }

    if (phase === 'running') {
      // Walk bounce — buoyant hop
      const hopMul = REDUCED ? 0 : 1; // P0-1: zero peacock hop amplitude under reduced-motion
      const hop = Math.abs(Math.sin(now * 7.5)) * hopMul;
      y -= hop * cell * 0.05;
      // Squash/stretch
      scaleY *= 1 - hop * 0.06;
      scaleX *= 1 + hop * 0.04;
      // Rotational wobble
      rot += Math.sin(now * 9) * 0.05 * hopMul;

      // Trailing sparkles — low prob each frame, spawn into sparkle map
      if (!REDUCED && Math.random() < 0.04) { // P0-1: skip trailing sparkle spawn
        const dirRad = (r.ddir * Math.PI) / 180;
        // Behind the peacock (opposite facing)
        const sx = x - Math.sin(dirRad) * cell * 0.3;
        const sy = y + Math.cos(dirRad) * cell * 0.3;
        // Use a negative-keyed entry so it never collides with goal sparkles
        const trailKey = -(this.sparkles.size + 1);
        this.sparkles.set(trailKey, {
          x: sx,
          y: sy,
          life: 0.6,
          particles: this.makeTrailSparkleParticles(),
        });
      }
    }

    if (fanning) {
      // Fan grow pulse + spin wobble
      const fanScale = 1 + e.fanT * 0.18;
      scaleX *= fanScale;
      scaleY *= fanScale;
      rot += (REDUCED ? 0 : 1) * Math.sin(now * 30) * 0.12 * e.fanT; // P0-1: zero fan spin-wobble
      // Fan shake (world-space high-freq jitter) — zeroed under reduced-motion
      if (!REDUCED) {
        const amp = cell * 0.035 * e.fanT;
        x += Math.sin(now * 50) * amp;
        y += Math.cos(now * 47) * amp;
      }
    }

    if (phase === 'won') {
      // Win celebration — happy bouncing + sway
      y -= Math.abs(Math.sin(now * 6)) * cell * 0.09;
      rot += Math.sin(now * 4) * 0.12;
    }

    // ── Draw peacock + chevron via single transform ──
    ctx.save();
    ctx.translate(x, y);
    if (rot !== 0) ctx.rotate(rot);
    if (scaleX !== 1 || scaleY !== 1) ctx.scale(scaleX, scaleY);

    this.drawPlayerSprite(ctx, e, cell, now);

    // Facing chevron (relative to transformed origin)
    const dirRad = (r.ddir * Math.PI) / 180;
    const cd = cell * 0.42;
    const ax = Math.sin(dirRad) * cd;
    const ay = -Math.cos(dirRad) * cd;
    ctx.save();
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
    ctx.restore(); // chevron local transform

    ctx.restore(); // peacock transform
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

  /**
   * Draw the peacock from the directional walk sprite (4 cols: R,D,U,L × 3
   * walk-cycle rows, 32×32). Falls back to the 🦚 emoji until the sheet loads
   * (or if it 404s). Idle phases use a static frame; running cycles the walk
   * animation. facing flips at the midpoint of a turn, matching the chevron.
   */
  private drawPlayerSprite(
    ctx: CanvasRenderingContext2D,
    e: GameEngine,
    cell: number,
    now: number,
  ) {
    const sheet = this.peacockWalk;
    if (!sheet) {
      this.emoji(ctx, '🦚', 0, 0, cell * 0.66);
      return;
    }
    const facing = ((Math.round(e.robot.ddir / 90) % 4) + 4) % 4;
    const col = WALK_COL[facing]!;
    const row = e.phase === 'running' ? Math.floor(now * 8) % WALK_FRAMES : 0;
    const smooth = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false; // crisp pixel sprite
    const s = cell * 0.72;
    ctx.drawImage(sheet, col * 32, row * 32, 32, 32, -s / 2, -s / 2, s, s);
    ctx.imageSmoothingEnabled = smooth;
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

  private drawGrid(
    ctx: CanvasRenderingContext2D,
    e: GameEngine,
    ox: number,
    oy: number,
    cell: number,
  ) {
    const L = e.level;
    const lw = Math.max(2, cell * 0.045);
    const rr = Math.max(2, cell * 0.06);
    ctx.lineWidth = lw;
    for (let r = 0; r < L.rows; r++) {
      for (let c = 0; c < L.cols; c++) {
        const x = ox + c * cell;
        const y = oy + r * cell;
        // per-tile bevel: light top-left → dark bottom-right, so adjacent
        // tiles read as distinct raised squares (light edge meets dark edge).
        const grad = ctx.createLinearGradient(x, y, x + cell, y + cell);
        grad.addColorStop(0, 'rgba(255,255,255,0.40)');
        grad.addColorStop(0.5, 'rgba(0,0,0,0.30)');
        grad.addColorStop(1, 'rgba(0,0,0,0.55)');
        ctx.strokeStyle = grad;
        this.roundRect(ctx, x + lw * 0.5, y + lw * 0.5, cell - lw, cell - lw, rr);
        ctx.stroke();
      }
    }
  }


  private spawnConfetti(W: number, H: number) {
    if (REDUCED) return; // P0-1: skip confetti spawn under reduced-motion
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
        color: this.confettiColors[i % this.confettiColors.length]!,
        life: 1,
      });
    }
  }

  private stepConfetti(dt: number, H: number) {
    for (const p of this.confetti) {
      p.vy += 240 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
    }
    // Cull particles once they've fallen past the canvas so the array drains
    // and step/draw stop after the burst is done.
    this.confetti = this.confetti.filter((p) => p.y < H + 40);
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
