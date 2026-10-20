import Phaser from 'phaser';
import type { Facing } from '../data/maps';
import { VirtualPad } from '../ui/VirtualPad';

/**
 * Junta teclado e direcional virtual.
 * Eventos: 'action' (Enter/Espaço/Z/A) e 'cancel' (Esc/X/Backspace/B).
 */
export class Controls extends Phaser.Events.EventEmitter {
  readonly pad?: VirtualPad;
  private keys: Record<Facing, Phaser.Input.Keyboard.Key[]>;
  /** toque rápido numa seta (apertou e soltou entre dois quadros) vale 1 passo */
  private tapped: Facing | null = null;

  constructor(scene: Phaser.Scene, opts: { pad?: boolean } = {}) {
    super();
    const kb = scene.input.keyboard!;
    const K = Phaser.Input.Keyboard.KeyCodes;
    const add = (...codes: number[]) => codes.map((c) => kb.addKey(c, false));
    this.keys = {
      up: add(K.UP, K.W),
      down: add(K.DOWN, K.S),
      left: add(K.LEFT, K.A),
      right: add(K.RIGHT, K.D),
    };
    const TAP: Record<string, Facing> = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
    const onKey = (e: KeyboardEvent) => {
      if (TAP[e.code] && !e.repeat) this.tapped = TAP[e.code];
      if (['Enter', 'Space', 'KeyZ'].includes(e.code)) this.emit('action');
      else if (['Escape', 'KeyX', 'Backspace'].includes(e.code)) this.emit('cancel');
    };
    kb.on('keydown', onKey);
    if ((opts.pad ?? true) && VirtualPad.wanted(scene)) {
      this.pad = new VirtualPad(scene);
      this.pad.on('action', () => this.emit('action'));
      this.pad.on('cancel', () => this.emit('cancel'));
    }
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      kb.off('keydown', onKey);
      this.removeAllListeners();
    });
  }

  direction(): Facing | null {
    for (const f of ['up', 'down', 'left', 'right'] as Facing[]) {
      if (this.keys[f].some((k) => k.isDown)) {
        this.tapped = null;
        return f;
      }
    }
    if (this.pad?.dir) return this.pad.dir;
    const t = this.tapped;
    this.tapped = null;
    return t;
  }

  /** Descarta um toque pendente (ex.: ao abrir diálogo ou menu). */
  clearTap(): void {
    this.tapped = null;
  }
}
