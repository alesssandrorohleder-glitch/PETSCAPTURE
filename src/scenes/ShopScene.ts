import Phaser from 'phaser';
import { SCENES, UI } from '../config';
import { ITEMS, type ItemData } from '../data/items';
import { GameState } from '../systems/GameState';
import { buy, itemCount } from '../systems/Inventory';
import { AdManager } from '../systems/AdManager';
import { watchForCoins } from '../systems/Rewards';
import { ADS } from '../ads.config';
import { MenuList, type MenuItem } from '../ui/MenuList';
import { choose, notify } from '../ui/Overlay';
import { makePanel, makeText } from '../ui/text';
import { BaseScene } from './BaseScene';

/** Loja da vila: compra de Cápsulas, Poções e Antídotos. */
export class ShopScene extends BaseScene {
  private menu?: MenuList;
  private money!: Phaser.GameObjects.Text;

  constructor() {
    super(SCENES.Shop);
  }

  create(): void {
    this.setupScene();
    this.title('Loja da Vila', 40);
    makePanel(this, 24, 76, 912, 76);
    makeText(this, 48, 96, 'Vendedor Teo: "Olá, domador! Cápsulas, poções, antídotos... tudo o que precisa para a jornada!"', 17, UI.text, { wordWrap: { width: 860 } });
    this.money = makeText(this, 936, 30, '', 22, UI.accent, { fontStyle: 'bold' }).setOrigin(1, 0);
    this.build(0);
  }

  private build(selected: number): void {
    this.menu?.destroy();
    this.money.setText(`Moedas: ${GameState.get().money}`);
    const items: MenuItem[] = Object.values(ITEMS).map((it) => ({
      label: `${it.name}  —  ${it.price} moedas`,
      hint: `${it.description}  (você tem ${itemCount(it.id)})`,
      onSelect: () => void this.purchase(it),
    }));
    if (AdManager.enabled) {
      items.push({
        label: `▶ Ganhar ${ADS.rewardCoins} moedas`,
        hint: 'assistindo a um anúncio (opcional)',
        onSelect: () => {
          const idx = this.menu?.selectedIndex ?? 0;
          this.menu?.setEnabled(false);
          void watchForCoins().then(async (msg) => {
            await notify(this, msg);
            this.build(idx);
          });
        },
      });
    }
    items.push({ label: 'Sair da loja', onSelect: () => this.goTo(SCENES.World) });
    this.menu = new MenuList(this, items, { x: 180, y: 168, itemWidth: 600, itemHeight: 56, gap: 10, fontSize: 21, onCancel: () => this.goTo(SCENES.World) });
    this.menu.select(selected);
  }

  private async purchase(it: ItemData): Promise<void> {
    const idx = this.menu?.selectedIndex ?? 0;
    this.menu?.setEnabled(false);
    const money = GameState.get().money;
    const qtys = [1, 5, 10];
    const i = await choose(this, `Quantas ${it.name}s? (você tem ${money} moedas)`, [
      ...qtys.map((q) => ({ label: `${q}x  —  ${q * it.price} moedas`, disabled: q * it.price > money })),
      { label: 'Cancelar' },
    ]);
    if (i >= 0 && i < qtys.length) await notify(this, buy(it.id, qtys[i]).msg);
    this.build(idx);
  }
}
