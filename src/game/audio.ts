// AudioBus: procedural Web Audio synthesis for every sound (so the game is fully
// playable with zero asset files), with an optional override layer that swaps in
// real recordings from public/assets/audio/<name>.ogg when present.
//
// The signature sound is the peacock call on "fan": a double "ah-AAAAH, ah-AAAAH"
// wail with vibrato + a feather-trill noise burst, approximating a real peacock.

import { type ThemeConfig, assetUrl } from './theme';

export type SfxName =
  | 'step'
  | 'turn'
  | 'fan'
  | 'flee'
  | 'win'
  | 'bump'
  | 'click'
  | 'collect';

const SFX_FILE: Record<SfxName, string> = {
  step: 'step.mp3',
  turn: 'turn.mp3',
  fan: 'fan.mp3',
  flee: 'flee.mp3',
  win: 'win.mp3',
  bump: 'bump.mp3',
  click: 'click.mp3',
  collect: 'collect.mp3',
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

  // --- background music ---
  private musicEnabled = false;
  private musicSource: AudioBufferSourceNode | null = null;
  private musicGain: GainNode | null = null;
  private musicBuf: AudioBuffer | null = null; // procedural loop or override
  private musicOverride: AudioBuffer | null = null; // loaded music.mp3

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
    // mute/unmute music without toggling the enabled flag
    if (m) {
      this.stopMusicImpl()
    } else if (this.musicEnabled) {
      this.startMusicImpl()
    }
  }
  isMuted() {
    return this.muted;
  }

  /** Best-effort: load any real recordings available under assets/audio/. */
  async loadOverrides(theme: ThemeConfig) {
    const ctx = this.ensure();
    if (!ctx) return;
    const names = Object.keys(SFX_FILE) as SfxName[];
    await Promise.all(
      names.map(async (n) => {
        try {
          // Theme sfx override takes precedence over the default asset path.
          const rel = theme.sfxOverrides?.[n] ?? `assets/audio/${SFX_FILE[n]}`;
          const res = await fetch(assetUrl(rel));
          if (!res.ok) return;
          const buf = await res.arrayBuffer();
          const ab = await ctx.decodeAudioData(buf);
          this.overrides[n] = ab;
        } catch {
          /* procedural fallback stays in place */
        }
      }),
    )
    // best-effort: load background-music override (theme.bgm)
    try {
      const res = await fetch(assetUrl(theme.bgm))
      if (res.ok) {
        const buf = await res.arrayBuffer()
        this.musicOverride = await ctx.decodeAudioData(buf)
        // startMusic() likely fired before the override decoded & locked in the
        // procedural loop — swap the live source to the real track now.
        if (this.musicEnabled && !this.muted) {
          this.stopMusicImpl()
          this.startMusicImpl()
        }
      }
    } catch {
      /* procedural tune stays in place */
    }
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
      case 'collect': this.chomp(t); this.chomp(t + 0.14); break;
      default: {
        const _: never = n; // F5: exhaustiveness — a new SfxName fails compile here
        void _;
      }
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

  private chomp(t: number) {
    const ctx = this.ctx!;
    // Crisp cookie-crunch: sharp broadband-ish noise burst (highpass + light
    // bandpass) with a fast exponential decay — the "krunch" of a bite. Plus a
    // tiny transient "crack" up top and a low jaw thud. (No downward sweep —
    // sweeps sound like a whoop, not a crunch.)
    const src = ctx.createBufferSource();
    src.buffer = this.getNoise(0.1);
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 1300;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2100;
    bp.Q.value = 0.7;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.32, t + 0.004); // sharp attack
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1); // fast decay
    src.connect(hp);
    hp.connect(bp);
    bp.connect(g);
    g.connect(this.master!);
    src.start(t);
    src.stop(t + 0.13);
    // crisp transient crack at the very start of the bite
    const crack = ctx.createBufferSource();
    crack.buffer = this.getNoise(0.025);
    const cf = ctx.createBiquadFilter();
    cf.type = 'highpass';
    cf.frequency.value = 3600;
    const cg = ctx.createGain();
    cg.gain.setValueAtTime(0.26, t);
    cg.gain.exponentialRampToValueAtTime(0.0001, t + 0.025);
    crack.connect(cf);
    cf.connect(cg);
    cg.connect(this.master!);
    crack.start(t);
    crack.stop(t + 0.035);
    // low jaw-closure thud
    this.blip(t, 95, 0.09, 'sine', 0.2);
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
  // ── background music public API ──────────────────────────────────────

  startMusic() {
    this.musicEnabled = true
    if (!this.muted) this.startMusicImpl()
  }

  stopMusic() {
    this.musicEnabled = false
    this.stopMusicImpl()
  }

  setMusicEnabled(enabled: boolean) {
    this.musicEnabled = enabled
    if (enabled && !this.muted) {
      this.startMusicImpl()
    } else {
      this.stopMusicImpl()
    }
  }

  // ── music internals ──────────────────────────────────────────────────

  private startMusicImpl() {
    const ctx = this.ensure()
    if (!ctx || !this.master || this.musicSource) return
    if (ctx.state === 'suspended') void ctx.resume()

    const buf = this.musicOverride || this.musicBuf || this.buildMusicBuffer()
    if (!buf) return

    this.musicGain = ctx.createGain()
    this.musicGain.gain.value = 0.12 // well under SFX (0.7)
    this.musicGain.connect(this.master)

    const src = ctx.createBufferSource()
    src.buffer = buf
    src.loop = true
    src.connect(this.musicGain)
    src.start()
    this.musicSource = src
  }

  private stopMusicImpl() {
    if (this.musicSource) {
      try { this.musicSource.stop() } catch { /* already stopped */ }
      this.musicSource.disconnect()
      this.musicSource = null
    }
    if (this.musicGain) {
      this.musicGain.disconnect()
      this.musicGain = null
    }
  }

  /** Build a ~8 s procedural loop buffer: soft pad + gentle bass + melody. */
  private buildMusicBuffer(): AudioBuffer | null {
    const ctx = this.ctx
    if (!ctx) return null

    const sr = ctx.sampleRate
    const dur = 8.0 // seconds per loop — comfortable for a simple tune
    const len = Math.ceil(sr * dur)
    const buf = ctx.createBuffer(2, len, sr) // stereo for slight width
    const L = buf.getChannelData(0)
    const R = buf.getChannelData(1)

    // clear
    L.fill(0)
    R.fill(0)

    // --- helper: additive synth into the buffer ---
    const noteOn = (
      ch: Float32Array,
      freq: number,
      start: number,
      vol: number,
      attack: number,
      release: number,
      type: 'sine' | 'triangle' | 'softsaw',
    ) => {
      const end = Math.min(start + release + attack, dur)
      const si = Math.floor(start * sr)
      const ei = Math.min(Math.ceil(end * sr), len)
      const twoPiFreq = 2 * Math.PI * freq / sr
      for (let i = si; i < ei; i++) {
        const t = (i - si) / sr // local time within note
        let env = 1
        if (t < attack) env = t / attack
        else if (t > release) {
          const r = (t - release) / attack
          env = Math.max(0, 1 - r * r) // smooth falloff
        }
        let s = 0
        const ph = twoPiFreq * i
        switch (type) {
          case 'sine':
            s = Math.sin(ph)
            break
          case 'triangle':
            s = 2 * Math.abs(2 * ((ph / (2 * Math.PI)) % 1) - 1) - 1
            break
          case 'softsaw': // bandlimited-ish: fundamental + 2 falling harmonics
            s = Math.sin(ph) + 0.5 * Math.sin(2 * ph) + 0.25 * Math.sin(3 * ph)
            s /= 1.75
            break
        }
        ch[i] += s * vol * env
      }
    }

    // Tempo: 95 BPM → beat = 60/95 ≈ 0.632 s
    const beat = 60 / 95
    const bar = beat * 4

    // Key of C major, gentle kid-friendly phrase (2 bars repeating)
    // Melody (glockenspiel-like, bright sine, soft envelope)
    const melody: [number, number, number][] = [
      // [time_offset, midi_note_number (69=A4), duration_in_beats]
      [0 * beat, 72, 0.5],   // C5
      [0.5 * beat, 74, 0.5], // D5
      [1 * beat, 76, 1.0],   // E5
      [2 * beat, 74, 0.5],   // D5
      [2.5 * beat, 72, 0.5], // C5
      [3 * beat, 79, 1.0],   // G5
      [4 * beat, 77, 0.5],   // F5
      [4.5 * beat, 76, 0.5], // E5
      [5 * beat, 74, 1.0],   // D5
      [6 * beat, 72, 0.5],   // C5
      [6.5 * beat, 71, 0.5], // B4
      [7 * beat, 72, 1.5],   // C5 (hold into next loop)
    ]

    const midiToFreq = (n: number) => 440 * Math.pow(2, (n - 69) / 12)

    for (const [off, nn, dBeats] of melody) {
      const f = midiToFreq(nn)
      const noteDur = dBeats * beat
      const att = 0.008
      const rel = noteDur - 0.02
      noteOn(L, f, off, 0.10, att, rel, 'sine')
      // slightly detuned + panned copy for shimmer
      noteOn(R, f * 1.002, off, 0.07, att, rel, 'sine')
    }

    // Bass: simple root notes on beats 1 & 3 (soft saw, very subdued)
    const bassNotes: [number, number][] = [
      [0 * bar, 48], // C3
      [1 * bar, 55], // G3
      [2 * bar, 48], // C3
      [3 * bar, 53], // F3
    ]
    for (const [off, nn] of bassNotes) {
      const f = midiToFreq(nn)
      const noteDur = bar * 0.95 // staccato feel with tiny gap before loop point
      noteOn(L, f, off, 0.07, 0.02, noteDur - 0.03, 'softsaw')
      noteOn(R, f, off, 0.05, 0.02, noteDur - 0.03, 'softsaw')
    }

    // Pad: sustained C major chord (soft saw, very quiet, slow tremolo for warmth)
    const padFreqs = [midiToFreq(48), midiToFreq(52), midiToFreq(55)] // C E G
    for (const f of padFreqs) {
      noteOn(L, f, 0, 0.04, 0.15, dur - 0.2, 'softsaw')
      noteOn(R, f * 0.997, 0, 0.03, 0.15, dur - 0.2, 'softsaw')
    }

    // Apply gentle master fade-out over last 200ms to ensure seamless loop (no click)
    const fadeSamples = Math.floor(0.2 * sr)
    for (let i = len - fadeSamples; i < len; i++) {
      const fade = (i - (len - fadeSamples)) / fadeSamples
      const smooth = fade * fade * (3 - 2 * fade) // smoothstep
      L[i] *= 1 - smooth
      R[i] *= 1 - smooth
    }

    // Normalize gently so nothing clips
    let peak = 0
    for (let i = 0; i < len; i++) {
      peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]))
    }
    if (peak > 0.85) {
      const scale = 0.8 / peak
      for (let i = 0; i < len; i++) {
        L[i] *= scale
        R[i] *= scale
      }
    }

    this.musicBuf = buf
    return buf
  }
}
