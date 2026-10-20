import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, UI } from '../config';
import { ELEMENTS } from '../data/elements';
import { SPECIES } from '../data/monsters';
import { fitInto, monsterTexture } from '../systems/Placeholders';
import { makeText } from '../ui/text';
import { fitCamera } from './BaseScene';

/**
 * Galeria de todas as espécies (abra com ?gallery=1). Útil para revisar os
 * desenhos provisórios e conferir suas artes depois de colocá-las em public/assets.
 * Setas ← → (ou toque nas laterais) trocam a página.
 */
export class GalleryScene extends Phaser.Scene {
  private page = 0;
  private items: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super('Gallery');
  }

  create(): void {
    fitCamera(this.cameras.main).setBackgroundColor(UI.bg);
    this.input.keyboard?.on('keydown-RIGHT', () => this.show(this.page + 1));
    this.input.keyboard?.on('keydown-LEFT', () => this.show(this.page - 1));
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.show(this.page + (p.x < this.scale.width / 2 ? -1 : 1)));
    // começa no ?page=N (útil para prints)
    this.show(Number(new URLSearchParams(window.location.search).get('page')) || 0);
  }

  private show(page: number): void {
    const all = Object.values(SPECIES);
    const per = 18;
    const pages = Math.ceil(all.length / per);
    this.page = (page + pages) % pages;
    this.items.forEach((o) => o.destroy());
    this.items = [];
    this.items.push(makeText(this, GAME_WIDTH / 2, 18, `Galeria de espécies — página ${this.page + 1}/${pages}  (← →)`, 18, UI.accent, { fontStyle: 'bold' }).setOrigin(0.5, 0));
    all.slice(this.page * per, (this.page + 1) * per).forEach((sp, i) => {
      const col = i % 6;
      const row = Math.floor(i / 6);
      const x = 80 + col * 160;
      const y = 112 + row * 146;
      this.items.push(fitInto(this.add.image(x, y, monsterTexture(this, sp.id)), 124, 124));
      this.items.push(makeText(this, x, y + 58, sp.name, 14, UI.text, { fontStyle: 'bold' }).setOrigin(0.5, 0));
      this.items.push(makeText(this, x, y + 75, sp.types.map((t) => ELEMENTS[t].name).join(' / '), 11, ELEMENTS[sp.types[0]].css).setOrigin(0.5, 0));
    });
    this.items.push(makeText(this, GAME_WIDTH / 2, GAME_HEIGHT - 4, 'Coloque suas artes em public/assets/monsters/<id>.png para substituir', 11, UI.textDim).setOrigin(0.5, 1));
  }
}
