import { SCENES, UI } from '../config';
import { MAPS } from '../data/maps';
import { getTrainer } from '../data/trainers';
import { formatPlayTime, SaveManager } from '../systems/SaveManager';
import { MenuList } from '../ui/MenuList';
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
    this.title('Elementais', 120).setFontSize(64);
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
