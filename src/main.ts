import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, RENDER_SCALE, UI } from './config';
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
import { GameState } from './systems/GameState';
import { createMonster } from './systems/Monster';
import { SaveManager } from './systems/SaveManager';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: Math.round(GAME_WIDTH * RENDER_SCALE),
  height: Math.round(GAME_HEIGHT * RENDER_SCALE),
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
// Exposto para testes automatizados.
Object.assign(window, { __state: GameState, __create: createMonster });

// Salva ao sair/trocar de aba e conta o tempo de jogo.
window.addEventListener('pagehide', () => SaveManager.save());
document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && SaveManager.save());
setInterval(() => {
  if (GameState.has() && document.visibilityState === 'visible' && game.scene.isActive('World')) GameState.get().playSeconds++;
}, 1000);
