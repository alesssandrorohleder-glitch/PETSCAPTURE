import { SCENES } from '../config';
import { AudioManager } from '../systems/AudioManager';
import { Settings } from '../systems/Settings';
import { MenuList, type MenuItem } from '../ui/MenuList';
import { BaseScene } from './BaseScene';

export class OptionsScene extends BaseScene {
  constructor() {
    super(SCENES.Options);
  }

  create(): void {
    this.setupScene();
    this.title('Opções', 80);
    const back = () => this.goTo(SCENES.Menu);
    const items = (): MenuItem[] => [
      {
        label: `Som: ${Settings.get().soundOn ? 'Ligado' : 'Desligado'}`,
        onSelect: () => {
          AudioManager.setSound(this.game, !Settings.get().soundOn);
          menu.setItems(items());
        },
      },
      { label: 'Voltar', onSelect: back },
    ];
    const menu = new MenuList(this, items(), { x: this.cx - 150, y: 200, itemWidth: 300, onCancel: back });
  }
}
