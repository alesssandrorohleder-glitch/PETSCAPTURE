import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, UI } from '../config';
import type { Controls } from '../systems/Controls';
import { MenuList } from './MenuList';
import { fixToCamera, makePanel, makeText } from './text';

/**
 * Caixa de diálogo com efeito de máquina de escrever.
 * Avança com Enter/Espaço/Z, botão A ou toque na caixa.
 */
export class DialogBox {
  private container: Phaser.GameObjects.Container;
  private text: Phaser.GameObjects.Text;
  private nameTag: Phaser.GameObjects.Text;
  private arrow: Phaser.GameObjects.Text;
  private typing?: Phaser.Time.TimerEvent;
  private full = '';
  private advance?: () => void;
  open = false;

  constructor(private scene: Phaser.Scene, controls: Controls) {
    const h = 130;
    const y = GAME_HEIGHT - h - 12;
    const panel = makePanel(scene, 12, y, GAME_WIDTH - 24, h);
    const hit = scene.add.zone(12, y, GAME_WIDTH - 24, h).setOrigin(0).setInteractive();
    this.nameTag = makeText(scene, 34, y + 12, '', 18, UI.accent, { fontStyle: 'bold' });
    this.text = makeText(scene, 34, y + 40, '', 21, UI.text, { wordWrap: { width: GAME_WIDTH - 90 }, lineSpacing: 6 });
    this.arrow = makeText(scene, GAME_WIDTH - 50, y + h - 34, '▼', 18, UI.accent);
    scene.tweens.add({ targets: this.arrow, y: '+=5', yoyo: true, repeat: -1, duration: 350 });
    this.container = scene.add.container(0, 0, [panel, hit, this.nameTag, this.text, this.arrow]).setDepth(9000).setVisible(false);
    fixToCamera(this.container);
    hit.on('pointerup', () => this.next());
    controls.on('action', () => this.next());
  }

  private next(): void {
    if (!this.open) return;
    if (this.typing && this.typing.getRemaining() > 0) {
      this.typing.remove();
      this.typing = undefined;
      this.text.setText(this.full);
      this.arrow.setVisible(true);
      return;
    }
    this.advance?.();
  }

  private type(line: string): void {
    this.full = line;
    this.text.setText('');
    this.arrow.setVisible(false);
    let i = 0;
    this.typing = this.scene.time.addEvent({
      delay: 18,
      repeat: line.length - 1,
      callback: () => {
        this.text.setText(line.slice(0, ++i));
        if (i >= line.length) this.arrow.setVisible(true);
      },
    });
  }

  /** Mostra as falas uma a uma; resolve quando o jogador fecha a última. */
  show(lines: string[], speaker = ''): Promise<void> {
    return new Promise((resolve) => {
      let idx = 0;
      this.open = true;
      this.container.setVisible(true);
      this.nameTag.setText(speaker);
      this.type(lines[0] ?? '');
      this.advance = () => {
        idx++;
        if (idx < lines.length) return this.type(lines[idx]);
        this.advance = undefined;
        this.container.setVisible(false);
        // fecha no próximo frame para a mesma tecla não reabrir uma interação
        this.scene.time.delayedCall(60, () => {
          this.open = false;
          resolve();
        });
      };
    });
  }

  /** Pergunta com opções; resolve com o índice escolhido (cancelar = última opção). */
  ask(question: string, options: string[], speaker = ''): Promise<number> {
    return new Promise((resolve) => {
      this.open = true;
      this.container.setVisible(true);
      this.nameTag.setText(speaker);
      this.type(question);
      this.advance = undefined;
      const w = 180;
      const finish = (i: number) => {
        menu.destroy();
        this.container.setVisible(false);
        this.scene.time.delayedCall(60, () => {
          this.open = false;
          resolve(i);
        });
      };
      const menu = new MenuList(
        this.scene,
        options.map((label, i) => ({ label, onSelect: () => finish(i) })),
        { x: GAME_WIDTH - w - 24, y: GAME_HEIGHT - 150 - options.length * 52, itemWidth: w, onCancel: () => finish(options.length - 1) },
      );
      fixToCamera(menu).setDepth(9100);
    });
  }
}
