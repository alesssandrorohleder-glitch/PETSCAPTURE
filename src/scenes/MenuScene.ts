import { GAME_HEIGHT, GAME_WIDTH, SCENES, UI } from '../config';
import { ELEMENTS } from '../data/elements';
import { fxTexture } from '../systems/Placeholders';
import { MAPS } from '../data/maps';
import { getTrainer } from '../data/trainers';
import { formatPlayTime, SaveManager } from '../systems/SaveManager';
import { MenuList, type MenuItem } from '../ui/MenuList';
import { CloudSave } from '../systems/CloudSave';
import { openAccountPanel } from '../ui/AccountPanel';
import Phaser from 'phaser';
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

    this.menu = undefined; // a cena pode ser reaberta: não reaproveitar o menu antigo
    this.hadSave = true; // na abertura, a seleção padrão já cuida disso
    this.cloudText = makeText(this, GAME_WIDTH - 16, 14, '', 15, UI.accent).setOrigin(1, 0);
    this.buildMenu();
    makeText(this, this.cx, 520, 'Setas/WASD + Enter  •  ou toque na tela', 15, UI.textDim).setOrigin(0.5);
    // o menu se atualiza ao entrar/sair da conta ou quando a nuvem traz outro progresso
    const off = CloudSave.onChange(() => this.scene.isActive() && this.buildMenu());
    this.events.once('shutdown', off);
    if (CloudSave.pending) this.openAccount();
  }

  private cloudText!: Phaser.GameObjects.Text;
  private hadSave = false;

  private buildMenu(): void {
    const selected = this.menu?.selectedIndex;
    this.menu?.destroy();
    const save = SaveManager.summary();
    const hint = save
      ? `${getTrainer(save.trainerId).name} • ${MAPS[save.mapId]?.name ?? ''} • ${formatPlayTime(save.playSeconds)}`
      : undefined;
    const items: MenuItem[] = [
      { label: 'Continuar', hint, disabled: !save, onSelect: () => this.continueGame() },
      { label: 'Novo Jogo', onSelect: () => void this.newGame(!!save) },
    ];
    if (CloudSave.enabled) {
      items.push(
        CloudSave.user
          ? { label: `Conta: ${CloudSave.user.name}`, hint: 'progresso salvo online', onSelect: () => this.openAccount() }
          : { label: 'Entrar / Criar conta', hint: 'salve seu progresso online', onSelect: () => this.openAccount() },
      );
    }
    items.push({ label: 'Opções', onSelect: () => this.goTo(SCENES.Options) });
    const h = 54;
    this.menu = new MenuList(this, items, { x: this.cx - 170, y: 226, itemWidth: 340, itemHeight: h, gap: 10 });
    // mantém a seleção ao reconstruir; se um progresso acabou de chegar (login), vai para "Continuar"
    if (save && !this.hadSave) this.menu.select(0);
    else if (selected !== undefined && !items[selected]?.disabled) this.menu.select(Math.min(selected, items.length - 1));
    this.hadSave = !!save;
    this.cloudText.setText(CloudSave.user ? `☁ ${CloudSave.user.name}` : '');
  }

  private openAccount(): void {
    this.menu?.setEnabled(false);
    openAccountPanel(undefined, () => {
      this.menu?.setEnabled(true);
      this.buildMenu();
    });
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
