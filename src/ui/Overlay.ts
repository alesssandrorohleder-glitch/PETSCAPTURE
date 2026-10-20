import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, UI } from '../config';
import { MenuList, type MenuItem } from './MenuList';
import { makePanel, makeText } from './text';

export interface ChoiceOption {
  label: string;
  hint?: string;
  disabled?: boolean;
}

/**
 * Lista de escolha por cima da tela. Resolve com o índice escolhido,
 * ou -1 se o jogador cancelar (Esc/X ou tocar fora).
 */
export function choose(scene: Phaser.Scene, title: string, options: ChoiceOption[], width = 520): Promise<number> {
  return new Promise((resolve) => {
    const itemH = options.some((o) => o.hint) ? 52 : 44;
    const h = Math.min(GAME_HEIGHT - 40, 86 + options.length * (itemH + 8));
    const x = (GAME_WIDTH - width) / 2;
    const y = (GAME_HEIGHT - h) / 2;
    const box = scene.add.container(0, 0).setDepth(9500);
    const shade = scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.5).setOrigin(0).setInteractive();
    box.add([shade, makePanel(scene, x, y, width, h)]);
    box.add(makeText(scene, GAME_WIDTH / 2, y + 26, title, title.length > 44 ? 16 : 20, UI.accent, { fontStyle: 'bold', align: 'center', wordWrap: { width: width - 40 } }).setOrigin(0.5));
    let done = false;
    const finish = (i: number) => {
      if (done) return;
      done = true;
      menu.destroy();
      box.destroy();
      resolve(i);
    };
    shade.on('pointerup', () => finish(-1));
    const items: MenuItem[] = options.map((o, i) => ({ label: o.label, hint: o.hint, disabled: o.disabled, onSelect: () => finish(i) }));
    const menu = new MenuList(scene, items, { x: x + 24, y: y + 56, itemWidth: width - 48, itemHeight: itemH, gap: 8, fontSize: 18, onCancel: () => finish(-1) });
    menu.setDepth(9600);
  });
}

/** Mensagem simples com botão OK. */
export async function notify(scene: Phaser.Scene, text: string): Promise<void> {
  await choose(scene, text, [{ label: 'OK' }], 560);
}
