import Phaser from 'phaser';
import { SCENES, UI } from '../config';
import { ELEMENTS } from '../data/elements';
import { getSpecies } from '../data/monsters';
import { TRAINERS, type TrainerData } from '../data/trainers';
import { Controls } from '../systems/Controls';
import { GameState } from '../systems/GameState';
import { fitInto, monsterTexture, trainerPortrait } from '../systems/Placeholders';
import { DialogBox } from '../ui/DialogBox';
import { makeText } from '../ui/text';
import { BaseScene } from './BaseScene';

const CARD_W = 176;
const CARD_H = 428;
const GAP = 10;

export class TrainerSelectScene extends BaseScene {
  private cards: Phaser.GameObjects.Container[] = [];
  private frames: Phaser.GameObjects.Rectangle[] = [];
  private index = 0;
  private dialog!: DialogBox;
  private choices: TrainerData[] = [];

  constructor() {
    super(SCENES.TrainerSelect);
  }

  create(): void {
    this.setupScene();
    this.cards = [];
    this.frames = [];
    this.index = 0;
    this.title('Escolha seu Domador', 30).setFontSize(28);

    this.choices = TRAINERS.filter((t) => t.selectable);
    const startX = this.cx - (this.choices.length * CARD_W + (this.choices.length - 1) * GAP) / 2;
    this.choices.forEach((t, i) => this.buildCard(t, startX + i * (CARD_W + GAP), 60, i));

    makeText(this, this.cx, 522, '← → para escolher  •  Enter ou toque para confirmar  •  Esc para voltar', 15, UI.textDim).setOrigin(0.5);

    const controls = new Controls(this, { pad: false });
    this.dialog = new DialogBox(this, controls);
    this.input.keyboard!.on('keydown', (e: KeyboardEvent) => {
      if (this.dialog.open) return;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.select(this.index - 1);
      if (e.code === 'ArrowRight' || e.code === 'KeyD') this.select(this.index + 1);
      if (e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyZ') this.confirm();
      if (e.code === 'Escape') this.goTo(SCENES.Menu);
    });
    this.select(0);
  }

  private buildCard(t: TrainerData, x: number, y: number, i: number): void {
    const el = ELEMENTS[t.element];
    const pet = getSpecies(t.starter);
    const frame = this.add.rectangle(0, 0, CARD_W, CARD_H, UI.panel).setOrigin(0).setStrokeStyle(3, UI.border);
    const band = this.add.rectangle(0, 0, CARD_W, 140, el.color, 0.35).setOrigin(0);
    const portrait = fitInto(this.add.image(CARD_W / 2, 70, trainerPortrait(this, t)), CARD_W - 16, 132);
    const name = makeText(this, CARD_W / 2, 148, `${t.name}, ${t.age}`, 22, UI.text, { fontStyle: 'bold' }).setOrigin(0.5, 0);
    const chip = this.add.rectangle(CARD_W / 2, 188, 96, 24, el.color).setStrokeStyle(2, 0xffffff, 0.6);
    const chipText = makeText(this, CARD_W / 2, 188, el.name.toUpperCase(), 14, '#1a1a2e', { fontStyle: 'bold' }).setOrigin(0.5);
    const petImg = fitInto(this.add.image(36, 232, monsterTexture(this, pet.id)), 56, 56);
    const petName = makeText(this, 70, 218, pet.name, 18, el.css, { fontStyle: 'bold' });
    const petLbl = makeText(this, 70, 240, 'pet inicial', 12, UI.textDim);
    const desc = makeText(this, 12, 270, `${t.description}\n\n${pet.description}`, 12, UI.textDim, { wordWrap: { width: CARD_W - 24 }, lineSpacing: 1 });

    const card = this.add.container(x, y, [frame, band, portrait, name, chip, chipText, petImg, petName, petLbl, desc]);
    card.setSize(CARD_W, CARD_H);
    frame.setInteractive({ useHandCursor: true });
    frame.on('pointerover', () => !this.dialog.open && this.select(i));
    frame.on('pointerup', () => {
      if (this.dialog.open) return;
      this.select(i);
      this.confirm();
    });
    this.cards.push(card);
    this.frames.push(frame);
  }

  private select(i: number): void {
    const n = this.cards.length;
    this.index = (i + n) % n;
    this.cards.forEach((c, k) => {
      const sel = k === this.index;
      c.setAlpha(sel ? 1 : 0.72);
      this.frames[k].setStrokeStyle(sel ? 4 : 2, sel ? 0xffd166 : UI.border);
      this.tweens.add({ targets: c, y: sel ? 52 : 60, duration: 120 });
    });
  }

  private async confirm(): Promise<void> {
    const t = this.choices[this.index];
    const pet = getSpecies(t.starter);
    const answer = await this.dialog.ask(`Começar a jornada com ${t.name} e ${pet.name}?`, ['Sim', 'Não']);
    if (answer !== 0) return;
    GameState.newGame(t.id);
    this.goTo(SCENES.World);
  }
}
