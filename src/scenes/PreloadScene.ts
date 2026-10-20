import manifest from 'virtual:asset-manifest';
import { SCENES, UI } from '../config';
import { makeText } from '../ui/text';
import { BaseScene, fitCamera } from './BaseScene';

const IMAGE_EXT = /\.(png|jpe?g|webp)$/i;
const AUDIO_EXT = /\.(mp3|ogg|wav|m4a)$/i;

/** "monsters/ignis.png" -> "monsters/ignis" */
export const assetKey = (file: string): string => file.replace(/\.[^.]+$/, '');

export class PreloadScene extends BaseScene {
  constructor() {
    super(SCENES.Preload);
  }

  preload(): void {
    fitCamera(this.cameras.main).setBackgroundColor(UI.bg);
    const w = 420;
    const x = this.cx - w / 2;
    const y = this.cy;
    makeText(this, this.cx, y - 50, 'Elementais', 36, UI.accent, { fontStyle: 'bold' }).setOrigin(0.5);
    const label = makeText(this, this.cx, y + 40, 'Carregando... 0%', 18, UI.textDim).setOrigin(0.5);
    const frame = this.add.graphics();
    frame.lineStyle(3, UI.border).strokeRoundedRect(x, y - 12, w, 24, 8);
    const bar = this.add.graphics();

    this.load.on('progress', (p: number) => {
      bar.clear().fillStyle(0xffd166).fillRoundedRect(x + 4, y - 8, Math.max(8, (w - 8) * p), 16, 6);
      label.setText(`Carregando... ${Math.round(p * 100)}%`);
    });
    // Se um arquivo falhar, segue com o placeholder.
    this.load.on('loaderror', (file: Phaser.Loader.File) => console.warn('[assets] falhou:', file.src));

    for (const file of manifest) {
      const key = assetKey(file);
      if (IMAGE_EXT.test(file)) this.load.image(key, `assets/${file}`);
      else if (AUDIO_EXT.test(file)) this.load.audio(key, `assets/${file}`);
    }
  }

  create(): void {
    // Pequena pausa para a barra ser visível mesmo sem arquivos.
    this.time.delayedCall(350, () => this.scene.start(SCENES.Menu));
  }
}
