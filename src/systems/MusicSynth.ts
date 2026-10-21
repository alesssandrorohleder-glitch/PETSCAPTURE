import Phaser from 'phaser';

/**
 * Músicas geradas na hora (Web Audio), usadas enquanto não existir o arquivo em
 * public/assets/audio/music/. Cada trilha tem tom, escala, andamento e instrumentos
 * próprios; a melodia é sorteada com uma semente fixa, então a música é sempre a mesma.
 */

interface Song {
  bpm: number;
  /** nota base (MIDI) */
  root: number;
  scale: number[];
  /** graus da escala de cada compasso (4 compassos se repetem) */
  chords: number[];
  lead: OscillatorType;
  bass: OscillatorType;
  pad?: OscillatorType;
  /** bateria: 0 = nenhuma, 1 = leve, 2 = batalha */
  drums: 0 | 1 | 2;
  /** chance de cada semicolcheia ter nota de melodia */
  density: number;
  /** arpejo em semicolcheias (batalhas, cristal...) */
  arp?: boolean;
  volume?: number;
}

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR = [0, 2, 3, 5, 7, 8, 10];
const DORIAN = [0, 2, 3, 5, 7, 9, 10];
const PENTA = [0, 2, 4, 7, 9];
const PENTA_MINOR = [0, 3, 5, 7, 10];
const LYDIAN = [0, 2, 4, 6, 7, 9, 11];

const SONGS: Record<string, Song> = {
  'music/menu': { bpm: 92, root: 60, scale: MAJOR, chords: [0, 5, 3, 4], lead: 'triangle', bass: 'sine', pad: 'sine', drums: 0, density: 0.32 },
  'music/vila': { bpm: 108, root: 62, scale: MAJOR, chords: [0, 3, 4, 0], lead: 'square', bass: 'triangle', drums: 1, density: 0.42 },
  'music/floresta': { bpm: 96, root: 57, scale: DORIAN, chords: [0, 3, 0, 4], lead: 'triangle', bass: 'triangle', pad: 'sine', drums: 1, density: 0.36 },
  'music/praia': { bpm: 112, root: 64, scale: PENTA, chords: [0, 3, 1, 4], lead: 'triangle', bass: 'sine', drums: 1, density: 0.4 },
  'music/planalto': { bpm: 118, root: 59, scale: MAJOR, chords: [0, 4, 5, 3], lead: 'square', bass: 'triangle', drums: 1, density: 0.4 },
  'music/canion': { bpm: 100, root: 52, scale: PENTA_MINOR, chords: [0, 3, 2, 4], lead: 'sawtooth', bass: 'triangle', drums: 1, density: 0.3, volume: 0.8 },
  'music/picos': { bpm: 84, root: 64, scale: LYDIAN, chords: [0, 1, 0, 4], lead: 'sine', bass: 'sine', pad: 'triangle', drums: 0, density: 0.3, arp: true },
  'music/ruinas': { bpm: 76, root: 50, scale: MINOR, chords: [0, 5, 3, 4], lead: 'triangle', bass: 'sine', pad: 'sine', drums: 0, density: 0.24 },
  'music/vento': { bpm: 104, root: 65, scale: PENTA, chords: [0, 2, 3, 1], lead: 'sine', bass: 'triangle', pad: 'sine', drums: 1, density: 0.38, arp: true },
  'music/vulcao': { bpm: 126, root: 48, scale: MINOR, chords: [0, 5, 6, 4], lead: 'sawtooth', bass: 'square', drums: 2, density: 0.34, volume: 0.75 },
  'music/cristal': { bpm: 90, root: 61, scale: LYDIAN, chords: [0, 4, 1, 3], lead: 'sine', bass: 'triangle', pad: 'sine', drums: 0, density: 0.3, arp: true },
  'music/battle_wild': { bpm: 150, root: 57, scale: MINOR, chords: [0, 5, 6, 4], lead: 'square', bass: 'sawtooth', drums: 2, density: 0.5, arp: true, volume: 0.8 },
  'music/battle_trainer': { bpm: 158, root: 55, scale: DORIAN, chords: [0, 6, 5, 4], lead: 'square', bass: 'sawtooth', drums: 2, density: 0.55, arp: true, volume: 0.8 },
  'music/noctis': { bpm: 140, root: 50, scale: MINOR, chords: [0, 1, 5, 4], lead: 'sawtooth', bass: 'square', drums: 2, density: 0.48, arp: true, volume: 0.75 },
  'music/evolution': { bpm: 120, root: 60, scale: LYDIAN, chords: [0, 1, 4, 0], lead: 'triangle', bass: 'sine', pad: 'sine', drums: 0, density: 0.5, arp: true },
};

const STEPS = 64; // 4 compassos de 16 semicolcheias
const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
const seeded = (seed: number) => () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 233280, 17);

/** Nota da escala (grau pode passar de uma oitava). */
const degree = (song: Song, d: number): number => {
  const n = song.scale.length;
  const oct = Math.floor(d / n);
  return song.root + song.scale[((d % n) + n) % n] + oct * 12;
};

interface Pattern {
  melody: (number | null)[];
  lengths: number[];
}

function compose(key: string, song: Song): Pattern {
  const r = seeded(hash(key));
  const melody: (number | null)[] = [];
  const lengths: number[] = [];
  let d = song.scale.length; // começa uma oitava acima da base
  for (let i = 0; i < STEPS; i++) {
    const bar = Math.floor(i / 16);
    const beat = i % 4 === 0;
    const play = beat ? r() < song.density + 0.35 : r() < song.density * 0.6;
    if (!play) {
      melody.push(null);
      lengths.push(0);
      continue;
    }
    // passeio aleatório pela escala, puxado para as notas do acorde no tempo forte
    d += Math.round((r() - 0.5) * 4);
    const n = song.scale.length;
    if (beat) {
      const chord = song.chords[bar] + n;
      const tones = [chord, chord + 2, chord + 4];
      d = tones.reduce((best, t) => (Math.abs(t - d) < Math.abs(best - d) ? t : best), tones[0]);
    }
    d = Phaser.Math.Clamp(d, n - 1, n * 2 + 2);
    melody.push(d);
    lengths.push(beat && r() < 0.5 ? 2 : 1);
  }
  // o último compasso termina na tônica, para o loop "fechar"
  melody[STEPS - 4] = song.scale.length;
  lengths[STEPS - 4] = 3;
  return { melody, lengths };
}

class Player {
  private timer: ReturnType<typeof setInterval> | null = null;
  private master?: GainNode;
  private nextTime = 0;
  private step = 0;
  private song?: Song;
  private pattern?: Pattern;
  key?: string;

  constructor(private ctx: AudioContext, private out: AudioNode) {}

  play(key: string, volume: number): boolean {
    const song = SONGS[key];
    if (!song) return false;
    this.stop();
    this.key = key;
    this.song = song;
    this.pattern = compose(key, song);
    this.master = this.ctx.createGain();
    this.master.gain.value = 0;
    this.master.gain.linearRampToValueAtTime(0.16 * volume * (song.volume ?? 1), this.ctx.currentTime + 0.8);
    this.master.connect(this.out);
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.1;
    this.timer = setInterval(() => this.schedule(), 40);
    return true;
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    const m = this.master;
    if (m) {
      const t = this.ctx.currentTime;
      m.gain.cancelScheduledValues(t);
      m.gain.setValueAtTime(m.gain.value, t);
      m.gain.linearRampToValueAtTime(0, t + 0.3);
      setTimeout(() => m.disconnect(), 400);
    }
    this.master = undefined;
    this.key = undefined;
  }

  private schedule(): void {
    if (!this.song || !this.master || this.ctx.state !== 'running') return;
    const spb = 60 / this.song.bpm / 4; // duração de uma semicolcheia
    // aba ficou parada: recomeça do agora em vez de despejar notas atrasadas
    if (this.nextTime < this.ctx.currentTime - 0.2) this.nextTime = this.ctx.currentTime + 0.05;
    while (this.nextTime < this.ctx.currentTime + 0.15) {
      this.playStep(this.step, this.nextTime, spb);
      this.step = (this.step + 1) % STEPS;
      this.nextTime += spb;
    }
  }

  private note(wave: OscillatorType, freq: number, t: number, dur: number, gain: number, attack = 0.01): void {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = wave;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master!);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private drum(kind: 'kick' | 'snare' | 'hat', t: number): void {
    const ctx = this.ctx;
    if (kind === 'kick') {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.setValueAtTime(140, t);
      o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
      g.gain.setValueAtTime(0.9, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      o.connect(g).connect(this.master!);
      o.start(t);
      o.stop(t + 0.2);
      return;
    }
    const dur = kind === 'hat' ? 0.04 : 0.12;
    const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = kind === 'hat' ? 'highpass' : 'bandpass';
    f.frequency.value = kind === 'hat' ? 7000 : 1800;
    const g = ctx.createGain();
    g.gain.setValueAtTime(kind === 'hat' ? 0.18 : 0.45, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f).connect(g).connect(this.master!);
    src.start(t);
  }

  private playStep(i: number, t: number, spb: number): void {
    const song = this.song!;
    const pat = this.pattern!;
    const bar = Math.floor(i / 16);
    const pos = i % 16;
    const chord = song.chords[bar];
    // baixo: tônica do acorde nos tempos 1 e 3, quinta nos outros (batalha: colcheias)
    const bassEvery = song.drums === 2 ? 2 : 4;
    if (pos % bassEvery === 0) {
      const d = pos % 8 === 0 ? chord : chord + 4;
      this.note(song.bass, midi(degree(song, d) - 24), t, spb * bassEvery * 0.9, song.bass === 'sine' ? 0.5 : 0.28);
    }
    // acorde sustentado no começo do compasso
    if (song.pad && pos === 0) {
      for (const o of [0, 2, 4]) this.note(song.pad, midi(degree(song, chord + o) - 12), t, spb * 16, 0.07, 0.4);
    }
    // arpejo
    if (song.arp && pos % 2 === 0) {
      const o = [0, 2, 4, 7][(pos / 2) % 4];
      this.note('triangle', midi(degree(song, chord + o)), t, spb * 1.6, 0.06);
    }
    // melodia
    const m = pat.melody[i];
    if (m !== null) this.note(song.lead, midi(degree(song, m)), t, spb * pat.lengths[i] * 0.95, song.lead === 'sine' || song.lead === 'triangle' ? 0.22 : 0.1);
    // bateria
    if (song.drums) {
      if (pos % 8 === 0 || (song.drums === 2 && pos === 10)) this.drum('kick', t);
      if (pos === 4 || pos === 12) this.drum('snare', t);
      if (song.drums === 2 ? pos % 2 === 0 : pos % 4 === 2) this.drum('hat', t);
    }
  }
}

let player: Player | null = null;

const contextOf = (game: Phaser.Game): { ctx: AudioContext; out: AudioNode } | null => {
  const mgr = game.sound as Phaser.Sound.WebAudioSoundManager;
  if (!('context' in mgr) || !mgr.context) return null;
  return { ctx: mgr.context, out: (mgr as unknown as { destination?: AudioNode }).destination ?? mgr.context.destination };
};

export const MusicSynth = {
  /** Toca a trilha gerada (false se não existir uma para essa chave). */
  play(game: Phaser.Game, key: string, volume = 0.5): boolean {
    const a = contextOf(game);
    if (!a || !SONGS[key]) return false;
    if (player?.key === key) return true;
    player ??= new Player(a.ctx, a.out);
    return player.play(key, volume * 2);
  },
  stop(): void {
    player?.stop();
  },
  has: (key: string) => key in SONGS,
};
