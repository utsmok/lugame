import type { ThemeConfig } from './theme';

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

export function cellSeed(c: number, r: number): number {
  // simple string-hash-like from coords — stable across frames
  let h = c * 374761393 + r * 668265263;
  h = (h ^ (h >>> 16)) * 0x45d9f3b;
  h = (h ^ (h >>> 16)) * 0x45d9f3b;
  h = h ^ (h >>> 16);
  return h >>> 0;
}

// ─── ConfigTileset (theme-driven; supersedes the hard-coded FarmTileset) ───

/** Parse a #rrggbb hex string into [r,g,b] (0..255). Returns black on bad input. */
function parseHex(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [0, 0, 0];
  const n = parseInt(m[1]!, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Linear-mix two [r,g,b] triples by t (0..1). */
function mixRgb(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export class ConfigTileset implements Tileset {
  decorImages?: DecorImg[];
  ground?: GroundTiles;
  constructor(private theme: ThemeConfig) {}

  drawBackground(ctx: CanvasRenderingContext2D, W: number, H: number) {
    const stops = this.theme.background.stops;
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    for (const s of stops) bg.addColorStop(s.offset, s.color);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Subtle scattered tufts/dots for texture — colours derived from the
    // gradient endpoints so they always fit the theme (farm greens, desert sands).
    const top: [number, number, number] = stops.length
      ? parseHex(stops[0]!.color)
      : [120, 180, 120];
    const bot: [number, number, number] = stops.length
      ? parseHex(stops[stops.length - 1]!.color)
      : top;
    const dark = mixRgb(top, [0, 0, 0], 0.35);
    const light = mixRgb(bot, [255, 255, 255], 0.08);
    ctx.save();
    ctx.globalAlpha = 0.18;
    const rng = mulberry32(42);
    for (let i = 0; i < 180; i++) {
      const tx = rng() * W;
      const ty = rng() * H;
      const [r, g, b] = i % 3 === 0 ? dark : light;
      ctx.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`;
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

    // Warm tile body — base colour from the theme, with per-tile variation
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(sx + rad, sy);
    ctx.arcTo(sx + ss, sy, sx + ss, sy + ss, rad);
    ctx.arcTo(sx + ss, sy + ss, sx, sy + ss, rad);
    ctx.arcTo(sx, sy + ss, sx, sy, rad);
    ctx.arcTo(sx, sy, sx + ss, sy, rad);
    ctx.closePath();

    const rng = mulberry32(seed);
    const [br, bg, bb] = parseHex(this.theme.cell.pathFill);
    const r = br + (rng() > 0.5 ? 10 : -10) + (rng() * 12 - 6);
    const g = bg + (rng() * 12 - 6);
    const b = bb + (rng() * 10 - 5);
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

    // Edge grass tufts / pebbles — tufts themed to the cell's grass colour
    const [gr, gg, gb] = parseHex(this.theme.cell.grassFill);
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
        // tiny grass tuft (slightly darker than the cell grass)
        ctx.fillStyle = `rgb(${(gr * 0.8) | 0},${(gg * 0.8) | 0},${(gb * 0.8) | 0})`;
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
    const hue = hues[Math.floor(rng() * hues.length)]!;
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
