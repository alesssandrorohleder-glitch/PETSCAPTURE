import { UI } from '../config';
import { MenuList, type MenuItem } from '../ui/MenuList';
import { makeText } from '../ui/text';
import { BaseScene } from './BaseScene';

/** Cena provisória: título, descrição e links de navegação. Substituída nas próximas etapas. */
export abstract class StubScene extends BaseScene {
  protected abstract heading: string;
  protected abstract description: string;
  protected abstract links(): MenuItem[];

  create(): void {
    this.setupScene();
    this.title(this.heading, 70);
    makeText(this, this.cx, 120, this.description, 18, UI.textDim, { align: 'center', wordWrap: { width: 760 } }).setOrigin(0.5, 0);
    const links = this.links();
    new MenuList(this, links, { x: this.cx - 160, y: 200, itemWidth: 320, itemHeight: 44, onCancel: links[links.length - 1].onSelect });
  }
}
