import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, RENDER_SCALE, SCENES, TEXTURE_SCALE, TILE, UI, WORLD_ZOOM } from '../config';
import { ENCOUNTER_RATE, getMap, TILES, type BuildingDef, type Facing, type MapDef, type NpcDef, type WarpDef } from '../data/maps';
import { getTrainer, TRAINERS, type TrainerData } from '../data/trainers';
import { AudioManager } from '../systems/AudioManager';
import { Controls } from '../systems/Controls';
import { GameState, type PlayerState } from '../systems/GameState';
import { createMonster } from '../systems/Monster';
import { rollEncounter } from '../systems/Encounters';
import { SaveManager } from '../systems/SaveManager';
import { CloudSave } from '../systems/CloudSave';
import { toast } from '../ui/Overlay';
import { AdManager } from '../systems/AdManager';
import { watchForCoins } from '../systems/Rewards';
import { ADS } from '../ads.config';
import type { BattleData } from './BattleScene';
import { fill, FRIEND_BATTLES, INTRO, RIVAL, storyNpcs, TRIGGERS, type TrainerBattleDef } from '../data/story';
import { getSpecies } from '../data/monsters';
import { WANDERERS, wandererFlag, type WandererDef } from '../data/wanderers';
import { buildingTexture, fitInto, glintTexture, monsterTexture, overworldSprite, pathEdgeTexture, rippleTexture, shadowTexture, signTexture, TALLGRASS_SIZE, tallGrassTexture, TILE_VARIANTS, tileTexture, TREE_SIZE, treeTexture } from '../systems/Placeholders';
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
  /** id do treinador de quem o jogador acabou de desistir */
  fled?: string;
}

/** Quando o jogador desistiu de cada andarilho (ms): ele espera um pouco antes de desafiar de novo. */
const fledAt = new Map<string, number>();
const FLEE_COOLDOWN_MS = 45000;

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

/** Personagem/pet animado: respira parado, balança ao andar e tem sombra. */
interface Actor {
  sprite: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Image;
  /** defasagem da respiração, para não ficarem todos sincronizados */
  phase: number;
  /** quando começou o último passo (ms da cena) */
  stepAt: number;
  stepMs: number;
  pet?: boolean;
}

/** Mistura duas cores (t = 0 → a, t = 1 → b). */
const blend = (a: number, b: number, t: number): number => {
  const c = Phaser.Display.Color.Interpolate.ColorWithColor(Phaser.Display.Color.ValueToColor(a), Phaser.Display.Color.ValueToColor(b), 100, t * 100);
  return Phaser.Display.Color.GetColor(c.r, c.g, c.b);
};

/** Número pseudo-aleatório estável por tile (mesmo desenho a cada visita). */
const tileHash = (x: number, y: number, salt = 0): number => {
  let h = (x * 73856093) ^ (y * 19349663) ^ (salt * 83492791);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

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
  /** pet que acompanha o jogador (o primeiro da equipe que ainda pode lutar) */
  private pet?: Phaser.GameObjects.Image;
  private petTile = { x: 0, y: 0 };
  private actors: Actor[] = [];
  /** tufos de mato alto por tile ("x,y"), para balançarem quando alguém passa */
  private tufts = new Map<string, Phaser.GameObjects.Image[]>();
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
    this.actors = [];
    this.tufts = new Map();
    this.look = getTrainer(this.st.trainerId).look;

    this.drawMap();
    this.player = this.add.image(0, 0, '__DEFAULT').setOrigin(0.5, 1);
    this.setFacing(this.st.facing);
    this.placePlayer();
    this.addActor(this.player, STEP_MS);
    this.pet = undefined;
    this.createPet();
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
    if (data?.fled) fledAt.set(data.fled, Date.now());
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
    cam.setZoom(RENDER_SCALE * WORLD_ZOOM);
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
    const H = grid.length;
    const W = grid[0].length;
    const nameAt = (x: number, y: number) => (y < 0 || y >= H || x < 0 || x >= W ? undefined : TILES[grid[y][x]]?.name);
    // o chão (tiles, bordas e manchas) é "assado" numa imagem só: sem frestas entre tiles quando a câmera anda
    const groundParts: Phaser.GameObjects.GameObject[] = [];
    const edgeParts: Phaser.GameObjects.GameObject[] = [];
    grid.forEach((row, y) =>
      [...row].forEach((ch, x) => {
        const name = TILES[ch].name;
        const variant = Math.floor(tileHash(x, y) * TILE_VARIANTS);
        // embaixo da água vai chão comum: o lago é desenhado por cima, com contorno arredondado (drawLakes)
        const tile = this.add.image(x * TILE + TILE / 2, y * TILE + TILE / 2, tileTexture(this, theme, name === 'water' ? 'ground' : name, variant)).setDisplaySize(TILE, TILE).setDepth(0);
        // chão e estrada podem ser espelhados: ainda menos repetição
        if (name === 'ground' || name === 'path' || name === 'tallgrass') tile.setFlip(tileHash(x, y, 1) < 0.5, tileHash(x, y, 2) < 0.5);
        groundParts.push(tile);
        if (name === 'path') {
          // borda irregular onde a estrada encontra o chão
          const sides: [number, number, number][] = [[0, -1, 0], [0, 1, 180], [-1, 0, -90], [1, 0, 90]];
          for (const [dx, dy, angle] of sides) {
            const n = nameAt(x + dx, y + dy);
            if (!n || n === 'path' || n === 'water') continue;
            edgeParts.push(
              this.add
                .image(x * TILE + TILE / 2 + (dx * TILE) / 2, y * TILE + TILE / 2 + (dy * TILE) / 2, pathEdgeTexture(this, theme, Math.floor(tileHash(x, y, 3 + angle) * 3)))
                .setOrigin(0.5, 0)
                .setDisplaySize(TILE + 6, 9)
                .setAngle(angle),
            );
          }
        }
        if (name === 'tallgrass') {
          // dois tufos por tile, em posições sorteadas: o mato não forma fileiras retas
          const group: Phaser.GameObjects.Image[] = [];
          for (let k = 0; k < 3; k++) {
            const key = tallGrassTexture(this, theme, Math.floor(tileHash(x, y, 4 + k) * 3));
            const ox = [-5, 6, 0][k] + (tileHash(x, y, 5 + k) - 0.5) * 8;
            const oy = [-14, -5, 3][k] + tileHash(x, y, 9 + k) * 3;
            const tuft = this.add
              .image(x * TILE + TILE / 2 + ox, (y + 1) * TILE + oy, key)
              .setOrigin(0.5, 1)
              .setDisplaySize(TALLGRASS_SIZE.w * (0.9 + tileHash(x, y, 11 + k) * 0.2), TALLGRASS_SIZE.h * (0.9 + tileHash(x, y, 13 + k) * 0.25))
              .setFlipX(tileHash(x, y, 6 + k) < 0.5)
              .setDepth(k < 2 ? y * TILE + 1 + k * 0.1 : y * TILE + 3.5); // o da frente cobre as pernas de quem está no tile
            // vento: balanço suave e dessincronizado
            this.tweens.add({ targets: tuft, angle: { from: -2.5, to: 2.5 }, duration: 1300 + tileHash(x, y, 7 + k) * 900, yoyo: true, repeat: -1, ease: 'Sine.inOut', delay: tileHash(x, y, 8 + k) * 1200 });
            group.push(tuft);
          }
          this.tufts.set(`${x},${y}`, group);
        }
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
    // chão mais escuro e arredondado sob as moitas de mato alto (sem cantos quadrados)
    const under = this.add.graphics();
    for (const [ring, t] of [[25, 0.3], [21, 0.5]] as const) {
      under.fillStyle(blend(theme.ground, Phaser.Display.Color.ValueToColor(theme.tallgrass).darken(25).color, t));
      grid.forEach((row, y) => [...row].forEach((ch, x) => TILES[ch].name === 'tallgrass' && under.fillCircle(x * TILE + TILE / 2 + (tileHash(x, y, 20) - 0.5) * 6, y * TILE + TILE / 2 + 2, ring + tileHash(x, y, 21) * 4)));
    }
    // manchas grandes e suaves por cima do chão: quebram o desenho em grade
    const patches = this.add.graphics();
    const lum = Phaser.Display.Color.ValueToColor(theme.ground).v;
    const soft = lum > 0.8 || lum < 0.4; // chão muito claro (areia/neve) ou escuro (vulcão): manchas bem discretas
    const count = Math.round((W * H) / 3);
    for (let i = 0; i < count; i++) {
      const px = tileHash(i, 11, 9) * W * TILE;
      const py = tileHash(i, 13, 10) * H * TILE;
      const light = tileHash(i, 17, 11) < 0.5;
      patches.fillStyle(light ? 0xfff6c2 : 0x0b3d0b, (light ? 0.06 : 0.07) * (soft ? 0.4 : 1)).fillEllipse(px, py, 40 + tileHash(i, 19, 12) * 90, 26 + tileHash(i, 23, 13) * 60);
    }
    const lake = this.drawLakes(nameAt, W, H);
    this.bakeGround([...groundParts, patches, under, lake, ...edgeParts], W * TILE, H * TILE);
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
      this.addActor(sprite, 220);
    }
  }

  /**
   * Lagos: mais escuros no fundo, cantos de margem arredondados e brilhos/ondinhas animados.
   * Devolve os desenhos que vão para a imagem do chão.
   */
  private drawLakes(nameAt: (x: number, y: number) => string | undefined, W: number, H: number) {
    const { theme } = this.map;
    const isWater = (x: number, y: number) => nameAt(x, y) === 'water';
    // distância até a margem (água mais funda no meio)
    const dist = new Map<string, number>();
    const queue: [number, number][] = [];
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (!isWater(x, y)) continue;
        const shore = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => nameAt(x + dx, y + dy) !== undefined && !isWater(x + dx, y + dy));
        if (shore) {
          dist.set(`${x},${y}`, 1);
          queue.push([x, y]);
        }
      }
    }
    while (queue.length) {
      const [x, y] = queue.shift()!;
      const d = dist.get(`${x},${y}`)!;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const k = `${x + dx},${y + dy}`;
        if (isWater(x + dx, y + dy) && !dist.has(k)) {
          dist.set(k, d + 1);
          queue.push([x + dx, y + dy]);
        }
      }
    }
    const lake = this.add.graphics();
    const lava = theme.id === 'vulcao';
    const waterTiles = [...dist.keys()].map((k) => k.split(',').map(Number) as [number, number]);
    /**
     * Preenche a forma do lago com vários círculos de tamanho levemente sorteado (contorno orgânico).
     * `r` = raio base: quanto menor, mais para dentro da água fica a camada.
     */
    const offs = [-10, -5, 0, 5, 10];
    const shape = (r: number, color: number, alpha = 1) => {
      lake.fillStyle(color, alpha);
      for (const [x, y] of waterTiles) {
        const X = x * TILE + TILE / 2;
        const Y = y * TILE + TILE / 2;
        const inner = [-1, 0, 1].every((dy) => [-1, 0, 1].every((dx) => isWater(x + dx, y + dy)));
        if (inner) {
          lake.fillRect(X - TILE / 2 - 1, Y - TILE / 2 - 1, TILE + 2, TILE + 2);
          continue;
        }
        for (const oy of offs) {
          for (const ox of offs) {
            const px = X + ox;
            const py = Y + oy;
            lake.fillCircle(px, py, r + (tileHash(px, py, 60) - 0.5) * 3.2);
          }
        }
      }
    };
    const g0 = theme.ground;
    shape(14, lava ? 0x3d3431 : blend(g0, 0x3b2a1a, 0.3), 0.85); // terra úmida
    shape(11.5, lava ? 0x2b2522 : blend(g0, 0x2b1d10, 0.55)); // barro
    shape(9.6, lava ? 0xffd166 : 0xffffff, lava ? 0.9 : 0.6); // espuma / brilho da lava
    shape(8.8, Phaser.Display.Color.ValueToColor(theme.water).lighten(12).color); // água rasa
    shape(7.2, theme.water);
    // fundo: escurece aos poucos longe da margem
    for (const [k, d] of dist) {
      if (d < 2) continue;
      const [x, y] = k.split(',').map(Number);
      for (let i = 0; i < 8; i++) lake.fillStyle(lava ? 0xffb703 : 0x001233, (lava ? 0.012 : 0.016) * Math.min(d - 1, 3)).fillCircle(x * TILE + TILE / 2, y * TILE + TILE / 2, 14 + i * 4);
    }
    if (lava) {
      // lava: placas de crosta escura com veios brilhando entre elas
      for (const [x, y] of waterTiles) {
        for (let i = 0; i < 3; i++) {
          const px = x * TILE + 6 + tileHash(x, y, 70 + i) * 20;
          const py = y * TILE + 6 + tileHash(x, y, 73 + i) * 20;
          const rw = 6 + tileHash(x, y, 76 + i) * 7;
          lake.fillStyle(0x6a1a00, 0.55).fillEllipse(px, py, rw * 1.4, rw);
          lake.fillStyle(0x3a0f00, 0.45).fillEllipse(px + 1, py + 1, rw * 0.8, rw * 0.55);
        }
        if (tileHash(x, y, 81) < 0.6) {
          lake.lineStyle(1.1, 0xffe08a, 0.75).beginPath();
          let vx = x * TILE + 4 + tileHash(x, y, 80) * 22;
          let vy = y * TILE + 4 + tileHash(x, y, 82) * 6;
          lake.moveTo(vx, vy);
          for (let i = 0; i < 3; i++) {
            vx += (tileHash(x, y, 83 + i) - 0.5) * 14;
            vy += 5 + tileHash(x, y, 86 + i) * 5;
            lake.lineTo(vx, vy);
          }
          lake.strokePath();
        }
      }
    }
    // reflexos parados
    for (const [x, y] of waterTiles) {
      for (let i = 0; i < 2; i++) {
        const len = 2.5 + tileHash(x, y, 50 + i) * 3.5;
        const px = x * TILE + 9 + tileHash(x, y, 52 + i) * 14;
        const py = y * TILE + 9 + tileHash(x, y, 54 + i) * 14;
        lake.lineStyle(1, Phaser.Display.Color.ValueToColor(theme.water).lighten(25).color, 0.6).beginPath().arc(px, py + len, len, Math.PI * 1.25, Math.PI * 1.75).strokePath();
      }
    }
    // brilhos piscando e ondinhas (animados, fora da imagem do chão)
    const tiles = waterTiles;
    const tint = lava ? 0xffd166 : 0xffffff;
    for (const [x, y] of tiles) {
      if (tileHash(x, y, 40) > 0.35) continue;
      const glint = this.add
        .image(x * TILE + 6 + tileHash(x, y, 41) * 20, y * TILE + 6 + tileHash(x, y, 42) * 20, glintTexture(this))
        .setDisplaySize(5, 5)
        .setTint(tint)
        .setAlpha(0)
        .setDepth(0.9);
      this.tweens.add({ targets: glint, alpha: { from: 0, to: 0.85 }, duration: 500, yoyo: true, repeat: -1, repeatDelay: 1500 + tileHash(x, y, 43) * 2500, delay: tileHash(x, y, 44) * 3000 });
    }
    if (tiles.length) {
      this.time.addEvent({
        delay: 700,
        loop: true,
        callback: () => {
          const [x, y] = tiles[Math.floor(Math.random() * tiles.length)];
          const ring = this.addToWorld(this.add.image(x * TILE + 6 + Math.random() * 20, y * TILE + 6 + Math.random() * 20, rippleTexture(this)))
            .setDisplaySize(6, 3)
            .setTint(tint)
            .setAlpha(0.6)
            .setDepth(0.9);
          this.tweens.add({ targets: ring, displayWidth: 22, displayHeight: 10, alpha: 0, duration: 1600, ease: 'Sine.out', onComplete: () => ring.destroy() });
        },
      });
    }
    return lake;
  }

  /**
   * Junta as partes do chão numa única textura (RenderTexture), na resolução em que a tela mostra o mapa.
   * Tiles separados deixam frestas de 1 pixel quando a câmera com zoom para entre dois pixels.
   */
  private bakeGround(parts: Phaser.GameObjects.GameObject[], w: number, h: number): void {
    const maxTex = 4096;
    const S = Math.max(1, Math.floor(Math.min(TEXTURE_SCALE, Math.ceil(RENDER_SCALE * WORLD_ZOOM), maxTex / w, maxTex / h)));
    const bake = this.add.container(0, 0, parts).setScale(S);
    const rt = this.add.renderTexture(0, 0, w * S, h * S).setOrigin(0).setScale(1 / S).setDepth(0);
    rt.draw(bake);
    bake.destroy();
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

  // ------------------------------------------------------------------ pet acompanhante
  private followerSpecies(): string | undefined {
    if (!Settings.get().petFollow) return undefined;
    return (this.st.party.find((m) => m.hp > 0) ?? this.st.party[0])?.species;
  }

  /** Cria o pet atrás do jogador (ou num tile livre ao lado). Chamado antes das câmeras ou com addToWorld. */
  private createPet(): void {
    const species = this.followerSpecies();
    if (!species) return;
    const [dx, dy] = DELTA[this.st.facing];
    const spots: [number, number][] = [[-dx, -dy], [-1, 0], [1, 0], [0, 1], [0, -1]];
    const free = spots.map(([ox, oy]) => ({ x: this.st.x + ox, y: this.st.y + oy })).find((p) => !this.blocked(p.x, p.y) && !this.map.warps.some((w) => w.x === p.x && w.y === p.y));
    this.petTile = free ?? { x: this.st.x, y: this.st.y };
    this.pet = this.add.image(0, 0, monsterTexture(this, species)).setOrigin(0.5, 1);
    fitInto(this.pet, TILE * 1.3, TILE * 1.3);
    this.addActor(this.pet, STEP_MS, true);
    this.placePet();
    if (this.petTile.x !== this.st.x) this.pet.setFlipX(this.petTile.x < this.st.x);
  }

  private placePet(): void {
    if (!this.pet) return;
    this.pet.setPosition(this.petTile.x * TILE + TILE / 2, (this.petTile.y + 1) * TILE - 2).setDepth(this.petTile.y * TILE + 2);
  }

  /** Liga/desliga o pet na hora (menu de pausa). */
  private refreshPet(): void {
    const old = this.actors.find((a) => a.pet);
    old?.shadow.destroy();
    this.actors = this.actors.filter((a) => !a.pet);
    this.pet?.destroy();
    this.pet = undefined;
    if (!this.followerSpecies()) return;
    this.createPet();
    const actor = this.actors.find((a) => a.pet);
    if (actor) this.addToWorld(actor.shadow);
    if (this.pet) this.addToWorld(this.pet);
  }

  /** O pet vai para o tile que o jogador acabou de deixar, com um pulinho. */
  private movePet(toX: number, toY: number): void {
    const pet = this.pet;
    if (!pet) return;
    if (toX !== this.petTile.x) pet.setFlipX(toX > this.petTile.x); // a arte olha para a esquerda
    this.petTile = { x: toX, y: toY };
    this.tweens.killTweensOf(pet);
    pet.setDepth(Math.max(toY * TILE + 2, pet.depth));
    this.stepped(pet);
    this.tweens.add({
      targets: pet,
      x: toX * TILE + TILE / 2,
      y: (toY + 1) * TILE - 2,
      duration: STEP_MS,
      onComplete: () => pet.setDepth(toY * TILE + 2),
    });
    this.rustle(toX, toY);
  }

  // ------------------------------------------------------------------ vida: respiração, passos, sombras
  private addActor(sprite: Phaser.GameObjects.Image, stepMs: number, pet = false): void {
    const shadow = this.add.image(sprite.x, sprite.y, shadowTexture(this)).setDisplaySize(pet ? 22 : 20, 7);
    this.actors.push({ sprite, shadow, phase: Math.random() * Math.PI * 2, stepAt: -9999, stepMs, pet });
  }

  private stepped(sprite: Phaser.GameObjects.Image): void {
    const a = this.actors.find((o) => o.sprite === sprite);
    if (a) a.stepAt = this.time.now;
  }

  /** Mato alto balança quando alguém passa. */
  private rustle(x: number, y: number): void {
    for (const tuft of this.tufts.get(`${x},${y}`) ?? []) {
      this.tweens.add({ targets: tuft, scaleX: tuft.scaleX * 1.1, duration: 90, yoyo: true, repeat: 1 });
    }
  }

  /** Chamado a cada quadro: pulinho/balanço ao andar, respiração parado, sombra seguindo. */
  private animateActors(now: number): void {
    for (const a of this.actors) {
      const s = a.sprite;
      if (!s.active) continue;
      const base = Math.abs(s.scaleX);
      const t = (now - a.stepAt) / a.stepMs;
      let hop = 0;
      let squash = 1;
      let angle = 0;
      if (t >= 0 && t < 1) {
        // andando: pulinho a cada passo e leve balanço de um lado para o outro
        const k = Math.sin(t * Math.PI);
        hop = k * (a.pet ? 5 : 2.5);
        squash = 1 - (1 - k) * 0.06;
        angle = Math.sin(t * Math.PI * 2) * (a.pet ? 6 : 4);
      } else {
        // parado: respira; o pet dá pulinhos de vez em quando
        const breath = Math.sin(now / 380 + a.phase);
        squash = 1 + breath * (a.pet ? 0.045 : 0.025);
        if (a.pet) {
          const cycle = ((now + a.phase * 700) % 2600) / 2600;
          if (cycle > 0.85) {
            const u = (cycle - 0.85) / 0.15;
            hop = Math.sin(u * Math.PI) * 4;
          }
        }
      }
      s.setScale(base, base * squash).setAngle(angle);
      const hgt = s.height * base;
      s.setOrigin(0.5, hgt > 0 ? 1 + hop / (hgt * squash) : 1);
      a.shadow.setPosition(s.x, s.y - 1).setDepth(s.depth - 0.4).setVisible(s.visible && s.alpha > 0.5);
      a.shadow.setAlpha(1 - hop * 0.08);
    }
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
          this.stepped(n.sprite);
          this.rustle(nx, ny);
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
      if (Date.now() - (fledAt.get(n.wander.id) ?? -Infinity) < FLEE_COOLDOWN_MS) continue;
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
  update(time: number): void {
    this.animateActors(time);
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
    this.movePet(this.st.x, this.st.y);
    this.st.x = nx;
    this.st.y = ny;
    this.player.setDepth(ny * TILE + 3);
    this.stepped(this.player);
    this.rustle(nx, ny);
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
            const local = SaveManager.save();
            if (!CloudSave.user) {
              toast(this, local ? '✓ Jogo salvo' : 'Não foi possível salvar neste navegador');
              return;
            }
            void CloudSave.uploadNow().then((online) => toast(this, online ? '✓ Jogo salvo (online)' : '✓ Salvo no aparelho. Sem conexão: enviaremos depois.'));
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
        {
          label: `Pet ao lado: ${Settings.get().petFollow ? 'Ligado' : 'Desligado'}`,
          onSelect: () => {
            Settings.update({ petFollow: !Settings.get().petFollow });
            this.refreshPet();
            this.toggleMenu();
            this.toggleMenu();
          },
        },
        { label: 'Menu Inicial', onSelect: () => this.goTo(SCENES.Menu) },
        { label: 'Fechar', onSelect: () => this.toggleMenu() },
      ],
      { x, y: 26, itemWidth: 220, itemHeight: 46, gap: 6 },
    );
    box.add(list);
    fixToCamera(box);
    this.menu = box;
  }
}
