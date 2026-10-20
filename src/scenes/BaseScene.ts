import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, RENDER_SCALE, UI } from '../config';
import { makeText } from '../ui/text';

/** Utilidades comuns: transição com fade e título de cena. */
export abstract class BaseScene extends Phaser.Scene {
  private transitioning = false;

  protected get cx(): number {
    return GAME_WIDTH / 2;
  }
  protected get cy(): number {
    return GAME_HEIGHT / 2;
  }

  /** Chamar no início de create(). Câmera em Full HD mostrando a área de layout 960×540. */
  protected setupScene(): void {
    this.transitioning = false;
    fitCamera(this.cameras.main).setBackgroundColor(UI.bg);
    this.cameras.main.fadeIn(200, 0, 0, 0);
  }

  protected goTo(key: string, data?: object): void {
    if (this.transitioning) return;
    this.transitioning = true;
    for (const cam of this.cameras.cameras) cam.fadeOut(200, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start(key, data));
  }

  protected title(text: string, y = 48): Phaser.GameObjects.Text {
    return makeText(this, this.cx, y, text, 34, UI.accent, { fontStyle: 'bold' }).setOrigin(0.5);
  }
}

/** Ajusta uma câmera para mostrar a área de layout (0..960, 0..540) em Full HD. */
export function fitCamera(cam: Phaser.Cameras.Scene2D.Camera): Phaser.Cameras.Scene2D.Camera {
  return cam.setZoom(RENDER_SCALE).centerOn(GAME_WIDTH / 2, GAME_HEIGHT / 2);
}

/** Utilidades de animação com Promise (para sequenciar com await). */
export const wait = (scene: Phaser.Scene, ms: number): Promise<void> =>
  new Promise((r) => scene.time.delayedCall(ms, () => r()));

export const tweenP = (scene: Phaser.Scene, cfg: Phaser.Types.Tweens.TweenBuilderConfig): Promise<void> =>
  new Promise((r) => scene.tweens.add({ ...cfg, onComplete: () => r() }));
