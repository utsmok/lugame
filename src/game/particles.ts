// Particle + sparkle types and palettes for the Renderer's win/fan effects.
// CONFETTI + FAN_COLORS are the default palettes; a theme may override them
// (theme.confetti / theme.fanColors) via the Renderer constructor.

export interface Particle {
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

export interface Sparkle {
  x: number;
  y: number;
  life: number; // 1 → 0
  particles: { dx: number; dy: number; size: number; color: string; ang: number; speed: number }[];
}

export const CONFETTI = [
  '#ffd34e',
  '#4ea8ff',
  '#36c96a',
  '#ff5d6c',
  '#b06bff',
  '#1bbf9e',
] as const;

export const FAN_DOTS = 14;
export const FAN_COLORS = ['#1bbf9e', '#2e6bff', '#ffd34e', '#1bbf9e', '#b06bff'];
