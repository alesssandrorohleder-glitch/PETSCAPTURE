import { getItem } from '../data/items';
import { getMove, type MoveData, type MoveEffect, type StatKey } from '../data/moves';
import { getSpecies } from '../data/monsters';
import { effectiveness } from '../data/typeChart';
import {
  displayName,
  gainXp,
  maxHp,
  movesForLevel,
  statsOf,
  supremeMove,
  type MonsterInstance,
  type StatusId,
} from './Monster';

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
  | { t: 'status'; side: Side; status: StatusId | null }
  | { t: 'buff'; side: Side; good: boolean }
  | { t: 'xp'; uid: string; amount: number }
  | { t: 'level'; uid: string; level: number }
  | { t: 'learnChoice'; uid: string; move: string }
  | { t: 'capture'; shakes: number; success: boolean }
  | { t: 'needSwitch' }
  | { t: 'end'; outcome: Outcome };

export type PlayerAction =
  | { kind: 'move'; move: string }
  | { kind: 'switch'; index: number }
  | { kind: 'item'; item: string; target: number }
  | { kind: 'run' };

/** Estado temporário de quem está em campo (some ao trocar ou ao fim da batalha). */
export interface Battler {
  mon: MonsterInstance;
  supremeUsed: boolean;
  stages: Record<StatKey, number>;
  shield: { reduction: number; turns: number } | null;
  reflect: { fraction: number; turns: number } | null;
  dot: { fraction: number; turns: number } | null;
  /** bloqueia o próximo golpe (turnos restantes) */
  protect: number;
  /** esquiva do próximo golpe (turnos restantes) */
  evade: number;
  stunned: boolean;
  sleepTurns: number;
  freezeTurns: number;
}

/** Para onde foi o monstro capturado. */
export type CaptureDest = 'party' | 'box';

export interface BattleOptions {
  party: MonsterInstance[];
  enemies: MonsterInstance[];
  kind: BattleKind;
  enemyName?: string;
  rng?: () => number;
  /** monstros guardados fora da equipe (recebe capturas com a equipe cheia) */
  box?: MonsterInstance[];
}

export const PARTY_MAX = 6;

/**
 * Chance de captura (0–1): maior com menos vida, taxa de captura da espécie e status.
 * Vida cheia ≈ catchRate/765; vida mínima ≈ catchRate/255 (antes do bônus de status).
 */
export function captureChance(mon: MonsterInstance, bonus = 1): number {
  const max = maxHp(mon);
  const statusBonus = mon.status === 'adormecido' || mon.status === 'congelado' ? 2 : mon.status ? 1.5 : 1;
  const a = (((3 * max - 2 * mon.hp) * getSpecies(mon.species).catchRate * bonus) / (3 * max)) * statusBonus;
  return Math.min(1, a / 255);
}

const opp = (s: Side): Side => (s === 'player' ? 'enemy' : 'player');
export const DEFAULT_CRIT = 1 / 16;

export const STATUS_INFO: Record<StatusId, { name: string; short: string; color: number }> = {
  envenenado: { name: 'envenenado', short: 'VEN', color: 0xa855f7 },
  adormecido: { name: 'adormecido', short: 'SONO', color: 0x94a3b8 },
  paralisado: { name: 'paralisado', short: 'PAR', color: 0xfacc15 },
  congelado: { name: 'congelado', short: 'GELO', color: 0x67e8f9 },
};

const STAT_NAMES: Record<StatKey, string> = { atk: 'O ataque', def: 'A defesa', spd: 'A velocidade', acc: 'A precisão' };

/** Multiplicador de estágios (-6..+6). */
export const stageMult = (stage: number, stat: StatKey = 'atk'): number => {
  const base = stat === 'acc' ? 3 : 2;
  return stage >= 0 ? (base + stage) / base : base / (base - stage);
};

const newBattler = (mon: MonsterInstance): Battler => ({
  mon,
  supremeUsed: false,
  stages: { atk: 0, def: 0, spd: 0, acc: 0 },
  shield: null,
  reflect: null,
  dot: null,
  protect: 0,
  evade: 0,
  stunned: false,
  sleepTurns: mon.status === 'adormecido' ? 1 : 0,
  freezeTurns: mon.status === 'congelado' ? 1 : 0,
});

/** Golpe que só afeta quem usa (não pode errar nem ser bloqueado). */
export const isSelfMove = (m: MoveData): boolean =>
  m.power <= 0 &&
  !!m.effects?.length &&
  m.effects.every((e) => ['heal', 'shield', 'protect', 'evade', 'reflect'].includes(e.kind) || (e.kind === 'stat' && e.target === 'self'));

/** Fórmula de dano (estilo clássico). `atkMult`/`defMult` vêm dos estágios. */
export function calcDamage(
  attacker: MonsterInstance,
  defender: MonsterInstance,
  move: MoveData,
  rng: () => number,
  atkMult = 1,
  defMult = 1,
): { damage: number; crit: boolean; eff: number } {
  const a = statsOf(attacker);
  const d = statsOf(defender);
  const eff = effectiveness(move.type, getSpecies(defender.species).types);
  if (move.power <= 0 || eff === 0) return { damage: 0, crit: false, eff };
  const crit = rng() < (move.critRate ?? DEFAULT_CRIT);
  const stab = getSpecies(attacker.species).types.includes(move.type) ? 1.5 : 1;
  // crítico ignora quedas de ataque e aumentos de defesa
  const am = crit ? Math.max(1, atkMult) : atkMult;
  const dm = crit ? Math.min(1, defMult) : defMult;
  const base = (((2 * attacker.level) / 5 + 2) * move.power * ((a.atk * am) / (d.def * dm))) / 50 + 2;
  const random = 0.85 + rng() * 0.15;
  const damage = Math.max(1, Math.floor(base * stab * eff * (crit ? 1.5 : 1) * random));
  return { damage, crit, eff };
}

/** XP dado por derrotar um monstro. */
export const xpReward = (defeated: MonsterInstance, kind: BattleKind): number =>
  Math.max(1, Math.floor(((getSpecies(defeated.species).xpYield * defeated.level) / 5) * (kind === 'trainer' ? 1.5 : 1)));

export class BattleEngine {
  readonly kind: BattleKind;
  readonly party: MonsterInstance[];
  readonly enemies: MonsterInstance[];
  readonly enemyName?: string;
  readonly box: MonsterInstance[];
  /** onde o monstro capturado foi parar */
  captured?: { mon: MonsterInstance; dest: CaptureDest };
  private rng: () => number;
  private battlers: Record<Side, Battler>;
  private runAttempts = 0;
  /** pets que lutaram contra o inimigo atual (todos ganham XP) */
  private participants = new Set<string>();
  /** XP total ganho por pet nesta batalha (para o bônus de anúncio) */
  readonly xpGained = new Map<string, number>();
  over = false;
  outcome?: Outcome;
  pIndex: number;
  eIndex = 0;

  constructor(o: BattleOptions) {
    this.kind = o.kind;
    this.party = o.party;
    this.enemies = o.enemies;
    this.enemyName = o.enemyName;
    this.box = o.box ?? [];
    this.rng = o.rng ?? Math.random;
    this.pIndex = Math.max(0, this.party.findIndex((m) => m.hp > 0));
    this.battlers = { player: newBattler(this.party[this.pIndex]), enemy: newBattler(this.enemies[0]) };
    this.participants.add(this.party[this.pIndex].uid);
  }

  active(side: Side): Battler {
    return this.battlers[side];
  }

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
      for (const side of this.order(action.move, enemyMove)) {
        if (this.over || this.battlers[side].mon.hp <= 0 || this.battlers[opp(side)].mon.hp <= 0) continue;
        this.act(side, side === 'player' ? action.move : enemyMove, ev);
        if (this.checkFaints(ev)) return ev;
      }
    } else if (!this.over) {
      this.act('enemy', enemyMove, ev);
      if (this.checkFaints(ev)) return ev;
    }
    if (!this.over) {
      this.endOfTurn(ev);
      this.checkFaints(ev);
    }
    return ev;
  }

  sendReplacement(index: number): BattleEvent[] {
    const ev: BattleEvent[] = [];
    this.switchTo(index, ev);
    return ev;
  }

  canSwitchTo(index: number): boolean {
    const m = this.party[index];
    return !!m && m.hp > 0 && index !== this.pIndex;
  }

  /** Limpa status temporários ao fim da batalha (só o veneno continua). */
  cleanup(): void {
    for (const m of this.party) if (m.status && m.status !== 'envenenado') m.status = null;
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
    const b = this.battlers[side];
    return statsOf(b.mon).spd * stageMult(b.stages.spd) * (b.mon.status === 'paralisado' ? 0.5 : 1);
  }

  private tryRun(ev: BattleEvent[]): boolean {
    if (this.kind === 'trainer') {
      ev.push({ t: 'msg', text: 'Não dá para fugir de uma batalha contra treinador!' });
      return true;
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
    this.battlers.player = newBattler(this.party[index]);
    this.participants.add(this.party[index].uid);
    ev.push({ t: 'send', side: 'player', index });
    ev.push({ t: 'msg', text: `Vai, ${displayName(this.party[index])}!` });
  }

  /** Pode usar a cápsula agora? (só contra selvagens) */
  canCapture(): boolean {
    return this.kind === 'wild' && !this.over;
  }

  /** Retorna true se a batalha acabou com a captura. */
  private throwCapsule(itemId: string, ev: BattleEvent[]): boolean {
    const wild = this.battlers.enemy.mon;
    if (this.kind !== 'wild') {
      ev.push({ t: 'msg', text: 'Não dá para capturar o monstro de outro treinador!' });
      return false;
    }
    ev.push({ t: 'msg', text: `Você lançou uma ${getItem(itemId).name}!` });
    const chance = captureChance(wild, getItem(itemId).catchBonus ?? 1);
    // 3 balançadas; cada uma passa com chance^(1/3), então o total é `chance`
    const perShake = Math.cbrt(chance);
    let shakes = 0;
    while (shakes < 3 && this.rng() < perShake) shakes++;
    const success = shakes === 3;
    ev.push({ t: 'capture', shakes, success });
    if (!success) {
      ev.push({ t: 'msg', text: ['Ah, não! Ele escapou!', 'Quase! Foi por pouco!', 'Droga! Estava quase!'][Math.min(2, shakes)] });
      return false;
    }
    const dest: CaptureDest = this.party.length < PARTY_MAX ? 'party' : 'box';
    if (wild.status === 'adormecido' || wild.status === 'congelado' || wild.status === 'paralisado') wild.status = null;
    (dest === 'party' ? this.party : this.box).push(wild);
    this.captured = { mon: wild, dest };
    ev.push({ t: 'msg', text: `Peguei! ${displayName(wild)} foi capturado!` });
    if (dest === 'box') ev.push({ t: 'msg', text: `Sua equipe está cheia. ${displayName(wild)} foi enviado para a Caixa.` });
    this.finish('capture', ev);
    return true;
  }

  private useItem(itemId: string, target: number, ev: BattleEvent[]): void {
    const item = getItem(itemId);
    if (item.kind === 'capture') {
      this.throwCapsule(itemId, ev);
      return;
    }
    const mon = this.party[target];
    ev.push({ t: 'msg', text: `Você usou ${item.name} em ${displayName(mon)}.` });
    if (item.kind === 'heal') {
      const max = maxHp(mon);
      mon.hp = Math.min(max, mon.hp + (item.amount ?? 0));
      if (target === this.pIndex) ev.push({ t: 'hp', side: 'player', hp: mon.hp, max });
      ev.push({ t: 'msg', text: `${displayName(mon)} recuperou vida.` });
    } else if (item.kind === 'cure' && mon.status === item.cures) {
      mon.status = null;
      if (target === this.pIndex) ev.push({ t: 'status', side: 'player', status: null });
      ev.push({ t: 'msg', text: `${displayName(mon)} está curado!` });
    }
  }

  /** Verifica status que impedem a ação. Retorna false se perdeu o turno. */
  private canAct(side: Side, ev: BattleEvent[]): boolean {
    const b = this.battlers[side];
    const n = this.name(side);
    if (b.stunned) {
      b.stunned = false;
      ev.push({ t: 'msg', text: `${n} está atordoado e não consegue agir!` });
      return false;
    }
    const st = b.mon.status;
    if (st === 'adormecido') {
      if (b.sleepTurns > 0) {
        b.sleepTurns--;
        ev.push({ t: 'msg', text: `${n} está dormindo profundamente...` });
        return false;
      }
      b.mon.status = null;
      ev.push({ t: 'status', side, status: null }, { t: 'msg', text: `${n} acordou!` });
    }
    if (st === 'congelado') {
      if (b.freezeTurns > 0) {
        b.freezeTurns--;
        ev.push({ t: 'msg', text: `${n} está congelado e não se move!` });
        return false;
      }
      b.mon.status = null;
      ev.push({ t: 'status', side, status: null }, { t: 'msg', text: `${n} descongelou!` });
    }
    if (st === 'paralisado' && this.rng() < 0.25) {
      ev.push({ t: 'msg', text: `${n} está paralisado! Não consegue se mover!` });
      return false;
    }
    return true;
  }

  private act(side: Side, moveId: string, ev: BattleEvent[]): void {
    if (!this.canAct(side, ev)) return;
    this.useMove(side, moveId, ev);
  }

  private useMove(side: Side, moveId: string, ev: BattleEvent[]): void {
    const att = this.battlers[side];
    const defSide = opp(side);
    const def = this.battlers[defSide];
    const move = getMove(moveId);
    if (move.supreme) att.supremeUsed = true;
    ev.push({ t: 'msg', text: `${this.name(side)} usou ${move.supreme ? 'SUPREMO ' : ''}${move.name}!` });

    if (isSelfMove(move)) {
      ev.push({ t: 'move', side, move });
      for (const e of move.effects ?? []) this.applyEffect(e, side, 0, ev);
      return;
    }

    const acc = move.accuracy * stageMult(att.stages.acc, 'acc');
    if (this.rng() * 100 >= acc) {
      ev.push({ t: 'miss', side }, { t: 'msg', text: 'Mas errou!' });
      return;
    }
    ev.push({ t: 'move', side, move });
    if (def.protect > 0) {
      def.protect = 0;
      ev.push({ t: 'msg', text: `${this.name(defSide)} bloqueou o golpe com a Muralha de Rocha!` });
      return;
    }
    if (def.evade > 0) {
      def.evade = 0;
      ev.push({ t: 'msg', text: `${this.name(defSide)} esquivou como um fantasma!` });
      return;
    }

    let dealt = 0;
    if (move.power > 0) {
      const [minH, maxH] = move.hits ?? [1, 1];
      const hits = minH + Math.floor(this.rng() * (maxH - minH + 1));
      let landed = 0;
      let lastEff = 1;
      for (let i = 0; i < hits && def.mon.hp > 0 && att.mon.hp > 0; i++) {
        const r = calcDamage(att.mon, def.mon, move, this.rng, stageMult(att.stages.atk), stageMult(def.stages.def));
        let damage = r.damage;
        if (def.shield) damage = Math.max(1, Math.floor(damage * (1 - def.shield.reduction)));
        lastEff = r.eff;
        damage = Math.min(damage, def.mon.hp);
        def.mon.hp -= damage;
        dealt += damage;
        landed++;
        ev.push({ t: 'hp', side: defSide, hp: def.mon.hp, max: maxHp(def.mon), crit: r.crit, eff: r.eff });
        if (r.crit) ev.push({ t: 'msg', text: 'Golpe crítico!' });
        if (def.reflect && damage > 0) {
          const back = Math.max(1, Math.floor(damage * def.reflect.fraction));
          att.mon.hp = Math.max(0, att.mon.hp - back);
          ev.push({ t: 'hp', side, hp: att.mon.hp, max: maxHp(att.mon) }, { t: 'msg', text: `O Espelho Congelado refletiu ${back} de dano!` });
        }
      }
      if (hits > 1) ev.push({ t: 'msg', text: `Acertou ${landed} vez(es)!` });
      if (lastEff > 1) ev.push({ t: 'msg', text: 'É super efetivo!' });
      else if (lastEff < 1) ev.push({ t: 'msg', text: 'Não foi muito efetivo...' });
    }
    for (const e of move.effects ?? []) this.applyEffect(e, side, dealt, ev, move.power <= 0);
  }

  private applyEffect(e: MoveEffect, side: Side, dealt: number, ev: BattleEvent[], isStatusMove = false): void {
    const self = this.battlers[side];
    const targetSide = opp(side);
    const target = this.battlers[targetSide];
    const roll = (chance = 1) => chance >= 1 || this.rng() < chance;
    switch (e.kind) {
      case 'status': {
        if (target.mon.hp <= 0 || !roll(e.chance)) return;
        const immune = e.status === 'congelado' && getSpecies(target.mon.species).types.includes('gelo');
        if (target.mon.status || immune) {
          if (isStatusMove) ev.push({ t: 'msg', text: 'Mas não teve efeito...' });
          return;
        }
        target.mon.status = e.status;
        if (e.status === 'adormecido') target.sleepTurns = 1 + Math.floor(this.rng() * 2);
        if (e.status === 'congelado') target.freezeTurns = 1;
        ev.push({ t: 'status', side: targetSide, status: e.status }, { t: 'msg', text: `${this.name(targetSide)} ficou ${STATUS_INFO[e.status].name}!` });
        return;
      }
      case 'stat': {
        if (!roll(e.chance)) return;
        const who = e.target === 'self' ? side : targetSide;
        const b = this.battlers[who];
        if (b.mon.hp <= 0) return;
        const before = b.stages[e.stat];
        b.stages[e.stat] = Math.max(-6, Math.min(6, before + e.stages));
        const diff = b.stages[e.stat] - before;
        const name = this.name(who);
        if (diff === 0) ev.push({ t: 'msg', text: `${STAT_NAMES[e.stat]} de ${name} não muda mais!` });
        else {
          const word = diff > 0 ? (diff > 1 ? 'aumentou muito' : 'aumentou') : diff < -1 ? 'caiu muito' : 'caiu';
          ev.push({ t: 'buff', side: who, good: diff > 0 }, { t: 'msg', text: `${STAT_NAMES[e.stat]} de ${name} ${word}!` });
        }
        return;
      }
      case 'heal': {
        const max = maxHp(self.mon);
        if (self.mon.hp >= max) {
          ev.push({ t: 'msg', text: 'A vida já está cheia!' });
          return;
        }
        self.mon.hp = Math.min(max, self.mon.hp + Math.floor(max * e.fraction));
        ev.push({ t: 'hp', side, hp: self.mon.hp, max }, { t: 'msg', text: `${this.name(side)} recuperou vida!` });
        return;
      }
      case 'drain': {
        if (dealt <= 0 || self.mon.hp <= 0) return;
        const max = maxHp(self.mon);
        self.mon.hp = Math.min(max, self.mon.hp + Math.max(1, Math.floor(dealt * e.fraction)));
        ev.push({ t: 'hp', side, hp: self.mon.hp, max }, { t: 'msg', text: `${this.name(side)} drenou a energia do alvo!` });
        return;
      }
      case 'shield':
        self.shield = { reduction: e.reduction, turns: e.turns };
        ev.push({ t: 'buff', side, good: true }, { t: 'msg', text: `${this.name(side)} está protegido por um escudo!` });
        return;
      case 'reflect':
        self.reflect = { fraction: e.fraction, turns: e.turns };
        ev.push({ t: 'buff', side, good: true }, { t: 'msg', text: `${this.name(side)} criou um espelho de gelo!` });
        return;
      case 'protect':
        self.protect = 2;
        ev.push({ t: 'buff', side, good: true }, { t: 'msg', text: `${this.name(side)} ergueu uma muralha de rocha!` });
        return;
      case 'evade':
        self.evade = 2;
        ev.push({ t: 'buff', side, good: true }, { t: 'msg', text: `${this.name(side)} ficou translúcido como um fantasma!` });
        return;
      case 'dot':
        if (target.mon.hp <= 0) return;
        target.dot = { fraction: e.fraction, turns: e.turns };
        ev.push({ t: 'msg', text: `${this.name(targetSide)} ficou preso no redemoinho!` });
        return;
      case 'stun':
        if (target.mon.hp > 0 && roll(e.chance)) {
          target.stunned = true;
          ev.push({ t: 'msg', text: `${this.name(targetSide)} ficou atordoado!` });
        }
        return;
    }
  }

  private endOfTurn(ev: BattleEvent[]): void {
    for (const side of ['player', 'enemy'] as Side[]) {
      const b = this.battlers[side];
      if (b.mon.hp <= 0) continue;
      const max = maxHp(b.mon);
      if (b.mon.status === 'envenenado') {
        b.mon.hp = Math.max(0, b.mon.hp - Math.max(1, Math.floor(max / 8)));
        ev.push({ t: 'hp', side, hp: b.mon.hp, max }, { t: 'msg', text: `${this.name(side)} sofre com o veneno!` });
      }
      if (b.dot && b.mon.hp > 0) {
        b.mon.hp = Math.max(0, b.mon.hp - Math.max(1, Math.floor(max * b.dot.fraction)));
        ev.push({ t: 'hp', side, hp: b.mon.hp, max }, { t: 'msg', text: `${this.name(side)} é castigado pelo redemoinho!` });
        if (--b.dot.turns <= 0) b.dot = null;
      }
      if (b.shield && --b.shield.turns <= 0) {
        b.shield = null;
        ev.push({ t: 'msg', text: `O escudo de ${this.name(side)} se desfez.` });
      }
      if (b.reflect && --b.reflect.turns <= 0) b.reflect = null;
      if (b.protect > 0) b.protect--;
      if (b.evade > 0) b.evade--;
    }
  }

  /** Retorna true se alguém desmaiou (o turno para). */
  private checkFaints(ev: BattleEvent[]): boolean {
    let fainted = false;
    const e = this.battlers.enemy.mon;
    if (e.hp <= 0) {
      fainted = true;
      ev.push({ t: 'faint', side: 'enemy' }, { t: 'msg', text: `${this.name('enemy')} desmaiou!` });
      this.awardXp(e, ev);
      const next = this.enemies.findIndex((m) => m.hp > 0);
      if (next >= 0) {
        this.eIndex = next;
        this.battlers.enemy = newBattler(this.enemies[next]);
        this.participants = new Set(this.battlers.player.mon.hp > 0 ? [this.battlers.player.mon.uid] : []);
        ev.push({ t: 'send', side: 'enemy', index: next }, { t: 'msg', text: `${this.enemyName ?? 'O inimigo'} enviou ${displayName(this.enemies[next])}!` });
      } else {
        this.finish('win', ev);
        return true;
      }
    }
    const p = this.battlers.player.mon;
    if (p.hp <= 0) {
      fainted = true;
      ev.push({ t: 'faint', side: 'player' }, { t: 'msg', text: `${displayName(p)} desmaiou!` });
      if (this.party.some((m) => m.hp > 0)) ev.push({ t: 'needSwitch' });
      else {
        ev.push({ t: 'msg', text: 'Todos os seus pets desmaiaram...' });
        this.finish('lose', ev);
      }
    }
    return fainted;
  }

  /** XP para cada pet que participou e ainda está de pé. */
  private awardXp(defeated: MonsterInstance, ev: BattleEvent[]): void {
    const amount = xpReward(defeated, this.kind);
    for (const mon of this.party) {
      if (!this.participants.has(mon.uid) || mon.hp <= 0) continue;
      this.grantXp(mon, amount, ev);
    }
  }

  /** Dá XP e gera os eventos de nível/golpes. Público para o bônus de XP (anúncio). */
  grantXp(mon: MonsterInstance, amount: number, ev: BattleEvent[]): void {
    this.xpGained.set(mon.uid, (this.xpGained.get(mon.uid) ?? 0) + amount);
    ev.push({ t: 'msg', text: `${displayName(mon)} ganhou ${amount} de XP!` }, { t: 'xp', uid: mon.uid, amount });
    const res = gainXp(mon, amount);
    for (const lv of res.levels) ev.push({ t: 'level', uid: mon.uid, level: lv }, { t: 'msg', text: `${displayName(mon)} subiu para o nível ${lv}!` });
    for (const mv of res.learned) ev.push({ t: 'msg', text: `${displayName(mon)} aprendeu ${getMove(mv).name}!` });
    if (res.supreme) ev.push({ t: 'msg', text: `${displayName(mon)} despertou o golpe SUPREMO ${getMove(res.supreme).name}!` });
    for (const mv of res.pending) ev.push({ t: 'learnChoice', uid: mon.uid, move: mv });
  }

  private finish(outcome: Outcome, ev: BattleEvent[]): void {
    this.over = true;
    this.outcome = outcome;
    ev.push({ t: 'end', outcome });
  }

  // ------------------------------------------------------------------ IA
  chooseEnemyMove(): string {
    const b = this.battlers.enemy;
    const foe = this.battlers.player;
    const moves = b.mon.moves.length ? this.usableMoves('enemy') : movesForLevel(b.mon.species, b.mon.level);
    if (!moves.length) return 'investida';
    const max = maxHp(b.mon);
    const pool = moves.filter((id) => !getMove(id).supreme || b.mon.hp < max * 0.5);
    const score = (id: string): number => {
      const mv = getMove(id);
      if (mv.power > 0) {
        return mv.power * effectiveness(mv.type, getSpecies(foe.mon.species).types) * (getSpecies(b.mon.species).types.includes(mv.type) ? 1.5 : 1);
      }
      const e = mv.effects?.[0];
      if (!e) return 0;
      switch (e.kind) {
        case 'heal': return b.mon.hp < max * 0.4 ? 150 : 0;
        case 'status': return foe.mon.status ? 0 : 60;
        case 'stat': return e.target === 'self' ? (b.stages[e.stat] >= 2 ? 0 : 40) : foe.stages[e.stat] <= -2 ? 0 : 40;
        case 'shield': return b.shield ? 0 : 40;
        case 'reflect': return b.reflect ? 0 : 40;
        case 'protect': return b.protect ? 0 : 35;
        case 'evade': return b.evade ? 0 : 35;
        default: return 30;
      }
    };
    const useful = pool.filter((id) => score(id) > 0);
    const candidates = useful.length ? useful : pool;
    if (this.rng() < 0.3) return candidates[Math.floor(this.rng() * candidates.length)];
    return candidates.reduce((best, id) => (score(id) > score(best) ? id : best), candidates[0]);
  }
}
