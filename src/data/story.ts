import type { NpcDef } from './maps';

/**
 * História: falas, batalhas contra treinadores e gatilhos no mapa.
 * O progresso fica em GameState.flags (salvo junto com o jogo).
 * Use {nome} e {pet} nas falas para o nome do jogador e do pet inicial.
 */

export interface TrainerBattleDef {
  /** marca (flag) gravada ao vencer */
  flag: string;
  /** id do treinador (nome e retrato) */
  trainer: string;
  team: [species: string, level: number][];
  prize: number;
  intro: string[];
  /** falas depois de perder para o jogador */
  win: string[];
  /** falas ao conversar de novo depois da batalha */
  after: string[];
  /** batalha final: termina com a tela de fim de jornada */
  final?: boolean;
}

export const RIVAL: Record<'noctis1' | 'noctis2' | 'noctis3', TrainerBattleDef> = {
  noctis1: {
    flag: 'noctis1',
    trainer: 'noctis',
    team: [['umbrel', 4]],
    prize: 150,
    intro: [
      'Então você é o tal novo domador... Hm. Esse {pet} parece tão ingênuo quanto você.',
      'Eu sou Noctis. As sombras não perdem para iniciantes. Vamos ver do que você é capaz!',
    ],
    win: ['...Sorte de principiante. Não se acostume.', 'Fique mais forte. Ou nem tente chegar às Ruínas da Lua.'],
    after: [],
  },
  noctis2: {
    flag: 'noctis2',
    trainer: 'noctis',
    team: [['umbrel_evo', 19], ['escorpedra', 17], ['corvanoite', 17]],
    prize: 1200,
    intro: ['Você chegou até o Cânion. Admito: estou surpreso, {nome}.', 'Mas daqui em diante a coisa fica séria. Mostre o que aprendeu!'],
    win: ['Tsc... Umbrel, chega.', 'As Ruínas da Lua ficam depois dos Picos Congelados. Lá eu vou provar que a sombra é a força suprema.'],
    after: [],
  },
  noctis3: {
    flag: 'noctis3',
    trainer: 'noctis',
    team: [['umbrel_evo2', 30], ['corvanoite', 27], ['sombrelo', 27], ['nevasco', 26]],
    prize: 5000,
    final: true,
    intro: [
      'Finalmente. Bem-vindo às Ruínas da Lua, {nome}.',
      'Desde pequeno, todos tinham medo do meu elemento. Treinei sozinho, nas sombras, para provar que estavam errados.',
      'Se você me vencer aqui... talvez eu entenda o que me falta.',
    ],
    win: [
      '...Eu perdi. E, estranhamente, não me sinto mal.',
      'Seus pets lutam com você porque confiam em você. Acho que era isso que me faltava.',
      'Obrigado, {nome}. Um dia vou te desafiar de novo. Dessa vez, como amigo.',
    ],
    after: ['As ruínas parecem mais calmas agora.', 'Ei, {nome}... quando quiser uma revanche, estarei aqui treinando com o Umbrel.'],
  },
};

/** Os treinadores amigos desafiam o jogador uma vez, no bioma do elemento deles. */
export const FRIEND_BATTLES: Record<string, TrainerBattleDef> = {
  kael: {
    flag: 'beat_kael',
    trainer: 'kael',
    team: [['ignis', 3]],
    prize: 200,
    intro: ['Ei! Também está começando a jornada? Que tal um treino rápido entre a gente?'],
    win: ['Uau, você é bom! O Ignis vai querer revanche.'],
    after: ['Dizem que monstros raros aparecem nos biomas do elemento deles. Fique de olho no mato alto!'],
  },
  marina: {
    flag: 'beat_marina',
    trainer: 'marina',
    team: [['aquaris', 9], ['conchilo', 8]],
    prize: 500,
    intro: ['Olá! Eu sou a Marina. Quer testar suas forças contra as ondas?'],
    win: ['Que batalha! Você leu a maré direitinho.'],
    after: ['Os monstros daqui adoram água. Golpes Elétricos e de Grama funcionam muito bem contra eles!'],
  },
  raijin: {
    flag: 'beat_raijin',
    trainer: 'raijin',
    team: [['voltix', 10], ['zumbolt', 10]],
    prize: 800,
    intro: ['Sente a eletricidade no ar? Vamos ver se você aguenta um choque de verdade!'],
    win: ['Zzzap... Fui mais rápido, mas você foi mais esperto.'],
    after: ['Pets de Terra não sentem nada dos golpes Elétricos. Pense nisso!'],
  },
  bruno: {
    flag: 'beat_bruno',
    trainer: 'bruno',
    team: [['terragon_evo', 16], ['pedrusco', 15]],
    prize: 1100,
    intro: ['Ha! Bem-vindo ao Cânion! Aqui as pedras têm mais força que muita gente. Encara?'],
    win: ['Ha ha! Você quebrou nossa muralha. Respeito!'],
    after: ['Golpes de Água e Grama amolecem até a rocha mais dura.'],
  },
  yuki: {
    flag: 'beat_yuki',
    trainer: 'yuki',
    team: [['frostelle_evo', 19], ['pinguelo', 17]],
    prize: 1600,
    intro: ['Brrr... gostou da neve? Antes de subir às Ruínas, mostre que está preparado!'],
    win: ['Você está pronto. Cuidado com o Noctis lá em cima.'],
    after: ['Fogo derrete o gelo, então cuidado se seu time for todo de Gelo.', 'Lá em cima ficam as Ruínas da Lua... o Noctis espera por lá.'],
  },
};

export interface StoryTrigger {
  map: string;
  /** retângulo em tiles */
  x: number;
  y: number;
  w: number;
  h: number;
  event: keyof typeof RIVAL;
  /** só dispara depois desta marca */
  requires?: string;
}

/** Pisar nesses tiles inicia o encontro com o Noctis. */
export const TRIGGERS: StoryTrigger[] = [
  { map: 'vila', x: 14, y: 1, w: 2, h: 1, event: 'noctis1' },
  { map: 'canion', x: 10, y: 5, w: 10, h: 1, event: 'noctis2', requires: 'noctis1' },
  { map: 'ruinas', x: 1, y: 3, w: 28, h: 1, event: 'noctis3', requires: 'noctis2' },
];

export const INTRO = [
  'Então você é {nome}, o novo domador da Vila Aurora! E esse aí deve ser o {pet}.',
  'Sua jornada começa aqui. Atravesse os biomas até as Ruínas da Lua, no alto dos Picos Congelados.',
  'Dizem que um domador de sombras chamado Noctis anda desafiando todos pelo caminho... Tenha cuidado!',
  'Dica: no mato alto aparecem monstros selvagens. Enfraqueça-os e use uma Cápsula para capturá-los.',
];

/** NPCs que dependem da história (o Noctis espera no altar das Ruínas). */
export function storyNpcs(mapId: string): NpcDef[] {
  if (mapId !== 'ruinas') return [];
  return [{ id: 'noctis', x: 15, y: 2, facing: 'down', look: 'noctis', name: 'Noctis', dialog: RIVAL.noctis3.after }];
}

/** Troca {nome} e {pet} nas falas. */
export const fill = (lines: string[], nome: string, pet: string): string[] => lines.map((l) => l.replace(/\{nome\}/g, nome).replace(/\{pet\}/g, pet));
