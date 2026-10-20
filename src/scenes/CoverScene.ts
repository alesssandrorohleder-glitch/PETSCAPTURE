import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, UI } from '../config';
import { ELEMENTS } from '../data/elements';
import { TRAINERS } from '../data/trainers';
import { fitInto, fxTexture, monsterTexture } from '../systems/Placeholders';
import { makeText } from '../ui/text';
import { fitCamera } from './BaseScene';

/**
 * Arte de capa para compartilhamento (og-cover.png). Só carrega com ?cover=1;
 * scripts/cover.mjs tira o print. Troque por uma arte sua quando tiver.
 */
export class CoverScene extends Phaser.Scene {
  constructor() {
    super('Cover');
  }

  create(): void {
    fitCamera(this.cameras.main).setBackgroundColor(UI.bg);
    const g = this.add.graphics();
    g.fillGradientStyle(0x2b1b4a, 0x2b1b4a, 0x14112b, 0x14112b, 1).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    Object.values(ELEMENTS).forEach((el, i) => {
      for (let k = 0; k < 6; k++) {
        this.add.image(Phaser.Math.Between(0, GAME_WIDTH), Phaser.Math.Between(0, GAME_HEIGHT), fxTexture(this, 'orb')).setTint(el.color).setAlpha(0.25 + (k % 3) * 0.1).setScale(0.3 + ((i + k) % 4) * 0.2).setBlendMode('ADD');
      }
    });
    const logo = makeText(this, GAME_WIDTH / 2, 120, 'Elementais', 96, UI.accent, { fontStyle: 'bold' }).setOrigin(0.5);
    logo.setShadow(0, 6, '#000000', 16, true, true);
    makeText(this, GAME_WIDTH / 2, 196, 'A Jornada dos Domadores', 34, UI.text).setOrigin(0.5);
    const pets = TRAINERS.map((t) => t.starter);
    pets.forEach((sp, i) => {
      const x = GAME_WIDTH / 2 + (i - (pets.length - 1) / 2) * 140;
      const y = 360 + (i % 2) * 24;
      this.add.ellipse(x, y + 62, 110, 22, 0x000000, 0.35);
      fitInto(this.add.image(x, y, monsterTexture(this, sp)), 130, 130);
    });
    makeText(this, GAME_WIDTH / 2, 500, 'Capture • Evolua • Vença o rival nas Ruínas da Lua', 22, UI.textDim).setOrigin(0.5);
  }
}
