import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, RENDER_SCALE } from '../config';
import { makeText } from './text';
import { urlParam } from '../systems/UrlFlags';
import type { Facing } from '../data/maps';

/** Direcional + botões A/B na tela, para celular. Fica fixo na câmera. */
export class VirtualPad extends Phaser.Events.EventEmitter {
  dir: Facing | null = null;
  private objects: Phaser.GameObjects.GameObject[] = [];
  private padPointer: number | null = null;

  /** Mostrar o pad? Touch, ou ?pad=1 na URL para testar no PC. */
  static wanted(scene: Phaser.Scene): boolean {
    const forced = urlParam('pad');
    if (forced === '0') return false;
    return forced === '1' || scene.sys.game.device.input.touch;
  }

  constructor(scene: Phaser.Scene) {
    super();
    const depth = 9800;
    const cx = 110;
    const cy = GAME_HEIGHT - 110;
    const base = scene.add.circle(cx, cy, 78, 0x000000, 0.28).setStrokeStyle(3, 0xffffff, 0.35);
    const arrows = scene.add.graphics().fillStyle(0xffffff, 0.6);
    const tri = (a: number) => {
      const p = (r: number, da: number) => [cx + Math.cos(a + da) * r, cy + Math.sin(a + da) * r] as const;
      const [x1, y1] = p(62, 0);
      const [x2, y2] = p(40, 0.35);
      const [x3, y3] = p(40, -0.35);
      arrows.fillTriangle(x1, y1, x2, y2, x3, y3);
    };
    [0, Math.PI / 2, Math.PI, -Math.PI / 2].forEach(tri);
    const knob = scene.add.circle(cx, cy, 22, 0xffffff, 0.35);
    const zone = scene.add.zone(cx, cy, 200, 200).setInteractive();

    const update = (p: Phaser.Input.Pointer) => {
      // p.x/p.y estão em pixels do canvas (Full HD); o pad usa coordenadas de layout
      const dx = p.x / RENDER_SCALE - cx;
      const dy = p.y / RENDER_SCALE - cy;
      if (Math.hypot(dx, dy) < 14) {
        this.dir = null;
      } else if (Math.abs(dx) > Math.abs(dy)) {
        this.dir = dx > 0 ? 'right' : 'left';
      } else {
        this.dir = dy > 0 ? 'down' : 'up';
      }
      const k = Math.min(1, 40 / Math.max(1, Math.hypot(dx, dy)));
      knob.setPosition(cx + dx * k, cy + dy * k);
    };
    const release = () => {
      this.padPointer = null;
      this.dir = null;
      knob.setPosition(cx, cy);
    };
    zone.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.padPointer = p.id;
      update(p);
    });
    scene.input.on('pointermove', (p: Phaser.Input.Pointer) => p.id === this.padPointer && update(p));
    scene.input.on('pointerup', (p: Phaser.Input.Pointer) => p.id === this.padPointer && release());

    const button = (x: number, y: number, label: string, color: number, event: string) => {
      const c = scene.add.circle(x, y, 38, color, 0.55).setStrokeStyle(3, 0xffffff, 0.5).setInteractive();
      const t = makeText(scene, x, y, label, 26, '#ffffff', { fontStyle: 'bold' }).setOrigin(0.5);
      c.on('pointerdown', () => {
        c.setScale(0.9);
        this.emit(event);
      });
      c.on('pointerup', () => c.setScale(1));
      c.on('pointerout', () => c.setScale(1));
      return [c, t];
    };
    this.objects = [
      base,
      arrows,
      knob,
      zone,
      ...button(GAME_WIDTH - 80, GAME_HEIGHT - 120, 'A', 0x2a9d8f, 'action'),
      ...button(GAME_WIDTH - 170, GAME_HEIGHT - 60, 'B', 0xe76f51, 'cancel'),
    ];
    for (const o of this.objects) (o as unknown as Phaser.GameObjects.Components.Depth).setDepth(depth);
  }

  setVisible(v: boolean): void {
    for (const o of this.objects) (o as unknown as Phaser.GameObjects.Components.Visible).setVisible(v);
    if (!v) this.dir = null;
  }
}
