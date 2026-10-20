import Phaser from 'phaser';
import { SCENES, UI } from '../config';
import { getSpecies } from '../data/monsters';
import { AudioManager } from '../systems/AudioManager';
import { Controls } from '../systems/Controls';
import { GameState } from '../systems/GameState';
import { displayName, evolutionTarget, evolve } from '../systems/Monster';
import { monsterTexture } from '../systems/Placeholders';
import { makePanel, makeText } from '../ui/text';
import { BaseScene, tweenP, wait } from './BaseScene';

export interface EvolutionData {
  uids: string[];
  next: { scene: string; data?: object };
}

/** Animação de evolução: pisca entre a forma antiga e a nova, flash e partículas. */
export class EvolutionScene extends BaseScene {
  private advance?: () => void;

  constructor() {
    super(SCENES.Evolution);
  }

  create(data: EvolutionData): void {
    this.setupScene();
    this.cameras.main.setBackgroundColor(0x0b0820);
    const controls = new Controls(this, { pad: false });
    controls.on('action', () => this.advance?.());
    this.input.on('pointerdown', () => this.advance?.());
    AudioManager.playMusic(this, 'music/evolution');
    void this.run(data);
  }

  private waitInput(ms = 2500): Promise<void> {
    return new Promise((resolve) => {
      let done = false;
      const fin = () => {
        if (done) return;
        done = true;
        this.advance = undefined;
        resolve();
      };
      this.time.delayedCall(200, () => (this.advance = fin));
      this.time.delayedCall(ms, fin);
    });
  }

  private async run(data: EvolutionData): Promise<void> {
    makePanel(this, 40, 410, 880, 100);
    const msg = makeText(this, 70, 440, '', 24, UI.text, { wordWrap: { width: 820 } });
    // raios de luz giratórios
    const rays = this.add.graphics({ x: this.cx, y: 210 });
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      rays.fillStyle(0xffd166, 0.08).fillTriangle(0, 0, Math.cos(a) * 400, Math.sin(a) * 400, Math.cos(a + 0.18) * 400, Math.sin(a + 0.18) * 400);
    }
    this.tweens.add({ targets: rays, angle: 360, duration: 12000, repeat: -1 });

    for (const uid of data.uids) {
      const mon = GameState.get().party.find((m) => m.uid === uid);
      if (!mon) continue;
      const into = evolutionTarget(mon);
      if (!into) continue;
      const oldName = displayName(mon);
      const oldKey = monsterTexture(this, mon.species);
      const newKey = monsterTexture(this, into);
      const sprite = this.add.image(this.cx, 210, oldKey).setDisplaySize(200, 200);
      msg.setText(`O quê? ${oldName} está evoluindo!`);
      await wait(this, 1200);

      // pisca cada vez mais rápido entre as duas formas
      let delay = 420;
      for (let i = 0; i < 14; i++) {
        sprite.setTexture(i % 2 ? oldKey : newKey).setDisplaySize(200, 200).setTintFill(0xffffff);
        await wait(this, delay);
        delay = Math.max(70, delay * 0.8);
      }
      this.cameras.main.flash(600, 255, 255, 255);
      evolve(mon);
      sprite.setTexture(newKey).clearTint().setDisplaySize(220, 220);
      for (let i = 0; i < 30; i++) {
        const p = this.add.circle(this.cx, 210, Phaser.Math.Between(3, 7), 0xffd166);
        const a = Math.random() * Math.PI * 2;
        const d = Phaser.Math.Between(80, 220);
        this.tweens.add({ targets: p, x: this.cx + Math.cos(a) * d, y: 210 + Math.sin(a) * d, alpha: 0, duration: 900, onComplete: () => p.destroy() });
      }
      await tweenP(this, { targets: sprite, scale: sprite.scale * 1.1, yoyo: true, duration: 250 });
      msg.setText(`Parabéns! ${oldName} evoluiu para ${getSpecies(into).name}!`);
      await this.waitInput(3500);
      sprite.destroy();
    }
    this.goTo(data.next.scene, data.next.data);
  }
}
