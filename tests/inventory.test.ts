import { beforeEach, describe, expect, it } from 'vitest';
import { GameState } from '../src/systems/GameState';
import { buy, useItemOutside } from '../src/systems/Inventory';
import { createMonster, maxHp } from '../src/systems/Monster';

beforeEach(() => {
  GameState.newGame('kael');
});

describe('loja', () => {
  it('compra desconta moedas e adiciona itens', () => {
    const st = GameState.get();
    st.money = 1000;
    const r = buy('capsula', 3);
    expect(r.ok).toBe(true);
    expect(st.money).toBe(400);
    expect(st.inventory.capsula).toBe(8);
  });
  it('sem moedas suficientes não compra', () => {
    const st = GameState.get();
    st.money = 100;
    expect(buy('capsula', 1).ok).toBe(false);
    expect(st.money).toBe(100);
  });
});

describe('itens fora da batalha', () => {
  it('poção cura e é consumida', () => {
    const st = GameState.get();
    const pet = st.party[0];
    pet.hp = 2;
    const n = st.inventory.pocao;
    expect(useItemOutside('pocao', pet).ok).toBe(true);
    expect(pet.hp).toBeGreaterThan(2);
    expect(pet.hp).toBeLessThanOrEqual(maxHp(pet));
    expect(st.inventory.pocao).toBe(n - 1);
  });
  it('poção não funciona com vida cheia nem desmaiado', () => {
    const pet = GameState.get().party[0];
    expect(useItemOutside('pocao', pet).ok).toBe(false);
    pet.hp = 0;
    expect(useItemOutside('pocao', pet).msg).toContain('Centro de Cura');
  });
  it('antídoto cura veneno', () => {
    const st = GameState.get();
    st.inventory.antidoto = 1;
    const pet = st.party[0];
    pet.status = 'envenenado';
    expect(useItemOutside('antidoto', pet).ok).toBe(true);
    expect(pet.status).toBeNull();
  });
});

describe('equipe e Caixa', () => {
  it('mover para o primeiro lugar', () => {
    const st = GameState.get();
    const b = createMonster('larvilo', 3);
    st.party.push(b);
    GameState.moveToFront(1);
    expect(st.party[0]).toBe(b);
  });
  it('não guarda o último pet de pé', () => {
    expect(GameState.deposit(0)).toBe(false);
  });
  it('guardar, retirar e trocar', () => {
    const st = GameState.get();
    const b = createMonster('larvilo', 3);
    const c = createMonster('brotinho', 3);
    st.party.push(b);
    expect(GameState.deposit(1)).toBe(true);
    expect(st.box).toEqual([b]);
    expect(GameState.withdraw(0)).toBe(true);
    expect(st.party).toContain(b);
    st.box.push(c);
    expect(GameState.swap(1, 0)).toBe(true);
    expect(st.party[1]).toBe(c);
    expect(st.box[0]).toBe(b);
  });
});
