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
};
