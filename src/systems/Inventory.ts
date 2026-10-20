import { getItem } from '../data/items';
import { GameState } from './GameState';
import { displayName, maxHp, type MonsterInstance } from './Monster';

export interface Result {
  ok: boolean;
  msg: string;
}

export const itemCount = (id: string): number => GameState.get().inventory[id] ?? 0;

/** O item pode ser usado neste pet fora de batalha? */
export function canUseOn(itemId: string, mon: MonsterInstance): boolean {
  const it = getItem(itemId);
  if (it.kind === 'heal') return mon.hp > 0 && mon.hp < maxHp(mon);
  if (it.kind === 'cure') return mon.status === it.cures;
  return false;
}

/** Usa um item fora de batalha (Poção, Antídoto). */
export function useItemOutside(itemId: string, mon: MonsterInstance): Result {
  const it = getItem(itemId);
  if (itemCount(itemId) <= 0) return { ok: false, msg: `Você não tem ${it.name}.` };
  if (it.kind === 'capture') return { ok: false, msg: 'Cápsulas só podem ser usadas em batalhas contra monstros selvagens.' };
  if (!canUseOn(itemId, mon)) {
    if (it.kind === 'heal' && mon.hp <= 0) return { ok: false, msg: `${displayName(mon)} desmaiou. Leve-o ao Centro de Cura.` };
    return { ok: false, msg: 'Não teria efeito.' };
  }
  GameState.get().inventory[itemId]--;
  if (it.kind === 'heal') {
    const before = mon.hp;
    mon.hp = Math.min(maxHp(mon), mon.hp + (it.amount ?? 0));
    return { ok: true, msg: `${displayName(mon)} recuperou ${mon.hp - before} de vida.` };
  }
  mon.status = null;
  return { ok: true, msg: `${displayName(mon)} está curado!` };
}

/** Compra na loja. */
export function buy(itemId: string, qty: number): Result {
  const it = getItem(itemId);
  const st = GameState.get();
  const total = it.price * qty;
  if (qty <= 0) return { ok: false, msg: 'Quantidade inválida.' };
  if (st.money < total) return { ok: false, msg: `Moedas insuficientes: custa ${total} e você tem ${st.money}.` };
  st.money -= total;
  st.inventory[itemId] = (st.inventory[itemId] ?? 0) + qty;
  return { ok: true, msg: `Você comprou ${qty}x ${it.name} por ${total} moedas.` };
}
