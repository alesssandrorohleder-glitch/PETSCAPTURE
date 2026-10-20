import { START_POSITION, type Facing } from '../data/maps';
import { getTrainer } from '../data/trainers';
import { createMonster, healFully, type MonsterInstance } from './Monster';

export interface PlayerState {
  version: number;
  trainerId: string;
  mapId: string;
  x: number;
  y: number;
  facing: Facing;
  money: number;
  party: MonsterInstance[];
  /** monstros capturados além dos 6 da equipe */
  box: MonsterInstance[];
  inventory: Record<string, number>;
  /** progresso da história (src/data/story.ts) */
  flags: Record<string, boolean>;
  /** último lugar de cura, para onde o jogador volta ao perder */
  respawn: { mapId: string; x: number; y: number };
  playSeconds: number;
}

export const STATE_VERSION = 1;
export const PARTY_LIMIT = 6;

let state: PlayerState | null = null;

export const GameState = {
  get(): PlayerState {
    if (!state) throw new Error('Nenhum jogo em andamento');
    return state;
  },
  has: (): boolean => state !== null,
  set(s: PlayerState): void {
    state = s;
  },
  newGame(trainerId: string): PlayerState {
    const trainer = getTrainer(trainerId);
    state = {
      version: STATE_VERSION,
      trainerId,
      mapId: START_POSITION.map,
      x: START_POSITION.x,
      y: START_POSITION.y,
      facing: START_POSITION.facing,
      money: 300,
      party: [createMonster(trainer.starter, 5)],
      box: [],
      inventory: { capsula: 5, pocao: 3 },
      flags: {},
      respawn: { mapId: START_POSITION.map, x: START_POSITION.x, y: START_POSITION.y },
      playSeconds: 0,
    };
    return state;
  },
  healParty(): void {
    GameState.get().party.forEach(healFully);
  },

  // ------------------------------------------------ equipe e Caixa
  /** Coloca o pet `i` como primeiro da equipe (ele entra primeiro nas batalhas). */
  moveToFront(i: number): void {
    const p = GameState.get().party;
    if (i <= 0 || i >= p.length) return;
    p.unshift(...p.splice(i, 1));
  },
  /** Guarda o pet `i` na Caixa. A equipe precisa manter ao menos 1 pet de pé. */
  deposit(i: number): boolean {
    const st = GameState.get();
    const rest = st.party.filter((_, k) => k !== i);
    if (!rest.some((m) => m.hp > 0)) return false;
    st.box.push(...st.party.splice(i, 1));
    return true;
  },
  /** Leva o monstro da Caixa para a equipe (se houver vaga). */
  withdraw(boxIndex: number): boolean {
    const st = GameState.get();
    if (st.party.length >= PARTY_LIMIT || !st.box[boxIndex]) return false;
    st.party.push(...st.box.splice(boxIndex, 1));
    return true;
  },
  /** Troca um pet da equipe por um da Caixa. */
  swap(partyIndex: number, boxIndex: number): boolean {
    const st = GameState.get();
    const a = st.party[partyIndex];
    const b = st.box[boxIndex];
    if (!a || !b) return false;
    if (b.hp <= 0 && !st.party.some((m, k) => k !== partyIndex && m.hp > 0)) return false;
    st.party[partyIndex] = b;
    st.box[boxIndex] = a;
    return true;
  },
};
