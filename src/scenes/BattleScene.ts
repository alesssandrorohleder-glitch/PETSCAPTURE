import Phaser from 'phaser';
import type { WorldData } from './WorldScene';
import { GAME_HEIGHT, GAME_WIDTH, SCENES, UI } from '../config';
import { ELEMENTS } from '../data/elements';
import { getItem, ITEMS } from '../data/items';
import { getMap } from '../data/maps';
import { getMove, type MoveData } from '../data/moves';
import { getSpecies } from '../data/monsters';
import { AudioManager } from '../systems/AudioManager';
import { BattleEngine, STATUS_INFO, type BattleEvent, type BattleKind, type PlayerAction, type Side } from '../systems/BattleEngine';
import { Controls } from '../systems/Controls';
import { GameState } from '../systems/GameState';
import { displayName, evolutionTarget, maxHp, MAX_MOVES, xpProgress, type MonsterInstance } from '../systems/Monster';
import { capsuleTexture, fitInto, monsterSprite, trainerPortrait } from '../systems/Placeholders';
import type { TrainerData } from '../data/trainers';
import { HealthBar } from '../ui/HealthBar';
import { choose } from '../ui/Overlay';
import { AdManager } from '../systems/AdManager';
import { playMoveFx } from '../systems/BattleFx';
import { MenuList, type MenuItem } from '../ui/MenuList';
import { makePanel, makeText } from '../ui/text';
import { BaseScene, tweenP, wait } from './BaseScene';

export interface BattleData {
  kind: BattleKind;
  enemies: MonsterInstance[];
  enemyName?: string;
  /** recompensa extra em moedas (treinadores) */
  prize?: number;
  /** treinador inimigo (retrato e nome na abertura) */
  trainer?: { id: string; name: string; look: TrainerData['look'] };
  /** frase do treinador ao começar */
  intro?: string;
  /** pet inicial raro (3%) */
  rare?: boolean;
  /** cena e dados para depois da batalha (padrão: World) */
  next?: { scene: string; data?: object };
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
  xp?: HealthBar;
  status: Phaser.GameObjects.Container;
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
    this.engine = new BattleEngine({ party: st.party, enemies: data.enemies, kind: data.kind, enemyName: data.enemyName, box: st.box });

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
    const sky = theme.sky;
    g.fillGradientStyle(sky, sky, theme.ground, theme.ground, 1);
    g.fillRect(0, 0, GAME_WIDTH, MSG_Y);
    g.fillStyle(theme.tallgrass, 0.9).fillEllipse(700, 222, 280, 60);
    g.fillStyle(theme.tallgrass, 0.9).fillEllipse(240, 380, 320, 76);
    g.fillStyle(0x000000, 0.12).fillEllipse(700, 228, 240, 36).fillEllipse(240, 386, 280, 46);
  }

  private buildSide(side: Side): SideView {
    const isEnemy = side === 'enemy';
    const size = isEnemy ? 150 : 190;
    const home = isEnemy ? { x: 700, y: 156 } : { x: 240, y: 300 };
    const sprite = this.add.image(home.x, home.y, '__DEFAULT');

    const px = isEnemy ? 30 : 590;
    const py = isEnemy ? 26 : 278;
    const ph = isEnemy ? 92 : 118;
    makePanel(this, px, py, 340, ph);
    const name = makeText(this, px + 16, py + 10, '', 21, UI.text, { fontStyle: 'bold' });
    const level = makeText(this, px + 324, py + 12, '', 18, UI.accent).setOrigin(1, 0);
    const types = this.add.container(px + 16, py + 42);
    makeText(this, px + 16, py + 62, 'HP', 14, UI.accent, { fontStyle: 'bold' });
    const hp = new HealthBar(this, px + 44, py + 62, 280, 14);
    const status = this.add.container(px + 186, py + 42);
    const view: SideView = { sprite, home, size, name, level, types, hp, status };
    if (!isEnemy) {
      view.hpText = makeText(this, px + 324, py + 80, '', 16, UI.text).setOrigin(1, 0);
      makeText(this, px + 16, py + 98, 'XP', 12, '#7dd3fc', { fontStyle: 'bold' });
      view.xp = new HealthBar(this, px + 44, py + 100, 200, 8, 0x38bdf8);
    }
    this.refresh(side, view);
    return view;
  }

  private refresh(side: Side, v: SideView = this.views[side]): void {
    const mon = this.engine.active(side).mon;
    v.name.setText(displayName(mon));
    v.level.setText(`Nv ${mon.level}`);
    const ref = monsterSprite(this, mon.species, side === 'player');
    fitInto(v.sprite.setTexture(ref.key).setFlipX(ref.flipX), v.size, v.size);
    v.types.removeAll(true);
    getSpecies(mon.species).types.forEach((t, i) => {
      const el = ELEMENTS[t];
      v.types.add(this.add.rectangle(i * 78, 0, 72, 16, el.color).setOrigin(0));
      v.types.add(makeText(this, i * 78 + 36, 8, el.name.toUpperCase(), 11, '#14112b', { fontStyle: 'bold' }).setOrigin(0.5));
    });
    v.hp.set(mon.hp, maxHp(mon));
    v.hpText?.setText(`${mon.hp}/${maxHp(mon)}`);
    v.xp?.set(xpProgress(mon), 1);
    this.setStatusChip(v, mon);
  }

  /** Ícone de status (VEN, SONO, PAR, GELO) ao lado dos tipos. */
  private setStatusChip(v: SideView, mon: MonsterInstance): void {
    v.status.removeAll(true);
    if (!mon.status) return;
    const info = STATUS_INFO[mon.status];
    v.status.add(this.add.rectangle(0, 0, 60, 16, info.color).setOrigin(0).setStrokeStyle(1, 0xffffff, 0.7));
    v.status.add(makeText(this, 30, 8, info.short, 11, '#14112b', { fontStyle: 'bold' }).setOrigin(0.5));
    this.tweens.add({ targets: v.status, alpha: 0.55, yoyo: true, repeat: -1, duration: 600 });
  }

  // ------------------------------------------------------------------ mensagens
  /** Mostra uma mensagem; avança com Enter/A/toque ou sozinha após um tempo. */
  private say(text: string, auto = 1400): Promise<void> {
    this.msg.setText(text);
    (window as unknown as { __battleLog?: string[] }).__battleLog?.push(text); // usado pelos testes
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
    if (this.data_.trainer) {
      // retrato do treinador entra, fala e sai antes do monstro aparecer
      const t = this.data_.trainer;
      const portrait = fitInto(this.add.image(GAME_WIDTH + 100, 170, trainerPortrait(this, t)), 170, 210).setDepth(40);
      v.enemy.sprite.setVisible(false);
      await tweenP(this, { targets: portrait, x: 700, duration: 450, ease: 'Cubic.out' });
      if (this.data_.intro) await this.say(`${t.name}: "${this.data_.intro}"`, 2200);
      await this.say(`${t.name} quer batalhar!`, 1200);
      await tweenP(this, { targets: portrait, x: GAME_WIDTH + 120, duration: 350 });
      portrait.destroy();
      v.enemy.sprite.setVisible(true).setX(v.enemy.home.x);
      await this.say(`${t.name} enviou ${displayName(e)}!`);
    } else if (this.data_.kind === 'wild' && this.data_.rare) {
      this.cameras.main.flash(500, 255, 215, 0);
      await this.say(`Incrível! Um ${displayName(e)} selvagem RARO apareceu!`, 1800);
    } else if (this.data_.kind === 'wild') await this.say(`Um ${displayName(e)} selvagem apareceu!`);
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
        this.data_.kind === 'trainer'
          ? { label: 'Desistir', onSelect: () => void this.giveUp() }
          : { label: 'Fugir', onSelect: () => void this.act({ kind: 'run' }) },
      ],
      { x: 576, y: MSG_Y + 6, columns: 2, itemWidth: 170, itemHeight: 54, gap: 10 },
    );
  }

  /** Sair da luta contra treinador (com confirmação: não ganha prêmio). */
  private async giveUp(): Promise<void> {
    this.clearMenus();
    const name = this.data_.enemyName ?? 'o treinador';
    const i = await this.offer(`Desistir da luta contra ${name}? Você não ganha o prêmio, mas pode lutar de novo depois.`, ['Continuar lutando', 'Desistir e sair']);
    if (i === 1) await this.act({ kind: 'run' });
    else this.showMainMenu();
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
    box.add(makeText(this, GAME_WIDTH / 2, y + 24, title, title.length > 40 ? 15 : 22, UI.accent, { fontStyle: 'bold', align: 'center', wordWrap: { width: 470 } }).setOrigin(0.5));
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
        disabled: it.kind === 'capture' && !this.engine.canCapture(),
        hint: it.kind === 'capture' && !this.engine.canCapture() ? 'não dá para capturar monstro de treinador' : it.description,
        onSelect: () => {
          if (it.kind !== 'capture') return this.pickItemTarget(it.id);
          GameState.get().inventory[it.id]--;
          void this.act({ kind: 'item', item: it.id, target: 0 });
        },
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

  private async play(events: BattleEvent[], menuAfter = true): Promise<void> {
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
        case 'status':
          this.setStatusChip(this.views[e.side], this.engine.active(e.side).mon);
          break;
        case 'buff':
          await this.animateBuff(e.side, e.good);
          break;
        case 'xp':
          if (e.uid === this.engine.active('player').mon.uid) await this.views.player.xp?.animateTo(xpProgress(this.engine.active('player').mon), 1, 500);
          break;
        case 'level':
          AudioManager.sfx(this, 'sfx/levelup');
          if (e.uid === this.engine.active('player').mon.uid) {
            this.refresh('player');
            this.burst(this.views.player.sprite.x, this.views.player.sprite.y, 0xffd166, 16);
          }
          break;
        case 'capture':
          await this.animateCapture(e.shakes, e.success);
          break;
        case 'learnChoice':
          await this.askForget(e.uid, e.move);
          break;
        case 'needSwitch':
          this.showPartyMenu(true);
          return;
        case 'end':
          await this.endBattle();
          return;
      }
    }
    if (menuAfter) this.showMainMenu();
  }

  // ------------------------------------------------------------------ animações
  private async animateMove(side: Side, move: MoveData): Promise<void> {
    const att = this.views[side].sprite;
    const target = this.views[side === 'player' ? 'enemy' : 'player'].sprite;
    const dir = side === 'player' ? 1 : -1;
    AudioManager.sfx(this, `sfx/${move.type}`);
    if (move.power > 0) {
      await tweenP(this, { targets: att, x: att.x + 40 * dir, y: att.y - 12 * dir, duration: 110, yoyo: true });
    } else {
      void tweenP(this, { targets: att, scale: att.scale * 1.08, duration: 160, yoyo: true });
    }
    await playMoveFx(this, move.type, { x: att.x, y: att.y }, { x: target.x, y: target.y }, { power: move.power, supreme: move.supreme });
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

  private async animateBuff(side: Side, good: boolean): Promise<void> {
    const s = this.views[side].sprite;
    const color = good ? 0x7dd3fc : 0xf87171;
    for (let i = 0; i < 6; i++) {
      const arrow = makeText(this, s.x - 50 + i * 20, s.y + (good ? 40 : -40), good ? '▲' : '▼', 20, Phaser.Display.Color.IntegerToColor(color).rgba).setOrigin(0.5);
      this.tweens.add({ targets: arrow, y: arrow.y + (good ? -70 : 70), alpha: 0, duration: 600, delay: i * 40, onComplete: () => arrow.destroy() });
    }
    await tweenP(this, { targets: s, alpha: 0.6, duration: 120, yoyo: true, repeat: 1 });
  }

  /** O pet quer aprender um golpe mas já tem 4: escolher qual esquecer (ou nenhum). */
  private askForget(uid: string, moveId: string): Promise<void> {
    const mon = GameState.get().party.find((m) => m.uid === uid);
    if (!mon) return Promise.resolve();
    const nm = getMove(moveId);
    return new Promise((resolve) => {
      const done = async (text: string) => {
        this.clearMenus();
        await this.say(text);
        resolve();
      };
      const items: MenuItem[] = mon.moves.map((id, i) => ({
        label: `Esquecer ${getMove(id).name}`,
        hint: `${ELEMENTS[getMove(id).type].name} • ${getMove(id).power > 0 ? `Poder ${getMove(id).power}` : 'Efeito'}`,
        onSelect: () => {
          const old = getMove(mon.moves[i]).name;
          mon.moves[i] = moveId;
          void done(`${displayName(mon)} esqueceu ${old} e aprendeu ${nm.name}!`);
        },
      }));
      items.push({ label: `Não aprender ${nm.name}`, onSelect: () => void done(`${displayName(mon)} não aprendeu ${nm.name}.`) });
      this.showOverlay(`${displayName(mon)} quer aprender ${nm.name} (${ELEMENTS[nm.type].name}${nm.power ? `, Poder ${nm.power}` : ''}), mas já sabe ${MAX_MOVES} golpes.`, items);
    });
  }

  /** Cápsula voa até o monstro, ele entra, a cápsula balança e prende (ou ele escapa). */
  private async animateCapture(shakes: number, success: boolean): Promise<void> {
    const target = this.views.enemy.sprite;
    const groundY = target.y + 52;
    const cap = this.add.image(this.views.player.sprite.x, this.views.player.sprite.y - 40, capsuleTexture(this)).setDisplaySize(34, 24).setDepth(60);
    const sx = cap.x;
    const sy = cap.y;
    AudioManager.sfx(this, 'sfx/capsula');
    await new Promise<void>((resolve) =>
      this.tweens.addCounter({
        from: 0,
        to: 1,
        duration: 600,
        onUpdate: (tw) => {
          const t = tw.getValue() ?? 1;
          cap.setPosition(sx + (target.x - sx) * t, sy + (target.y - 30 - sy) * t - Math.sin(t * Math.PI) * 140);
          cap.setAngle(t * 720);
        },
        onComplete: () => resolve(),
      }),
    );
    cap.setAngle(0);
    // o monstro vira luz e entra na cápsula
    target.setTintFill(0xffffff);
    const full = target.scale;
    await tweenP(this, { targets: target, scale: 0.05, alpha: 0.2, duration: 300 });
    await tweenP(this, { targets: cap, y: groundY, duration: 300, ease: 'Bounce.out' });
    for (let i = 0; i < shakes; i++) {
      await wait(this, 250);
      await tweenP(this, { targets: cap, angle: { from: 0, to: i % 2 ? 25 : -25 }, duration: 140, yoyo: true });
    }
    await wait(this, 300);
    if (success) {
      AudioManager.sfx(this, 'sfx/captured');
      this.burst(cap.x, cap.y, 0xffd166, 14);
      cap.setTint(0x9a9a9a);
      await wait(this, 500);
    } else {
      this.burst(cap.x, cap.y, 0xffffff, 16);
      cap.destroy();
      target.clearTint();
      await tweenP(this, { targets: target, scale: full, alpha: 1, duration: 260, ease: 'Back.out' });
    }
  }

  private async animateHp(side: Side, hp: number, max: number, strong?: boolean): Promise<void> {
    const v = this.views[side];
    if (strong) this.cameras.main.shake(200, 0.008);
    AudioManager.sfx(this, 'sfx/hit');
    this.tweens.add({ targets: v.sprite, alpha: 0.2, duration: 70, yoyo: true, repeat: 2 });
    await v.hp.animateTo(hp, max, 500, (n) => v.hpText?.setText(`${n}/${max}`));
  }

  private async animateFaint(side: Side): Promise<void> {
    const s = this.views[side].sprite;
    AudioManager.sfx(this, 'sfx/faint');
    await tweenP(this, { targets: s, y: s.y + 60, alpha: 0, duration: 450, ease: 'Quad.in' });
  }

  private async animateSend(side: Side): Promise<void> {
    const v = this.views[side];
    this.refresh(side);
    const full = v.sprite.scale;
    v.sprite.setPosition(v.home.x, v.home.y).setAlpha(0).setScale(full * 0.2);
    await tweenP(this, { targets: v.sprite, alpha: 1, scale: full, duration: 350, ease: 'Back.out' });
  }

  // ------------------------------------------------------------------ fim
  /** Pergunta com opções (a primeira é sempre seguir sem anúncio). Resolve com o índice. */
  private async offer(question: string, options: string[]): Promise<number> {
    this.msg.setText('');
    return choose(this, question, options.map((label) => ({ label })), 600);
  }

  private async endBattle(): Promise<void> {
    const st = GameState.get();
    const outcome = this.engine.outcome;

    // Anúncio recompensado: reviver o pet depois de perder (opcional, 1x por batalha)
    if (outcome === 'lose' && AdManager.enabled && !this.engine.revived) {
      const mon = this.engine.active('player').mon;
      const i = await this.offer(`Seus pets desmaiaram. Quer assistir a um anúncio para reviver ${displayName(mon)} com metade da vida e continuar a batalha?`, [
        'Não, voltar ao Centro de Cura',
        '▶ Assistir anúncio e reviver',
      ]);
      if (i === 1) {
        const r = await AdManager.rewarded('reviver-pet');
        if (r === 'viewed') return this.play(this.engine.reviveAfterLoss());
        await this.say(r === 'dismissed' ? 'O anúncio foi fechado antes do fim.' : 'Nenhum anúncio disponível agora.');
      }
    }

    this.engine.cleanup();
    let watchedReward = false;
    if (outcome === 'win' || outcome === 'capture') {
      if (outcome === 'win') {
        const prize = (this.data_.prize ?? 0) + this.data_.enemies.reduce((sum, m) => sum + m.level * 8, 0);
        st.money += prize;
        await this.say(`Você ganhou ${prize} moedas!`, 1600);
      }
      // Anúncio recompensado: dobrar o XP da batalha (opcional)
      const xp = [...this.engine.xpGained.values()].reduce((a, b) => a + b, 0);
      if (xp > 0 && AdManager.enabled) {
        const i = await this.offer(`Quer dobrar o XP desta batalha (+${xp} XP) assistindo a um anúncio?`, ['Não, continuar', '▶ Assistir anúncio e dobrar XP']);
        if (i === 1) {
          const r = await AdManager.rewarded('dobrar-xp');
          if (r === 'viewed') {
            watchedReward = true;
            await this.play(this.engine.doubleXp(), false);
          } else await this.say(r === 'dismissed' ? 'O anúncio foi fechado antes do fim.' : 'Nenhum anúncio disponível agora.');
        }
      }
    }

    // Intersticial entre batalhas (no máximo 1 a cada 3 min; pulado se acabou de ver um recompensado)
    if (!watchedReward) await AdManager.interstitial('apos-batalha');

    if (outcome === 'win' || outcome === 'capture') {
      let next = this.data_.next ?? { scene: SCENES.World };
      if (outcome === 'win' && this.data_.kind === 'trainer' && !this.data_.next) {
        next = { scene: SCENES.GameOver, data: { victory: true, message: `Você venceu ${this.data_.enemyName}!` } };
      }
      const evolving = st.party.filter((m) => m.hp > 0 && evolutionTarget(m)).map((m) => m.uid);
      if (evolving.length) this.goTo(SCENES.Evolution, { uids: evolving, next });
      else this.goTo(next.scene, next.data);
    } else if (outcome === 'lose') {
      GameState.healParty();
      Object.assign(st, { mapId: st.respawn.mapId, x: st.respawn.x, y: st.respawn.y, facing: 'down' });
      this.goTo(SCENES.GameOver, { victory: false });
    } else {
      // fugiu/desistiu: o treinador andarilho dá um tempo antes de desafiar de novo
      this.goTo(SCENES.World, { fled: this.data_.trainer?.id } satisfies WorldData);
    }
  }
}
