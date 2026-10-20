import Phaser from 'phaser';
import type { ElementId } from '../data/elements';
import { ELEMENTS } from '../data/elements';
import { fxTexture, type FxShape } from './Placeholders';

interface Point {
  x: number;
  y: number;
}

/** Visual de cada elemento: forma da partícula, cores e comportamento do impacto. */
interface ElementFx {
  shape: FxShape;
  tints: number[];
  impact: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig;
  count: number;
  /** de onde as partículas saem em relação ao alvo */
  from?: 'target' | 'above';
}

const FX: Record<ElementId, ElementFx> = {
  fogo: {
    shape: 'flame', tints: [0xffd166, 0xff9f1c, 0xff6b35, 0xe63946], count: 40,
    impact: { speed: { min: 60, max: 240 }, angle: { min: 200, max: 340 }, gravityY: -260, scale: { start: 1.8, end: 0.2 }, alpha: { start: 1, end: 0 }, lifespan: 700 },
  },
  agua: {
    shape: 'drop', tints: [0x90e0ef, 0x48cae4, 0x0096c7, 0xffffff], count: 36,
    impact: { speed: { min: 120, max: 320 }, angle: { min: 200, max: 340 }, gravityY: 650, scale: { start: 1.2, end: 0.4 }, alpha: { start: 1, end: 0 }, lifespan: 750 },
  },
  eletrico: {
    shape: 'spark', tints: [0xffffff, 0xffee32, 0xffd60a], count: 34,
    impact: { speed: { min: 200, max: 420 }, scale: { start: 1.3, end: 0 }, alpha: { start: 1, end: 0 }, lifespan: 280, blendMode: 'ADD', rotate: { min: 0, max: 360 } },
  },
  terra: {
    shape: 'rock', tints: [0xb08968, 0x7f5539, 0x9c6644, 0xddb892], count: 20, from: 'above',
    impact: { speedY: { min: 150, max: 300 }, speedX: { min: -60, max: 60 }, gravityY: 900, scale: { min: 0.9, max: 1.8 }, rotate: { min: 0, max: 360 }, lifespan: 600, alpha: { start: 1, end: 0.3 } },
  },
  gelo: {
    shape: 'snow', tints: [0xffffff, 0xcaf0f8, 0x90e0ef], count: 40,
    impact: { speed: { min: 40, max: 180 }, gravityY: 60, scale: { start: 1.3, end: 0.3 }, rotate: { min: -180, max: 180 }, alpha: { start: 1, end: 0 }, lifespan: 1000 },
  },
  sombra: {
    shape: 'smoke', tints: [0x3c096c, 0x5a189a, 0x9d4edd, 0x10002b], count: 26,
    impact: { speed: { min: 20, max: 90 }, scale: { start: 1.2, end: 4 }, alpha: { start: 0.85, end: 0 }, lifespan: 950 },
  },
  grama: {
    shape: 'leaf', tints: [0x52b788, 0x74c69d, 0x2d6a4f, 0xb7e4c7], count: 30,
    impact: { speed: { min: 100, max: 260 }, gravityY: 160, scale: { start: 1.5, end: 0.6 }, rotate: { start: 0, end: 540 }, alpha: { start: 1, end: 0 }, lifespan: 900 },
  },
  pedra: {
    shape: 'rock', tints: [0x8e9aaf, 0x6c757d, 0xadb5bd, 0x495057], count: 26,
    impact: { speed: { min: 140, max: 320 }, gravityY: 700, scale: { min: 0.8, max: 1.6 }, rotate: { min: 0, max: 360 }, lifespan: 650, alpha: { start: 1, end: 0.2 } },
  },
  vento: {
    shape: 'smoke', tints: [0xffffff, 0x9ff0d2, 0xd8f3dc], count: 34,
    impact: { speed: { min: 160, max: 360 }, angle: { min: 160, max: 200 }, scale: { start: 0.8, end: 2.2 }, alpha: { start: 0.7, end: 0 }, lifespan: 600, rotate: { start: 0, end: 360 } },
  },
  inseto: {
    shape: 'leaf', tints: [0xa7c957, 0x6a994e, 0xf2e8cf], count: 30,
    impact: { speed: { min: 120, max: 280 }, gravityY: 120, scale: { start: 1.1, end: 0.3 }, rotate: { start: 0, end: -540 }, alpha: { start: 1, end: 0 }, lifespan: 750 },
  },
};

type Cfg = Phaser.Types.GameObjects.Particles.ParticleEmitterConfig;

/** As texturas são geradas em 2x (nítidas em Full HD): divide a escala por 2. */
function halfScale(cfg: Cfg): Cfg {
  const sc = cfg.scale as { start?: number; end?: number; min?: number; max?: number } | number | undefined;
  if (sc === undefined) return { ...cfg, scale: 0.5 };
  if (typeof sc === 'number') return { ...cfg, scale: sc / 2 };
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(sc)) out[k] = v / 2;
  return { ...cfg, scale: out as Cfg['scale'] };
}

/** Explode partículas e remove o emissor depois. */
function burst(scene: Phaser.Scene, x: number, y: number, fx: ElementFx, count: number, extra: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig = {}): void {
  const em = scene.add.particles(0, 0, fxTexture(scene, fx.shape), halfScale({ ...fx.impact, tint: fx.tints, emitting: false, ...extra })).setDepth(60);
  em.explode(count, x, y);
  const life = typeof fx.impact.lifespan === 'number' ? fx.impact.lifespan : 1000;
  scene.time.delayedCall(life + 200, () => em.destroy());
}

/** Raios em zigue-zague (elétrico). */
function lightning(scene: Phaser.Scene, to: Point, bolts: number): void {
  const g = scene.add.graphics().setDepth(61);
  for (let b = 0; b < bolts; b++) {
    const x0 = to.x + Phaser.Math.Between(-50, 50);
    let x = x0;
    let y = to.y - 160;
    g.lineStyle(4, 0xffee32, 1).beginPath().moveTo(x, y);
    while (y < to.y) {
      x += Phaser.Math.Between(-18, 18);
      y += Phaser.Math.Between(16, 28);
      g.lineTo(x, Math.min(y, to.y));
    }
    g.strokePath();
  }
  scene.tweens.add({ targets: g, alpha: 0, duration: 260, yoyo: false, onComplete: () => g.destroy() });
}

/**
 * Efeito de um golpe: projétil do atacante até o alvo e impacto do elemento.
 * Golpes de efeito (sem dano) mostram uma aura em quem usou.
 */
export async function playMoveFx(scene: Phaser.Scene, element: ElementId, from: Point, to: Point, opts: { power: number; supreme?: boolean }): Promise<void> {
  const fx = FX[element];
  const big = opts.supreme ? 2.5 : opts.power >= 90 ? 1.5 : 1;
  if (opts.power <= 0) {
    // aura em volta de quem usou
    burst(scene, from.x, from.y + 30, fx, Math.round(fx.count * 0.7), { speed: { min: 20, max: 80 }, angle: { min: 240, max: 300 }, gravityY: -120 });
    await new Promise((r) => scene.time.delayedCall(450, r));
    return;
  }
  // projétil com rastro
  const orb = scene.add.image(from.x, from.y, fxTexture(scene, 'orb')).setTint(ELEMENTS[element].color).setScale(0.8 * big).setDepth(62).setBlendMode(Phaser.BlendModes.ADD);
  const trail = scene.add.particles(0, 0, fxTexture(scene, fx.shape), halfScale({ ...fx.impact, speed: { min: 5, max: 40 }, gravityY: 0, lifespan: 300, tint: fx.tints, frequency: 18, follow: orb, scale: { start: 0.9, end: 0 } })).setDepth(61);
  await new Promise<void>((r) => scene.tweens.add({ targets: orb, x: to.x, y: to.y, duration: 260, ease: 'Quad.in', onComplete: () => r() }));
  trail.stop();
  scene.time.delayedCall(400, () => trail.destroy());
  orb.destroy();
  // impacto
  const origin = fx.from === 'above' ? { x: to.x, y: to.y - 140 } : to;
  burst(scene, origin.x, origin.y, fx, Math.round(fx.count * big));
  if (element === 'eletrico') lightning(scene, to, opts.supreme ? 5 : 2);
  if (opts.supreme) {
    const c = Phaser.Display.Color.IntegerToColor(ELEMENTS[element].color);
    scene.cameras.main.flash(350, c.red, c.green, c.blue);
    scene.cameras.main.shake(450, 0.022);
    // segunda onda
    scene.time.delayedCall(220, () => burst(scene, to.x, to.y, fx, fx.count));
  } else if (opts.power >= 90) {
    scene.cameras.main.shake(300, 0.01);
  }
}
