import Phaser from 'phaser';
import { Settings } from './Settings';
import { MusicSynth } from './MusicSynth';
import { playSynth } from './Synth';

/**
 * Ponto único para música e efeitos. Usa os arquivos de /public/assets/audio quando existem;
 * senão, toca música e efeitos gerados na hora (MusicSynth / Synth).
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
    if (this.musicKey === key && (this.music?.isPlaying || !this.music)) return;
    this.stopMusic();
    if (!scene.cache.audio.exists(key)) {
      if (MusicSynth.play(scene.game, key, volume)) this.musicKey = key;
      return;
    }
    this.music = scene.sound.add(key, { loop: true, volume });
    this.musicKey = key;
    this.music.play();
  }

  static stopMusic(): void {
    MusicSynth.stop();
    this.music?.stop();
    this.music?.destroy();
    this.music = undefined;
    this.musicKey = undefined;
  }

  /** Toca o arquivo de som se existir; senão, um som sintetizado simples. */
  /** Navegadores só liberam o som depois de um toque ou tecla: libera no primeiro gesto. */
  static unlockOnGesture(game: Phaser.Game): void {
    const unlock = () => {
      const ctx = (game.sound as Phaser.Sound.WebAudioSoundManager).context;
      if (ctx && ctx.state !== 'running') void ctx.resume().catch(() => {});
      if (!ctx || ctx.state === 'running') ['pointerdown', 'touchend', 'keydown'].forEach((e) => window.removeEventListener(e, unlock, true));
    };
    ['pointerdown', 'touchend', 'keydown'].forEach((e) => window.addEventListener(e, unlock, true));
  }

  static sfx(scene: Phaser.Scene, key: string, volume = 0.7): void {
    if (scene.cache.audio.exists(key)) scene.sound.play(key, { volume });
    else playSynth(scene.game, key);
  }
}
