import { SCENES } from '../config';
import { AudioManager } from '../systems/AudioManager';
import { BaseScene } from './BaseScene';

export class BootScene extends BaseScene {
  constructor() {
    super(SCENES.Boot);
  }

  create(): void {
    AudioManager.applyMute(this.game);
    this.scene.start(SCENES.Preload);
  }
}
