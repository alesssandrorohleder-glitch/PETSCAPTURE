import Phaser from 'phaser';
import { UI } from '../config';
import { ELEMENTS } from '../data/elements';
import { getSpecies } from '../data/monsters';
import { STATUS_INFO } from '../systems/BattleEngine';
import { displayName, maxHp, type MonsterInstance } from '../systems/Monster';
import { fitInto, monsterTexture } from '../systems/Placeholders';
import { HealthBar } from './HealthBar';
import { makeText } from './text';

/** Chips de tipo (e status) lado a lado. */
export function typeChips(scene: Phaser.Scene, x: number, y: number, mon: MonsterInstance, w = 64): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);
  getSpecies(mon.species).types.forEach((t, i) => {
    c.add(scene.add.rectangle(i * (w + 4), 0, w, 16, ELEMENTS[t].color).setOrigin(0));
    c.add(makeText(scene, i * (w + 4) + w / 2, 8, ELEMENTS[t].name.toUpperCase(), 10, '#14112b', { fontStyle: 'bold' }).setOrigin(0.5));
  });
  if (mon.status) {
    const info = STATUS_INFO[mon.status];
    const sx = getSpecies(mon.species).types.length * (w + 4);
    c.add(scene.add.rectangle(sx, 0, 46, 16, info.color).setOrigin(0));
    c.add(makeText(scene, sx + 23, 8, info.short, 10, '#14112b', { fontStyle: 'bold' }).setOrigin(0.5));
  }
  return c;
}

/** Cartão compacto de um monstro: imagem, nome, nível, tipos e vida. */
export class MonsterCard extends Phaser.GameObjects.Container {
  readonly bg: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, x: number, y: number, w: number, h: number, mon: MonsterInstance, note = '') {
    super(scene, x, y);
    scene.add.existing(this);
    const fainted = mon.hp <= 0;
    this.bg = scene.add.rectangle(0, 0, w, h, fainted ? 0x3a1f2e : UI.panelLight).setOrigin(0).setStrokeStyle(2, UI.border, 0.7);
    const img = fitInto(scene.add.image(48, h / 2, monsterTexture(scene, mon.species)), 78, h - 16);
    if (fainted) img.setTint(0x777777);
    const label = displayName(mon);
    const name = makeText(scene, 96, 10, label, label.length > 12 ? 15 : 19, UI.text, { fontStyle: 'bold' });
    const lv = makeText(scene, w - 12, 12, `Nv ${mon.level}`, 16, UI.accent).setOrigin(1, 0);
    const chips = typeChips(scene, 96, 38, mon);
    const hp = new HealthBar(scene, 96, h - 36, w - 110, 12);
    hp.set(mon.hp, maxHp(mon));
    const hpT = makeText(scene, w - 12, h - 20, fainted ? 'desmaiado' : `${mon.hp}/${maxHp(mon)} HP`, 13, fainted ? UI.danger : UI.textDim).setOrigin(1, 0);
    this.add([this.bg, img, name, lv, chips, hp, hpT]);
    if (note) this.add(makeText(scene, 96, h - 20, note, 12, UI.accent));
    this.setSize(w, h);
  }

  setSelected(on: boolean): void {
    this.bg.setStrokeStyle(on ? 4 : 2, on ? 0xffd166 : UI.border, on ? 1 : 0.7);
  }
}
