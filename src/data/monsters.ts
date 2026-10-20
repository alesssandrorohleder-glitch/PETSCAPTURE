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
/** Learnset em pares [nível, golpe]. */
const wl = (pairs: [number, string][]) => pairs.map(([level, move]) => ({ level, move }));
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
  verdaki: s({
    id: 'verdaki', name: 'Verdaki', types: ['grama', 'inseto'],
    description: 'Bebê fofo e gorducho, verde-claro, com uma carapaça de folha brilhante nas costas e duas antenas de broto em espiral.',
    base: { hp: 46, atk: 44, def: 48, spd: 40 },
    learnset: ls(['folha_navalha', 'picada_venenosa', 'chicote_vinha', 'enxame', 'esporos_sono', 'floresta_devoradora'], [1, 3, 6, 9, 12, 18]),
    evolution: { level: 10, into: 'verdamantis' },
    catchRate: 170, xpYield: 52, shape: 'blob',
  }),
  verdamantis: s({
    id: 'verdamantis', name: 'Verdamantis', types: ['grama', 'inseto'],
    description: 'Híbrido de louva-a-deus e besouro, com carapaça de folhas e braços de vinha cheios de espinhos.',
    base: { hp: 60, atk: 66, def: 62, spd: 60 },
    learnset: ls(['folha_navalha', 'picada_venenosa', 'chicote_vinha', 'enxame', 'esporos_sono', 'floresta_devoradora'], [1, 3, 6, 9, 12, 18]),
    evolution: { level: 20, into: 'verdakor' },
    catchRate: 90, xpYield: 100, shape: 'triangle',
  }),
  verdakor: s({
    id: 'verdakor', name: 'Verdakor', types: ['grama', 'inseto'],
    description: 'Mariposa de galhos e casca com brotos na cabeça como chifres, olhos âmbar e quatro asas de folha de outono que brilham contra o sol.',
    base: { hp: 76, atk: 88, def: 70, spd: 92 },
    learnset: ls(['folha_navalha', 'picada_venenosa', 'chicote_vinha', 'enxame', 'esporos_sono', 'floresta_devoradora'], [1, 3, 6, 9, 12, 18]),
    catchRate: 45, xpYield: 170, shape: 'star',
  }),
  larvilo: s({
    id: 'larvilo', name: 'Larvilo', types: ['inseto'],
    description: 'Larva fofa de casca verde-musgo que tece fios de seda brilhante.',
    base: { hp: 42, atk: 36, def: 40, spd: 38 },
    learnset: [{ level: 1, move: 'picada' }, { level: 4, move: 'fio_seda' }, { level: 7, move: 'picada_venenosa' }, { level: 11, move: 'enxame' }],
    catchRate: 200, xpYield: 40, shape: 'blob',
  }),
  // Floresta Encantada
  brotinho: s({
    id: 'brotinho', name: 'Brotinho', types: ['grama'],
    description: 'Broto saltitante com duas folhas na cabeça que giram como hélice.',
    base: { hp: 42, atk: 34, def: 40, spd: 40 },
    learnset: wl([[1, 'investida'], [5, 'absorver'], [8, 'esporos_sono'], [12, 'folha_navalha']]),
    catchRate: 190, xpYield: 42, shape: 'circle',
  }),
  // Praia e Recifes
  conchilo: s({
    id: 'conchilo', name: 'Conchilo', types: ['agua'],
    description: 'Ermitão que mora numa concha espiral cheia de cracas coloridas.',
    base: { hp: 50, atk: 52, def: 68, spd: 35 },
    learnset: wl([[1, 'jato_dagua'], [5, 'bolha_prisao'], [9, 'onda_cortante'], [14, 'rolar_blindado']]),
    catchRate: 150, xpYield: 60, shape: 'square',
  }),
  medulume: s({
    id: 'medulume', name: 'Medulume', types: ['agua', 'eletrico'],
    description: 'Água-viva translúcida que brilha com pequenas descargas nos tentáculos.',
    base: { hp: 48, atk: 55, def: 45, spd: 60 },
    learnset: wl([[1, 'choque'], [5, 'jato_dagua'], [8, 'paralisia'], [12, 'onda_cortante']]),
    catchRate: 120, xpYield: 68, shape: 'blob',
  }),
  // Planalto da Tempestade
  zumbolt: s({
    id: 'zumbolt', name: 'Zumbolt', types: ['eletrico', 'inseto'],
    description: 'Besouro de carapaça metálica que acumula estática nas antenas.',
    base: { hp: 50, atk: 62, def: 55, spd: 58 },
    learnset: wl([[1, 'picada'], [6, 'choque'], [10, 'enxame'], [13, 'investida_relampago']]),
    catchRate: 120, xpYield: 75, shape: 'hexagon',
  }),
  voltabico: s({
    id: 'voltabico', name: 'Voltabico', types: ['eletrico'],
    description: 'Filhote de pássaro-trovão com penas eriçadas em forma de raio.',
    base: { hp: 48, atk: 65, def: 45, spd: 78 },
    learnset: wl([[1, 'choque'], [8, 'investida_relampago'], [12, 'campo_magnetico'], [16, 'trovao_celeste']]),
    catchRate: 110, xpYield: 78, shape: 'star',
  }),
  // Cânion de Pedra
  pedrusco: s({
    id: 'pedrusco', name: 'Pedrusco', types: ['terra'],
    description: 'Pedregulho vivo com musgo nas costas que rola ladeira abaixo por diversão.',
    base: { hp: 65, atk: 68, def: 80, spd: 30 },
    learnset: wl([[1, 'arremesso_pedra'], [10, 'rolar_blindado'], [14, 'muralha_rocha'], [17, 'tremor']]),
    catchRate: 110, xpYield: 85, shape: 'circle',
  }),
  escorpedra: s({
    id: 'escorpedra', name: 'Escorpedra', types: ['terra', 'inseto'],
    description: 'Escorpião de casca arenosa com um ferrão de cristal âmbar.',
    base: { hp: 55, atk: 78, def: 65, spd: 55 },
    learnset: wl([[1, 'picada_venenosa'], [10, 'arremesso_pedra'], [14, 'tremor'], [18, 'lanca_cristal']]),
    catchRate: 100, xpYield: 90, shape: 'triangle',
  }),
  // Picos Congelados
  pinguelo: s({
    id: 'pinguelo', name: 'Pinguelo', types: ['gelo', 'agua'],
    description: 'Pinguim gorducho que desliza de barriga pelas encostas geladas.',
    base: { hp: 68, atk: 65, def: 62, spd: 50 },
    learnset: wl([[1, 'rajada_gelida'], [12, 'jato_dagua'], [16, 'espinhos_gelo'], [20, 'onda_cortante']]),
    catchRate: 100, xpYield: 95, shape: 'blob',
  }),
  nevasco: s({
    id: 'nevasco', name: 'Nevasco', types: ['gelo'],
    description: 'Filhote de yeti de pelo azulado que solta flocos de neve ao espirrar.',
    base: { hp: 75, atk: 80, def: 60, spd: 58 },
    learnset: wl([[1, 'rajada_gelida'], [14, 'espinhos_gelo'], [19, 'nevasca'], [23, 'prisao_cristal']]),
    catchRate: 90, xpYield: 105, shape: 'square',
  }),
  // Ruínas da Lua
  sombrelo: s({
    id: 'sombrelo', name: 'Sombrelo', types: ['sombra'],
    description: 'Lanterna fantasma com uma chama violeta que hipnotiza quem olha.',
    base: { hp: 60, atk: 75, def: 60, spd: 72 },
    learnset: wl([[1, 'garra_sombria'], [18, 'ilusao'], [23, 'drenar_energia'], [27, 'lua_negra']]),
    catchRate: 80, xpYield: 120, shape: 'diamond',
  }),
  corvanoite: s({
    id: 'corvanoite', name: 'Corvanoite', types: ['sombra'],
    description: 'Corvo de penas escuras como a noite e olhos de lua cheia.',
    base: { hp: 62, atk: 85, def: 55, spd: 85 },
    learnset: wl([[1, 'garra_sombria'], [20, 'passo_fantasma'], [25, 'drenar_energia'], [29, 'lua_negra']]),
    catchRate: 70, xpYield: 125, shape: 'triangle',
  }),
};

export const getSpecies = (id: string): SpeciesData => {
  const sp = SPECIES[id];
  if (!sp) throw new Error(`Espécie desconhecida: ${id}`);
  return sp;
};
