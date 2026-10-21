/**
 * O layout do jogo usa coordenadas de 960×540. A renderização acompanha a tela
 * até Full HD: num monitor 1080p o canvas tem 1920×1080 (zoom 2); em telas ou
 * janelas menores ele desenha menos pixels e fica mais leve. Texturas geradas e
 * textos são sempre criados em 2x, para ficarem nítidos.
 */
import { urlParam } from './systems/UrlFlags';

export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;
export const MAX_RENDER_SCALE = 2; // 1920×1080

function pickRenderScale(): number {
  if (typeof window === 'undefined') return MAX_RENDER_SCALE;
  const forced = Number(urlParam('scale'));
  const clamp = (v: number) => Math.min(MAX_RENDER_SCALE, Math.max(1, v));
  if (forced) return clamp(forced);
  const dpr = window.devicePixelRatio || 1;
  const fit = Math.min((window.innerWidth * dpr) / GAME_WIDTH, (window.innerHeight * dpr) / GAME_HEIGHT);
  return clamp(Math.ceil(fit * 4) / 4); // passos de 0,25
}

/** Zoom das câmeras (tamanho do canvas = 960×540 × RENDER_SCALE). Use ?scale=2 para forçar Full HD. */
export const RENDER_SCALE = pickRenderScale();
/** Aproximação extra da câmera do mapa (personagens e cenário maiores na tela). */
export const WORLD_ZOOM = 1.6;
/** Escala das texturas geradas (3x = nítidas mesmo com o zoom do mapa em Full HD). */
export const TEXTURE_SCALE = 3;
/** Resolução dos textos (2x = nítido até Full HD). */
export const TEXT_RESOLUTION = 2;
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
