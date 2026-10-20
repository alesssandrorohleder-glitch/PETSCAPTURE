import Phaser from 'phaser';
import { FONT, UI } from '../config';

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

/** Fixa um objeto (e todos os filhos, se for container) na câmera — necessário para o toque funcionar com a câmera rolando. */
export function fixToCamera<T extends Phaser.GameObjects.GameObject>(obj: T): T {
  const o = obj as unknown as Phaser.GameObjects.Components.ScrollFactor;
  o.setScrollFactor?.(0);
  if (obj instanceof Phaser.GameObjects.Container) obj.list.forEach((c) => fixToCamera(c));
  return obj;
}
