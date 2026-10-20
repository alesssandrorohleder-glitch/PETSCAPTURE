/**
 * Mapas desenhados em texto. Cada caractere é um tile de 32×32:
 *   #  árvore (bloqueia)        .  caminho
 *   ,  chão/grama baixa          "  mato alto (encontros aleatórios)
 *   ~  água (bloqueia)           f  flores (decoração)
 *   r  pedra (bloqueia)          F  cerca (bloqueia)
 * Prédios, NPCs, placas e saídas (warps) ficam em listas separadas.
 * Todas as linhas de um mapa precisam ter o mesmo tamanho (há um teste para isso).
 */

export interface TileInfo {
  name: string;
  solid: boolean;
  encounter?: boolean;
}

export const TILES: Record<string, TileInfo> = {
  '#': { name: 'tree', solid: true },
  '.': { name: 'path', solid: false },
  ',': { name: 'ground', solid: false },
  '"': { name: 'tallgrass', solid: false, encounter: true },
  '~': { name: 'water', solid: true },
  f: { name: 'flowers', solid: false },
  r: { name: 'rock', solid: true },
  F: { name: 'fence', solid: true },
};

export interface BiomeTheme {
  id: string;
  ground: number;
  path: number;
  tallgrass: number;
  tree: number;
  water: number;
  rock: number;
  flowers: number;
}

export type BuildingKind = 'heal' | 'shop' | 'house';
export type Facing = 'up' | 'down' | 'left' | 'right';

export interface BuildingDef {
  kind: BuildingKind;
  /** canto superior esquerdo, em tiles */
  x: number;
  y: number;
  w: number;
  h: number;
  label?: string;
}

export interface NpcDef {
  id: string;
  x: number;
  y: number;
  facing: Facing;
  /** id de treinador (aparência) ou cores próprias */
  look: string | { hair: number; outfit: number; accent: number; skin: number };
  name: string;
  dialog: string[];
}

export interface SignDef {
  x: number;
  y: number;
  text: string[];
}

export interface WarpDef {
  x: number;
  y: number;
  to: string;
  tx: number;
  ty: number;
  facing: Facing;
}

export interface EncounterDef {
  species: string;
  min: number;
  max: number;
  /** peso relativo na sorte do encontro */
  weight: number;
}

/** Chance de encontro a cada passo no mato alto. */
export const ENCOUNTER_RATE = 0.1;

export interface MapDef {
  id: string;
  name: string;
  theme: BiomeTheme;
  /** chave de música (public/assets/audio/music/<id>.mp3) */
  music: string;
  grid: string[];
  buildings: BuildingDef[];
  npcs: NpcDef[];
  signs: SignDef[];
  warps: WarpDef[];
  /** monstros selvagens do mato alto */
  encounters?: EncounterDef[];
}

export const THEMES = {
  vila: { id: 'vila', ground: 0x7ec850, path: 0xe0c88f, tallgrass: 0x3f8f3a, tree: 0x2d6a4f, water: 0x4ea8de, rock: 0x8d8d8d, flowers: 0xff8fab },
  floresta: { id: 'floresta', ground: 0x5fa84a, path: 0xc9a66b, tallgrass: 0x2f7a32, tree: 0x1b4332, water: 0x3a86ff, rock: 0x6c757d, flowers: 0xf9c74f },
} satisfies Record<string, BiomeTheme>;

const VILA: MapDef = {
  id: 'vila',
  name: 'Vila Aurora',
  theme: THEMES.vila,
  music: 'music/vila',
  grid: [
    '##############..##############',
    '#,,,,,,,,,,,,,..,,,,,,,,,,,,,#',
    '#,,,,,,,,,,,,,..,,,,,,,,,,,,,#',
    '#,,,,,,,,,,,,,..,,,,,,,,,,,,,#',
    '#,,,,,,,,,,,,,..,,,,,,,,,,,,,#',
    '#,,,,,,,,,,,,,..,,,,,,,,,,,,,#',
    '#,..........................,#',
    '#,,ff,,,,,,,,,..,,,,,,,,,ff,,#',
    '#,,,,,,,,,,,,,..,,,,,,,,,,,,,#',
    '#,,,,,,,,,,,,,..,,,,,,,,,,,,,#',
    '#,,,,,,,,,,,,,..,,,,,,,,,,,,,#',
    '#,,,,,,,,,,,,,..,,,,,,,,,,,,,#',
    '#,,,,,,,,,,,,,..,,,,,,,,,,,,,#',
    '#,,,,,,,,,,,,,..,,,,,,,,,,,,,#',
    '#,..........................,#',
    '#,,~~~~,,,,,,,..,,,,,,,,rr,,,#',
    '#,~~~~~~,,,,,,..,,,,,,,,,,,,,#',
    '#,,~~~~,,,,,,,,,,,,ff,,,,,,,,#',
    '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,#',
    '##############################',
  ],
  buildings: [
    { kind: 'heal', x: 4, y: 2, w: 5, h: 4, label: 'Centro de Cura' },
    { kind: 'shop', x: 21, y: 2, w: 5, h: 4, label: 'Loja' },
    { kind: 'house', x: 4, y: 10, w: 4, h: 3 },
    { kind: 'house', x: 22, y: 10, w: 4, h: 3 },
  ],
  npcs: [
    {
      id: 'anciao',
      x: 10,
      y: 8,
      facing: 'down',
      name: 'Ancião Oren',
      look: { hair: 0xdddddd, outfit: 0x6a4c93, accent: 0xffd166, skin: 0xe0ac69 },
      dialog: [
        'Bem-vindo à Vila Aurora, jovem domador!',
        'Ao norte fica a Floresta Encantada. Monstros selvagens se escondem no mato alto.',
        'Se seu pet se ferir, volte ao Centro de Cura. É de graça!',
      ],
    },
    {
      id: 'menina',
      x: 19,
      y: 12,
      facing: 'left',
      name: 'Lia',
      look: { hair: 0xffb703, outfit: 0xe76f51, accent: 0xffffff, skin: 0xf1c27d },
      dialog: ['Dizem que um domador de sombras anda rondando as Ruínas da Lua...', 'Tome cuidado lá fora!'],
    },
  ],
  signs: [{ x: 16, y: 1, text: ['↑ Floresta Encantada'] }],
  warps: [
    { x: 14, y: 0, to: 'floresta', tx: 14, ty: 22, facing: 'up' },
    { x: 15, y: 0, to: 'floresta', tx: 15, ty: 22, facing: 'up' },
  ],
};

const FLORESTA: MapDef = {
  id: 'floresta',
  name: 'Floresta Encantada',
  theme: THEMES.floresta,
  music: 'music/floresta',
  grid: [
    '##############..##############',
    '##,,,,,,,,,,,,..,,,,,,,,,,,,##',
    '#,,"""""",,,,,..,,,,""""""",,#',
    '#,,"""""",,,,,..,,,,""""""",,#',
    '#,,"""""",,##,,..,##,""""""",#',
    '#,,,,,,,,,,##,,..,##,,,,,,,,,#',
    '#####,,,,,,,,,,..,,,,,,,,#####',
    '#,,,,,,,,,,,,,,..,,,,,,,,,,,,#',
    '#,"""""",,,,###..###,,,""""",#',
    '#,"""""",,,,###..###,,,""""",#',
    '#,"""""",,,,,,,..,,,,,,""""",#',
    '#,,,,,,,,,,,,,,..,,,,,,,,,,,,#',
    '#,,,,,~~~~,,,,,..,,,,,,,,,,,,#',
    '#,,,,~~~~~~,,,,..,,,,,""""",,#',
    '#,,,,,~~~~,,,,,..,,,,,""""",,#',
    '#,,,,,,,,,,,,,,..,,,,,""""",,#',
    '###,,,,,,,,,,,,..,,,,,,,,,,###',
    '#,,,,""""",,,,,..,,,,,,,,,,,,#',
    '#,,,,""""",,,,,..,,,,,""",,,,#',
    '#,,,,""""",,,,,..,,,,,""",,,,#',
    '#,,,,,,,,,,,,,,..,,,,,,,,,,,,#',
    '#,,,,,,,,,,,,,,..,,,,,,,,,,,,#',
    '#,,,,,,,,,,,,,,..,,,,,,,,,,,,#',
    '##############..##############',
  ],
  buildings: [],
  npcs: [],
  signs: [
    { x: 13, y: 21, text: ['Floresta Encantada', 'Cuidado: monstros de Grama e Inseto no mato alto!'] },
    { x: 16, y: 1, text: ['↑ Praia e Recifes', '(Caminho bloqueado por enquanto — abre na etapa 5.)'] },
  ],
  warps: [
    { x: 14, y: 23, to: 'vila', tx: 14, ty: 1, facing: 'down' },
    { x: 15, y: 23, to: 'vila', tx: 15, ty: 1, facing: 'down' },
  ],
  encounters: [
    { species: 'larvilo', min: 2, max: 4, weight: 65 },
    { species: 'verdakor', min: 2, max: 4, weight: 35 },
  ],
};

export const MAPS: Record<string, MapDef> = { vila: VILA, floresta: FLORESTA };

export const getMap = (id: string): MapDef => {
  const m = MAPS[id];
  if (!m) throw new Error(`Mapa desconhecido: ${id}`);
  return m;
};

export const START_POSITION = { map: 'vila', x: 14, y: 7, facing: 'down' as Facing };
