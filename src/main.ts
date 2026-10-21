import Phaser from 'phaser';
import { AudioManager } from './systems/AudioManager';
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
import { CoverScene } from './scenes/CoverScene';
import { GalleryScene } from './scenes/GalleryScene';
import { GameState } from './systems/GameState';
import { createMonster } from './systems/Monster';
import { SaveManager } from './systems/SaveManager';
import { urlParam } from './systems/UrlFlags';
import { AdManager } from './systems/AdManager';
import { CloudSave } from './systems/CloudSave';
import { GamePause } from './systems/GamePause';
import { openAccountPanel } from './ui/AccountPanel';
import { Settings } from './systems/Settings';
import { showConsentBanner } from './ui/ConsentBanner';

// ?cover=1 abre só a arte de capa (usada por scripts/cover.mjs)
const coverMode = urlParam('cover') === '1';
// ?gallery=1 abre a galeria com todas as espécies
const galleryMode = urlParam('gallery') === '1';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: Math.round(GAME_WIDTH * RENDER_SCALE),
  height: Math.round(GAME_HEIGHT * RENDER_SCALE),
  backgroundColor: UI.bg,
  pixelArt: false,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { activePointers: 3 },
  scene: coverMode
    ? [CoverScene]
    : galleryMode
      ? [GalleryScene]
      : [
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

// Anúncios: pausa som e controles enquanto um anúncio aparece; aviso de cookies na 1ª visita.
Object.assign(window, { __ads: AdManager, __cloud: CloudSave }); // para testes
// anúncios e janela de conta pausam som e controles do jogo
AudioManager.unlockOnGesture(game);
GamePause.init((paused) => {
  game.sound.mute = paused || !Settings.get().soundOn;
  game.input.enabled = !paused;
  if (game.input.keyboard) game.input.keyboard.enabled = !paused;
});
AdManager.init((paused) => GamePause.set('ad', paused));
// login e salvamento online (só se configurado — ver src/online.config.ts)
CloudSave.onRecovery(() => openAccountPanel('recovery'));
void CloudSave.init();
window.addEventListener('pagehide', () => CloudSave.flushOnExit());
if (!coverMode && !galleryMode) showConsentBanner();
