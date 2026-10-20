import type { TrainerData } from './trainers';

/**
 * Treinadores que andam pelo mapa (1 por mapa). Se o jogador cruzar a linha de visão
 * deles, vêm desafiar. Depois de vencidos, aceitam revanche (metade das moedas).
 * Imagens: public/assets/trainers/<id>.png e public/assets/overworld/<id>_down.png etc.
 */
export interface WandererDef {
  id: string;
  map: string;
  name: string;
  look: TrainerData['look'];
  /** ponto central e raio (em tiles) da área onde ele anda */
  home: { x: number; y: number };
  radius: number;
  team: [species: string, level: number][];
  prize: number;
  intro: string;
  win: string[];
  rematch: string;
}

export const WANDERERS: WandererDef[] = [
  {
    id: 'w_pedrinho', map: 'vila', name: 'Garoto Pedrinho',
    look: { hair: 0x3d2b1f, outfit: 0x2a9d8f, accent: 0xe9c46a, skin: 0xd8a47f },
    home: { x: 20, y: 8 }, radius: 3,
    team: [['larvilo', 3]], prize: 80,
    intro: 'Ei, ei! Acabei de pegar meu primeiro monstro! Bora batalhar?',
    win: ['Ahh, perdi! Vou treinar no mato alto da floresta!'],
    rematch: 'Treinei um montão! Quer revanche?',
  },
  {
    id: 'w_bia', map: 'floresta', name: 'Caçadora de Insetos Bia',
    look: { hair: 0x6a994e, outfit: 0xbc6c25, accent: 0xfefae0, skin: 0xf1c27d },
    home: { x: 8, y: 11 }, radius: 3,
    team: [['larvilo', 4], ['verdakor', 5]], prize: 180,
    intro: 'Shhh! Você assustou meus insetos! Agora vai ter que batalhar!',
    win: ['Seus pets são rápidos como vagalumes...'],
    rematch: 'Achei insetos novos no mato! Revanche?',
  },
  {
    id: 'w_davi', map: 'praia', name: 'Pescador Davi',
    look: { hair: 0x5e503f, outfit: 0x219ebc, accent: 0xffb703, skin: 0xc68642 },
    home: { x: 6, y: 15 }, radius: 3,
    team: [['conchilo', 8], ['medulume', 9]], prize: 400,
    intro: 'Os peixes não estão mordendo hoje... Uma batalha vai animar o dia!',
    win: ['Que maré de azar! Mas foi uma boa luta.'],
    rematch: 'O mar está agitado hoje. Mais uma batalha?',
  },
  {
    id: 'w_lucia', map: 'planalto', name: 'Caçadora de Tempestades Lúcia',
    look: { hair: 0x9d4edd, outfit: 0x343a40, accent: 0xffd60a, skin: 0xf6d5b3 },
    home: { x: 22, y: 17 }, radius: 3,
    team: [['zumbolt', 12], ['voltabico', 13]], prize: 700,
    intro: 'Sigo os raios pelo planalto! E você parece carregado de energia. Vamos lá!',
    win: ['Que descarga! Você brilhou mais que um relâmpago.'],
    rematch: 'Uma nova tempestade se formou. Revanche?',
  },
  {
    id: 'w_jorge', map: 'canion', name: 'Mineiro Jorge',
    look: { hair: 0x8d99ae, outfit: 0x6c584c, accent: 0xf4a261, skin: 0xb5835a },
    home: { x: 8, y: 13 }, radius: 3,
    team: [['pedrusco', 15], ['escorpedra', 16]], prize: 1000,
    intro: 'Cavei o dia todo e não achei nada. Talvez eu ache um desafio em você!',
    win: ['Você é mais duro que granito!'],
    rematch: 'Achei uma pedra nova e meus pets ficaram animados. Revanche?',
  },
  {
    id: 'w_sofia', map: 'picos', name: 'Alpinista Sofia',
    look: { hair: 0xe76f51, outfit: 0x264653, accent: 0xe9f5f9, skin: 0xf9dcc4 },
    home: { x: 20, y: 16 }, radius: 3,
    team: [['pinguelo', 19], ['nevasco', 20]], prize: 1400,
    intro: 'Cheguei ao topo de todos os picos. Só falta vencer você!',
    win: ['Ufa... você tem o fôlego de uma alpinista!'],
    rematch: 'Escalei mais um pico e voltei mais forte. Revanche?',
  },
  {
    id: 'w_ravi', map: 'ruinas', name: 'Místico Ravi',
    look: { hair: 0xf8f9fa, outfit: 0x5a189a, accent: 0xc77dff, skin: 0xa47148 },
    home: { x: 8, y: 10 }, radius: 3,
    team: [['sombrelo', 24], ['corvanoite', 25]], prize: 2000,
    intro: 'As luas me disseram que você viria... e que batalharíamos.',
    win: ['As luas não mentem: você tem um grande futuro.'],
    rematch: 'As luas mudaram de fase. Quer outra batalha?',
  },
];

export const wandererFlag = (id: string): string => `beat_${id}`;
