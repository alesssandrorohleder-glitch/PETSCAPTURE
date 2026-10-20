import { SCENES, UI } from '../config';
import { MenuList } from '../ui/MenuList';
import { makeText } from '../ui/text';
import { BaseScene } from './BaseScene';
import { Storage } from '../systems/Storage';

export const SAVE_KEY = 'elementais.save';

export class MenuScene extends BaseScene {
  constructor() {
    super(SCENES.Menu);
  }

  create(): void {
    this.setupScene();
    this.title('Elementais', 120).setFontSize(64);
    makeText(this, this.cx, 180, 'A Jornada dos Domadores', 26, UI.text).setOrigin(0.5);

    const hasSave = Storage.has(SAVE_KEY);
    new MenuList(
      this,
      [
        { label: 'Novo Jogo', onSelect: () => this.goTo(SCENES.TrainerSelect) },
        { label: 'Continuar', disabled: !hasSave, onSelect: () => this.goTo(SCENES.World) },
        { label: 'Opções', onSelect: () => this.goTo(SCENES.Options) },
      ],
      { x: this.cx - 140, y: 250 },
    );
    makeText(this, this.cx, 510, 'Setas/WASD + Enter  •  ou toque na tela', 15, UI.textDim).setOrigin(0.5);
  }
}
