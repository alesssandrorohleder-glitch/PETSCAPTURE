import { getSpecies, type BaseStats } from '../data/monsters';
import { MOVES } from '../data/moves';

export type StatusId = 'envenenado' | 'adormecido' | 'paralisado' | 'congelado';

export interface MonsterInstance {
  uid: string;
  species: string;
  nickname?: string;
  level: number;
  xp: number;
  hp: number;
  /** ids de golpes (máx. 4) */
  moves: string[];
  status: StatusId | null;
}

let uidCounter = 0;
export const newUid = (): string => `${Date.now().toString(36)}${(uidCounter++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function statsOf(m: Pick<MonsterInstance, 'species' | 'level'>): BaseStats {
  const b = getSpecies(m.species).base;
  const calc = (v: number) => Math.floor((v * 2 * m.level) / 100) + 5;
  return {
    hp: Math.floor((b.hp * 2 * m.level) / 100) + m.level + 10,
    atk: calc(b.atk),
    def: calc(b.def),
    spd: calc(b.spd),
  };
}

export const maxHp = (m: Pick<MonsterInstance, 'species' | 'level'>): number => statsOf(m).hp;

export const displayName = (m: MonsterInstance): string => m.nickname ?? getSpecies(m.species).name;

export const MAX_MOVES = 4;

/** Golpes normais que a espécie conhece até o nível (os 4 mais recentes). O supremo fica à parte. */
export function movesForLevel(species: string, level: number): string[] {
  return getSpecies(species)
    .learnset.filter((l) => l.level <= level && !MOVES[l.move]?.supreme)
    .map((l) => l.move)
    .slice(-MAX_MOVES);
}

/** Golpe supremo disponível no nível atual (ou null). Não ocupa um dos 4 espaços. */
export function supremeMove(species: string, level: number): string | null {
  const l = getSpecies(species).learnset.find((x) => x.level <= level && MOVES[x.move]?.supreme);
  return l?.move ?? null;
}

export function createMonster(species: string, level: number): MonsterInstance {
  const m: MonsterInstance = { uid: newUid(), species, level, xp: 0, hp: 0, moves: movesForLevel(species, level), status: null };
  m.hp = maxHp(m);
  return m;
}

export function healFully(m: MonsterInstance): void {
  m.hp = maxHp(m);
  m.status = null;
}
