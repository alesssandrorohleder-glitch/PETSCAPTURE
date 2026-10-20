import Phaser from 'phaser';
import { Settings } from './Settings';

/**
 * Ponto único para música e efeitos. Toca apenas sons que foram carregados
 * (ver README: /public/assets/audio). Se o arquivo não existir, não faz nada.
 */
export class AudioManager {
  private static music?: Phaser.Sound.BaseSound;
  private static musicKey?: string;

  static applyMute(game: Phaser.Game): void {
    game.sound.mute = !Settings.get().soundOn;
  }

  static setSound(game: Phaser.Game, on: boolean): void {
    Settings.update({ soundOn: on });
    this.applyMute(game);
  }

  static playMusic(scene: Phaser.Scene, key: string, volume = 0.5): void {
    if (this.musicKey === key && this.music?.isPlaying) return;
    this.stopMusic();
    if (!scene.cache.audio.exists(key)) return;
    this.music = scene.sound.add(key, { loop: true, volume });
    this.musicKey = key;
    this.music.play();
  }

  static stopMusic(): void {
    this.music?.stop();
    this.music?.destroy();
    this.music = undefined;
    this.musicKey = undefined;
  }

  static sfx(scene: Phaser.Scene, key: string, volume = 0.7): void {
    if (scene.cache.audio.exists(key)) scene.sound.play(key, { volume });
  }
}
