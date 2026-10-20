import Phaser from 'phaser';

/**
 * Efeitos sonoros gerados na hora (Web Audio), usados enquanto não existir um arquivo
 * em public/assets/audio/sfx/. Bem curtos e baixos, só para dar retorno ao jogador.
 */
type Wave = OscillatorType;

function tone(ctx: AudioContext, out: AudioNode, wave: Wave, f0: number, f1: number, dur: number, gain = 0.12, delay = 0): void {
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = wave;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(ctx: AudioContext, out: AudioNode, dur: number, filter: number, gain = 0.15, delay = 0): void {
  const t = ctx.currentTime + delay;
  const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = filter;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(out);
  src.start(t);
}

const SOUNDS: Record<string, (c: AudioContext, o: AudioNode) => void> = {
  'sfx/select': (c, o) => tone(c, o, 'square', 660, 880, 0.06, 0.05),
  'sfx/confirm': (c, o) => (tone(c, o, 'square', 660, 660, 0.05, 0.05), tone(c, o, 'square', 990, 990, 0.08, 0.05, 0.05)),
  'sfx/hit': (c, o) => noise(c, o, 0.15, 1800, 0.2),
  'sfx/fogo': (c, o) => noise(c, o, 0.45, 900, 0.22),
  'sfx/agua': (c, o) => (tone(c, o, 'sine', 900, 300, 0.25, 0.12), tone(c, o, 'sine', 700, 250, 0.2, 0.08, 0.08)),
  'sfx/eletrico': (c, o) => (tone(c, o, 'square', 1400, 200, 0.12, 0.06), tone(c, o, 'sawtooth', 1800, 300, 0.15, 0.05, 0.07)),
  'sfx/terra': (c, o) => (tone(c, o, 'sine', 120, 40, 0.35, 0.3), noise(c, o, 0.3, 400, 0.2)),
  'sfx/gelo': (c, o) => [1568, 2093, 2637].forEach((f, i) => tone(c, o, 'sine', f, f, 0.25, 0.06, i * 0.06)),
  'sfx/sombra': (c, o) => tone(c, o, 'sawtooth', 220, 60, 0.5, 0.08),
  'sfx/grama': (c, o) => [880, 1046, 1318].forEach((f, i) => tone(c, o, 'triangle', f, f * 1.05, 0.08, 0.07, i * 0.05)),
  'sfx/inseto': (c, o) => [0, 0.05, 0.1, 0.15].forEach((d) => tone(c, o, 'square', 1200, 900, 0.04, 0.04, d)),
  'sfx/pedra': (c, o) => (noise(c, o, 0.25, 600, 0.25), tone(c, o, 'square', 160, 70, 0.2, 0.08)),
  'sfx/vento': (c, o) => noise(c, o, 0.6, 2600, 0.12),
  'sfx/capsula': (c, o) => tone(c, o, 'triangle', 400, 1200, 0.3, 0.1),
  'sfx/captured': (c, o) => [523, 659, 784, 1046].forEach((f, i) => tone(c, o, 'square', f, f, 0.1, 0.06, i * 0.09)),
  'sfx/levelup': (c, o) => [523, 659, 784, 1046, 1318].forEach((f, i) => tone(c, o, 'triangle', f, f, 0.12, 0.08, i * 0.08)),
  'sfx/heal': (c, o) => [784, 988, 1175, 1568].forEach((f, i) => tone(c, o, 'sine', f, f, 0.18, 0.07, i * 0.1)),
  'sfx/faint': (c, o) => tone(c, o, 'triangle', 440, 80, 0.6, 0.12),
};

export function playSynth(game: Phaser.Game, key: string): void {
  const make = SOUNDS[key];
  const mgr = game.sound as Phaser.Sound.WebAudioSoundManager;
  if (!make || game.sound.mute || !('context' in mgr) || !mgr.context) return;
  try {
    if (mgr.context.state === 'suspended') return; // o navegador só libera som depois de um toque/tecla
    make(mgr.context, mgr.destination ?? mgr.context.destination);
  } catch {
    /* som nunca derruba o jogo */
  }
}
