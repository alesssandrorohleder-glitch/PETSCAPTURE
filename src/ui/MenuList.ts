import Phaser from 'phaser';
import { UI } from '../config';
import { makeText } from './text';

export interface MenuItem {
  label: string;
  onSelect: () => void;
  disabled?: boolean;
  /** Texto pequeno opcional exibido abaixo do rótulo. */
  hint?: string;
}

export interface MenuListOptions {
  x: number;
  y: number;
  itemWidth?: number;
  itemHeight?: number;
  columns?: number;
  gap?: number;
  fontSize?: number;
  /** Tecla "voltar" (Esc / X / Backspace). */
  onCancel?: () => void;
}

/**
 * Lista de opções navegável por teclado (setas/WASD + Enter/Espaço/Z)
 * e por toque/mouse. Vários menus podem coexistir; só o ativo recebe teclas.
 */
export class MenuList extends Phaser.GameObjects.Container {
  private items: MenuItem[] = [];
  private boxes: Phaser.GameObjects.Rectangle[] = [];
  private labels: Phaser.GameObjects.Text[] = [];
  private index = 0;
  private enabled = true;
  private readonly opts: Required<Omit<MenuListOptions, 'onCancel'>> & Pick<MenuListOptions, 'onCancel'>;

  constructor(scene: Phaser.Scene, items: MenuItem[], opts: MenuListOptions) {
    super(scene, opts.x, opts.y);
    this.opts = { itemWidth: 280, itemHeight: 48, columns: 1, gap: 10, fontSize: 22, ...opts };
    scene.add.existing(this);
    this.setItems(items);
    const kb = scene.input.keyboard;
    kb?.on('keydown', this.onKey, this);
    this.once(Phaser.GameObjects.Events.DESTROY, () => kb?.off('keydown', this.onKey, this));
  }

  setItems(items: MenuItem[]): void {
    this.removeAll(true);
    this.boxes = [];
    this.labels = [];
    this.items = items;
    const { itemWidth: w, itemHeight: h, columns, gap, fontSize } = this.opts;
    items.forEach((item, i) => {
      const cx = (i % columns) * (w + gap);
      const cy = Math.floor(i / columns) * (h + gap);
      const box = this.scene.add
        .rectangle(cx, cy, w, h, UI.panelLight, 1)
        .setOrigin(0)
        .setStrokeStyle(2, UI.border, 0.6)
        .setInteractive({ useHandCursor: !item.disabled });
      const label = makeText(this.scene, cx + w / 2, cy + h / 2 - (item.hint ? 8 : 0), item.label, fontSize, item.disabled ? UI.textDim : UI.text).setOrigin(0.5);
      this.add([box, label]);
      if (item.hint) {
        this.add(makeText(this.scene, cx + w / 2, cy + h / 2 + 13, item.hint, 13, UI.textDim).setOrigin(0.5));
      }
      box.on('pointerover', () => this.enabled && this.select(i));
      box.on('pointerup', () => {
        if (!this.enabled) return;
        this.select(i);
        this.activate();
      });
      this.boxes.push(box);
      this.labels.push(label);
    });
    this.index = Math.max(0, items.findIndex((it) => !it.disabled));
    this.refresh();
  }

  setEnabled(on: boolean): this {
    this.enabled = on;
    this.setAlpha(on ? 1 : 0.6);
    return this;
  }

  get selectedIndex(): number {
    return this.index;
  }

  select(i: number): void {
    if (i < 0 || i >= this.items.length) return;
    this.index = i;
    this.refresh();
  }

  private refresh(): void {
    this.boxes.forEach((b, i) => {
      const sel = i === this.index;
      b.setFillStyle(sel ? UI.border : UI.panelLight, sel ? 0.9 : 1);
      b.setStrokeStyle(sel ? 3 : 2, sel ? 0xffffff : UI.border, sel ? 1 : 0.6);
    });
  }

  private move(dx: number, dy: number): void {
    const cols = this.opts.columns;
    const n = this.items.length;
    let i = this.index;
    for (let tries = 0; tries < n; tries++) {
      if (dx) i = (i + dx + n) % n;
      if (dy) i = (i + dy * cols + n) % n;
      if (!this.items[i]?.disabled) break;
    }
    this.select(i);
  }

  private activate(): void {
    const item = this.items[this.index];
    if (!item || item.disabled) return;
    item.onSelect();
  }

  private onKey(e: KeyboardEvent): void {
    if (!this.enabled || !this.active || !this.visible) return;
    switch (e.code) {
      case 'ArrowUp': case 'KeyW': this.move(0, -1); break;
      case 'ArrowDown': case 'KeyS': this.move(0, 1); break;
      case 'ArrowLeft': case 'KeyA': if (this.opts.columns > 1) this.move(-1, 0); break;
      case 'ArrowRight': case 'KeyD': if (this.opts.columns > 1) this.move(1, 0); break;
      case 'Enter': case 'Space': case 'KeyZ': this.activate(); break;
      case 'Escape': case 'KeyX': case 'Backspace': this.opts.onCancel?.(); break;
    }
  }
}
