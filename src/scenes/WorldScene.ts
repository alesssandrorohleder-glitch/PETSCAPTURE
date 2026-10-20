import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, RENDER_SCALE, SCENES, TILE, UI } from '../config';
import { ENCOUNTER_RATE, getMap, TILES, type BuildingDef, type Facing, type MapDef, type NpcDef, type WarpDef } from '../data/maps';
import { getTrainer, TRAINERS, type TrainerData } from '../data/trainers';
import { AudioManager } from '../systems/AudioManager';
import { Controls } from '../systems/Controls';
import { GameState, type PlayerState } from '../systems/GameState';
import { createMonster } from '../systems/Monster';
import { rollEncounter } from '../systems/Encounters';
import type { BattleData } from './BattleScene';
import { buildingTexture, fitInto, overworldSprite, signTexture, tileTexture, TREE_SIZE, treeTexture } from '../systems/Placeholders';
import { Settings } from '../systems/Settings';
import { DialogBox } from '../ui/DialogBox';
import { MenuList } from '../ui/MenuList';
import { fixToCamera, makePanel, makeText } from '../ui/text';
import { BaseScene, fitCamera } from './BaseScene';

const STEP_MS = 160;
const DELTA: Record<Facing, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const OPPOSITE: Record<Facing, Facing> = { up: 'down', down: 'up', left: 'right', right: 'left' };

interface NpcObj {
  def: NpcDef;
  sprite: Phaser.GameObjects.Image;
  look: TrainerData['look'];
}

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

  create(): void {
    this.setupScene();
    if (!GameState.has()) GameState.newGame(TRAINERS[0].id); // atalho para testes
    this.st = GameState.get();
    this.map = getMap(this.st.mapId);
    this.moving = false;
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
  }

  /**
   * Duas câmeras em Full HD: a principal segue o jogador pelo mapa (camada do mundo)
   * e a de interface fica parada por cima (HUD, diálogos, menus, direcional).
   */
  private setupCameras(): void {
    const world = this.add.layer();
    world.add(this.children.list.filter((o) => (o as unknown) !== world));
    const cam = this.cameras.main;
    cam.setZoom(RENDER_SCALE);
    cam.setBounds(0, 0, this.map.grid[0].length * TILE, this.map.grid.length * TILE);
    cam.startFollow(this.player, true, 0.2, 0.2, 0, TILE / 2);
    cam.setRoundPixels(true);

    const ui = fitCamera(this.cameras.add(0, 0, GAME_WIDTH * RENDER_SCALE, GAME_HEIGHT * RENDER_SCALE));
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
    for (const def of this.map.npcs) {
      if (def.look === this.st.trainerId) continue; // o jogador não encontra a si mesmo
      const look = typeof def.look === 'string' ? getTrainer(def.look).look : def.look;
      const sprite = this.add.image(def.x * TILE + TILE / 2, (def.y + 1) * TILE, '__DEFAULT').setOrigin(0.5, 1).setDepth(def.y * TILE + 2);
      const npc = { def, sprite, look };
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
    return this.npcs.find((n) => n.def.x === x && n.def.y === y);
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
    if (this.moving || this.dialog.open || this.menu) return;
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
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.restart());
  }

  // ------------------------------------------------------------------ interação
  private interact(): void {
    if (this.dialog.open || this.moving || this.menu) return;
    const [dx, dy] = DELTA[this.st.facing];
    const tx = this.st.x + dx;
    const ty = this.st.y + dy;
    const npc = this.npcAt(tx, ty);
    if (npc) {
      this.applySprite(npc.sprite, npc.def.id, npc.look, OPPOSITE[this.st.facing]);
      void this.dialog.show(npc.def.dialog, npc.def.name);
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
        await this.dialog.show(['Pronto! Seus pets estão totalmente recuperados.', 'Volte sempre!'], 'Enfermeira Clara');
      }
    } else if (b.kind === 'shop') {
      await this.dialog.show(['Olá! A loja abre na etapa 6.'], 'Vendedor Teo');
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
    box.add([shade, makePanel(this, x - 20, 70, 260, 390)]);
    const list = new MenuList(
      this,
      [
        { label: 'Equipe', onSelect: () => this.goTo(SCENES.Party) },
        { label: 'Inventário', onSelect: () => this.goTo(SCENES.Inventory) },
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
      { x, y: 90, itemWidth: 220, itemHeight: 56, gap: 14 },
    );
    box.add(list);
    fixToCamera(box);
    this.menu = box;
  }
}
