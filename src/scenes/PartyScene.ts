import Phaser from 'phaser';
import { SCENES, UI } from '../config';
import { ELEMENTS } from '../data/elements';
import { ITEMS } from '../data/items';
import { getMove } from '../data/moves';
import { getSpecies } from '../data/monsters';
import { GameState } from '../systems/GameState';
import { canUseOn, itemCount, useItemOutside } from '../systems/Inventory';
import { displayName, maxHp, statsOf, supremeMove, xpForLevel, type MonsterInstance } from '../systems/Monster';
import { fitInto, monsterTexture } from '../systems/Placeholders';
import { MenuList, type MenuItem } from '../ui/MenuList';
import { MonsterCard, typeChips } from '../ui/MonsterCard';
import { choose, notify } from '../ui/Overlay';
import { makePanel, makeText } from '../ui/text';
import { BaseScene } from './BaseScene';

const CARD_W = 296;
const CARD_H = 112;
const PER_PAGE = 6;

/** Equipe (até 6) e Caixa. Setas escolhem o pet, Enter vai para as ações, Esc volta. */
export class PartyScene extends BaseScene {
  private mode: 'party' | 'box' = 'party';
  private index = 0;
  private page = 0;
  private focus: 'cards' | 'actions' = 'cards';
  private cards: MonsterCard[] = [];
  private detail?: Phaser.GameObjects.Container;
  private actions?: MenuList;
  private header!: Phaser.GameObjects.Text;
  private busy = false;

  constructor() {
    super(SCENES.Party);
  }

  create(): void {
    this.setupScene();
    this.mode = 'party';
    this.index = 0;
    this.page = 0;
    this.focus = 'cards';
    this.busy = false;
    this.header = makeText(this, 24, 18, '', 28, UI.accent, { fontStyle: 'bold' });
    this.input.keyboard!.on('keydown', (e: KeyboardEvent) => this.onKey(e));
    this.render();
  }

  private get list(): MonsterInstance[] {
    const st = GameState.get();
    return this.mode === 'party' ? st.party : st.box.slice(this.page * PER_PAGE, (this.page + 1) * PER_PAGE);
  }

  private get selected(): MonsterInstance | undefined {
    return this.list[this.index];
  }

  private render(): void {
    const st = GameState.get();
    this.cards.forEach((c) => c.destroy());
    this.cards = [];
    this.children.getByName('empty')?.destroy();
    const pages = Math.max(1, Math.ceil(st.box.length / PER_PAGE));
    this.header.setText(this.mode === 'party' ? `Equipe (${st.party.length}/6)` : `Caixa (${st.box.length}) — página ${this.page + 1}/${pages}`);
    this.index = Math.min(this.index, Math.max(0, this.list.length - 1));
    this.list.forEach((m, i) => {
      const x = 24 + (i % 2) * (CARD_W + 10);
      const y = 64 + Math.floor(i / 2) * (CARD_H + 10);
      const note = this.mode === 'party' && i === 0 ? '★ primeiro' : '';
      const card = new MonsterCard(this, x, y, CARD_W, CARD_H, m, note);
      card.bg.setInteractive({ useHandCursor: true }).on('pointerup', () => {
        if (this.busy) return;
        this.index = i;
        this.setFocus('cards');
        this.refreshSelection();
      });
      this.cards.push(card);
    });
    if (!this.list.length) {
      makeText(this, 24, 90, 'A Caixa está vazia. Monstros capturados com a equipe cheia vêm para cá.', 18, UI.textDim, { wordWrap: { width: 580 } }).setName('empty');
    }
    this.refreshSelection();
  }

  private refreshSelection(): void {
    this.cards.forEach((c, i) => c.setSelected(i === this.index));
    this.renderDetail();
    this.buildActions(); // ações dependem do pet selecionado
  }

  private renderDetail(): void {
    this.detail?.destroy();
    const m = this.selected;
    const x = 644;
    const y = 64;
    const box = this.add.container(0, 0);
    box.add(makePanel(this, x, y, 292, 400));
    this.detail = box;
    if (!m) return;
    const sp = getSpecies(m.species);
    const st = statsOf(m);
    box.add(fitInto(this.add.image(x + 70, y + 72, monsterTexture(this, m.species)), 110, 110));
    const nm = displayName(m);
    box.add(makeText(this, x + 136, y + 18, nm, nm.length > 12 ? 15 : 20, UI.text, { fontStyle: 'bold' }));
    box.add(makeText(this, x + 136, y + 46, `Nv ${m.level}`, 16, UI.accent));
    box.add(typeChips(this, x + 136, y + 72, m, 60));
    const toNext = m.level >= 100 ? 0 : xpForLevel(m.level + 1) - m.xp;
    box.add(makeText(this, x + 136, y + 98, `${toNext} XP para o Nv ${m.level + 1}`, 12, '#7dd3fc', { wordWrap: { width: 150 } }));
    const line = (i: number, label: string, value: string) => {
      box.add(makeText(this, x + 20, y + 140 + i * 22, label, 15, UI.textDim));
      box.add(makeText(this, x + 150, y + 140 + i * 22, value, 15, UI.text, { fontStyle: 'bold' }));
    };
    line(0, 'Vida', `${m.hp}/${maxHp(m)}`);
    line(1, 'Ataque', String(st.atk));
    line(2, 'Defesa', String(st.def));
    line(3, 'Velocidade', String(st.spd));
    box.add(makeText(this, x + 20, y + 236, 'Golpes', 15, UI.accent, { fontStyle: 'bold' }));
    const moves = [...m.moves];
    const sup = supremeMove(m.species, m.level);
    if (sup) moves.push(sup);
    moves.forEach((id, i) => {
      const mv = getMove(id);
      box.add(this.add.rectangle(x + 20, y + 262 + i * 24, 8, 16, ELEMENTS[mv.type].color).setOrigin(0));
      box.add(makeText(this, x + 34, y + 260 + i * 24, `${mv.supreme ? '★ ' : ''}${mv.name}`, 14, UI.text));
      box.add(makeText(this, x + 276, y + 260 + i * 24, mv.power ? `${mv.power}` : '—', 14, UI.textDim).setOrigin(1, 0));
    });
    box.add(makeText(this, x + 20, y + 382, sp.description, 11, UI.textDim, { wordWrap: { width: 256 } }).setOrigin(0, 1));
  }

  private buildActions(): void {
    this.actions?.destroy();
    const st = GameState.get();
    const m = this.selected;
    const items: MenuItem[] =
      this.mode === 'party'
        ? [
            { label: 'Ser o primeiro', disabled: this.index === 0, onSelect: () => this.run(async () => GameState.moveToFront(this.index)) },
            { label: 'Usar item', disabled: !m, onSelect: () => this.run(() => this.useItem()) },
            { label: 'Guardar', disabled: st.party.length <= 1, onSelect: () => this.run(() => this.deposit()) },
            { label: `Caixa (${st.box.length})`, onSelect: () => this.switchMode('box') },
            { label: 'Voltar', onSelect: () => this.leave() },
          ]
        : [
            { label: 'Levar p/ equipe', disabled: !m, onSelect: () => this.run(() => this.withdraw()) },
            { label: 'Trocar com…', disabled: !m, onSelect: () => this.run(() => this.swap()) },
            { label: 'Próx. página', disabled: st.box.length <= PER_PAGE, onSelect: () => this.nextPage() },
            { label: 'Equipe', onSelect: () => this.switchMode('party') },
            { label: 'Voltar', onSelect: () => this.leave() },
          ];
    this.actions = new MenuList(this, items, { x: 24, y: 478, columns: 5, itemWidth: 176, itemHeight: 46, gap: 8, fontSize: 17, onCancel: () => this.setFocus('cards') });
    this.actions.keyboard = this.focus === 'actions';
    this.actions.setHighlight(this.focus === 'actions');
  }

  private setFocus(f: 'cards' | 'actions'): void {
    this.focus = f;
    if (this.actions) {
      this.actions.keyboard = f === 'actions';
      this.actions.setHighlight(f === 'actions');
    }
    this.cards.forEach((c, i) => c.setSelected(i === this.index));
  }

  private onKey(e: KeyboardEvent): void {
    if (this.busy || this.focus !== 'cards') return;
    const n = this.list.length;
    const move = (d: number) => {
      if (!n) return;
      this.index = (this.index + d + n) % n;
      this.refreshSelection();
    };
    switch (e.code) {
      case 'ArrowLeft': case 'KeyA': move(-1); break;
      case 'ArrowRight': case 'KeyD': move(1); break;
      case 'ArrowUp': case 'KeyW': move(-2); break;
      case 'ArrowDown': case 'KeyS': move(2); break;
      case 'Enter': case 'Space': case 'KeyZ':
        // espera a tecla soltar para o menu não receber o mesmo Enter
        this.time.delayedCall(0, () => this.setFocus('actions'));
        break;
      case 'Escape': case 'KeyX': case 'Backspace': this.leave(); break;
    }
  }

  /** Executa uma ação que pode abrir janelas e depois redesenha. */
  private run(fn: () => Promise<unknown> | unknown): void {
    if (this.busy) return;
    this.busy = true;
    this.actions?.setEnabled(false);
    void Promise.resolve(fn()).then(() => {
      this.busy = false;
      this.focus = 'cards';
      this.render();
    });
  }

  private async useItem(): Promise<void> {
    const m = this.selected!;
    const usable = Object.values(ITEMS).filter((it) => it.kind !== 'capture' && itemCount(it.id) > 0);
    if (!usable.length) return notify(this, 'Você não tem itens que possam ser usados aqui.');
    const i = await choose(this, `Usar em ${displayName(m)}`, [
      ...usable.map((it) => ({ label: `${it.name}  x${itemCount(it.id)}`, hint: it.description, disabled: !canUseOn(it.id, m) })),
      { label: 'Cancelar' },
    ]);
    if (i < 0 || i >= usable.length) return;
    await notify(this, useItemOutside(usable[i].id, m).msg);
  }

  private async deposit(): Promise<void> {
    const m = this.selected!;
    if (!GameState.deposit(this.index)) return notify(this, 'Você precisa manter pelo menos um pet de pé na equipe.');
    await notify(this, `${displayName(m)} foi guardado na Caixa.`);
  }

  private async withdraw(): Promise<void> {
    const m = this.selected!;
    if (!GameState.withdraw(this.page * PER_PAGE + this.index)) return notify(this, 'A equipe está cheia (6). Use "Trocar com…".');
    await notify(this, `${displayName(m)} entrou na equipe!`);
  }

  private async swap(): Promise<void> {
    const m = this.selected!;
    const party = GameState.get().party;
    const i = await choose(this, `Trocar ${displayName(m)} por…`, [...party.map((p) => ({ label: `${displayName(p)}  Nv ${p.level}` })), { label: 'Cancelar' }]);
    if (i < 0 || i >= party.length) return;
    const out = party[i];
    if (!GameState.swap(i, this.page * PER_PAGE + this.index)) return notify(this, 'Não dá: a equipe ficaria sem nenhum pet de pé.');
    await notify(this, `${displayName(m)} entrou na equipe e ${displayName(out)} foi para a Caixa.`);
  }

  private switchMode(mode: 'party' | 'box'): void {
    this.mode = mode;
    this.index = 0;
    this.page = 0;
    this.focus = 'cards';
    this.render();
  }

  private nextPage(): void {
    const pages = Math.ceil(GameState.get().box.length / PER_PAGE);
    this.page = (this.page + 1) % Math.max(1, pages);
    this.index = 0;
    this.render();
  }

  private leave(): void {
    if (this.busy) return;
    this.goTo(SCENES.World);
  }
}
