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

/** XP total necessário para estar no nível `level` (curva cúbica). */
export const xpForLevel = (level: number): number => (level <= 1 ? 0 : level ** 3);
export const MAX_LEVEL = 100;

/** Progresso (0–1) dentro do nível atual, para a barra de XP. */
export function xpProgress(m: Pick<MonsterInstance, 'level' | 'xp'>): number {
  if (m.level >= MAX_LEVEL) return 1;
  const a = xpForLevel(m.level);
  const b = xpForLevel(m.level + 1);
  return Math.max(0, Math.min(1, (m.xp - a) / (b - a)));
}

export interface LevelUpResult {
  /** níveis alcançados, em ordem */
  levels: number[];
  /** golpes aprendidos automaticamente */
  learned: string[];
  /** golpes novos que exigem escolha (já tem 4) */
  pending: string[];
  /** golpe supremo desbloqueado */
  supreme: string | null;
}

/**
 * Soma XP e sobe de nível quantas vezes for preciso.
 * A vida sobe junto com o máximo (o dano já sofrido é mantido).
 */
export function gainXp(m: MonsterInstance, amount: number): LevelUpResult {
  const res: LevelUpResult = { levels: [], learned: [], pending: [], supreme: null };
  m.xp += amount;
  while (m.level < MAX_LEVEL && m.xp >= xpForLevel(m.level + 1)) {
    const oldMax = maxHp(m);
    m.level++;
    if (m.hp > 0) m.hp += maxHp(m) - oldMax;
    res.levels.push(m.level);
    for (const l of getSpecies(m.species).learnset.filter((x) => x.level === m.level)) {
      if (MOVES[l.move]?.supreme) res.supreme = l.move;
      else if (m.moves.includes(l.move)) continue;
      else if (m.moves.length < MAX_MOVES) {
        m.moves.push(l.move);
        res.learned.push(l.move);
      } else res.pending.push(l.move);
    }
  }
  return res;
}

/** Evolução pendente (nível atingido) ou null. */
export function evolutionTarget(m: MonsterInstance): string | null {
  const evo = getSpecies(m.species).evolution;
  return evo && m.level >= evo.level ? evo.into : null;
}

/** Evolui mantendo nível, XP, golpes e a proporção de vida. */
export function evolve(m: MonsterInstance): string {
  const into = evolutionTarget(m);
  if (!into) return m.species;
  const ratio = m.hp / maxHp(m);
  m.species = into;
  m.hp = Math.max(m.hp > 0 ? 1 : 0, Math.round(maxHp(m) * ratio));
  return into;
}

export function createMonster(species: string, level: number): MonsterInstance {
  const m: MonsterInstance = { uid: newUid(), species, level, xp: xpForLevel(level), hp: 0, moves: movesForLevel(species, level), status: null };
  m.hp = maxHp(m);
  return m;
}

export function healFully(m: MonsterInstance): void {
  m.hp = maxHp(m);
  m.status = null;
}
