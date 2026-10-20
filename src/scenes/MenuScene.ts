import { GAME_HEIGHT, GAME_WIDTH, SCENES, UI } from '../config';
import { ELEMENTS } from '../data/elements';
import { fxTexture } from '../systems/Placeholders';
import { MAPS } from '../data/maps';
import { getTrainer } from '../data/trainers';
import { formatPlayTime, SaveManager } from '../systems/SaveManager';
import { MenuList } from '../ui/MenuList';
import { AudioManager } from '../systems/AudioManager';
import { choose } from '../ui/Overlay';
import { makeText } from '../ui/text';
import { BaseScene } from './BaseScene';

export class MenuScene extends BaseScene {
  private menu?: MenuList;

  constructor() {
    super(SCENES.Menu);
  }

  create(): void {
    this.setupScene();
    AudioManager.playMusic(this, 'music/menu');
    // orbes dos elementos subindo ao fundo
    this.add.particles(0, 0, fxTexture(this, 'orb'), {
      x: { min: 0, max: GAME_WIDTH },
      y: GAME_HEIGHT + 20,
      speedY: { min: -40, max: -18 },
      speedX: { min: -8, max: 8 },
      scale: { min: 0.3, max: 0.9 },
      alpha: { start: 0.55, end: 0 },
      lifespan: 14000,
      frequency: 260,
      tint: Object.values(ELEMENTS).map((e) => e.color),
      blendMode: 'ADD',
      advance: 8000,
    });
    const logo = this.title('Elementais', 120).setFontSize(64).setShadow(0, 4, '#000000', 12, true, true);
    this.tweens.add({ targets: logo, y: 112, yoyo: true, repeat: -1, duration: 1800, ease: 'Sine.inOut' });
    makeText(this, this.cx, 180, 'A Jornada dos Domadores', 26, UI.text).setOrigin(0.5);

    const save = SaveManager.summary();
    const hint = save
      ? `${getTrainer(save.trainerId).name} • ${MAPS[save.mapId]?.name ?? ''} • ${formatPlayTime(save.playSeconds)}`
      : undefined;
    this.menu = new MenuList(
      this,
      [
        { label: 'Continuar', hint, disabled: !save, onSelect: () => this.continueGame() },
        { label: 'Novo Jogo', onSelect: () => void this.newGame(!!save) },
        { label: 'Opções', onSelect: () => this.goTo(SCENES.Options) },
      ],
      { x: this.cx - 170, y: 240, itemWidth: 340, itemHeight: save ? 60 : 50 },
    );
    makeText(this, this.cx, 510, 'Setas/WASD + Enter  •  ou toque na tela', 15, UI.textDim).setOrigin(0.5);
  }

  private continueGame(): void {
    if (SaveManager.load()) this.goTo(SCENES.World);
  }

  private async newGame(hasSave: boolean): Promise<void> {
    if (hasSave) {
      this.menu?.setEnabled(false);
      const ok = await choose(this, 'Começar um novo jogo apaga o progresso salvo. Tem certeza?', [{ label: 'Sim, começar de novo' }, { label: 'Cancelar' }]);
      this.menu?.setEnabled(true);
      if (ok !== 0) return;
    }
    this.goTo(SCENES.TrainerSelect);
  }
}
