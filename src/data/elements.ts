/**
 * Elementos do jogo. Para adicionar um novo: inclua o id em ElementId,
 * os dados em ELEMENTS e as relações em src/data/typeChart.ts.
 */
export type ElementId = 'fogo' | 'agua' | 'grama' | 'inseto' | 'eletrico' | 'terra' | 'gelo' | 'sombra';

export interface ElementInfo {
  name: string;
  color: number;
  /** cor do texto/realce em CSS */
  css: string;
  icon: string;
}

export const ELEMENTS: Record<ElementId, ElementInfo> = {
  fogo: { name: 'Fogo', color: 0xff6b35, css: '#ff6b35', icon: '🔥' },
  agua: { name: 'Água', color: 0x3a86ff, css: '#3a86ff', icon: '💧' },
  grama: { name: 'Grama', color: 0x52b788, css: '#52b788', icon: '🌿' },
  inseto: { name: 'Inseto', color: 0xa7c957, css: '#a7c957', icon: '🐞' },
  eletrico: { name: 'Elétrico', color: 0xffd60a, css: '#ffd60a', icon: '⚡' },
  terra: { name: 'Terra', color: 0xb08968, css: '#b08968', icon: '🪨' },
  gelo: { name: 'Gelo', color: 0x90e0ef, css: '#90e0ef', icon: '❄️' },
  sombra: { name: 'Sombra', color: 0x9d4edd, css: '#9d4edd', icon: '🌑' },
};
