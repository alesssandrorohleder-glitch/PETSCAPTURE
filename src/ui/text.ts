import Phaser from 'phaser';
import { FONT, RENDER_SCALE, UI } from '../config';

export function makeText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  size = 20,
  color: string = UI.text,
  style: Phaser.Types.GameObjects.Text.TextStyle = {},
): Phaser.GameObjects.Text {
  return scene.add.text(x, y, text, {
    fontFamily: FONT,
    fontSize: `${size}px`,
    color,
    resolution: RENDER_SCALE,
    ...style,
  });
}

export function makePanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: number = UI.panel,
  alpha = 0.95,
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(fill, alpha);
  g.fillRoundedRect(x, y, w, h, 12);
  g.lineStyle(3, UI.border, 1);
  g.strokeRoundedRect(x, y, w, h, 12);
  return g;
}

/**
 * Marca um objeto como interface fixa na tela. Com a renderização em Full HD, a cena do
 * mapa tem uma câmera só para a interface (que nunca rola), então não é preciso mudar o
 * scrollFactor — e mudar quebraria o toque com a câmera em zoom. Mantido como ponto único
 * caso a estratégia mude.
 */
export function fixToCamera<T extends Phaser.GameObjects.GameObject>(obj: T): T {
  return obj;
}
