import { SCENES, UI } from '../config';
import { MenuList } from '../ui/MenuList';
import { makeText } from '../ui/text';
import { BaseScene } from './BaseScene';

export interface GameOverData {
  victory: boolean;
  title?: string;
  message?: string;
}

export class GameOverScene extends BaseScene {
  constructor() {
    super(SCENES.GameOver);
  }

  create(data: GameOverData): void {
    this.setupScene();
    const victory = data?.victory ?? true;
    this.title(data?.title ?? (victory ? 'Vitória!' : 'Derrota...'), 140).setColor(victory ? UI.accent : UI.danger).setFontSize(56);
    makeText(this, this.cx, 220, data?.message ?? (victory ? 'Seus pets ficaram mais fortes.' : 'Seus pets foram levados ao Centro de Cura.'), 20, UI.text, { align: 'center', wordWrap: { width: 760 }, lineSpacing: 8 }).setOrigin(0.5);
    new MenuList(this, [{ label: 'Continuar', onSelect: () => this.goTo(SCENES.World) }], { x: this.cx - 140, y: 300 });
  }
}
