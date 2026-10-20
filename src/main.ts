import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, UI } from './config';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { MenuScene } from './scenes/MenuScene';
import { OptionsScene } from './scenes/OptionsScene';
import { TrainerSelectScene } from './scenes/TrainerSelectScene';
import { WorldScene } from './scenes/WorldScene';
import { BattleScene } from './scenes/BattleScene';
import { PartyScene } from './scenes/PartyScene';
import { InventoryScene } from './scenes/InventoryScene';
import { ShopScene } from './scenes/ShopScene';
import { GameOverScene } from './scenes/GameOverScene';
import { EvolutionScene } from './scenes/EvolutionScene';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: UI.bg,
  pixelArt: false,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { activePointers: 3 },
  scene: [
    BootScene,
    PreloadScene,
    MenuScene,
    OptionsScene,
    TrainerSelectScene,
    WorldScene,
    BattleScene,
    PartyScene,
    InventoryScene,
    ShopScene,
    GameOverScene,
    EvolutionScene,
  ],
});

// Exposto para testes automatizados (scripts/smoke.mjs).
(window as unknown as { __game: Phaser.Game }).__game = game;
import { GameState } from './systems/GameState';
(window as unknown as { __state: typeof GameState }).__state = GameState;
