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

export type TreeStyle = 'round' | 'palm' | 'pine' | 'mesa' | 'pillar' | 'spire' | 'crystal';

export interface BiomeTheme {
  id: string;
  /** como o "#" é desenhado no placeholder */
  treeStyle: TreeStyle;
  /** céu do fundo de batalha */
  sky: number;
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

/** Pet inicial que aparece raramente (3%) — nunca o do próprio jogador. */
export interface RareDef {
  species: string;
  min: number;
  max: number;
}

export const RARE_STARTER_RATE = 0.03;

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
  /** pets iniciais raros (3% cada) */
  rare?: RareDef[];
}

/** NPC com a aparência de um treinador (fica escondido se for o personagem do jogador). */
function trainerNpc(id: string, x: number, y: number, facing: Facing, dialog: string[]): NpcDef {
  const names: Record<string, string> = { kael: 'Kael', marina: 'Marina', raijin: 'Raijin', bruno: 'Bruno', yuki: 'Yuki', noctis: 'Noctis' };
  return { id, x, y, facing, look: id, name: names[id] ?? id, dialog };
}

/** Saídas padrão pelo caminho central (colunas 14 e 15). */
function edgeWarps(to: string, dir: 'up' | 'down'): WarpDef[] {
  return [14, 15].map((x) =>
    dir === 'up' ? { x, y: 0, to, tx: x, ty: 22, facing: 'up' as Facing } : { x, y: 23, to, tx: x, ty: 1, facing: 'down' as Facing },
  );
}

export const THEMES = {
  vila: { id: 'vila', treeStyle: 'round', sky: 0x4ea8de, ground: 0x7ec850, path: 0xe0c88f, tallgrass: 0x3f8f3a, tree: 0x2d6a4f, water: 0x4ea8de, rock: 0x8d8d8d, flowers: 0xff8fab },
  floresta: { id: 'floresta', treeStyle: 'round', sky: 0x3a86ff, ground: 0x5fa84a, path: 0xc9a66b, tallgrass: 0x2f7a32, tree: 0x1b4332, water: 0x3a86ff, rock: 0x6c757d, flowers: 0xf9c74f },
  praia: { id: 'praia', treeStyle: 'palm', sky: 0x48cae4, ground: 0xf2d49b, path: 0xc8a165, tallgrass: 0x2a9d8f, tree: 0x2d6a4f, water: 0x0096c7, rock: 0x9c8b7a, flowers: 0xff8fab },
  planalto: { id: 'planalto', treeStyle: 'round', sky: 0x5a6378, ground: 0x9fb37a, path: 0xbfae86, tallgrass: 0xd4b44a, tree: 0x4f6d3a, water: 0x4ea8de, rock: 0x7d7f8c, flowers: 0xffd60a },
  canion: { id: 'canion', treeStyle: 'mesa', sky: 0xf4a261, ground: 0xd9925b, path: 0xe9c08f, tallgrass: 0x9c6b30, tree: 0xa0522d, water: 0x4ea8de, rock: 0x8b4a2b, flowers: 0xe9c46a },
  picos: { id: 'picos', treeStyle: 'pine', sky: 0xa9d6e5, ground: 0xeef6fb, path: 0xc9dbe6, tallgrass: 0x8ecae6, tree: 0x1d4e5f, water: 0x90e0ef, rock: 0x9aa9b4, flowers: 0xcdb4db },
  ruinas: { id: 'ruinas', treeStyle: 'pillar', sky: 0x2b1b4a, ground: 0x3d2f5a, path: 0x6b5b8a, tallgrass: 0x7b2cbf, tree: 0x5a4e7a, water: 0x240046, rock: 0x6c5f8d, flowers: 0xc77dff },
  vento: { id: 'vento', treeStyle: 'round', sky: 0x90e0ef, ground: 0xb7e4c7, path: 0xf1faee, tallgrass: 0x74c69d, tree: 0x40916c, water: 0x8ecae6, rock: 0xadb5bd, flowers: 0xffffff },
  vulcao: { id: 'vulcao', treeStyle: 'spire', sky: 0x9d0208, ground: 0x5c3a2e, path: 0x9c6644, tallgrass: 0xe85d04, tree: 0x22223b, water: 0xff5400, rock: 0x3d3d3d, flowers: 0xffba08 },
  cristal: { id: 'cristal', treeStyle: 'crystal', sky: 0x1b263b, ground: 0x5c677d, path: 0x979dac, tallgrass: 0xb185db, tree: 0xc77dff, water: 0x48cae4, rock: 0x33415c, flowers: 0xe0aaff },
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
  npcs: [trainerNpc('kael', 20, 11, 'left', ['Ei! Também está começando a jornada?', 'Dizem que monstros raros aparecem nos biomas do elemento deles. Fique de olho no mato alto!'])],
  signs: [
    { x: 13, y: 21, text: ['Floresta Encantada', 'Cuidado: monstros de Grama e Inseto no mato alto!'] },
    { x: 16, y: 1, text: ['↑ Praia e Recifes'] },
  ],
  warps: [
    ...edgeWarps('praia', 'up'),
    { x: 14, y: 23, to: 'vila', tx: 14, ty: 1, facing: 'down' },
    { x: 15, y: 23, to: 'vila', tx: 15, ty: 1, facing: 'down' },
  ],
  encounters: [
    { species: 'larvilo', min: 2, max: 4, weight: 55 },
    { species: 'brotinho', min: 2, max: 3, weight: 20 },
    { species: 'verdaki', min: 2, max: 4, weight: 25 },
    { species: 'verdamantis', min: 9, max: 11, weight: 3 },
  ],
};

const PRAIA: MapDef = {
  id: 'praia',
  name: 'Praia e Recifes',
  theme: THEMES.praia,
  music: 'music/praia',
  grid: [
    '##############..##############',
    '#,,,,,,,,,,,,,..,,,,,~~~~~~~~#',
    '#,""""",,,,,,,..,,,,~~~~~~~~~#',
    '#,""""",,,,,,,..,,,,~~~~~~~~~#',
    '#,""""",,rr,,,..,,,~~~~~~~~~~#',
    '#,,,,,,,,,,,,,..,,,~~~~~~~~~~#',
    '#,,,,,,,..........,,~~~~~~~~~#',
    '#,,"""",,.,,,,,,,,,,~~~~~~~~~#',
    '#,,"""",,.,,,,,""""",~~~~~~~~#',
    '#,,"""",,.,,,,,""""",~~~~~~~~#',
    '#,,,,,,,,.,,,,,,,,,,,~~~~~~~~#',
    '#rr,,,,,,..........,,,~~~~~~~#',
    '#,,,,,,,,,,,,,,,,,.,,,~~~~~~~#',
    '#,"""""",,,,,,,,,,.,,,~~~~~~~#',
    '#,"""""",,,,,,,,,,.,,,,~~~~~~#',
    '#,,,,,,,,,,,,,,,,,.,,,,~~~~~~#',
    '#,,,,,,,,,,,,,....,,,,,,~~~~~#',
    '#,,,""""",,,,,..,,""""",~~~~~#',
    '#,,,""""",,,,,..,,""""",,~~~~#',
    '#,,,,,,,,,,,,,..,,""""",,~~~~#',
    '#,,,,,,,,,,,,,..,,,,,,,,,~~~~#',
    '#,,,,,,,,,,,,,..,,,,,,,,,,~~~#',
    '#,,,,,,,,,,,,,..,,,,,,,,,,,~~#',
    '##############..##############',
  ],
  buildings: [],
  npcs: [trainerNpc('marina', 12, 10, 'down', ['Olá! Eu sou a Marina.', 'Os monstros daqui adoram água. Golpes Elétricos e de Grama funcionam muito bem contra eles!'])],
  signs: [{ x: 13, y: 21, text: ['Praia e Recifes', 'Monstros de Água vivem nas algas.'] }],
  warps: [...edgeWarps('planalto', 'up'), ...edgeWarps('floresta', 'down')],
  encounters: [
    { species: 'conchilo', min: 5, max: 8, weight: 55 },
    { species: 'medulume', min: 6, max: 9, weight: 45 },
  ],
  rare: [{ species: 'aquaris', min: 6, max: 9 }],
};

const PLANALTO: MapDef = {
  id: 'planalto',
  name: 'Planalto da Tempestade',
  theme: THEMES.planalto,
  music: 'music/planalto',
  grid: [
    '##############..##############',
    '#,,,,,,,,,,,,,..,,,,,,,,,,,,,#',
    '#,""""""",,,,,..,,,,,""""""",#',
    '#,""""""",,r,,..,,r,,""""""",#',
    '#,""""""",,,,,..,,,,,""""""",#',
    '#,,,,,,,,,,,,,..,,,,,,,,,,,,,#',
    '#FFFFFFF,,,,,,..,,,,,,FFFFFFF#',
    '#,,,,,,,,,,,,,..,,,,,,,,,,,,,#',
    '#,rr,,,"""""",..,""""",,,,rr,#',
    '#,rr,,,"""""",..,""""",,,,rr,#',
    '#,,,,,,"""""",..,""""",,,,,,,#',
    '.,,,,,,,,,,,,,..,,,,,,,,,,,,,#',
    '.,,,,,,,,,,,,,..,,,,,,,,,,,,,#',
    '#,""""",,,,,,,..,,,,,,,""""",#',
    '#,""""",,,,r,,..,,r,,,,""""",#',
    '#,""""",,,,,,,..,,,,,,,""""",#',
    '#,,,,,,,,,,,,,..,,,,,,,,,,,,,#',
    '#,,,,,,,,,,,,,..,,,,,,,,,,,,,#',
    '#,,,,"""""",,,..,,,"""""",,,,#',
    '#,,,,"""""",,,..,,,"""""",,,,#',
    '#,,,,,,,,,,,,,..,,,,,,,,,,,,,#',
    '#,,,,,,,,,,,,,..,,,,,,,,,,,,,#',
    '#,,,,,,,,,,,,,..,,,,,,,,,,,,,#',
    '##############..##############',
  ],
  buildings: [{ kind: 'heal', x: 20, y: 10, w: 4, h: 3, label: 'Posto de Cura' }],
  npcs: [trainerNpc('raijin', 10, 12, 'right', ['Sente a eletricidade no ar? Aqui os raios caem o tempo todo!', 'Pets de Terra não sentem nada dos golpes Elétricos. Pense nisso!'])],
  signs: [{ x: 13, y: 21, text: ['Planalto da Tempestade', 'Há um Posto de Cura no meio do caminho.'] }],
  warps: [...edgeWarps('canion', 'up'), ...edgeWarps('praia', 'down'), { x: 0, y: 11, to: 'vento', tx: 28, ty: 11, facing: 'left' as Facing }, { x: 0, y: 12, to: 'vento', tx: 28, ty: 12, facing: 'left' as Facing }],
  encounters: [
    { species: 'zumbolt', min: 9, max: 12, weight: 50 },
    { species: 'voltabico', min: 10, max: 13, weight: 50 },
  ],
  rare: [{ species: 'voltix', min: 10, max: 13 }],
};

const CANION: MapDef = {
  id: 'canion',
  name: 'Cânion de Pedra',
  theme: THEMES.canion,
  music: 'music/canion',
  grid: [
    '##############..##############',
    '#rrrr,,,,,,,,,..,,,,,,,,,rrrr#',
    '#rr,,,""""",,,..,,,""""",,,rr#',
    '#r,,,,""""",,,..,,,""""",,,,r#',
    '#r,,,,,,,,,,,,..,,,,,,,,,,,,r#',
    '#rrrrrrrrr,,,,..,,,,rrrrrrrrr#',
    '#r,,,,,,,,,,,,..,,,,,,,,,,,,r#',
    '#r,"""""",,,,,..,,,,,,,,,,,,r#',
    '#r,"""""",,,,,..........,,,,r#',
    '#r,"""""",,,,,,,,,,,,,,.,,,,r#',
    '#r,,,,,,,,,rrrrrrrr,,,.,,,,,r#',
    '#r,,,,,,,,,rrrrrrrr,,,.,,,,,r#',
    '#r,,,,..............,,.,,,,,r#',
    '#r,,,,.,,,,,,,,,,,,,,,,""""",.',
    '#r,,,,.,,,,,,,,,,,,,,,,""""",.',
    '#r,,,,.,,,,,,,,,,,,,,,,""""",#',
    '#rrrr,.,,,rrrrrrrrrrrrrrrrrrr#',
    '#r,,,,.,,,,,,,,,,,,,,,,,,,,,r#',
    '#r,"""..........,,,""""",,,,r#',
    '#r,""""",,,,,,..,,,""""",,,,r#',
    '#r,""""",,,,,,..,,,,,,,,,,,,r#',
    '#r,,,,,,,,,,,,..,,,,,,,,,,,,r#',
    '#rrrr,,,,,,,,,..,,,,,,,,,rrrr#',
    '##############..##############',
  ],
  buildings: [],
  npcs: [trainerNpc('bruno', 16, 4, 'down', ['Ha! Bem-vindo ao Cânion! Aqui as pedras têm mais força que muita gente.', 'Golpes de Água e Grama amolecem até a rocha mais dura.'])],
  signs: [{ x: 13, y: 21, text: ['Cânion de Pedra', 'Siga a trilha. As paredes de rocha não deixam passar.'] }],
  warps: [...edgeWarps('picos', 'up'), ...edgeWarps('planalto', 'down'), { x: 29, y: 13, to: 'vulcao', tx: 1, ty: 11, facing: 'right' as Facing }, { x: 29, y: 14, to: 'vulcao', tx: 1, ty: 12, facing: 'right' as Facing }],
  encounters: [
    { species: 'pedrusco', min: 13, max: 16, weight: 50 },
    { species: 'escorpedra', min: 13, max: 17, weight: 50 },
  ],
  rare: [
    { species: 'terragon', min: 13, max: 16 },
    { species: 'ignis', min: 13, max: 16 },
  ],
};

const PICOS: MapDef = {
  id: 'picos',
  name: 'Picos Congelados',
  theme: THEMES.picos,
  music: 'music/picos',
  grid: [
    '##############..##############',
    '#,,,,,,,,,,,,,..,,,,,,,,,,,,,#',
    '#,""""""",,,,,..,,,,,""""""",#',
    '#,""""""",,,,,..,,,,,""""""",#',
    '#,,,,,,,,,,,,,..,,,,,,,,,,,,,#',
    '#####,,,,~~~~,..,~~~~,,,,#####',
    '#,,,,,,,,~~~~,..,~~~~,,,,,,,,#',
    '#,"""",,,,,,,,..,,,,,,,,"""",#',
    '#,"""",,,,,,,,..,,,,,,,,"""",#',
    '#,"""",,,,rr,,..,,rr,,,,"""",#',
    '#,,,,,,,,,,,,,..,,,,,,,,,,,,,#',
    '#,,,,#########..###########,,#',
    '#,,,,,,,,,,,,,..,,,,,,,,,,,,,#',
    '#,"""""",,,,,,..,,,,,,"""""",#',
    '#,"""""",,,,,,..,,,,,,"""""",#',
    '#,"""""",,,,,,..,,,,,,"""""",#',
    '.,,,,,,,,,,,,,..,,,,,,,,,,,,,#',
    '.,,,,,,,,,,,,,..,,,,,,,,,,,,,#',
    '#~~~,,,"""""",..,"""""",,,~~~#',
    '#~~~,,,"""""",..,"""""",,,~~~#',
    '#,,,,,,,,,,,,,..,,,,,,,,,,,,,#',
    '#,,,,,,,,,,,,,..,,,,,,,,,,,,,#',
    '#,,,,,,,,,,,,,..,,,,,,,,,,,,,#',
    '##############..##############',
  ],
  buildings: [{ kind: 'heal', x: 20, y: 6, w: 4, h: 3, label: 'Posto de Cura' }],
  npcs: [trainerNpc('yuki', 8, 12, 'right', ['Brrr... gostou da neve? Eu adoro!', 'Fogo derrete o gelo, então cuidado se seu time for todo de Gelo.', 'Lá em cima ficam as Ruínas da Lua... dizem que um domador de sombras espera por lá.'])],
  signs: [{ x: 13, y: 21, text: ['Picos Congelados', 'Há um Posto de Cura logo acima.'] }],
  warps: [...edgeWarps('ruinas', 'up'), ...edgeWarps('canion', 'down'), { x: 0, y: 16, to: 'cristal', tx: 28, ty: 11, facing: 'left' as Facing }, { x: 0, y: 17, to: 'cristal', tx: 28, ty: 12, facing: 'left' as Facing }],
  encounters: [
    { species: 'pinguelo', min: 17, max: 20, weight: 50 },
    { species: 'nevasco', min: 18, max: 21, weight: 50 },
  ],
  rare: [{ species: 'frostelle', min: 17, max: 20 }],
};

const RUINAS: MapDef = {
  id: 'ruinas',
  name: 'Ruínas da Lua',
  theme: THEMES.ruinas,
  music: 'music/ruinas',
  grid: [
    '##############################',
    '#r,,,,r,,,,,r,,,,r,,,,,r,,,,r#',
    '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,#',
    '#,,,,,,,,,,,..........,,,,,,,#',
    '#r,,,,r,,,,,.,,,,,,,,.r,,,,,r#',
    '#,,,,,,,,,,,.,,,,,,,,.,,,,,,,#',
    '#,,"""""",,,.,,,,,,,,.,,"""",#',
    '#,,"""""",,,......,...,,"""",#',
    '#,,"""""",,,,,,,,.,,,,,,"""",#',
    '#r,,,,r,,,,,,,,,..,,,,,r,,,,r#',
    '#,,,,,,,,,,,,,,..,,,,,,,,,,,,#',
    '#rrrrrrrrrrrr,,..,,rrrrrrrrrr#',
    '#,,,,,,,,,,,,,,..,,,,,,,,,,,,#',
    '#,""""",,,,,,,,..,,,,,,""""",#',
    '#,""""",,r,,,,,..,,,,r,""""",#',
    '#,""""",,,,,,,,..,,,,,,""""",#',
    '#,,,,,,,,,,,,,,..,,,,,,,,,,,,#',
    '#r,,,,r,,,,,,,,..,,,,,,r,,,,r#',
    '#,,,""""",,,,,,..,,,,""""",,,#',
    '#,,,""""",,,,,,..,,,,""""",,,#',
    '#,,,,,,,,,,,,,,..,,,,,,,,,,,,#',
    '#r,,,,r,,,,,,,,..,,,,,,r,,,,r#',
    '#,,,,,,,,,,,,,,..,,,,,,,,,,,,#',
    '##############..##############',
  ],
  buildings: [],
  npcs: [],
  signs: [{ x: 13, y: 21, text: ['Ruínas da Lua', 'Um silêncio pesado paira sobre as colunas antigas...'] }],
  warps: [...edgeWarps('picos', 'down')],
  encounters: [
    { species: 'sombrelo', min: 22, max: 26, weight: 50 },
    { species: 'corvanoite', min: 23, max: 27, weight: 50 },
  ],
  rare: [{ species: 'umbrel', min: 22, max: 26 }],
};

const VENTO: MapDef = {
  id: 'vento',
  name: 'Vale dos Ventos',
  theme: THEMES.vento,
  music: 'music/vento',
  grid: [
    '##############################',
    '#,,,,,,,ff,,,,,,,,,,,,ff,,,,,#',
    '#,""""",,,,,,,""""",,,,,"""",#',
    '#,""""",,rr,,,""""",,rr,"""",#',
    '#,""""",,,,,,,""""",,,,,"""",#',
    '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,#',
    '#,,,,~~~~,,,,,,,,,,,,,,,,,,,,#',
    '#,,,~~~~~~,,,,""""",,,,"""",,#',
    '#,,,,~~~~,,,,,""""",,,,"""",,#',
    '#,,,,,,,,,,,,,""""",,,,"""",,#',
    '#,,ff,,,,,,,,,,,,,,,,,,,,,,,,#',
    '#,,,,,,,,,....................',
    '#,,,,,,,,,....................',
    '#,""""",,,,,,,,,,,,,,,,,,,ff,#',
    '#,""""",,rr,,,""""",,,,,,,,,,#',
    '#,""""",,,,,,,""""",,,"""",,,#',
    '#,,,,,,,,,,,,,""""",,,"""",,,#',
    '#,,,,,,,ff,,,,,,,,,,,,"""",,,#',
    '#,""""",,,,,,,,,,,,,,,,,,,,,,#',
    '#,""""",,,,,"""""",,,,,rr,,,,#',
    '#,,,,,,,,,,,"""""",,,,,,,,,,,#',
    '#,,,ff,,,,,,,,,,,,,,,,,,ff,,,#',
    '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,#',
    '##############################',
  ],
  buildings: [],
  npcs: [],
  signs: [{ x: 27, y: 10, text: ['Vale dos Ventos', 'Monstros de Vento planam sobre o capim. Golpes Elétricos, de Gelo e de Pedra funcionam bem aqui!'] }],
  warps: [{ x: 29, y: 11, to: 'planalto', tx: 1, ty: 11, facing: 'right' as Facing }, { x: 29, y: 12, to: 'planalto', tx: 1, ty: 12, facing: 'right' as Facing }],
  encounters: [
    { species: 'brisito', min: 8, max: 10, weight: 35 },
    { species: 'penugem', min: 8, max: 10, weight: 35 },
    { species: 'brisito_evo', min: 11, max: 14, weight: 14 },
    { species: 'penugem_evo', min: 11, max: 14, weight: 14 },
    { species: 'brisito_evo2', min: 24, max: 25, weight: 1 },
    { species: 'penugem_evo2', min: 24, max: 25, weight: 1 },
  ],
};

const VULCAO: MapDef = {
  id: 'vulcao',
  name: 'Vulcão Rubro',
  theme: THEMES.vulcao,
  music: 'music/vulcao',
  grid: [
    '##############################',
    '#,,,,,~~~~,,,,,,,,,,~~~~,,,,,#',
    '#,"""",~~,,,"""""",,,~~,"""",#',
    '#,"""",,,,,,"""""",,,,,,"""",#',
    '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,#',
    '#,,~~~,,,,rr,,,,,,,,rr,,~~~,,#',
    '#,~~~~~,,,,,,,""""",,,,~~~~~,#',
    '#,,~~~,,,"""",""""",,,,,~~~,,#',
    '#,,,,,,,,"""",,,,,,,,,,,,,,,,#',
    '#,,"""",,"""",,,,~~~~,,,"""",#',
    '#,,"""",,,,,,,,,~~~~~~,,"""",#',
    '.........,,,,,,,,~~~~,,,"""",#',
    '.........,,,,,,,,,,,,,,,,,,,,#',
    '#,,,,,,..,,,,,,,,,,,,,,,,,,,,#',
    '#,"""",..,,,rr,,,,,"""""",,,,#',
    '#,"""",..,,,,,,,,,,"""""",,,,#',
    '#,,,,,,..,,,,~~~,,,"""""",,,,#',
    '#,~~,,,,,,,,~~~~~,,,,,,,,,,,,#',
    '#,~~,,"""""",,~~~,,,,,rr,,,,,#',
    '#,,,,"""""",,,,,,,,,,,,,,,,,,#',
    '#,,,,"""""",,,,,"""",,,~~~,,,#',
    '#,,,,,,,,,,,,,,,"""",,,~~~,,,#',
    '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,#',
    '##############################',
  ],
  buildings: [],
  npcs: [],
  signs: [{ x: 2, y: 10, text: ['Vulcão Rubro', 'Cuidado com a lava! Monstros de Fogo vivem no capim em brasa. Use Água, Terra ou Pedra.'] }],
  warps: [{ x: 0, y: 11, to: 'canion', tx: 28, ty: 13, facing: 'left' as Facing }, { x: 0, y: 12, to: 'canion', tx: 28, ty: 14, facing: 'left' as Facing }],
  encounters: [
    { species: 'carvonito', min: 12, max: 14, weight: 30 },
    { species: 'cabrasa', min: 12, max: 14, weight: 30 },
    { species: 'carvonito_evo', min: 15, max: 18, weight: 19 },
    { species: 'cabrasa_evo', min: 15, max: 18, weight: 19 },
    { species: 'carvonito_evo2', min: 24, max: 26, weight: 1 },
    { species: 'cabrasa_evo2', min: 24, max: 26, weight: 1 },
  ],
};

const CRISTAL: MapDef = {
  id: 'cristal',
  name: 'Minas de Cristal',
  theme: THEMES.cristal,
  music: 'music/cristal',
  grid: [
    '##############################',
    '#,,,,,,,,#,,,,,,,,,#,,,,,,,,,#',
    '#,""""",,#,"""""",,#,""""",,,#',
    '#,""""",,#,"""""",,#,""""",,,#',
    '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,#',
    '####,,,,####,,,,,,####,,,,####',
    '#,,,,,,,,,,,,,~~~,,,,,,,,,,,,#',
    '#,"""",,,,,,,~~~~~,,,,,,"""",#',
    '#,"""",,rr,,,,~~~,,,,rr,"""",#',
    '#,"""",,,,,,,,,,,,,,,,,,"""",#',
    '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,#',
    '#,,,,,,,,,,,,.................',
    '#,,,,,,,,,,,,.................',
    '#,""""",,,,,,..,,,,,,,""""",,#',
    '#,""""",,rr,,..,,rr,,,""""",,#',
    '#,,,,,,,,,,,,..,,,,,,,,,,,,,,#',
    '####,,,,####,..,####,,,,######',
    '#,,,,,,,,,,,,..,,,,,,,,,,,,,,#',
    '#,"""""",,,,,,,,,,,,,"""""",,#',
    '#,"""""",,~~~,,,,,,,,"""""",,#',
    '#,,,,,,,,~~~,,,,rr,,,,,,,,,,,#',
    '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,#',
    '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,#',
    '##############################',
  ],
  buildings: [],
  npcs: [],
  signs: [{ x: 27, y: 10, text: ['Minas de Cristal', 'Monstros de Pedra se escondem entre os cristais. Água, Grama e Terra são as melhores armas.'] }],
  warps: [{ x: 29, y: 11, to: 'picos', tx: 1, ty: 16, facing: 'right' as Facing }, { x: 29, y: 12, to: 'picos', tx: 1, ty: 17, facing: 'right' as Facing }],
  encounters: [
    { species: 'seixito', min: 16, max: 18, weight: 30 },
    { species: 'geodito', min: 16, max: 18, weight: 30 },
    { species: 'seixito_evo', min: 19, max: 23, weight: 19 },
    { species: 'geodito_evo', min: 19, max: 23, weight: 19 },
    { species: 'seixito_evo2', min: 25, max: 27, weight: 1 },
    { species: 'geodito_evo2', min: 25, max: 27, weight: 1 },
  ],
};

export const MAPS: Record<string, MapDef> = { vila: VILA, floresta: FLORESTA, praia: PRAIA, planalto: PLANALTO, canion: CANION, picos: PICOS, ruinas: RUINAS, vento: VENTO, vulcao: VULCAO, cristal: CRISTAL };

export const getMap = (id: string): MapDef => {
  const m = MAPS[id];
  if (!m) throw new Error(`Mapa desconhecido: ${id}`);
  return m;
};

export const START_POSITION = { map: 'vila', x: 14, y: 7, facing: 'down' as Facing };
