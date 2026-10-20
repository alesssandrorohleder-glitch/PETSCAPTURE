import Phaser from 'phaser';
import { SCENES, UI } from '../config';
import { ITEMS, type ItemData } from '../data/items';
import { GameState } from '../systems/GameState';
import { canUseOn, itemCount, useItemOutside } from '../systems/Inventory';
import { displayName, maxHp } from '../systems/Monster';
import { capsuleTexture } from '../systems/Placeholders';
import { MenuList, type MenuItem } from '../ui/MenuList';
import { choose, notify } from '../ui/Overlay';
import { makePanel, makeText } from '../ui/text';
import { BaseScene } from './BaseScene';

/** Mochila: lista de itens; Poção e Antídoto podem ser usados nos pets. */
export class InventoryScene extends BaseScene {
  private menu?: MenuList;
  private info!: Phaser.GameObjects.Text;
  private money!: Phaser.GameObjects.Text;

  constructor() {
    super(SCENES.Inventory);
  }

  create(): void {
    this.setupScene();
    this.title('Mochila', 40);
    makePanel(this, 24, 76, 420, 380);
    makePanel(this, 464, 76, 472, 380);
    this.add.image(700, 160, capsuleTexture(this)).setDisplaySize(98, 70);
    this.info = makeText(this, 488, 220, '', 18, UI.text, { wordWrap: { width: 424 }, lineSpacing: 6 });
    this.money = makeText(this, 936, 30, '', 20, UI.accent, { fontStyle: 'bold' }).setOrigin(1, 0);
    this.build(0);
  }

  private items(): ItemData[] {
    return Object.values(ITEMS);
  }

  private build(selected: number): void {
    this.menu?.destroy();
    this.money.setText(`Moedas: ${GameState.get().money}`);
    const list: MenuItem[] = this.items().map((it) => ({
      label: `${it.name}   x${itemCount(it.id)}`,
      disabled: itemCount(it.id) <= 0,
      onSelect: () => void this.use(it),
    }));
    list.push({ label: 'Voltar', onSelect: () => this.goTo(SCENES.World) });
    this.menu = new MenuList(this, list, { x: 48, y: 100, itemWidth: 372, itemHeight: 50, gap: 10, onCancel: () => this.goTo(SCENES.World) });
    this.menu.select(selected);
    this.showInfo();
    // atualiza a descrição conforme a seleção muda
    this.input.keyboard!.off('keyup', this.showInfo, this);
    this.input.keyboard!.on('keyup', this.showInfo, this);
    this.input.off('pointermove', this.showInfo, this);
    this.input.on('pointermove', this.showInfo, this);
  }

  private showInfo(): void {
    const it = this.items()[this.menu?.selectedIndex ?? 0];
    if (!it) {
      this.info.setText('');
      return;
    }
    const where = it.kind === 'capture' ? 'Use durante batalhas contra monstros selvagens.' : 'Pode ser usado aqui ou em batalha.';
    this.info.setText(`${it.name}\n\n${it.description}\n\n${where}\n\nVocê tem: ${itemCount(it.id)}`);
  }

  private async use(it: ItemData): Promise<void> {
    const idx = this.menu?.selectedIndex ?? 0;
    this.menu?.setEnabled(false);
    if (it.kind === 'capture') {
      await notify(this, 'Cápsulas só podem ser usadas em batalhas contra monstros selvagens.');
    } else {
      const party = GameState.get().party;
      const i = await choose(this, `Usar ${it.name} em…`, [
        ...party.map((m) => ({ label: `${displayName(m)}  Nv ${m.level}  —  ${m.hp}/${maxHp(m)} HP`, disabled: !canUseOn(it.id, m) })),
        { label: 'Cancelar' },
      ]);
      if (i >= 0 && i < party.length) await notify(this, useItemOutside(it.id, party[i]).msg);
    }
    this.build(idx);
  }
}
