import { getItem } from '../data/items';
import { getMove, type MoveData } from '../data/moves';
import { getSpecies } from '../data/monsters';
import { effectiveness } from '../data/typeChart';
import { displayName, maxHp, movesForLevel, statsOf, supremeMove, type MonsterInstance } from './Monster';

export type Side = 'player' | 'enemy';
export type BattleKind = 'wild' | 'trainer';
export type Outcome = 'win' | 'lose' | 'run' | 'capture';

export type BattleEvent =
  | { t: 'msg'; text: string }
  | { t: 'move'; side: Side; move: MoveData }
  | { t: 'hp'; side: Side; hp: number; max: number; crit?: boolean; eff?: number }
  | { t: 'miss'; side: Side }
  | { t: 'faint'; side: Side }
  | { t: 'send'; side: Side; index: number }
  | { t: 'needSwitch' }
  | { t: 'end'; outcome: Outcome };

export type PlayerAction =
  | { kind: 'move'; move: string }
  | { kind: 'switch'; index: number }
  | { kind: 'item'; item: string; target: number }
  | { kind: 'run' };

export interface Battler {
  mon: MonsterInstance;
  supremeUsed: boolean;
}

export interface BattleOptions {
  party: MonsterInstance[];
  enemies: MonsterInstance[];
  kind: BattleKind;
  /** nome do treinador inimigo (batalhas de treinador) */
  enemyName?: string;
  rng?: () => number;
}

const opp = (s: Side): Side => (s === 'player' ? 'enemy' : 'player');
export const DEFAULT_CRIT = 1 / 16;

/** Fórmula de dano (estilo clássico). Exportada para testes. */
export function calcDamage(
  attacker: MonsterInstance,
  defender: MonsterInstance,
  move: MoveData,
  rng: () => number,
): { damage: number; crit: boolean; eff: number } {
  const a = statsOf(attacker);
  const d = statsOf(defender);
  const eff = effectiveness(move.type, getSpecies(defender.species).types);
  if (move.power <= 0 || eff === 0) return { damage: 0, crit: false, eff };
  const crit = rng() < (move.critRate ?? DEFAULT_CRIT);
  const stab = getSpecies(attacker.species).types.includes(move.type) ? 1.5 : 1;
  const base = (((2 * attacker.level) / 5 + 2) * move.power * (a.atk / d.def)) / 50 + 2;
  const random = 0.85 + rng() * 0.15;
  const damage = Math.max(1, Math.floor(base * stab * eff * (crit ? 1.5 : 1) * random));
  return { damage, crit, eff };
}

export class BattleEngine {
  readonly kind: BattleKind;
  readonly party: MonsterInstance[];
  readonly enemies: MonsterInstance[];
  readonly enemyName?: string;
  private rng: () => number;
  private battlers: Record<Side, Battler>;
  private runAttempts = 0;
  over = false;
  outcome?: Outcome;
  /** índice do pet ativo na equipe do jogador */
  pIndex: number;
  eIndex = 0;

  constructor(o: BattleOptions) {
    this.kind = o.kind;
    this.party = o.party;
    this.enemies = o.enemies;
    this.enemyName = o.enemyName;
    this.rng = o.rng ?? Math.random;
    this.pIndex = Math.max(0, this.party.findIndex((m) => m.hp > 0));
    this.battlers = {
      player: { mon: this.party[this.pIndex], supremeUsed: false },
      enemy: { mon: this.enemies[0], supremeUsed: false },
    };
  }

  active(side: Side): Battler {
    return this.battlers[side];
  }

  /** Golpes que o lado pode usar agora (normais + supremo se disponível e não usado). */
  usableMoves(side: Side): string[] {
    const b = this.battlers[side];
    const list = b.mon.moves.length ? [...b.mon.moves] : ['investida'];
    const sup = supremeMove(b.mon.species, b.mon.level);
    if (sup && !b.supremeUsed) list.push(sup);
    return list;
  }

  supremeAvailable(side: Side): string | null {
    const b = this.battlers[side];
    return b.supremeUsed ? null : supremeMove(b.mon.species, b.mon.level);
  }

  name(side: Side): string {
    const n = displayName(this.battlers[side].mon);
    if (side === 'player') return n;
    return this.kind === 'wild' ? `${n} selvagem` : `${n} inimigo`;
  }

  // ------------------------------------------------------------------ turno
  turn(action: PlayerAction): BattleEvent[] {
    if (this.over) return [];
    const ev: BattleEvent[] = [];
    const enemyMove = this.chooseEnemyMove();

    if (action.kind === 'run') {
      if (this.tryRun(ev)) return ev;
    } else if (action.kind === 'switch') {
      this.switchTo(action.index, ev);
    } else if (action.kind === 'item') {
      this.useItem(action.item, action.target, ev);
    }

    if (action.kind === 'move') {
      const order = this.order(action.move, enemyMove);
      for (const side of order) {
        if (this.over || this.battlers[side].mon.hp <= 0) continue;
        if (this.battlers[opp(side)].mon.hp <= 0) continue;
        this.useMove(side, side === 'player' ? action.move : enemyMove, ev);
        if (this.checkFaints(ev)) break;
      }
    } else if (!this.over) {
      this.useMove('enemy', enemyMove, ev);
      this.checkFaints(ev);
    }
    return ev;
  }

  /** Depois que o pet do jogador desmaia e ele escolhe outro. */
  sendReplacement(index: number): BattleEvent[] {
    const ev: BattleEvent[] = [];
    this.switchTo(index, ev);
    return ev;
  }

  canSwitchTo(index: number): boolean {
    const m = this.party[index];
    return !!m && m.hp > 0 && index !== this.pIndex;
  }

  // ------------------------------------------------------------------ ações
  private order(playerMove: string, enemyMove: string): Side[] {
    const pp = getMove(playerMove).priority ?? 0;
    const ep = getMove(enemyMove).priority ?? 0;
    if (pp !== ep) return pp > ep ? ['player', 'enemy'] : ['enemy', 'player'];
    const ps = this.speed('player');
    const es = this.speed('enemy');
    if (ps !== es) return ps > es ? ['player', 'enemy'] : ['enemy', 'player'];
    return this.rng() < 0.5 ? ['player', 'enemy'] : ['enemy', 'player'];
  }

  speed(side: Side): number {
    return statsOf(this.battlers[side].mon).spd;
  }

  private tryRun(ev: BattleEvent[]): boolean {
    if (this.kind === 'trainer') {
      ev.push({ t: 'msg', text: 'Não dá para fugir de uma batalha contra treinador!' });
      return true; // não gasta o turno
    }
    this.runAttempts++;
    const ps = this.speed('player');
    const es = this.speed('enemy');
    const chance = ps >= es ? 1 : Math.min(1, (ps * 128) / es / 256 + 0.3 * this.runAttempts);
    if (this.rng() < chance) {
      ev.push({ t: 'msg', text: 'Você fugiu em segurança!' });
      this.finish('run', ev);
      return true;
    }
    ev.push({ t: 'msg', text: 'Não conseguiu fugir!' });
    return false;
  }

  private switchTo(index: number, ev: BattleEvent[]): void {
    const old = this.battlers.player.mon;
    if (old.hp > 0) ev.push({ t: 'msg', text: `${displayName(old)}, volte!` });
    this.pIndex = index;
    this.battlers.player = { mon: this.party[index], supremeUsed: false };
    ev.push({ t: 'send', side: 'player', index });
    ev.push({ t: 'msg', text: `Vai, ${displayName(this.party[index])}!` });
  }

  private useItem(itemId: string, target: number, ev: BattleEvent[]): void {
    const item = getItem(itemId);
    const mon = this.party[target];
    ev.push({ t: 'msg', text: `Você usou ${item.name} em ${displayName(mon)}.` });
    if (item.kind === 'heal') {
      const max = maxHp(mon);
      mon.hp = Math.min(max, mon.hp + (item.amount ?? 0));
      if (target === this.pIndex) ev.push({ t: 'hp', side: 'player', hp: mon.hp, max });
      ev.push({ t: 'msg', text: `${displayName(mon)} recuperou vida.` });
    }
  }

  private useMove(side: Side, moveId: string, ev: BattleEvent[]): void {
    const att = this.battlers[side];
    const def = this.battlers[opp(side)];
    const move = getMove(moveId);
    if (move.supreme) att.supremeUsed = true;
    ev.push({ t: 'msg', text: `${this.name(side)} usou ${move.supreme ? 'SUPREMO ' : ''}${move.name}!` });

    if (this.rng() * 100 >= move.accuracy) {
      ev.push({ t: 'miss', side });
      ev.push({ t: 'msg', text: 'Mas errou!' });
      return;
    }
    ev.push({ t: 'move', side, move });
    if (move.power <= 0) return;

    const [minH, maxH] = move.hits ?? [1, 1];
    const hits = minH + Math.floor(this.rng() * (maxH - minH + 1));
    let landed = 0;
    let lastEff = 1;
    for (let i = 0; i < hits && def.mon.hp > 0; i++) {
      const { damage, crit, eff } = calcDamage(att.mon, def.mon, move, this.rng);
      lastEff = eff;
      def.mon.hp = Math.max(0, def.mon.hp - damage);
      landed++;
      ev.push({ t: 'hp', side: opp(side), hp: def.mon.hp, max: maxHp(def.mon), crit, eff });
      if (crit) ev.push({ t: 'msg', text: 'Golpe crítico!' });
    }
    if (hits > 1) ev.push({ t: 'msg', text: `Acertou ${landed} vez(es)!` });
    if (lastEff > 1) ev.push({ t: 'msg', text: 'É super efetivo!' });
    else if (lastEff < 1) ev.push({ t: 'msg', text: 'Não foi muito efetivo...' });
  }

  /** Retorna true se alguém desmaiou (o turno para). */
  private checkFaints(ev: BattleEvent[]): boolean {
    let fainted = false;
    const e = this.battlers.enemy.mon;
    if (e.hp <= 0) {
      fainted = true;
      ev.push({ t: 'faint', side: 'enemy' });
      ev.push({ t: 'msg', text: `${this.name('enemy')} desmaiou!` });
      const next = this.enemies.findIndex((m) => m.hp > 0);
      if (next >= 0) {
        this.eIndex = next;
        this.battlers.enemy = { mon: this.enemies[next], supremeUsed: false };
        ev.push({ t: 'send', side: 'enemy', index: next });
        ev.push({ t: 'msg', text: `${this.enemyName ?? 'O inimigo'} enviou ${displayName(this.enemies[next])}!` });
      } else {
        this.finish('win', ev);
        return true;
      }
    }
    const p = this.battlers.player.mon;
    if (p.hp <= 0) {
      fainted = true;
      ev.push({ t: 'faint', side: 'player' });
      ev.push({ t: 'msg', text: `${displayName(p)} desmaiou!` });
      if (this.party.some((m) => m.hp > 0)) ev.push({ t: 'needSwitch' });
      else {
        ev.push({ t: 'msg', text: 'Todos os seus pets desmaiaram...' });
        this.finish('lose', ev);
      }
    }
    return fainted;
  }

  private finish(outcome: Outcome, ev: BattleEvent[]): void {
    this.over = true;
    this.outcome = outcome;
    ev.push({ t: 'end', outcome });
  }

  // ------------------------------------------------------------------ IA
  /** Escolhe golpe do inimigo: costuma preferir o mais forte/efetivo, às vezes varia. */
  chooseEnemyMove(): string {
    const b = this.battlers.enemy;
    const target = this.battlers.player.mon;
    const moves = b.mon.moves.length ? this.usableMoves('enemy') : movesForLevel(b.mon.species, b.mon.level);
    if (!moves.length) return 'investida';
    // Supremo só quando está com pouca vida ou o alvo está forte
    const pool = moves.filter((id) => !getMove(id).supreme || b.mon.hp < maxHp(b.mon) * 0.5);
    const score = (id: string) => {
      const mv = getMove(id);
      if (mv.power <= 0) return 30;
      return mv.power * effectiveness(mv.type, getSpecies(target.species).types) * (getSpecies(b.mon.species).types.includes(mv.type) ? 1.5 : 1);
    };
    if (this.rng() < 0.3) return pool[Math.floor(this.rng() * pool.length)];
    return pool.reduce((best, id) => (score(id) > score(best) ? id : best), pool[0]);
  }
}
