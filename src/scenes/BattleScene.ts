import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SCENES, UI } from '../config';
import { ELEMENTS } from '../data/elements';
import { getItem, ITEMS } from '../data/items';
import { getMap } from '../data/maps';
import { getMove, type MoveData } from '../data/moves';
import { getSpecies } from '../data/monsters';
import { AudioManager } from '../systems/AudioManager';
import { BattleEngine, type BattleEvent, type BattleKind, type PlayerAction, type Side } from '../systems/BattleEngine';
import { Controls } from '../systems/Controls';
import { GameState } from '../systems/GameState';
import { displayName, maxHp, type MonsterInstance } from '../systems/Monster';
import { monsterTexture } from '../systems/Placeholders';
import { HealthBar } from '../ui/HealthBar';
import { MenuList, type MenuItem } from '../ui/MenuList';
import { makePanel, makeText } from '../ui/text';
import { BaseScene, tweenP } from './BaseScene';

export interface BattleData {
  kind: BattleKind;
  enemies: MonsterInstance[];
  enemyName?: string;
  /** recompensa extra em moedas (treinadores) */
  prize?: number;
}

interface SideView {
  sprite: Phaser.GameObjects.Image;
  home: { x: number; y: number };
  size: number;
  name: Phaser.GameObjects.Text;
  level: Phaser.GameObjects.Text;
  types: Phaser.GameObjects.Container;
  hp: HealthBar;
  hpText?: Phaser.GameObjects.Text;
}

const MSG_Y = 404;

export class BattleScene extends BaseScene {
  private engine!: BattleEngine;
  private data_!: BattleData;
  private views!: Record<Side, SideView>;
  private msg!: Phaser.GameObjects.Text;
  private menu?: MenuList;
  private overlay?: Phaser.GameObjects.Container;
  private controls!: Controls;
  private advance?: () => void;

  constructor() {
    super(SCENES.Battle);
  }

  create(data: BattleData): void {
    this.setupScene();
    this.data_ = data;
    this.menu = undefined;
    this.overlay = undefined;
    const st = GameState.get();
    this.engine = new BattleEngine({ party: st.party, enemies: data.enemies, kind: data.kind, enemyName: data.enemyName });

    this.drawBackground(st.mapId);
    this.views = {
      enemy: this.buildSide('enemy'),
      player: this.buildSide('player'),
    };
    makePanel(this, 12, MSG_Y - 8, GAME_WIDTH - 24, GAME_HEIGHT - MSG_Y - 4);
    this.msg = makeText(this, 36, MSG_Y + 14, '', 22, UI.text, { wordWrap: { width: 520 }, lineSpacing: 6 });

    this.controls = new Controls(this, { pad: false });
    this.controls.on('action', () => this.advance?.());
    this.input.on('pointerdown', () => this.advance?.());

    AudioManager.playMusic(this, data.kind === 'trainer' ? 'music/battle_trainer' : 'music/battle_wild');
    void this.intro();
  }

  // ------------------------------------------------------------------ cenário
  private drawBackground(mapId: string): void {
    const theme = getMap(mapId).theme;
    const g = this.add.graphics();
    const sky = Phaser.Display.Color.IntegerToColor(theme.water).darken(10).color;
    g.fillGradientStyle(sky, sky, theme.ground, theme.ground, 1);
    g.fillRect(0, 0, GAME_WIDTH, MSG_Y);
    g.fillStyle(theme.tallgrass, 0.9).fillEllipse(700, 222, 280, 60);
    g.fillStyle(theme.tallgrass, 0.9).fillEllipse(240, 380, 320, 76);
    g.fillStyle(0x000000, 0.12).fillEllipse(700, 228, 240, 36).fillEllipse(240, 386, 280, 46);
  }

  private buildSide(side: Side): SideView {
    const mon = this.engine.active(side).mon;
    const isEnemy = side === 'enemy';
    const size = isEnemy ? 150 : 190;
    const home = isEnemy ? { x: 700, y: 156 } : { x: 240, y: 300 };
    const sprite = this.add.image(home.x, home.y, monsterTexture(this, mon.species)).setDisplaySize(size, size).setFlipX(!isEnemy);

    const px = isEnemy ? 30 : 590;
    const py = isEnemy ? 26 : 278;
    const ph = isEnemy ? 92 : 112;
    makePanel(this, px, py, 340, ph);
    const name = makeText(this, px + 16, py + 10, '', 21, UI.text, { fontStyle: 'bold' });
    const level = makeText(this, px + 324, py + 12, '', 18, UI.accent).setOrigin(1, 0);
    const types = this.add.container(px + 16, py + 42);
    makeText(this, px + 16, py + 62, 'HP', 14, UI.accent, { fontStyle: 'bold' });
    const hp = new HealthBar(this, px + 44, py + 62, 280, 14);
    const view: SideView = { sprite, home, size, name, level, types, hp };
    if (!isEnemy) view.hpText = makeText(this, px + 324, py + 82, '', 16, UI.text).setOrigin(1, 0);
    this.refresh(side, view);
    return view;
  }

  private refresh(side: Side, v: SideView = this.views[side]): void {
    const mon = this.engine.active(side).mon;
    v.name.setText(displayName(mon));
    v.level.setText(`Nv ${mon.level}`);
    v.sprite.setTexture(monsterTexture(this, mon.species)).setDisplaySize(v.size, v.size);
    v.types.removeAll(true);
    getSpecies(mon.species).types.forEach((t, i) => {
      const el = ELEMENTS[t];
      v.types.add(this.add.rectangle(i * 78, 0, 72, 16, el.color).setOrigin(0));
      v.types.add(makeText(this, i * 78 + 36, 8, el.name.toUpperCase(), 11, '#14112b', { fontStyle: 'bold' }).setOrigin(0.5));
    });
    v.hp.set(mon.hp, maxHp(mon));
    v.hpText?.setText(`${mon.hp}/${maxHp(mon)}`);
  }

  // ------------------------------------------------------------------ mensagens
  /** Mostra uma mensagem; avança com Enter/A/toque ou sozinha após um tempo. */
  private say(text: string, auto = 1400): Promise<void> {
    this.msg.setText(text);
    return new Promise((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        this.advance = undefined;
        resolve();
      };
      // pequena trava para o mesmo toque não pular a mensagem
      this.time.delayedCall(150, () => (this.advance = finish));
      if (auto > 0) this.time.delayedCall(auto, finish);
    });
  }

  private async intro(): Promise<void> {
    const v = this.views;
    v.enemy.sprite.x = GAME_WIDTH + 120;
    v.player.sprite.x = -120;
    void tweenP(this, { targets: v.enemy.sprite, x: v.enemy.home.x, duration: 500, ease: 'Cubic.out' });
    await tweenP(this, { targets: v.player.sprite, x: v.player.home.x, duration: 500, ease: 'Cubic.out' });
    const e = this.engine.active('enemy').mon;
    if (this.data_.kind === 'wild') await this.say(`Um ${displayName(e)} selvagem apareceu!`);
    else await this.say(`${this.data_.enemyName} quer batalhar! Enviou ${displayName(e)}!`);
    await this.say(`Vai, ${displayName(this.engine.active('player').mon)}!`, 900);
    this.showMainMenu();
  }

  // ------------------------------------------------------------------ menus
  private clearMenus(): void {
    this.menu?.destroy();
    this.menu = undefined;
    this.overlay?.destroy();
    this.overlay = undefined;
  }

  private showMainMenu(): void {
    this.clearMenus();
    this.msg.setText(`O que ${displayName(this.engine.active('player').mon)} vai fazer?`);
    this.menu = new MenuList(
      this,
      [
        { label: 'Lutar', onSelect: () => this.showMoveMenu() },
        { label: 'Equipe', onSelect: () => this.showPartyMenu(false) },
        { label: 'Item', onSelect: () => this.showItemMenu() },
        { label: 'Fugir', onSelect: () => void this.act({ kind: 'run' }) },
      ],
      { x: 576, y: MSG_Y + 6, columns: 2, itemWidth: 170, itemHeight: 54, gap: 10 },
    );
  }

  private showMoveMenu(): void {
    this.clearMenus();
    this.msg.setText('');
    const moves = this.engine.usableMoves('player');
    const items: MenuItem[] = moves.map((id) => {
      const mv = getMove(id);
      return {
        label: mv.supreme ? `★ ${mv.name}` : mv.name,
        hint: `${ELEMENTS[mv.type].name} • ${mv.power > 0 ? `Poder ${mv.power}` : 'Efeito'}${mv.supreme ? ' • 1x' : ''}`,
        onSelect: () => void this.act({ kind: 'move', move: id }),
      };
    });
    items.push({ label: 'Voltar', onSelect: () => this.showMainMenu() });
    this.menu = new MenuList(this, items, {
      x: 28,
      y: MSG_Y + 4,
      columns: 3,
      itemWidth: 292,
      itemHeight: 54,
      gap: 8,
      fontSize: 19,
      onCancel: () => this.showMainMenu(),
    });
  }

  /** Lista sobreposta genérica (equipe, itens). */
  private showOverlay(title: string, items: MenuItem[], onCancel?: () => void): void {
    this.clearMenus();
    const h = Math.min(380, 80 + items.length * 56);
    const y = (MSG_Y - h) / 2 + 10;
    const box = this.add.container(0, 0).setDepth(500);
    box.add(this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.45).setOrigin(0).setInteractive());
    box.add(makePanel(this, 230, y, 500, h));
    box.add(makeText(this, GAME_WIDTH / 2, y + 22, title, 22, UI.accent, { fontStyle: 'bold' }).setOrigin(0.5));
    this.overlay = box;
    this.menu = new MenuList(this, items, { x: 260, y: y + 50, itemWidth: 440, itemHeight: 46, gap: 8, fontSize: 18, onCancel });
    this.menu.setDepth(501);
  }

  private partyItems(onPick: (i: number) => void, disable: (m: MonsterInstance, i: number) => boolean): MenuItem[] {
    return GameState.get().party.map((m, i) => ({
      label: `${displayName(m)}  Nv ${m.level}  —  ${m.hp}/${maxHp(m)} HP${i === this.engine.pIndex ? '  (em campo)' : ''}`,
      disabled: disable(m, i),
      onSelect: () => onPick(i),
    }));
  }

  private showPartyMenu(forced: boolean): void {
    const items = this.partyItems(
      (i) => (forced ? void this.sendReplacement(i) : void this.act({ kind: 'switch', index: i })),
      (_m, i) => !this.engine.canSwitchTo(i),
    );
    if (!forced) items.push({ label: 'Voltar', onSelect: () => this.showMainMenu() });
    this.showOverlay(forced ? 'Escolha o próximo pet' : 'Trocar de pet', items, forced ? undefined : () => this.showMainMenu());
  }

  private showItemMenu(): void {
    const inv = GameState.get().inventory;
    const items: MenuItem[] = Object.values(ITEMS)
      .filter((it) => (inv[it.id] ?? 0) > 0)
      .map((it) => ({
        label: `${it.name}  x${inv[it.id]}`,
        disabled: it.kind === 'capture',
        hint: it.kind === 'capture' ? 'captura chega na etapa 6' : it.description,
        onSelect: () => this.pickItemTarget(it.id),
      }));
    if (!items.length) items.push({ label: 'Mochila vazia', disabled: true, onSelect: () => {} });
    items.push({ label: 'Voltar', onSelect: () => this.showMainMenu() });
    this.showOverlay('Mochila', items, () => this.showMainMenu());
  }

  private pickItemTarget(itemId: string): void {
    const item = getItem(itemId);
    const items = this.partyItems(
      (i) => {
        GameState.get().inventory[itemId]--;
        void this.act({ kind: 'item', item: itemId, target: i });
      },
      (m) => (item.kind === 'heal' ? m.hp <= 0 || m.hp >= maxHp(m) : item.kind === 'cure' ? m.status !== item.cures : true),
    );
    items.push({ label: 'Voltar', onSelect: () => this.showItemMenu() });
    this.showOverlay(`Usar ${item.name} em…`, items, () => this.showItemMenu());
  }

  // ------------------------------------------------------------------ turno
  private async act(action: PlayerAction): Promise<void> {
    this.clearMenus();
    await this.play(this.engine.turn(action));
  }

  private async sendReplacement(index: number): Promise<void> {
    this.clearMenus();
    await this.play(this.engine.sendReplacement(index));
  }

  private async play(events: BattleEvent[]): Promise<void> {
    for (const e of events) {
      switch (e.t) {
        case 'msg':
          await this.say(e.text);
          break;
        case 'move':
          await this.animateMove(e.side, e.move);
          break;
        case 'hp':
          await this.animateHp(e.side, e.hp, e.max, e.crit || (e.eff ?? 1) > 1);
          break;
        case 'miss':
          break;
        case 'faint':
          await this.animateFaint(e.side);
          break;
        case 'send':
          await this.animateSend(e.side);
          break;
        case 'needSwitch':
          this.showPartyMenu(true);
          return;
        case 'end':
          await this.endBattle();
          return;
      }
    }
    this.showMainMenu();
  }

  // ------------------------------------------------------------------ animações
  private async animateMove(side: Side, move: MoveData): Promise<void> {
    const att = this.views[side].sprite;
    const target = this.views[side === 'player' ? 'enemy' : 'player'];
    const dir = side === 'player' ? 1 : -1;
    AudioManager.sfx(this, `sfx/${move.type}`);
    if (move.power > 0) {
      await tweenP(this, { targets: att, x: att.x + 40 * dir, y: att.y - 12 * dir, duration: 110, yoyo: true });
      this.burst(target.sprite.x, target.sprite.y, ELEMENTS[move.type].color, move.supreme ? 26 : 12);
      if (move.supreme || move.power >= 90) this.cameras.main.shake(320, move.supreme ? 0.02 : 0.01);
    } else {
      this.burst(att.x, att.y, ELEMENTS[move.type].color, 10);
      await tweenP(this, { targets: att, scale: att.scale * 1.08, duration: 160, yoyo: true });
    }
  }

  /** Explosão simples de partículas coloridas (efeitos por elemento chegam na etapa 4). */
  private burst(x: number, y: number, color: number, n: number): void {
    for (let i = 0; i < n; i++) {
      const p = this.add.circle(x, y, Phaser.Math.Between(4, 9), color).setDepth(50);
      const a = Math.random() * Math.PI * 2;
      const d = Phaser.Math.Between(30, 90);
      this.tweens.add({ targets: p, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, alpha: 0, scale: 0.3, duration: 450, onComplete: () => p.destroy() });
    }
  }

  private async animateHp(side: Side, hp: number, max: number, strong?: boolean): Promise<void> {
    const v = this.views[side];
    if (strong) this.cameras.main.shake(200, 0.008);
    this.tweens.add({ targets: v.sprite, alpha: 0.2, duration: 70, yoyo: true, repeat: 2 });
    await v.hp.animateTo(hp, max, 500, (n) => v.hpText?.setText(`${n}/${max}`));
  }

  private async animateFaint(side: Side): Promise<void> {
    const s = this.views[side].sprite;
    await tweenP(this, { targets: s, y: s.y + 60, alpha: 0, duration: 450, ease: 'Quad.in' });
  }

  private async animateSend(side: Side): Promise<void> {
    const v = this.views[side];
    this.refresh(side);
    v.sprite.setPosition(v.home.x, v.home.y).setAlpha(0).setScale(v.sprite.scaleX * 0.2, v.sprite.scaleY * 0.2);
    await tweenP(this, { targets: v.sprite, alpha: 1, displayWidth: v.size, displayHeight: v.size, duration: 350, ease: 'Back.out' });
  }

  // ------------------------------------------------------------------ fim
  private async endBattle(): Promise<void> {
    const st = GameState.get();
    const outcome = this.engine.outcome;
    if (outcome === 'win') {
      const prize = (this.data_.prize ?? 0) + this.data_.enemies.reduce((s, m) => s + m.level * 8, 0);
      st.money += prize;
      await this.say(`Você ganhou ${prize} moedas!`, 1600);
      if (this.data_.kind === 'trainer') {
        this.goTo(SCENES.GameOver, { victory: true, message: `Você venceu ${this.data_.enemyName}! +${prize} moedas` });
        return;
      }
      this.goTo(SCENES.World);
    } else if (outcome === 'lose') {
      GameState.healParty();
      Object.assign(st, { mapId: st.respawn.mapId, x: st.respawn.x, y: st.respawn.y, facing: 'down' });
      this.goTo(SCENES.GameOver, { victory: false });
    } else {
      this.goTo(SCENES.World);
    }
  }
}
