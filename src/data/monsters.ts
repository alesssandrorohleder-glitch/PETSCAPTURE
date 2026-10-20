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
    description: 'Raposa-lagarto esguia, de orelhas de feneco e cauda que termina em chamas vivas.',
    base: { hp: 45, atk: 60, def: 45, spd: 62 }, learnset: IGNIS_LS, evolution: { level: 10, into: 'ignis_evo' },
    catchRate: 45, xpYield: 64, shape: 'triangle',
  }),
  ignis_evo: s({
    id: 'ignis_evo', name: 'Ignara', types: ['fogo'],
    description: 'Mais ágil e alta, com uma juba de fogo vivo nos ombros e rachaduras de lava brilhando entre as escamas.',
    base: { hp: 62, atk: 80, def: 58, spd: 80 }, learnset: IGNIS_LS, evolution: { level: 24, into: 'ignis_evo2' },
    catchRate: 25, xpYield: 140, shape: 'triangle',
  }),
  ignis_evo2: s({
    id: 'ignis_evo2', name: 'Solaryx', types: ['fogo'],
    description: 'Guardiã majestosa de escamas vinho com veios de lava dourada e um disco solar de chamas atrás da cabeça.',
    base: { hp: 80, atk: 100, def: 74, spd: 96 }, learnset: IGNIS_LS,
    catchRate: 10, xpYield: 220, shape: 'triangle',
  }),
  aquaris: s({
    id: 'aquaris', name: 'Aquaris', types: ['agua'],
    description: 'Híbrido de lontra e golfinho, pele azul safira e gotas orbitando o corpo.',
    base: { hp: 52, atk: 50, def: 55, spd: 55 }, learnset: AQUARIS_LS, evolution: { level: 10, into: 'aquaris_evo' },
    catchRate: 45, xpYield: 64, shape: 'blob',
  }),
  aquaris_evo: s({
    id: 'aquaris_evo', name: 'Ondarel', types: ['agua'],
    description: 'Mais longo e veloz, com barbatanas como ondas e um colar de bolhas brilhantes.',
    base: { hp: 73, atk: 69, def: 71, spd: 65 }, learnset: AQUARIS_LS, evolution: { level: 24, into: 'aquaris_evo2' },
    catchRate: 25, xpYield: 140, shape: 'blob',
  }),
  aquaris_evo2: s({
    id: 'aquaris_evo2', name: 'Coralyth', types: ['agua'],
    description: 'Serpente guardiã do mar, de escamas safira e uma coroa de coral cintilante.',
    base: { hp: 93, atk: 87, def: 89, spd: 82 }, learnset: AQUARIS_LS,
    catchRate: 10, xpYield: 220, shape: 'blob',
  }),
  voltix: s({
    id: 'voltix', name: 'Voltix', types: ['eletrico'],
    description: 'Híbrido de lobo e lebre, pelo amarelo com marcas pretas em zigue-zague.',
    base: { hp: 42, atk: 55, def: 40, spd: 75 }, learnset: VOLTIX_LS, evolution: { level: 10, into: 'voltix_evo' },
    catchRate: 45, xpYield: 64, shape: 'star',
  }),
  voltix_evo: s({
    id: 'voltix_evo', name: 'Voltrax', types: ['eletrico'],
    description: 'Lobo jovem de patas longas, com faíscas saltando das orelhas e da cauda.',
    base: { hp: 58, atk: 76, def: 53, spd: 90 }, learnset: VOLTIX_LS, evolution: { level: 24, into: 'voltix_evo2' },
    catchRate: 25, xpYield: 140, shape: 'star',
  }),
  voltix_evo2: s({
    id: 'voltix_evo2', name: 'Trovalor', types: ['eletrico'],
    description: 'Lobo do trovão de pelagem dourada e uma juba feita de relâmpagos.',
    base: { hp: 74, atk: 96, def: 68, spd: 114 }, learnset: VOLTIX_LS,
    catchRate: 10, xpYield: 220, shape: 'star',
  }),
  terragon: s({
    id: 'terragon', name: 'Terragon', types: ['terra'],
    description: 'Híbrido de tatu e rinoceronte, armadura de pedra e chifre de cristal.',
    base: { hp: 55, atk: 58, def: 65, spd: 35 }, learnset: TERRAGON_LS, evolution: { level: 10, into: 'terragon_evo' },
    catchRate: 45, xpYield: 64, shape: 'square',
  }),
  terragon_evo: s({
    id: 'terragon_evo', name: 'Pedragon', types: ['terra'],
    description: 'Maior e mais pesado, com placas de rocha sobrepostas e um chifre de cristal mais longo.',
    base: { hp: 77, atk: 77, def: 86, spd: 43 }, learnset: TERRAGON_LS, evolution: { level: 24, into: 'terragon_evo2' },
    catchRate: 25, xpYield: 140, shape: 'square',
  }),
  terragon_evo2: s({
    id: 'terragon_evo2', name: 'Titambar', types: ['terra'],
    description: 'Titã de pedra com cristais âmbar brotando dos ombros e das costas.',
    base: { hp: 98, atk: 98, def: 109, spd: 55 }, learnset: TERRAGON_LS,
    catchRate: 10, xpYield: 220, shape: 'square',
  }),
  frostelle: s({
    id: 'frostelle', name: 'Frostelle', types: ['gelo'],
    description: 'Híbrido de coruja das neves e raposa, penas brancas com pontas azuis e cauda de cristal.',
    base: { hp: 48, atk: 57, def: 48, spd: 60 }, learnset: FROSTELLE_LS, evolution: { level: 10, into: 'frostelle_evo' },
    catchRate: 45, xpYield: 64, shape: 'diamond',
  }),
  frostelle_evo: s({
    id: 'frostelle_evo', name: 'Nevelle', types: ['gelo'],
    description: 'Coruja-raposa elegante de asas largas, com flocos de neve girando ao redor.',
    base: { hp: 65, atk: 77, def: 62, spd: 76 }, learnset: FROSTELLE_LS, evolution: { level: 24, into: 'frostelle_evo2' },
    catchRate: 25, xpYield: 140, shape: 'diamond',
  }),
  frostelle_evo2: s({
    id: 'frostelle_evo2', name: 'Aurorelle', types: ['gelo'],
    description: 'Fênix-coruja de gelo cujas penas refletem as cores da aurora boreal.',
    base: { hp: 82, atk: 98, def: 78, spd: 96 }, learnset: FROSTELLE_LS,
    catchRate: 10, xpYield: 220, shape: 'diamond',
  }),
  umbrel: s({
    id: 'umbrel', name: 'Umbrel', types: ['sombra'],
    description: 'Híbrido de gato e morcego, pelo preto com marcas roxas brilhantes e fumaça na cauda.',
    base: { hp: 48, atk: 62, def: 44, spd: 66 }, learnset: UMBREL_LS, evolution: { level: 10, into: 'umbrel_evo' },
    catchRate: 30, xpYield: 70, shape: 'hexagon',
  }),
  umbrel_evo: s({
    id: 'umbrel_evo', name: 'Umbrax', types: ['sombra'],
    description: 'Felino ágil de orelhas pontudas e pequenas asas de membrana, envolto em névoa roxa.',
    base: { hp: 65, atk: 83, def: 60, spd: 81 }, learnset: UMBREL_LS, evolution: { level: 24, into: 'umbrel_evo2' },
    catchRate: 20, xpYield: 150, shape: 'hexagon',
  }),
  umbrel_evo2: s({
    id: 'umbrel_evo2', name: 'Eclipantera', types: ['sombra'],
    description: 'Pantera sombria com grandes asas de escuridão e olhos de lua violeta.',
    base: { hp: 83, atk: 105, def: 76, spd: 102 }, learnset: UMBREL_LS,
    catchRate: 8, xpYield: 230, shape: 'hexagon',
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
  // ------------------------------------------------ Vulcão Rubro, Minas de Cristal e Vale dos Ventos
  carvonito: s({
    id: 'carvonito', name: 'Carvonito', types: ['fogo'],
    description: 'Ouriço pequeno de espinhos de carvão que brilham em brasa quando ele se assusta.',
    base: { hp: 45, atk: 50, def: 55, spd: 40 }, learnset: ls(['brasa', 'bafo_quente', 'escudo_chamas', 'lava_ardente', 'avalanche', 'coracao_vulcao'], [1, 5, 9, 14, 20, 28]), evolution: { level: 10, into: 'carvonito_evo' },
    catchRate: 120, xpYield: 60, shape: 'circle',
  }),
  carvonito_evo: s({
    id: 'carvonito_evo', name: 'Brasouriço', types: ['fogo'],
    description: 'Ouriço robusto com espinhos incandescentes que solta faíscas ao rolar.',
    base: { hp: 62, atk: 70, def: 76, spd: 55 }, learnset: ls(['brasa', 'bafo_quente', 'escudo_chamas', 'lava_ardente', 'avalanche', 'coracao_vulcao'], [1, 5, 9, 14, 20, 28]), evolution: { level: 24, into: 'carvonito_evo2' },
    catchRate: 60, xpYield: 130, shape: 'circle',
  }),
  carvonito_evo2: s({
    id: 'carvonito_evo2', name: 'Vulcouriço', types: ['fogo', 'pedra'],
    description: 'Couraça de basalto e espinhos de lava: rola encosta abaixo como um meteoro.',
    base: { hp: 78, atk: 88, def: 96, spd: 70 }, learnset: ls(['brasa', 'bafo_quente', 'escudo_chamas', 'lava_ardente', 'avalanche', 'coracao_vulcao'], [1, 5, 9, 14, 20, 28]),
    catchRate: 25, xpYield: 200, shape: 'circle',
  }),
  cabrasa: s({
    id: 'cabrasa', name: 'Cabrasa', types: ['fogo'],
    description: 'Cabritinho de pelo cinza-fumaça com chifrinhos que ardem como carvão.',
    base: { hp: 48, atk: 58, def: 42, spd: 56 }, learnset: ls(['brasa', 'investida', 'bafo_quente', 'chifre_magma', 'lava_ardente', 'coracao_vulcao'], [1, 4, 8, 13, 20, 28]), evolution: { level: 10, into: 'cabrasa_evo' },
    catchRate: 120, xpYield: 60, shape: 'triangle',
  }),
  cabrasa_evo: s({
    id: 'cabrasa_evo', name: 'Brasacorno', types: ['fogo'],
    description: 'Bode ágil que salta entre rochas quentes, com chifres curvos em brasa.',
    base: { hp: 66, atk: 80, def: 56, spd: 76 }, learnset: ls(['brasa', 'investida', 'bafo_quente', 'chifre_magma', 'lava_ardente', 'coracao_vulcao'], [1, 4, 8, 13, 20, 28]), evolution: { level: 24, into: 'cabrasa_evo2' },
    catchRate: 60, xpYield: 130, shape: 'triangle',
  }),
  cabrasa_evo2: s({
    id: 'cabrasa_evo2', name: 'Vulcorno', types: ['fogo'],
    description: 'Bode montanhês imponente com grandes chifres de magma e barba de fumaça.',
    base: { hp: 82, atk: 100, def: 70, spd: 94 }, learnset: ls(['brasa', 'investida', 'bafo_quente', 'chifre_magma', 'lava_ardente', 'coracao_vulcao'], [1, 4, 8, 13, 20, 28]),
    catchRate: 25, xpYield: 200, shape: 'triangle',
  }),
  seixito: s({
    id: 'seixito', name: 'Seixito', types: ['pedra', 'terra'],
    description: 'Toupeirinha de barro com focinho de seixo e garrinhas de cavar túneis.',
    base: { hp: 50, atk: 48, def: 65, spd: 30 }, learnset: ls(['lasca_pedra', 'arremesso_pedra', 'pele_granito', 'tremor', 'martelo_rocha', 'queda_meteoro'], [1, 5, 9, 14, 20, 28]), evolution: { level: 10, into: 'seixito_evo' },
    catchRate: 120, xpYield: 60, shape: 'square',
  }),
  seixito_evo: s({
    id: 'seixito_evo', name: 'Escavrocha', types: ['pedra', 'terra'],
    description: 'Toupeira blindada com placas de rocha nas costas e garras de escavadeira.',
    base: { hp: 70, atk: 68, def: 90, spd: 40 }, learnset: ls(['lasca_pedra', 'arremesso_pedra', 'pele_granito', 'tremor', 'martelo_rocha', 'queda_meteoro'], [1, 5, 9, 14, 20, 28]), evolution: { level: 24, into: 'seixito_evo2' },
    catchRate: 60, xpYield: 130, shape: 'square',
  }),
  seixito_evo2: s({
    id: 'seixito_evo2', name: 'Sismoto', types: ['pedra', 'terra'],
    description: 'Toupeira colossal de carapaça rochosa; quando bate as garras no chão, a terra treme.',
    base: { hp: 90, atk: 88, def: 115, spd: 50 }, learnset: ls(['lasca_pedra', 'arremesso_pedra', 'pele_granito', 'tremor', 'martelo_rocha', 'queda_meteoro'], [1, 5, 9, 14, 20, 28]),
    catchRate: 25, xpYield: 200, shape: 'square',
  }),
  geodito: s({
    id: 'geodito', name: 'Geodito', types: ['pedra'],
    description: 'Geodo rachado que esconde cristais roxos brilhantes por dentro.',
    base: { hp: 44, atk: 52, def: 58, spd: 42 }, learnset: ls(['lasca_pedra', 'pele_granito', 'lanca_cristal', 'avalanche', 'martelo_rocha', 'queda_meteoro'], [1, 5, 9, 14, 20, 28]), evolution: { level: 10, into: 'geodito_evo' },
    catchRate: 120, xpYield: 60, shape: 'hexagon',
  }),
  geodito_evo: s({
    id: 'geodito_evo', name: 'Geodrusa', types: ['pedra'],
    description: 'Criatura de rocha com uma drusa de ametista nas costas.',
    base: { hp: 60, atk: 72, def: 80, spd: 58 }, learnset: ls(['lasca_pedra', 'pele_granito', 'lanca_cristal', 'avalanche', 'martelo_rocha', 'queda_meteoro'], [1, 5, 9, 14, 20, 28]), evolution: { level: 24, into: 'geodito_evo2' },
    catchRate: 60, xpYield: 130, shape: 'hexagon',
  }),
  geodito_evo2: s({
    id: 'geodito_evo2', name: 'Ametistão', types: ['pedra'],
    description: 'Golem de ametista cujos cristais cantam quando o vento passa.',
    base: { hp: 76, atk: 92, def: 100, spd: 74 }, learnset: ls(['lasca_pedra', 'pele_granito', 'lanca_cristal', 'avalanche', 'martelo_rocha', 'queda_meteoro'], [1, 5, 9, 14, 20, 28]),
    catchRate: 25, xpYield: 200, shape: 'hexagon',
  }),
  // ---------- Híbridos (dois elementos desde a primeira forma)
  lodito: s({
    id: 'lodito', name: 'Lodito', types: ['terra', 'agua'],
    description: 'Salamandra híbrida de lama que mergulha em poças de barro.',
    base: { hp: 52, atk: 44, def: 56, spd: 38 }, learnset: ls(['jato_dagua', 'arremesso_pedra', 'bolha_prisao', 'tremor', 'redemoinho', 'furia_montanha'], [1, 5, 9, 14, 20, 28]), evolution: { level: 10, into: 'lodito_evo' },
    catchRate: 120, xpYield: 60, shape: 'blob',
  }),
  lodito_evo: s({
    id: 'lodito_evo', name: 'Charcossauro', types: ['terra', 'agua'],
    description: 'Salamandra híbrida de pântano com costas de argila e nadadeiras de água.',
    base: { hp: 72, atk: 62, def: 78, spd: 52 }, learnset: ls(['jato_dagua', 'arremesso_pedra', 'bolha_prisao', 'tremor', 'redemoinho', 'furia_montanha'], [1, 5, 9, 14, 20, 28]), evolution: { level: 24, into: 'lodito_evo2' },
    catchRate: 60, xpYield: 130, shape: 'blob',
  }),
  lodito_evo2: s({
    id: 'lodito_evo2', name: 'Pantanox', types: ['terra', 'agua'],
    description: 'Lagarto híbrido do pântano que levanta ondas de lama com a cauda.',
    base: { hp: 92, atk: 82, def: 100, spd: 68 }, learnset: ls(['jato_dagua', 'arremesso_pedra', 'bolha_prisao', 'tremor', 'redemoinho', 'furia_montanha'], [1, 5, 9, 14, 20, 28]),
    catchRate: 25, xpYield: 200, shape: 'blob',
  }),
  vaporito: s({
    id: 'vaporito', name: 'Vaporito', types: ['fogo', 'agua'],
    description: 'Lontrinha híbrida de vapor que vive nas fontes termais.',
    base: { hp: 42, atk: 52, def: 40, spd: 58 }, learnset: ls(['brasa', 'jato_dagua', 'bafo_quente', 'cura_mare', 'redemoinho', 'coracao_vulcao'], [1, 5, 9, 14, 20, 28]), evolution: { level: 10, into: 'vaporito_evo' },
    catchRate: 120, xpYield: 60, shape: 'circle',
  }),
  vaporito_evo: s({
    id: 'vaporito_evo', name: 'Fumarel', types: ['fogo', 'agua'],
    description: 'Lontra híbrida que solta nuvens de vapor fervente pelas costas.',
    base: { hp: 58, atk: 72, def: 56, spd: 80 }, learnset: ls(['brasa', 'jato_dagua', 'bafo_quente', 'cura_mare', 'redemoinho', 'coracao_vulcao'], [1, 5, 9, 14, 20, 28]), evolution: { level: 24, into: 'vaporito_evo2' },
    catchRate: 60, xpYield: 130, shape: 'circle',
  }),
  vaporito_evo2: s({
    id: 'vaporito_evo2', name: 'Geiserão', types: ['fogo', 'agua'],
    description: 'Lontra híbrida colossal que dispara gêiseres escaldantes.',
    base: { hp: 74, atk: 94, def: 70, spd: 104 }, learnset: ls(['brasa', 'jato_dagua', 'bafo_quente', 'cura_mare', 'redemoinho', 'coracao_vulcao'], [1, 5, 9, 14, 20, 28]),
    catchRate: 25, xpYield: 200, shape: 'circle',
  }),
  pimentinha: s({
    id: 'pimentinha', name: 'Pimentinha', types: ['grama', 'fogo'],
    description: 'Brotinho híbrido de pimenta com folhas na cabeça e uma brasa no rabo.',
    base: { hp: 44, atk: 56, def: 40, spd: 52 }, learnset: ls(['folha_navalha', 'brasa', 'absorver', 'chicote_vinha', 'lava_ardente', 'floresta_devoradora'], [1, 5, 9, 14, 20, 28]), evolution: { level: 10, into: 'pimentinha_evo' },
    catchRate: 120, xpYield: 60, shape: 'triangle',
  }),
  pimentinha_evo: s({
    id: 'pimentinha_evo', name: 'Malaguetor', types: ['grama', 'fogo'],
    description: 'Criatura híbrida de pimenta ardida que cospe sementes em brasa.',
    base: { hp: 60, atk: 78, def: 54, spd: 74 }, learnset: ls(['folha_navalha', 'brasa', 'absorver', 'chicote_vinha', 'lava_ardente', 'floresta_devoradora'], [1, 5, 9, 14, 20, 28]), evolution: { level: 24, into: 'pimentinha_evo2' },
    catchRate: 60, xpYield: 130, shape: 'triangle',
  }),
  pimentinha_evo2: s({
    id: 'pimentinha_evo2', name: 'Capsiflora', types: ['grama', 'fogo'],
    description: 'Fera híbrida de pimenteira em chamas; suas folhas queimam sem virar cinza.',
    base: { hp: 76, atk: 100, def: 68, spd: 96 }, learnset: ls(['folha_navalha', 'brasa', 'absorver', 'chicote_vinha', 'lava_ardente', 'floresta_devoradora'], [1, 5, 9, 14, 20, 28]),
    catchRate: 25, xpYield: 200, shape: 'triangle',
  }),
  tatubrasa: s({
    id: 'tatubrasa', name: 'Tatubrasa', types: ['terra', 'fogo'],
    description: 'Tatu híbrido de terra com rachaduras de magma na carapaça.',
    base: { hp: 50, atk: 48, def: 62, spd: 34 }, learnset: ls(['investida', 'brasa', 'rolar_blindado', 'chifre_magma', 'lava_ardente', 'furia_montanha'], [1, 5, 9, 14, 20, 28]), evolution: { level: 10, into: 'tatubrasa_evo' },
    catchRate: 120, xpYield: 60, shape: 'square',
  }),
  tatubrasa_evo: s({
    id: 'tatubrasa_evo', name: 'Magmatatu', types: ['terra', 'fogo'],
    description: 'Tatu híbrido que rola pela encosta deixando um rastro de lava.',
    base: { hp: 70, atk: 66, def: 86, spd: 48 }, learnset: ls(['investida', 'brasa', 'rolar_blindado', 'chifre_magma', 'lava_ardente', 'furia_montanha'], [1, 5, 9, 14, 20, 28]), evolution: { level: 24, into: 'tatubrasa_evo2' },
    catchRate: 60, xpYield: 130, shape: 'square',
  }),
  tatubrasa_evo2: s({
    id: 'tatubrasa_evo2', name: 'Calderatu', types: ['terra', 'fogo'],
    description: 'Tatu híbrido gigante cuja carapaça é uma caldeira de magma.',
    base: { hp: 90, atk: 86, def: 110, spd: 62 }, learnset: ls(['investida', 'brasa', 'rolar_blindado', 'chifre_magma', 'lava_ardente', 'furia_montanha'], [1, 5, 9, 14, 20, 28]),
    catchRate: 25, xpYield: 200, shape: 'square',
  }),
  quartzito: s({
    id: 'quartzito', name: 'Quartzito', types: ['pedra', 'eletrico'],
    description: 'Pedregulho híbrido imantado que solta faíscas quando é esfregado.',
    base: { hp: 44, atk: 52, def: 52, spd: 50 }, learnset: ls(['choque', 'lasca_pedra', 'campo_magnetico', 'investida_relampago', 'martelo_rocha', 'tempestade_mil_raios'], [1, 5, 9, 14, 20, 28]), evolution: { level: 10, into: 'quartzito_evo' },
    catchRate: 120, xpYield: 60, shape: 'hexagon',
  }),
  quartzito_evo: s({
    id: 'quartzito_evo', name: 'Magnetrino', types: ['pedra', 'eletrico'],
    description: 'Rinoceronte híbrido de quartzo que acumula eletricidade no chifre.',
    base: { hp: 60, atk: 72, def: 72, spd: 66 }, learnset: ls(['choque', 'lasca_pedra', 'campo_magnetico', 'investida_relampago', 'martelo_rocha', 'tempestade_mil_raios'], [1, 5, 9, 14, 20, 28]), evolution: { level: 24, into: 'quartzito_evo2' },
    catchRate: 60, xpYield: 130, shape: 'hexagon',
  }),
  quartzito_evo2: s({
    id: 'quartzito_evo2', name: 'Piezolito', types: ['pedra', 'eletrico'],
    description: 'Rinoceronte híbrido de magnetita cujo chifre de quartzo atrai raios.',
    base: { hp: 76, atk: 94, def: 92, spd: 84 }, learnset: ls(['choque', 'lasca_pedra', 'campo_magnetico', 'investida_relampago', 'martelo_rocha', 'tempestade_mil_raios'], [1, 5, 9, 14, 20, 28]),
    catchRate: 25, xpYield: 200, shape: 'hexagon',
  }),
  brisito: s({
    id: 'brisito', name: 'Brisito', types: ['vento'],
    description: 'Passarinho de penas fofas como nuvem que vive pegando carona no vento.',
    base: { hp: 40, atk: 48, def: 38, spd: 66 }, learnset: ls(['brisa_cortante', 'asa_veloz', 'rajada', 'manto_nuvem', 'ciclone', 'furacao_celeste'], [1, 5, 9, 14, 20, 28]), evolution: { level: 10, into: 'brisito_evo' },
    catchRate: 120, xpYield: 60, shape: 'diamond',
  }),
  brisito_evo: s({
    id: 'brisito_evo', name: 'Planavento', types: ['vento'],
    description: 'Ave de asas longas que plana por horas sem bater as asas.',
    base: { hp: 56, atk: 66, def: 52, spd: 90 }, learnset: ls(['brisa_cortante', 'asa_veloz', 'rajada', 'manto_nuvem', 'ciclone', 'furacao_celeste'], [1, 5, 9, 14, 20, 28]), evolution: { level: 24, into: 'brisito_evo2' },
    catchRate: 60, xpYield: 130, shape: 'diamond',
  }),
  brisito_evo2: s({
    id: 'brisito_evo2', name: 'Céuzefir', types: ['vento'],
    description: 'Águia majestosa de penas-nuvem que comanda as correntes de ar.',
    base: { hp: 72, atk: 86, def: 66, spd: 112 }, learnset: ls(['brisa_cortante', 'asa_veloz', 'rajada', 'manto_nuvem', 'ciclone', 'furacao_celeste'], [1, 5, 9, 14, 20, 28]),
    catchRate: 25, xpYield: 200, shape: 'diamond',
  }),
  penugem: s({
    id: 'penugem', name: 'Penugem', types: ['vento'],
    description: 'Bolinha de penugem flutuante, leve como uma semente de dente-de-leão.',
    base: { hp: 42, atk: 44, def: 44, spd: 60 }, learnset: ls(['brisa_cortante', 'manto_nuvem', 'rajada', 'choque', 'ciclone', 'furacao_celeste'], [1, 5, 9, 14, 20, 28]), evolution: { level: 10, into: 'penugem_evo' },
    catchRate: 120, xpYield: 60, shape: 'blob',
  }),
  penugem_evo: s({
    id: 'penugem_evo', name: 'Rodopio', types: ['vento'],
    description: 'Gira como um cata-vento e cria pequenos redemoinhos por onde passa.',
    base: { hp: 58, atk: 62, def: 60, spd: 82 }, learnset: ls(['brisa_cortante', 'manto_nuvem', 'rajada', 'choque', 'ciclone', 'furacao_celeste'], [1, 5, 9, 14, 20, 28]), evolution: { level: 24, into: 'penugem_evo2' },
    catchRate: 60, xpYield: 130, shape: 'blob',
  }),
  penugem_evo2: s({
    id: 'penugem_evo2', name: 'Ciclonix', types: ['vento', 'eletrico'],
    description: 'Espírito de ciclone envolto em nuvens carregadas de raios.',
    base: { hp: 74, atk: 82, def: 76, spd: 104 }, learnset: ls(['brisa_cortante', 'manto_nuvem', 'rajada', 'choque', 'ciclone', 'furacao_celeste'], [1, 5, 9, 14, 20, 28]),
    catchRate: 25, xpYield: 200, shape: 'blob',
  }),
};

export const getSpecies = (id: string): SpeciesData => {
  const sp = SPECIES[id];
  if (!sp) throw new Error(`Espécie desconhecida: ${id}`);
  return sp;
};

/** Primeira forma da linha evolutiva (ex.: ignis_evo2 -> ignis). */
export function rootSpecies(id: string): string {
  let cur = id;
  for (let guard = 0; guard < 10; guard++) {
    const prev = Object.values(SPECIES).find((sp) => sp.evolution?.into === cur);
    if (!prev) return cur;
    cur = prev.id;
  }
  return cur;
}

/** Estágio na linha evolutiva: 0 = primeira forma, 1 = segunda, 2 = terceira. */
export function evolutionStage(id: string): number {
  let stage = 0;
  let cur = id;
  for (let guard = 0; guard < 10; guard++) {
    const prev = Object.values(SPECIES).find((sp) => sp.evolution?.into === cur);
    if (!prev) return stage;
    stage++;
    cur = prev.id;
  }
  return stage;
}
