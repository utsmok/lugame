// AudioBus: procedural Web Audio synthesis for every sound (so the game is fully
// playable with zero asset files), with an optional override layer that swaps in
// real recordings from public/assets/audio/<name>.ogg when present.
//
// The signature sound is the peacock call on "fan": a double "ah-AAAAH, ah-AAAAH"
// wail with vibrato + a feather-trill noise burst, approximating a real peacock.

export type SfxName =
  | 'step'
  | 'turn'
  | 'fan'
  | 'flee'
  | 'win'
  | 'bump'
  | 'click';

const BASE = import.meta.env.BASE_URL; // '/lugame/' in prod, '/' in dev
const SFX_FILE: Record<SfxName, string> = {
  step: 'step.mp3',
  turn: 'turn.mp3',
  fan: 'fan.mp3',
  flee: 'flee.mp3',
  win: 'win.mp3',
  bump: 'bump.mp3',
  click: 'click.mp3',
};

// Resolve the AudioContext constructor, including Safari's prefixed variant,
// using runtime guards instead of an unchecked cast.
function audioCtor(): typeof AudioContext | undefined {
  if (typeof window.AudioContext === 'function') return window.AudioContext;
  const w = window as unknown as Record<string, unknown>;
  if ('webkitAudioContext' in w && typeof w.webkitAudioContext === 'function') {
    return w.webkitAudioContext as typeof AudioContext;
  }
  return undefined;
}

export class AudioBus {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private overrides: Partial<Record<SfxName, AudioBuffer>> = {};
  private muted = false;

  /** Lazily create the context (must follow a user gesture). */
  private ensure(): AudioContext | null {
    if (this.ctx) return this.ctx;
    try {
      const Ctor = audioCtor();
      this.ctx = Ctor ? new Ctor() : null;
      if (!this.ctx) return null;
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.7;
      this.master.connect(this.ctx.destination);
    } catch {
      this.ctx = null;
    }
    return this.ctx;
  }

  resume() {
    const ctx = this.ensure();
    if (ctx && ctx.state === 'suspended') void ctx.resume();
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master && this.ctx) {
      this.master.gain.value = m ? 0 : 0.7;
    }
  }
  isMuted() {
    return this.muted;
  }

  /** Best-effort: load any real recordings available under assets/audio/. */
  async loadOverrides() {
    const ctx = this.ensure();
    if (!ctx) return;
    const names = Object.keys(SFX_FILE) as SfxName[];
    await Promise.all(
      names.map(async (n) => {
        try {
          const res = await fetch(`${BASE}assets/audio/${SFX_FILE[n]}`);
          if (!res.ok) return;
          const buf = await res.arrayBuffer();
          const ab = await ctx.decodeAudioData(buf);
          this.overrides[n] = ab;
        } catch {
          /* procedural fallback stays in place */
        }
      }),
    );
  }

  play(n: SfxName) {
    const ctx = this.ensure();
    if (!ctx || !this.master || this.muted) return;
    if (ctx.state === 'suspended') void ctx.resume();
    if (this.overrides[n]) {
      this.playBuffer(this.overrides[n]!);
      return;
    }
    const t = ctx.currentTime;
    switch (n) {
      case 'step':
        this.blip(t, 190, 0.08, 'triangle', 0.22);
        this.noiseBurst(t, 0.05, 0.06, 2200, 'highpass', 0.7);
        break;
      case 'turn':
        this.blip(t, 440, 0.07, 'sine', 0.2);
        this.blip(t + 0.08, 540, 0.07, 'sine', 0.2);
        break;
      case 'fan':
        this.peacockCall(t);
        this.peacockCall(t + 0.62);
        this.noiseBurst(t, 0.85, 0.07, 1400, 'bandpass', 2.2);
        break;
      case 'flee':
        this.sweep(t, 520, 180, 0.16, 'square', 0.18);
        break;
      case 'win':
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
          this.blip(t + i * 0.11, f, 0.2, 'triangle', 0.26),
        );
        this.noiseBurst(t + 0.46, 0.2, 0.1, 2600, 'highpass', 0.7);
        break;
      case 'bump':
        this.blip(t, 110, 0.13, 'sawtooth', 0.22);
        this.blip(t, 95, 0.16, 'square', 0.14);
        break;
      case 'click':
        this.blip(t, 660, 0.04, 'sine', 0.16);
        break;
    }
  }

  private playBuffer(buf: AudioBuffer) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.master!);
    src.start();
  }

  private blip(
    t: number,
    freq: number,
    dur: number,
    type: OscillatorType,
    vol: number,
  ) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.master!);
    osc.start(t);
    osc.stop(t + dur + 0.03);
  }

  private sweep(
    t: number,
    f0: number,
    f1: number,
    dur: number,
    type: OscillatorType,
    vol: number,
  ) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.master!);
    osc.start(t);
    osc.stop(t + dur + 0.03);
  }

  private getNoise(dur: number): AudioBuffer {
    const ctx = this.ctx!;
    if (this.noiseBuf && this.noiseBuf.duration >= dur) return this.noiseBuf;
    const len = Math.ceil(ctx.sampleRate * Math.max(dur, 1));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;
    return buf;
  }

  private noiseBurst(
    t: number,
    dur: number,
    vol: number,
    centerFreq: number,
    type: BiquadFilterType,
    Q: number,
  ) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.getNoise(dur);
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = centerFreq;
    f.Q.value = Q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    // tremolo (feather trill)
    const trem = ctx.createOscillator();
    const tremGain = ctx.createGain();
    trem.frequency.value = 20;
    tremGain.gain.value = vol * 0.55;
    trem.connect(tremGain);
    tremGain.connect(g.gain);
    src.connect(f);
    f.connect(g);
    g.connect(this.master!);
    src.start(t);
    src.stop(t + dur);
    trem.start(t);
    trem.stop(t + dur);
  }

  // The signature: a peacock's two-tone wailing call "ah-AAAAH".
  private peacockCall(t: number) {
    const ctx = this.ctx!;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.connect(this.master!);

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 950;
    bp.Q.value = 1.4;
    bp.connect(out);

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc2.type = 'triangle';
    osc1.connect(bp);
    osc2.connect(bp);

    // vibrato
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 6.5;
    lfoGain.gain.value = 22;
    lfo.connect(lfoGain);
    lfoGain.connect(osc1.frequency);
    lfoGain.connect(osc2.frequency);

    const f0 = 430;
    const f1 = 900;
    const slide = (o: OscillatorNode, mul: number) => {
      o.frequency.setValueAtTime(f0 * mul, t);
      o.frequency.exponentialRampToValueAtTime(f1 * mul, t + 0.17);
      o.frequency.setValueAtTime(f1 * mul, t + 0.3);
      o.frequency.exponentialRampToValueAtTime(f0 * 0.85 * mul, t + 0.46);
    };
    slide(osc1, 1);
    slide(osc2, 1.006);

    // two-hump amplitude (ah - AAAH)
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(0.5, t + 0.035);
    out.gain.exponentialRampToValueAtTime(0.22, t + 0.16);
    out.gain.exponentialRampToValueAtTime(0.55, t + 0.24);
    out.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);

    osc1.start(t);
    osc2.start(t);
    lfo.start(t);
    osc1.stop(t + 0.55);
    osc2.stop(t + 0.55);
    lfo.stop(t + 0.55);
  }
}
