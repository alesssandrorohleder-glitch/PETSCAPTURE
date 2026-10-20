import { beforeEach, describe, expect, it } from 'vitest';
import { GameState } from '../src/systems/GameState';
import { sanitize, SAVE_KEY, SaveManager } from '../src/systems/SaveManager';
import { createMonster } from '../src/systems/Monster';

/** localStorage de mentira (o Vitest roda em Node, sem navegador). */
class MemoryStorage {
  data = new Map<string, string>();
  blocked = false;
  getItem(k: string) {
    if (this.blocked) throw new Error('bloqueado');
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    if (this.blocked) throw new Error('bloqueado');
    this.data.set(k, v);
  }
  removeItem(k: string) {
    this.data.delete(k);
  }
}
const mem = new MemoryStorage();
(globalThis as unknown as { window: unknown }).window = { localStorage: mem };

beforeEach(() => {
  mem.data.clear();
  mem.blocked = false;
});

describe('save', () => {
  it('salva e carrega o progresso', () => {
    const st = GameState.newGame('yuki');
    st.money = 777;
    st.flags.noctis1 = true;
    st.party.push(createMonster('larvilo', 7));
    st.box.push(createMonster('brotinho', 3));
    Object.assign(st, { mapId: 'praia', x: 5, y: 6 });
    expect(SaveManager.save()).toBe(true);

    GameState.newGame('kael'); // "fecha o site" e começa outro
    expect(SaveManager.load()).toBe(true);
    const back = GameState.get();
    expect(back.trainerId).toBe('yuki');
    expect(back.money).toBe(777);
    expect(back.flags.noctis1).toBe(true);
    expect(back.party.map((m) => m.species)).toEqual(['frostelle', 'larvilo']);
    expect(back.box).toHaveLength(1);
    expect(back.mapId).toBe('praia');
    expect(SaveManager.summary()?.partyLevels).toEqual([5, 7]);
  });

  it('sem save: Continuar não aparece', () => {
    expect(SaveManager.has()).toBe(false);
    expect(SaveManager.load()).toBe(false);
  });

  it('armazenamento bloqueado não quebra o jogo', () => {
    GameState.newGame('kael');
    mem.blocked = true;
    expect(SaveManager.save()).toBe(false);
    expect(SaveManager.load()).toBe(false);
    expect(SaveManager.has()).toBe(false);
  });

  it('save corrompido é ignorado', () => {
    mem.data.set(SAVE_KEY, '{isso não é json');
    expect(SaveManager.load()).toBe(false);
    mem.data.set(SAVE_KEY, JSON.stringify({ version: 1, state: { trainerId: 'ninguem' } }));
    expect(SaveManager.load()).toBe(false);
  });

  it('corrige dados inválidos', () => {
    const st = GameState.newGame('bruno');
    const raw = JSON.parse(JSON.stringify(st));
    raw.mapId = 'mapa_que_nao_existe';
    raw.party.push({ species: 'naoexiste', level: 3 });
    raw.party[0].moves.push('golpe_falso');
    raw.party[0].hp = 99999;
    raw.inventory.item_falso = 4;
    const s = sanitize(raw)!;
    expect(s.mapId).toBe('vila');
    expect(s.party).toHaveLength(1);
    expect(s.party[0].moves).not.toContain('golpe_falso');
    expect(s.party[0].hp).toBeLessThan(99999);
    expect(s.inventory.item_falso).toBeUndefined();
  });

  it('se a equipe inteira está desmaiada, volta curada ao Centro de Cura', () => {
    const st = GameState.newGame('marina');
    st.party[0].hp = 0;
    Object.assign(st, { mapId: 'praia', x: 3, y: 3 });
    const s = sanitize(JSON.parse(JSON.stringify(st)))!;
    expect(s.party[0].hp).toBeGreaterThan(0);
    expect(s.mapId).toBe('vila');
  });
});
