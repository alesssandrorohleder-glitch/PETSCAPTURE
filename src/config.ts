/**
 * O layout do jogo usa coordenadas de 960×540, mas a renderização é em Full HD:
 * o canvas tem 1920×1080 e as câmeras usam zoom 2. Textos e texturas são gerados
 * em resolução dobrada para ficarem nítidos.
 */
export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;
export const RENDER_SCALE = 2;
export const TILE = 32;

export const FONT = '"Trebuchet MS", "Segoe UI", Verdana, sans-serif';

export const UI = {
  bg: 0x14112b,
  panel: 0x231d45,
  panelLight: 0x332a63,
  border: 0x8c7cf0,
  text: '#f4f1ff',
  textDim: '#a79fcf',
  accent: '#ffd166',
  danger: '#ff6b6b',
} as const;

export const SCENES = {
  Boot: 'Boot',
  Preload: 'Preload',
  Menu: 'Menu',
  Options: 'Options',
  TrainerSelect: 'TrainerSelect',
  World: 'World',
  Battle: 'Battle',
  Party: 'Party',
  Inventory: 'Inventory',
  Shop: 'Shop',
  GameOver: 'GameOver',
  Evolution: 'Evolution',
} as const;
