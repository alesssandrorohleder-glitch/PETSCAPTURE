import { MAPS, START_POSITION } from '../data/maps';
import { MOVES } from '../data/moves';
import { SPECIES } from '../data/monsters';
import { ITEMS } from '../data/items';
import { TRAINERS } from '../data/trainers';
import { GameState, PARTY_LIMIT, STATE_VERSION, type PlayerState } from './GameState';
import { maxHp, type MonsterInstance } from './Monster';
import { Storage } from './Storage';

export const SAVE_KEY = 'elementais.save';

export interface SaveSummary {
  trainerId: string;
  mapId: string;
  playSeconds: number;
  partyLevels: number[];
  savedAt: number;
}

export interface SaveFile {
  version: number;
  savedAt: number;
  state: PlayerState;
}

/** Corrige/valida um monstro vindo do save (dados antigos ou editados). */
function cleanMonster(m: MonsterInstance): MonsterInstance | null {
  if (!m || !SPECIES[m.species]) return null;
  const level = Math.max(1, Math.min(100, Math.floor(m.level || 1)));
  const out: MonsterInstance = {
    uid: String(m.uid || Math.random().toString(36).slice(2)),
    species: m.species,
    nickname: m.nickname,
    level,
    xp: Math.max(0, Number(m.xp) || 0),
    hp: 0,
    moves: (m.moves ?? []).filter((id) => MOVES[id] && !MOVES[id].supreme).slice(0, 4),
    status: m.status ?? null,
  };
  out.hp = Math.max(0, Math.min(maxHp(out), Math.floor(Number(m.hp) || 0)));
  return out;
}

/** Valida o estado carregado. Retorna null se não der para aproveitar. */
export function sanitize(raw: unknown): PlayerState | null {
  const s = raw as PlayerState;
  if (!s || typeof s !== 'object' || !TRAINERS.some((t) => t.id === s.trainerId && t.selectable)) return null;
  const party = (s.party ?? []).map(cleanMonster).filter((m): m is MonsterInstance => !!m).slice(0, PARTY_LIMIT);
  if (!party.length) return null;
  const box = (s.box ?? []).map(cleanMonster).filter((m): m is MonsterInstance => !!m);
  const inventory: Record<string, number> = {};
  for (const [id, n] of Object.entries(s.inventory ?? {})) if (ITEMS[id]) inventory[id] = Math.max(0, Math.floor(Number(n) || 0));
  const mapOk = !!MAPS[s.mapId];
  const respawnOk = !!MAPS[s.respawn?.mapId];
  // se ninguém da equipe está de pé, todos voltam curados ao último Centro de Cura
  const anyAlive = party.some((m) => m.hp > 0);
  if (!anyAlive) party.forEach((m) => ((m.hp = maxHp(m)), (m.status = null)));
  const respawn = respawnOk ? s.respawn : { mapId: START_POSITION.map, x: START_POSITION.x, y: START_POSITION.y };
  const at = anyAlive && mapOk ? { mapId: s.mapId, x: s.x, y: s.y } : respawn;
  return {
    version: STATE_VERSION,
    trainerId: s.trainerId,
    mapId: at.mapId,
    x: Number(at.x) || 0,
    y: Number(at.y) || 0,
    facing: ['up', 'down', 'left', 'right'].includes(s.facing) ? s.facing : 'down',
    money: Math.max(0, Math.floor(Number(s.money) || 0)),
    party,
    box,
    inventory,
    flags: typeof s.flags === 'object' && s.flags ? { ...s.flags } : {},
    respawn,
    playSeconds: Math.max(0, Number(s.playSeconds) || 0),
  };
}

/**
 * Salvamento no navegador (localStorage). Nunca lança erro: se o navegador
 * bloquear o armazenamento, o jogo continua sem salvar.
 */
export const SaveManager = {
  has(): boolean {
    return SaveManager.summary() !== null;
  },

  /** Avisado a cada salvamento local (o salvamento online se inscreve aqui). */
  onSaved: null as ((file: SaveFile) => void) | null,

  save(): boolean {
    if (!GameState.has()) return false;
    const file: SaveFile = { version: STATE_VERSION, savedAt: Date.now(), state: GameState.get() };
    const ok = Storage.set(SAVE_KEY, file);
    SaveManager.onSaved?.(file);
    return ok;
  },

  /** O arquivo salvo neste aparelho (ou null). */
  localFile(): SaveFile | null {
    const file = Storage.get<SaveFile | null>(SAVE_KEY, null);
    return file && sanitize(file.state) ? file : null;
  },

  /** Substitui o save deste aparelho (ex.: progresso baixado da nuvem). */
  writeLocal(file: SaveFile): boolean {
    if (!sanitize(file.state)) return false;
    return Storage.set(SAVE_KEY, file);
  },

  /** Carrega o save para o GameState. Retorna false se não existir ou estiver corrompido. */
  load(): boolean {
    const file = Storage.get<SaveFile | null>(SAVE_KEY, null);
    const state = file ? sanitize(file.state) : null;
    if (!state) return false;
    GameState.set(state);
    return true;
  },

  summary(file: SaveFile | null = Storage.get<SaveFile | null>(SAVE_KEY, null)): SaveSummary | null {
    const st = file ? sanitize(file.state) : null;
    if (!file || !st) return null;
    return { trainerId: st.trainerId, mapId: st.mapId, playSeconds: st.playSeconds, partyLevels: st.party.map((m) => m.level), savedAt: file.savedAt };
  },

  clear(): void {
    Storage.remove(SAVE_KEY);
  },
};

export const formatPlayTime = (sec: number): string => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h ? `${h}h${String(m).padStart(2, '0')}` : `${m} min`;
};
