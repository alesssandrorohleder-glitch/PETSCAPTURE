import type { ElementId } from './elements';

export type PlaceholderShape = 'circle' | 'triangle' | 'diamond' | 'square' | 'star' | 'hexagon' | 'blob';

export interface BaseStats {
  hp: number;
  atk: number;
  def: number;
  spd: number;
}

export interface SpeciesData {
  id: string;
  name: string;
  types: ElementId[];
  description: string;
  base: BaseStats;
  /** Golpes aprendidos por nível (ids de src/data/moves.ts). */
  learnset: { level: number; move: string }[];
  evolution?: { level: number; into: string };
  /** 0–255: quanto maior, mais fácil capturar. */
  catchRate: number;
  /** XP base dado ao ser derrotado. */
  xpYield: number;
  /** Forma do placeholder até você colocar a imagem. */
  shape: PlaceholderShape;
}

const s = (d: SpeciesData): SpeciesData => d;

/** Níveis padrão dos golpes dos pets iniciais: 1, 3, 5, 7, 10 e 15 (supremo). */
const ls = (moves: string[], levels = [1, 3, 5, 7, 10, 15]) => moves.map((move, i) => ({ level: levels[i], move }));
const IGNIS_LS = ls(['faisca', 'cauda_brasa', 'garra_ignea', 'escudo_chamas', 'rajada_solar', 'fenix_ancestral']);
const AQUARIS_LS = ls(['jato_dagua', 'bolha_prisao', 'onda_cortante', 'cura_mare', 'redemoinho', 'tsunami_abissal']);
const VOLTIX_LS = ls(['choque', 'investida_relampago', 'campo_magnetico', 'paralisia', 'trovao_celeste', 'tempestade_mil_raios']);
const TERRAGON_LS = ls(['arremesso_pedra', 'rolar_blindado', 'muralha_rocha', 'tremor', 'lanca_cristal', 'furia_montanha']);
const FROSTELLE_LS = ls(['rajada_gelida', 'espinhos_gelo', 'espelho_congelado', 'nevasca', 'prisao_cristal', 'aurora_eterna']);
const UMBREL_LS = ls(['garra_sombria', 'passo_fantasma', 'ilusao', 'drenar_energia', 'lua_negra', 'eclipse_total']);

/** Pets iniciais, o de Noctis e monstros selvagens. */
export const SPECIES: Record<string, SpeciesData> = {
  ignis: s({
    id: 'ignis', name: 'Ignis', types: ['fogo'],
    description: 'Híbrido de raposa e salamandra, escamas carmesim e cauda em chamas.',
    base: { hp: 45, atk: 60, def: 45, spd: 62 }, learnset: IGNIS_LS, evolution: { level: 10, into: 'ignis_evo' },
    catchRate: 45, xpYield: 64, shape: 'triangle',
  }),
  ignis_evo: s({
    id: 'ignis_evo', name: 'Ignis Evoluído', types: ['fogo'],
    description: 'Juba de fogo vivo e rachaduras de lava pelo corpo.',
    base: { hp: 72, atk: 92, def: 68, spd: 88 }, learnset: IGNIS_LS,
    catchRate: 20, xpYield: 160, shape: 'triangle',
  }),
  aquaris: s({
    id: 'aquaris', name: 'Aquaris', types: ['agua'],
    description: 'Híbrido de lontra e golfinho, pele azul safira e gotas orbitando o corpo.',
    base: { hp: 52, atk: 50, def: 55, spd: 55 }, learnset: AQUARIS_LS, evolution: { level: 10, into: 'aquaris_evo' },
    catchRate: 45, xpYield: 64, shape: 'blob',
  }),
  aquaris_evo: s({
    id: 'aquaris_evo', name: 'Aquaris Evoluído', types: ['agua'],
    description: 'Serpente guardiã do mar com coroa de coral.',
    base: { hp: 85, atk: 80, def: 82, spd: 75 }, learnset: AQUARIS_LS,
    catchRate: 20, xpYield: 160, shape: 'blob',
  }),
  voltix: s({
    id: 'voltix', name: 'Voltix', types: ['eletrico'],
    description: 'Híbrido de lobo e lebre, pelo amarelo com marcas pretas em zigue-zague.',
    base: { hp: 42, atk: 55, def: 40, spd: 75 }, learnset: VOLTIX_LS, evolution: { level: 10, into: 'voltix_evo' },
    catchRate: 45, xpYield: 64, shape: 'star',
  }),
  voltix_evo: s({
    id: 'voltix_evo', name: 'Voltix Evoluído', types: ['eletrico'],
    description: 'Lobo do trovão com juba de relâmpagos.',
    base: { hp: 68, atk: 88, def: 62, spd: 105 }, learnset: VOLTIX_LS,
    catchRate: 20, xpYield: 160, shape: 'star',
  }),
  terragon: s({
    id: 'terragon', name: 'Terragon', types: ['terra'],
    description: 'Híbrido de tatu e rinoceronte, armadura de pedra e chifre de cristal.',
    base: { hp: 55, atk: 58, def: 65, spd: 35 }, learnset: TERRAGON_LS, evolution: { level: 10, into: 'terragon_evo' },
    catchRate: 45, xpYield: 64, shape: 'square',
  }),
  terragon_evo: s({
    id: 'terragon_evo', name: 'Terragon Evoluído', types: ['terra'],
    description: 'Titã de pedra com cristais âmbar.',
    base: { hp: 90, atk: 90, def: 100, spd: 50 }, learnset: TERRAGON_LS,
    catchRate: 20, xpYield: 160, shape: 'square',
  }),
  frostelle: s({
    id: 'frostelle', name: 'Frostelle', types: ['gelo'],
    description: 'Híbrido de coruja das neves e raposa, penas brancas com pontas azuis e cauda de cristal.',
    base: { hp: 48, atk: 57, def: 48, spd: 60 }, learnset: FROSTELLE_LS, evolution: { level: 10, into: 'frostelle_evo' },
    catchRate: 45, xpYield: 64, shape: 'diamond',
  }),
  frostelle_evo: s({
    id: 'frostelle_evo', name: 'Frostelle Evoluída', types: ['gelo'],
    description: 'Fênix-coruja de gelo com luz de aurora.',
    base: { hp: 75, atk: 90, def: 72, spd: 88 }, learnset: FROSTELLE_LS,
    catchRate: 20, xpYield: 160, shape: 'diamond',
  }),
  umbrel: s({
    id: 'umbrel', name: 'Umbrel', types: ['sombra'],
    description: 'Híbrido de gato e morcego, pelo preto com marcas roxas brilhantes e fumaça na cauda.',
    base: { hp: 48, atk: 62, def: 44, spd: 66 }, learnset: UMBREL_LS, evolution: { level: 10, into: 'umbrel_evo' },
    catchRate: 30, xpYield: 70, shape: 'hexagon',
  }),
  umbrel_evo: s({
    id: 'umbrel_evo', name: 'Umbrel Evoluído', types: ['sombra'],
    description: 'Pantera sombria com asas de escuridão.',
    base: { hp: 76, atk: 96, def: 70, spd: 94 }, learnset: UMBREL_LS,
    catchRate: 15, xpYield: 170, shape: 'hexagon',
  }),

  // ------------------------------------------------ Selvagens
  verdakor: s({
    id: 'verdakor', name: 'Verdakor', types: ['grama', 'inseto'],
    description: 'Híbrido de louva-a-deus e besouro, carapaça de folhas e braços de vinha com espinhos.',
    base: { hp: 50, atk: 48, def: 50, spd: 46 },
    learnset: ls(['folha_navalha', 'picada_venenosa', 'chicote_vinha', 'enxame', 'esporos_sono', 'floresta_devoradora'], [1, 3, 6, 9, 12, 18]),
    catchRate: 150, xpYield: 55, shape: 'diamond',
  }),
  larvilo: s({
    id: 'larvilo', name: 'Larvilo', types: ['inseto'],
    description: 'Larva fofa de casca verde-musgo que tece fios de seda brilhante.',
    base: { hp: 42, atk: 36, def: 40, spd: 38 },
    learnset: [{ level: 1, move: 'picada' }, { level: 4, move: 'fio_seda' }, { level: 7, move: 'picada_venenosa' }, { level: 11, move: 'enxame' }],
    catchRate: 200, xpYield: 40, shape: 'blob',
  }),
};

export const getSpecies = (id: string): SpeciesData => {
  const sp = SPECIES[id];
  if (!sp) throw new Error(`Espécie desconhecida: ${id}`);
  return sp;
};
