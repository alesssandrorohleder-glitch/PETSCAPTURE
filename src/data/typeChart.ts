import type { ElementId } from './elements';

/**
 * Tabela de tipos: quem cada elemento ataca com dano x2.
 * O dano x0.5 é deduzido automaticamente: se o alvo é forte contra o tipo do golpe
 * (ex.: Fogo atacando Água), o golpe "não é muito efetivo".
 * Para um novo tipo, basta adicionar uma linha.
 */
export const STRONG_AGAINST: Record<ElementId, ElementId[]> = {
  fogo: ['grama', 'inseto', 'gelo'],
  agua: ['fogo', 'terra'],
  grama: ['agua', 'terra'],
  inseto: ['grama', 'sombra'],
  eletrico: ['agua'],
  terra: ['fogo', 'eletrico'],
  gelo: ['grama', 'terra'],
  sombra: ['sombra'],
};

/** Multiplicador de um golpe do tipo `move` contra um alvo de um tipo. */
export function singleMultiplier(move: ElementId, target: ElementId): number {
  if (STRONG_AGAINST[move].includes(target)) return 2;
  if (STRONG_AGAINST[target].includes(move)) return 0.5;
  return 1;
}

/** Multiplicador total (monstros de dois tipos multiplicam os dois valores). */
export function effectiveness(move: ElementId, targetTypes: ElementId[]): number {
  return targetTypes.reduce((acc, t) => acc * singleMultiplier(move, t), 1);
}
