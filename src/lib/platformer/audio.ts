/* Áudio 8-bit original gerado com Web Audio API (sem arquivos externos). */

export type Track = "menu" | "level1" | "level2" | "level3" | "boss";
export type AudioSettings = { enabled: boolean; music: number; sfx: number };

const KEY = "pedra-do-tempo-audio";
const mf = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

// Cada passo = colcheia. null = pausa. [melodia, baixo]
type Song = { bpm: number; lead: (number | null)[]; bass: (number | null)[]; drums?: boolean; leadType?: OscillatorType };

const _ = null;
const SONGS: Record<Track, Song> = {
  menu: {
    bpm: 132,
    lead: [72, _, 76, 79, 81, 79, 76, _, 74, _, 77, 81, 79, _, _, _, 72, _, 76, 79, 84, 83, 81, 79, 77, 76, 74, 76, 72, _, _, _],
    bass: [48, _, 55, _, 53, _, 55, _, 50, _, 57, _, 55, _, 43, _, 48, _, 55, _, 53, _, 52, _, 50, _, 55, _, 48, _, 48, _],
    leadType: "triangle",
  },
  level1: {
    bpm: 150,
    lead: [76, 76, _, 76, _, 72, 76, _, 79, _, _, _, 67, _, _, _, 72, _, 67, _, 64, _, 69, _, 71, _, 70, 69, _, 67, 76, 79, 81, _, 77, 79, _, 76, _, 72, 74, 71, _, _, _, _, _],
    bass: [48, _, 55, _, 48, _, 55, _, 43, _, 50, _, 43, _, 47, _, 48, _, 55, _, 45, _, 52, _, 53, _, 50, _, 43, _, 55, _, 53, _, 60, _, 48, _, 55, _, 50, _, 43, _, 55, _, 43, _],
    drums: true,
  },
  level2: {
    bpm: 140,
    lead: [69, _, 72, 76, _, 74, 72, _, 71, _, 74, 77, _, 76, 74, _, 72, 74, 76, 77, 79, _, 76, _, 74, 72, 71, 72, 69, _, _, _],
    bass: [45, _, 52, _, 45, _, 52, _, 43, _, 50, _, 43, _, 50, _, 41, _, 48, _, 40, _, 47, _, 38, _, 45, _, 45, _, 40, _],
    drums: true,
  },
  level3: {
    bpm: 156,
    lead: [74, _, 77, _, 81, 79, 77, 76, 74, _, 73, _, 76, _, 69, _, 74, 76, 77, 79, 81, _, 82, 81, 79, 77, 76, 73, 74, _, _, _],
    bass: [38, 50, 38, 50, 41, 53, 41, 53, 45, 57, 45, 57, 45, 57, 44, 56, 38, 50, 38, 50, 46, 58, 46, 58, 45, 57, 45, 57, 38, 50, 38, 50],
    drums: true,
  },
  boss: {
    bpm: 176,
    lead: [69, 69, 72, 69, 75, 74, 72, 69, 68, 68, 71, 68, 74, 72, 71, 68, 69, 69, 72, 69, 76, 75, 74, 72, 71, 72, 74, 76, 81, _, 80, _],
    bass: [33, 45, 33, 45, 33, 45, 33, 45, 32, 44, 32, 44, 32, 44, 32, 44, 29, 41, 29, 41, 29, 41, 29, 41, 28, 40, 28, 40, 28, 40, 28, 40],
    drums: true,
    leadType: "sawtooth",
  },
};

class AudioEngine {
  ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  settings: AudioSettings = { enabled: true, music: 0.6, sfx: 0.8 };
  private timer: number | null = null;
  private track: Track | null = null;
  private step = 0;
  private nextT = 0;
  private lastOnce: Record<string, number> = {};
  private listeners = new Set<() => void>();

  constructor() {
    if (typeof window === "undefined") return;
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || "null");
      if (s) this.settings = { ...this.settings, ...s };
    } catch {
      /* ignore */
    }
  }

  get muted() {
    return !this.settings.enabled;
  }
  set muted(v: boolean) {
    this.set({ enabled: !v });
  }

  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => void this.listeners.delete(fn);
  }

  set(p: Partial<AudioSettings>) {
    this.settings = { ...this.settings, ...p };
    try {
      localStorage.setItem(KEY, JSON.stringify(this.settings));
    } catch {
      /* ignore */
    }
    this.applyGains();
    this.listeners.forEach((f) => f());
  }

  private applyGains() {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.settings.enabled ? 1 : 0, t, 0.02);
    this.musicBus!.gain.setTargetAtTime(this.settings.music * 0.5, t, 0.02);
    this.sfxBus!.gain.setTargetAtTime(this.settings.sfx, t, 0.02);
  }

  ensure() {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const w = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
      const AC = w.AudioContext || w.webkitAudioContext;
      if (!AC) return null;
      const ctx = new AC();
      this.ctx = ctx;
      this.master = ctx.createGain();
      this.musicBus = ctx.createGain();
      this.sfxBus = ctx.createGain();
      this.musicBus.connect(this.master);
      this.sfxBus.connect(this.master);
      this.master.connect(ctx.destination);
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      this.noise = buf;
      this.applyGains();
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  private tone(bus: GainNode, freq: number, t: number, dur: number, type: OscillatorType, vol: number, to?: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(Math.max(30, to), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(bus);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private hiss(bus: GainNode, t: number, dur: number, vol: number, hp = 4000) {
    const ctx = this.ctx!;
    const s = ctx.createBufferSource();
    s.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = hp;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(bus);
    s.start(t);
    s.stop(t + dur + 0.02);
  }

  /* ---- efeitos (compatível com o motor) ---- */
  blip(freq: number, dur = 0.09, type: OscillatorType = "square", vol = 0.06) {
    const ctx = this.ensure();
    if (!ctx) return;
    this.tone(this.sfxBus!, freq, ctx.currentTime, dur, type, vol * 1.6);
  }
  slide(from: number, to: number, dur = 0.25, vol = 0.07) {
    const ctx = this.ensure();
    if (!ctx) return;
    this.tone(this.sfxBus!, from, ctx.currentTime, dur, "square", vol * 1.6, to);
  }
  private seq(notes: [number, number][], step: number, type: OscillatorType, vol: number, bus = this.sfxBus) {
    const ctx = this.ensure();
    if (!ctx) return;
    const t0 = ctx.currentTime + 0.01;
    notes.forEach(([n, len], i) => {
      if (n > 0) this.tone(bus!, mf(n), t0 + i * step, step * len, type, vol);
    });
  }
  /** Evita repetir o mesmo som na mesma ocorrência. */
  private once(id: string, ms: number) {
    const now = performance.now();
    if (now - (this.lastOnce[id] ?? -1e9) < ms) return false;
    this.lastOnce[id] = now;
    return true;
  }

  jump() {
    this.slide(330, 760, 0.13, 0.05);
  }
  coin() {
    this.seq([[88, 1], [93, 3]], 0.06, "square", 0.07);
  }
  fragment() {
    this.seq([[79, 1], [83, 1], [86, 1], [91, 3]], 0.08, "triangle", 0.12);
  }
  attack() {
    const ctx = this.ensure();
    if (!ctx) return;
    this.tone(this.sfxBus!, 500, ctx.currentTime, 0.12, "square", 0.05, 1200);
    this.hiss(this.sfxBus!, ctx.currentTime, 0.1, 0.08, 3000);
  }
  enemyHit() {
    const ctx = this.ensure();
    if (!ctx) return;
    this.tone(this.sfxBus!, 600, ctx.currentTime, 0.15, "square", 0.08, 120);
    this.hiss(this.sfxBus!, ctx.currentTime, 0.12, 0.12, 1500);
  }
  damage() {
    this.slide(420, 110, 0.28, 0.07);
  }
  click() {
    this.blip(1046, 0.05, "square", 0.04);
  }
  /** Perdeu uma vida. */
  lifeLost() {
    if (!this.once("death", 1200)) return;
    this.stopMusic();
    this.seq([[71, 1], [77, 1], [0, 1], [77, 1], [76, 1], [74, 1], [72, 3]], 0.11, "square", 0.08);
  }
  levelClear() {
    if (!this.once("clear", 1500)) return;
    this.stopMusic();
    this.seq([[67, 1], [72, 1], [76, 1], [79, 1], [84, 2], [79, 1], [84, 4]], 0.1, "square", 0.08);
    this.seq([[55, 2], [0, 2], [60, 2], [0, 1], [48, 4]], 0.1, "triangle", 0.12);
  }
  /* ---- jingles ---- */
  victory() {
    if (!this.once("victory", 3000)) return;
    this.stopMusic();
    this.seq(
      [[72, 1], [72, 1], [72, 1], [72, 3], [68, 3], [70, 3], [72, 2], [70, 1], [72, 6]],
      0.12, "square", 0.08, this.musicBus,
    );
    this.seq([[48, 3], [0, 3], [44, 3], [46, 3], [48, 9]], 0.12, "triangle", 0.2, this.musicBus);
  }
  gameOver() {
    if (!this.once("gameover", 3000)) return;
    this.stopMusic();
    this.seq([[72, 2], [0, 1], [67, 2], [0, 1], [64, 3], [69, 2], [71, 2], [69, 2], [68, 2], [70, 2], [68, 2], [67, 6]], 0.13, "square", 0.08);
    this.seq([[48, 6], [45, 6], [44, 6], [43, 8]], 0.13, "triangle", 0.18);
  }

  /* ---- música ---- */
  startMusic(world: number) {
    this.playMusic(`level${((world - 1) % 3) + 1}` as Track);
  }
  playMusic(track: Track) {
    if (this.track === track && this.timer) return;
    this.stopMusic();
    const ctx = this.ensure();
    if (!ctx) return;
    this.track = track;
    this.step = 0;
    this.nextT = ctx.currentTime + 0.08;
    const song = SONGS[track];
    const dt = 60 / song.bpm / 2;
    const tick = () => {
      if (!this.ctx) return;
      while (this.nextT < this.ctx.currentTime + 0.25) {
        const i = this.step % song.lead.length;
        const l = song.lead[i];
        const b = song.bass[this.step % song.bass.length];
        if (l != null) this.tone(this.musicBus!, mf(l), this.nextT, dt * 0.9, song.leadType ?? "square", 0.09);
        if (b != null) this.tone(this.musicBus!, mf(b), this.nextT, dt * 0.95, "triangle", 0.22);
        if (song.drums) {
          if (this.step % 4 === 0) this.tone(this.musicBus!, 140, this.nextT, 0.08, "sine", 0.3, 50);
          if (this.step % 4 === 2) this.hiss(this.musicBus!, this.nextT, 0.06, 0.12, 2000);
          else this.hiss(this.musicBus!, this.nextT, 0.025, 0.05, 7000);
        }
        this.nextT += dt;
        this.step++;
      }
    };
    tick();
    this.timer = window.setInterval(tick, 60);
  }
  stopMusic() {
    if (this.timer) window.clearInterval(this.timer);
    this.timer = null;
    this.track = null;
  }
  get currentTrack() {
    return this.track;
  }
}

export const audio = new AudioEngine();
