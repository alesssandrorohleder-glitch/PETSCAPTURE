import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, RENDER_SCALE, SCENES, TILE, UI } from '../config';
import { ENCOUNTER_RATE, getMap, TILES, type BuildingDef, type Facing, type MapDef, type NpcDef, type WarpDef } from '../data/maps';
import { getTrainer, TRAINERS, type TrainerData } from '../data/trainers';
import { AudioManager } from '../systems/AudioManager';
import { Controls } from '../systems/Controls';
import { GameState, type PlayerState } from '../systems/GameState';
import { createMonster } from '../systems/Monster';
import { rollEncounter } from '../systems/Encounters';
import { SaveManager } from '../systems/SaveManager';
import { toast } from '../ui/Overlay';
import { AdManager } from '../systems/AdManager';
import { watchForCoins } from '../systems/Rewards';
import { ADS } from '../ads.config';
import type { BattleData } from './BattleScene';
import { fill, FRIEND_BATTLES, INTRO, RIVAL, storyNpcs, TRIGGERS, type TrainerBattleDef } from '../data/story';
import { getSpecies } from '../data/monsters';
import { WANDERERS, wandererFlag, type WandererDef } from '../data/wanderers';
import { buildingTexture, fitInto, overworldSprite, signTexture, tileTexture, TREE_SIZE, treeTexture } from '../systems/Placeholders';
import { Settings } from '../systems/Settings';
import { DialogBox } from '../ui/DialogBox';
import { MenuList } from '../ui/MenuList';
import { fixToCamera, makePanel, makeText } from '../ui/text';
import { BaseScene, fitCamera, tweenP, wait } from './BaseScene';

const STEP_MS = 160;
const DELTA: Record<Facing, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const OPPOSITE: Record<Facing, Facing> = { up: 'down', down: 'up', left: 'right', right: 'left' };

/** O que fazer ao voltar de uma batalha de história (só acontece se o jogador venceu). */
export interface AfterBattle {
  flag: string;
  speaker: string;
  lines: string[];
  /** remove o NPC temporário (Noctis "vai embora") */
  final?: boolean;
}

export interface WorldData {
  after?: AfterBattle;
}

interface NpcObj {
  def: NpcDef;
  sprite: Phaser.GameObjects.Image;
  look: TrainerData['look'];
  /** posição atual (andarilhos se movem) */
  x: number;
  y: number;
  facing: Facing;
  /** treinador andarilho */
  wander?: WandererDef;
  /** horário (ms da cena) do próximo passo/virada */
  nextMove: number;
}

/** Quem aparece na abertura da batalha (retrato e nome). */
interface Opponent {
  id: string;
  name: string;
  look: TrainerData['look'];
}

const SIGHT = 4;

export class WorldScene extends BaseScene {
  private map!: MapDef;
  private st!: PlayerState;
  private player!: Phaser.GameObjects.Image;
  private look!: TrainerData['look'];
  private controls!: Controls;
  private dialog!: DialogBox;
  private npcs: NpcObj[] = [];
  private moving = false;
  private menu?: Phaser.GameObjects.Container;
  /** chance de encontro por passo (alterável em testes) */
  encounterRate = ENCOUNTER_RATE;

  constructor() {
    super(SCENES.World);
  }

  create(data?: WorldData): void {
    this.setupScene();
    if (!GameState.has()) GameState.newGame(TRAINERS[0].id); // atalho para testes
    this.st = GameState.get();
    this.map = getMap(this.st.mapId);
    this.moving = false;
    this.engaging = false;
    this.menu = undefined;
    this.npcs = [];
    this.look = getTrainer(this.st.trainerId).look;

    this.drawMap();
    this.player = this.add.image(0, 0, '__DEFAULT').setOrigin(0.5, 1);
    this.setFacing(this.st.facing);
    this.placePlayer();
    this.setupCameras();

    this.controls = new Controls(this);
    this.dialog = new DialogBox(this, this.controls);
    this.controls.on('action', () => this.interact());
    this.controls.on('cancel', () => this.toggleMenu());
    this.input.keyboard!.on('keydown-M', () => this.toggleMenu());

    this.buildHud();
    AudioManager.playMusic(this, this.map.music);

    // salvamento automático: ao entrar no mapa e a cada 30 s
    if (data?.after) this.st.flags[data.after.flag] = true;
    SaveManager.save();
    this.time.addEvent({ delay: 30000, loop: true, callback: () => SaveManager.save() });

    if (data?.after) this.time.delayedCall(350, () => void this.afterBattle(data.after!));
    else if (!this.st.flags.intro) this.time.delayedCall(450, () => void this.intro());
  }

  // ------------------------------------------------------------------ história
  private get names(): [string, string] {
    const t = getTrainer(this.st.trainerId);
    return [t.name, getSpecies(t.starter).name];
  }

  private lines(l: string[]): string[] {
    return fill(l, ...this.names);
  }

  private async intro(): Promise<void> {
    this.moving = true;
    await this.dialog.show(this.lines(INTRO), 'Ancião Oren');
    this.st.flags.intro = true;
    SaveManager.save();
    this.moving = false;
  }

  private async afterBattle(a: AfterBattle): Promise<void> {
    this.moving = true;
    await this.dialog.show(this.lines(a.lines), a.speaker);
    this.moving = false;
    if (a.final) {
      const [nome] = this.names;
      this.goTo(SCENES.GameOver, {
        victory: true,
        title: 'Fim da Jornada!',
        message: `Parabéns, ${nome}! Você venceu Noctis nas Ruínas da Lua e se tornou um grande domador.\nContinue explorando, capturando e completando sua equipe!`,
      });
    }
  }

  /** Inicia uma batalha contra treinador; ao vencer, volta ao mapa com as falas de vitória. */
  private startTrainerBattle(def: TrainerBattleDef, who?: Opponent): void {
    const trainer: Opponent = who ?? getTrainer(def.trainer);
    const data: BattleData = {
      kind: 'trainer',
      enemies: def.team.map(([sp, lv]) => createMonster(sp, lv)),
      enemyName: trainer.name,
      trainer: { id: trainer.id, name: trainer.name, look: trainer.look },
      prize: def.prize,
      intro: this.lines(def.intro).slice(-1)[0],
      next: { scene: SCENES.World, data: { after: { flag: def.flag, speaker: trainer.name, lines: def.win, final: def.final } } satisfies WorldData },
    };
    this.moving = true;
    this.cameras.main.flash(250, 255, 255, 255);
    this.time.delayedCall(260, () => this.goTo(SCENES.Battle, data));
  }

  /** Encontro com o Noctis: ele aparece, fala e desafia. */
  private async rivalEvent(event: keyof typeof RIVAL): Promise<void> {
    const def = RIVAL[event];
    this.moving = true;
    let sprite = this.npcs.find((n) => n.def.id === 'noctis')?.sprite;
    if (!sprite) {
      // surge à frente do jogador
      const look = getTrainer('noctis').look;
      sprite = this.addToWorld(this.add.image(this.st.x * TILE + TILE / 2, (this.st.y - 1) * TILE, '__DEFAULT').setOrigin(0.5, 1).setDepth(this.st.y * TILE).setAlpha(0));
      this.applySprite(sprite, 'noctis', look, 'down');
      this.tweens.add({ targets: sprite, alpha: 1, y: this.st.y * TILE, duration: 500 });
    }
    this.setFacing('up');
    AudioManager.playMusic(this, 'music/noctis');
    const intro = this.lines(def.intro);
    await this.dialog.show(intro.slice(0, -1).length ? intro.slice(0, -1) : intro, 'Noctis');
    if (def.final) {
      const ok = await this.dialog.ask('Pronto para a batalha final?', ['Sim', 'Ainda não']);
      if (ok !== 0) {
        await this.dialog.show(['Volte quando tiver coragem.'], 'Noctis');
        this.moving = false;
        this.tryMove('down');
        return;
      }
    }
    this.startTrainerBattle(def);
  }

  private async friendEvent(npc: NpcObj, def: TrainerBattleDef): Promise<void> {
    this.moving = true;
    const ans = await this.dialog.ask(this.lines(def.intro)[0], ['Batalhar!', 'Agora não'], npc.def.name);
    if (ans === 0) this.startTrainerBattle(def);
    else this.moving = false;
  }

  /**
   * Duas câmeras em Full HD: a principal segue o jogador pelo mapa (camada do mundo)
   * e a de interface fica parada por cima (HUD, diálogos, menus, direcional).
   */
  private worldLayer!: Phaser.GameObjects.Layer;

  /** Coloca no mapa (câmera do mundo) um objeto criado depois do início da cena. */
  private addToWorld<T extends Phaser.GameObjects.GameObject>(obj: T): T {
    this.worldLayer.add(obj);
    obj.cameraFilter = 0; // depois do add: entrar na camada dispara o evento que esconde da câmera do mapa
    return obj;
  }

  private setupCameras(): void {
    const world = this.add.layer();
    this.worldLayer = world;
    world.add(this.children.list.filter((o) => (o as unknown) !== world));
    const cam = this.cameras.main;
    cam.setZoom(RENDER_SCALE);
    cam.setBounds(0, 0, this.map.grid[0].length * TILE, this.map.grid.length * TILE);
    cam.startFollow(this.player, true, 0.2, 0.2, 0, TILE / 2);
    cam.setRoundPixels(true);

    const ui = fitCamera(this.cameras.add(0, 0, this.scale.width, this.scale.height));
    ui.ignore(world);
    // tudo que for criado depois (interface) só aparece na câmera de interface
    const hide = (obj: Phaser.GameObjects.GameObject) => cam.ignore(obj);
    this.events.on(Phaser.Scenes.Events.ADDED_TO_SCENE, hide);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.events.off(Phaser.Scenes.Events.ADDED_TO_SCENE, hide));
  }

  // ------------------------------------------------------------------ mapa
  private drawMap(): void {
    const { grid, theme } = this.map;
    grid.forEach((row, y) =>
      [...row].forEach((ch, x) => {
        this.add.image(x * TILE, y * TILE, tileTexture(this, theme, TILES[ch].name)).setOrigin(0).setDisplaySize(TILE, TILE).setDepth(0);
        if (ch === '#') {
          // árvore alta: base no tile, copa avançando sobre o tile de cima
          this.add
            .image(x * TILE + TILE / 2, (y + 1) * TILE + 2, treeTexture(this, theme))
            .setOrigin(0.5, 1)
            .setDisplaySize(TREE_SIZE.w, TREE_SIZE.h)
            .setDepth(y * TILE + 4);
        }
      }),
    );
    for (const b of this.map.buildings) {
      this.add
        .image(b.x * TILE, b.y * TILE, buildingTexture(this, b.kind, b.w, b.h))
        .setOrigin(0)
        .setDisplaySize(b.w * TILE, b.h * TILE)
        .setDepth((b.y + b.h) * TILE);
      if (b.label) {
        makeText(this, (b.x + b.w / 2) * TILE, b.y * TILE - 4, b.label, 13, '#ffffff', { stroke: '#000000', strokeThickness: 3 })
          .setOrigin(0.5, 1)
          .setDepth(5000);
      }
    }
    for (const s of this.map.signs) this.add.image(s.x * TILE, s.y * TILE, signTexture(this)).setOrigin(0).setDisplaySize(TILE, TILE).setDepth(s.y * TILE + 1);
    const wanderers = WANDERERS.filter((w) => w.map === this.map.id).map((w) => ({
      def: { id: w.id, x: w.home.x, y: w.home.y, facing: 'down' as Facing, look: w.look, name: w.name, dialog: [] },
      wander: w,
    }));
    const statics = [...this.map.npcs, ...storyNpcs(this.map.id)].map((def) => ({ def, wander: undefined }));
    for (const { def, wander } of [...statics, ...wanderers]) {
      if (def.look === this.st.trainerId) continue; // o jogador não encontra a si mesmo
      const look = typeof def.look === 'string' ? getTrainer(def.look).look : def.look;
      const sprite = this.add.image(0, 0, '__DEFAULT').setOrigin(0.5, 1);
      const npc: NpcObj = { def, sprite, look, x: def.x, y: def.y, facing: def.facing, wander, nextMove: this.time.now + 1500 + Math.random() * 1500 };
      this.placeNpc(npc);
      this.applySprite(sprite, def.id, look, def.facing);
      this.npcs.push(npc);
    }
  }

  private buildHud(): void {
    // Nome do mapa ao entrar
    const banner = this.add.container(16, 16).setDepth(8000);
    const w = Math.max(200, this.map.name.length * 12 + 40);
    banner.add([makePanel(this, 0, 0, w, 44), makeText(this, w / 2, 22, this.map.name, 20, UI.accent, { fontStyle: 'bold' }).setOrigin(0.5)]);
    fixToCamera(banner);
    this.tweens.add({ targets: banner, alpha: 0, delay: 2200, duration: 500 });

    // Botão de menu (útil no toque e no mouse)
    const btn = this.add.container(GAME_WIDTH - 70, 34).setDepth(8000);
    const bg = this.add.rectangle(0, 0, 112, 44, UI.panel, 0.85).setStrokeStyle(2, UI.border).setInteractive({ useHandCursor: true });
    btn.add([bg, makeText(this, 0, 0, '☰ Menu', 18).setOrigin(0.5)]);
    fixToCamera(btn);
    bg.on('pointerup', () => this.toggleMenu());
  }

  private placePlayer(): void {
    this.player.setPosition(this.st.x * TILE + TILE / 2, (this.st.y + 1) * TILE).setDepth(this.st.y * TILE + 3);
  }

  /** Personagens ocupam até 1 tile de largura e 1,5 de altura (imagens maiores são reduzidas). */
  private applySprite(img: Phaser.GameObjects.Image, id: string, look: TrainerData['look'], f: Facing): void {
    const ref = overworldSprite(this, id, look, f);
    img.setTexture(ref.key).setFlipX(ref.flipX);
    fitInto(img, TILE * 1.25, TILE * 1.5);
  }

  private setFacing(f: Facing): void {
    this.st.facing = f;
    this.applySprite(this.player, this.st.trainerId, this.look, f);
  }

  // ------------------------------------------------------------------ colisão
  private buildingAt(x: number, y: number): BuildingDef | undefined {
    return this.map.buildings.find((b) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h);
  }

  private isDoor(b: BuildingDef, x: number, y: number): boolean {
    return x === b.x + Math.floor(b.w / 2) && y === b.y + b.h - 1;
  }

  private npcAt(x: number, y: number): NpcObj | undefined {
    return this.npcs.find((n) => n.x === x && n.y === y);
  }

  private placeNpc(n: NpcObj): void {
    n.sprite.setPosition(n.x * TILE + TILE / 2, (n.y + 1) * TILE).setDepth(n.y * TILE + 2);
  }

  private faceNpc(n: NpcObj, f: Facing): void {
    n.facing = f;
    this.applySprite(n.sprite, n.def.id, n.look, f);
  }

  /** Mundo parado (diálogo, menu, evento ou transição): ninguém anda. */
  private get locked(): boolean {
    return this.moving || this.dialog.open || !!this.menu || this.engaging;
  }

  private engaging = false;

  // ------------------------------------------------------------------ andarilhos
  private wanderTick(now: number): void {
    for (const n of this.npcs) {
      if (!n.wander || now < n.nextMove) continue;
      n.nextMove = now + 1200 + Math.random() * 1600;
      const dirs: Facing[] = ['up', 'down', 'left', 'right'];
      const dir = dirs[Math.floor(Math.random() * 4)];
      this.faceNpc(n, dir);
      if (Math.random() < 0.6) {
        const [dx, dy] = DELTA[dir];
        const nx = n.x + dx;
        const ny = n.y + dy;
        const home = n.wander.home;
        const inArea = Math.abs(nx - home.x) <= n.wander.radius && Math.abs(ny - home.y) <= n.wander.radius;
        const special = this.map.warps.some((w) => w.x === nx && w.y === ny) || TRIGGERS.some((t) => t.map === this.map.id && nx >= t.x && nx < t.x + t.w && ny >= t.y && ny < t.y + t.h);
        const onPlayer = nx === this.st.x && ny === this.st.y;
        if (inArea && !special && !onPlayer && !this.blocked(nx, ny)) {
          n.x = nx;
          n.y = ny;
          n.sprite.setDepth(ny * TILE + 2);
          this.tweens.add({ targets: n.sprite, x: nx * TILE + TILE / 2, y: (ny + 1) * TILE, duration: 220 });
        }
      }
      if (this.checkSight()) return;
    }
  }

  /** Algum andarilho ainda não vencido está vendo o jogador? Se sim, ele vem desafiar. */
  private checkSight(): boolean {
    for (const n of this.npcs) {
      if (!n.wander || this.st.flags[wandererFlag(n.wander.id)]) continue;
      const [dx, dy] = DELTA[n.facing];
      for (let i = 1; i <= SIGHT; i++) {
        const x = n.x + dx * i;
        const y = n.y + dy * i;
        if (x === this.st.x && y === this.st.y) {
          void this.engage(n, i - 1);
          return true;
        }
        if (this.blocked(x, y)) break;
      }
    }
    return false;
  }

  /** "!" sobre o andarilho, ele caminha até o jogador e desafia. */
  private async engage(n: NpcObj, steps: number): Promise<void> {
    this.engaging = true;
    const mark = this.addToWorld(makeText(this, n.sprite.x, n.sprite.y - 52, '!', 30, '#ffd166', { fontStyle: 'bold', stroke: '#14112b', strokeThickness: 5 }).setOrigin(0.5).setDepth(9000));
    this.tweens.add({ targets: mark, y: mark.y - 8, yoyo: true, duration: 150 });
    await wait(this, 650);
    mark.destroy();
    const [dx, dy] = DELTA[n.facing];
    for (let i = 0; i < steps; i++) {
      n.x += dx;
      n.y += dy;
      n.sprite.setDepth(n.y * TILE + 2);
      await tweenP(this, { targets: n.sprite, x: n.x * TILE + TILE / 2, y: (n.y + 1) * TILE, duration: 200 });
    }
    this.setFacing(OPPOSITE[n.facing]);
    await this.challenge(n, false);
  }

  /** Fala de desafio e batalha (ou pergunta de revanche, se já foi vencido). */
  private async challenge(n: NpcObj, rematch: boolean): Promise<void> {
    const w = n.wander!;
    this.engaging = true;
    const who: Opponent = { id: w.id, name: w.name, look: w.look };
    const def: TrainerBattleDef = { flag: wandererFlag(w.id), trainer: w.id, team: w.team, prize: rematch ? Math.floor(w.prize / 2) : w.prize, intro: [rematch ? w.rematch : w.intro], win: w.win, after: [] };
    if (rematch) {
      const ans = await this.dialog.ask(w.rematch, ['Batalhar!', 'Agora não'], w.name);
      if (ans !== 0) {
        this.engaging = false;
        return;
      }
    } else {
      await this.dialog.show([w.intro], w.name);
    }
    this.startTrainerBattle(def, who);
  }

  private blocked(x: number, y: number): boolean {
    const ch = this.map.grid[y]?.[x];
    if (ch === undefined || TILES[ch].solid) return true;
    if (this.buildingAt(x, y)) return true;
    if (this.npcAt(x, y)) return true;
    return this.map.signs.some((s) => s.x === x && s.y === y);
  }

  // ------------------------------------------------------------------ loop
  update(): void {
    if (this.dialog.open || this.menu) this.controls.clearTap();
    if (this.locked) return;
    this.wanderTick(this.time.now);
    if (this.locked) return;
    const dir = this.controls.direction();
    if (dir) this.tryMove(dir);
  }

  private tryMove(dir: Facing): void {
    this.setFacing(dir);
    const [dx, dy] = DELTA[dir];
    const nx = this.st.x + dx;
    const ny = this.st.y + dy;
    const b = this.buildingAt(nx, ny);
    if (b && dir === 'up' && this.isDoor(b, nx, ny)) {
      void this.enterBuilding(b);
      return;
    }
    if (this.blocked(nx, ny)) return;

    this.moving = true;
    this.st.x = nx;
    this.st.y = ny;
    this.player.setDepth(ny * TILE + 3);
    this.tweens.add({
      targets: this.player,
      x: nx * TILE + TILE / 2,
      y: (ny + 1) * TILE,
      duration: STEP_MS,
      onComplete: () => {
        this.moving = false;
        this.onStep(nx, ny);
      },
    });
  }

  private onStep(x: number, y: number): void {
    const warp = this.map.warps.find((w) => w.x === x && w.y === y);
    if (warp) return this.warp(warp);
    const f = this.st.flags;
    const trig = TRIGGERS.find(
      (t) => t.map === this.map.id && !f[RIVAL[t.event].flag] && (!t.requires || f[t.requires]) && x >= t.x && x < t.x + t.w && y >= t.y && y < t.y + t.h,
    );
    if (trig) return void this.rivalEvent(trig.event);
    if (this.checkSight()) return;
    const ch = this.map.grid[y][x];
    if (TILES[ch].encounter && Math.random() < this.encounterRate) this.startEncounter();
  }

  /** Sorteia um monstro do mapa e inicia a batalha. */
  startEncounter(): void {
    if (!this.st.party.some((m) => m.hp > 0)) return;
    const roll = rollEncounter(this.map, getTrainer(this.st.trainerId).starter);
    if (!roll) return;
    this.moving = true;
    const data: BattleData = { kind: 'wild', enemies: [createMonster(roll.species, roll.level)], rare: roll.rare };
    const cam = this.cameras.main;
    cam.flash(250, 255, 255, 255);
    this.time.delayedCall(260, () => this.goTo(SCENES.Battle, data));
  }

  private warp(w: WarpDef): void {
    Object.assign(this.st, { mapId: w.to, x: w.tx, y: w.ty, facing: w.facing });
    this.moving = true;
    for (const c of this.cameras.cameras) c.fadeOut(180, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.restart({})); // {} evita repetir os dados da última entrada (ex.: falas pós-batalha)
  }

  // ------------------------------------------------------------------ interação
  private interact(): void {
    if (this.dialog.open || this.moving || this.menu) return;
    const [dx, dy] = DELTA[this.st.facing];
    const tx = this.st.x + dx;
    const ty = this.st.y + dy;
    const npc = this.npcAt(tx, ty);
    if (npc) {
      this.faceNpc(npc, OPPOSITE[this.st.facing]);
      if (npc.wander) return void this.challenge(npc, !!this.st.flags[wandererFlag(npc.wander.id)]);
      const battle = FRIEND_BATTLES[npc.def.id];
      if (battle && !this.st.flags[battle.flag]) void this.friendEvent(npc, battle);
      else void this.dialog.show(this.lines(battle?.after ?? npc.def.dialog), npc.def.name);
      return;
    }
    const sign = this.map.signs.find((s) => s.x === tx && s.y === ty);
    if (sign) {
      void this.dialog.show(sign.text);
      return;
    }
    const b = this.buildingAt(tx, ty);
    if (b && this.isDoor(b, tx, ty)) void this.enterBuilding(b);
  }

  private async enterBuilding(b: BuildingDef): Promise<void> {
    if (b.kind === 'heal') {
      const ans = await this.dialog.ask('Bem-vindo ao Centro de Cura! Deseja curar seus pets? (É grátis!)', ['Sim', 'Não'], 'Enfermeira Clara');
      if (ans === 0) {
        GameState.healParty();
        this.st.respawn = { mapId: this.map.id, x: this.st.x, y: this.st.y };
        this.cameras.main.flash(400, 255, 255, 255);
        AudioManager.sfx(this, 'sfx/heal');
        await this.dialog.show(['Pronto! Seus pets estão totalmente recuperados.', 'Volte sempre!'], 'Enfermeira Clara');
      }
    } else if (b.kind === 'shop') {
      this.goTo(SCENES.Shop);
    } else {
      await this.dialog.show(['A porta está trancada.']);
    }
  }

  // ------------------------------------------------------------------ menu
  private toggleMenu(): void {
    if (this.dialog.open || this.moving) return;
    if (this.menu) {
      this.menu.destroy();
      this.menu = undefined;
      this.controls.pad?.setVisible(true);
      return;
    }
    this.controls.pad?.setVisible(false);
    const x = GAME_WIDTH - 280;
    const box = this.add.container(0, 0).setDepth(9500);
    const shade = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.4).setOrigin(0).setInteractive();
    shade.on('pointerup', () => this.toggleMenu());
    box.add([shade, makePanel(this, x - 20, 14, 260, 516)]);
    box.add(makeText(this, x + 110, 510, `Moedas: ${this.st.money}`, 18, UI.accent, { fontStyle: 'bold' }).setOrigin(0.5));
    const list = new MenuList(
      this,
      [
        { label: 'Equipe', onSelect: () => this.goTo(SCENES.Party) },
        { label: 'Mochila', onSelect: () => this.goTo(SCENES.Inventory) },
        {
          label: 'Salvar',
          onSelect: () => {
            this.toggleMenu();
            toast(this, SaveManager.save() ? '✓ Jogo salvo' : 'Não foi possível salvar neste navegador');
          },
        },
        ...(AdManager.enabled
          ? [
              {
                label: `+${ADS.rewardCoins} moedas`,
                hint: 'assistir anúncio',
                onSelect: () => {
                  this.toggleMenu();
                  this.moving = true;
                  void watchForCoins().then(async (msg) => {
                    await this.dialog.show([msg]);
                    this.moving = false;
                  });
                },
              },
            ]
          : []),
        {
          label: `Som: ${Settings.get().soundOn ? 'Ligado' : 'Desligado'}`,
          onSelect: () => {
            AudioManager.setSound(this.game, !Settings.get().soundOn);
            this.toggleMenu();
            this.toggleMenu();
          },
        },
        { label: 'Menu Inicial', onSelect: () => this.goTo(SCENES.Menu) },
        { label: 'Fechar', onSelect: () => this.toggleMenu() },
      ],
      { x, y: 30, itemWidth: 220, itemHeight: 52, gap: 8 },
    );
    box.add(list);
    fixToCamera(box);
    this.menu = box;
  }
}
