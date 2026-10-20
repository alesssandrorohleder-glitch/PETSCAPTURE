import type { ElementId } from './elements';

export interface TrainerData {
  id: string;
  name: string;
  age: number;
  element: ElementId;
  /** id da espécie do pet inicial (src/data/monsters.ts) */
  starter: string;
  /** Aparece na tela de escolha? (Noctis é sempre o rival.) */
  selectable: boolean;
  description: string;
  /** Cores usadas pelo placeholder até você colocar as imagens. */
  look: { hair: number; outfit: number; accent: number; skin: number };
}

export const TRAINERS: TrainerData[] = [
  {
    id: 'kael',
    name: 'Kael',
    age: 20,
    element: 'fogo',
    starter: 'ignis',
    selectable: true,
    description: 'Aventureiro de cabelo vermelho-escuro espetado e jaqueta preta e laranja com chamas.',
    look: { hair: 0x8b1e1e, outfit: 0x222222, accent: 0xff7f11, skin: 0xf1c27d },
  },
  {
    id: 'marina',
    name: 'Marina',
    age: 19,
    element: 'agua',
    starter: 'aquaris',
    selectable: true,
    description: 'Aventureira de cabelo turquesa ondulado e jaqueta estilo marinheiro.',
    look: { hair: 0x2ec4b6, outfit: 0x1d3557, accent: 0xffffff, skin: 0xf6d5b3 },
  },
  {
    id: 'raijin',
    name: 'Raijin',
    age: 21,
    element: 'eletrico',
    starter: 'voltix',
    selectable: true,
    description: 'Aventureiro de cabelo loiro espetado com mecha preta e moletom com raios.',
    look: { hair: 0xf9d71c, outfit: 0x3d3d3d, accent: 0xffd60a, skin: 0xe8b98a },
  },
  {
    id: 'bruno',
    name: 'Bruno',
    age: 24,
    element: 'terra',
    starter: 'terragon',
    selectable: true,
    description: 'Aventureiro musculoso de barba castanha, colete de couro e picareta nas costas.',
    look: { hair: 0x6f4518, outfit: 0x8d5524, accent: 0xc68642, skin: 0xd09a6b },
  },
  {
    id: 'yuki',
    name: 'Yuki',
    age: 20,
    element: 'gelo',
    starter: 'frostelle',
    selectable: true,
    description: 'Aventureira de cabelo curto branco-prateado e casaco branco com flocos de neve.',
    look: { hair: 0xe0e7ef, outfit: 0xf8f9fa, accent: 0x8ecae6, skin: 0xf9dcc4 },
  },
  {
    id: 'noctis',
    name: 'Noctis',
    age: 22,
    element: 'sombra',
    starter: 'umbrel',
    selectable: false,
    description: 'Rival de cabelo preto cobrindo um olho, olhos violeta e casaco roxo-escuro.',
    look: { hair: 0x111111, outfit: 0x3c096c, accent: 0xc77dff, skin: 0xe6c3a5 },
  },
];

export const getTrainer = (id: string): TrainerData => {
  const t = TRAINERS.find((tr) => tr.id === id);
  if (!t) throw new Error(`Treinador desconhecido: ${id}`);
  return t;
};
