import Phaser from 'phaser';

/** Barra de vida/XP animada. Verde > 50%, amarela > 20%, vermelha abaixo. */
export class HealthBar extends Phaser.GameObjects.Container {
  private fill: Phaser.GameObjects.Rectangle;
  private ratio = 1;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private barW: number,
    h: number,
    private fixedColor?: number,
  ) {
    super(scene, x, y);
    const bg = scene.add.rectangle(0, 0, barW, h, 0x1a1530).setOrigin(0).setStrokeStyle(2, 0x000000, 0.6);
    this.fill = scene.add.rectangle(2, 2, barW - 4, h - 4, fixedColor ?? 0x4ade80).setOrigin(0);
    this.add([bg, this.fill]);
    scene.add.existing(this);
  }

  private color(r: number): number {
    if (this.fixedColor !== undefined) return this.fixedColor;
    return r > 0.5 ? 0x4ade80 : r > 0.2 ? 0xfacc15 : 0xef4444;
  }

  set(value: number, max: number): void {
    this.ratio = Phaser.Math.Clamp(max > 0 ? value / max : 0, 0, 1);
    this.fill.width = (this.barW - 4) * this.ratio;
    this.fill.setFillStyle(this.color(this.ratio));
  }

  /** Anima até o novo valor; `onStep` recebe o valor intermediário (para o texto de HP). */
  animateTo(value: number, max: number, duration = 450, onStep?: (v: number) => void): Promise<void> {
    const from = this.ratio;
    const to = Phaser.Math.Clamp(max > 0 ? value / max : 0, 0, 1);
    return new Promise((resolve) => {
      if (from === to) {
        onStep?.(value);
        return resolve();
      }
      this.scene.tweens.addCounter({
        from,
        to,
        duration,
        onUpdate: (tw) => {
          const r = tw.getValue() ?? to;
          this.ratio = r;
          this.fill.width = (this.barW - 4) * r;
          this.fill.setFillStyle(this.color(r));
          onStep?.(Math.round(r * max));
        },
        onComplete: () => resolve(),
      });
    });
  }
}
