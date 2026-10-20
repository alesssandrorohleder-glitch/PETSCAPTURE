import { describe, expect, it } from 'vitest';
import { BattleEngine, captureChance, PARTY_MAX } from '../src/systems/BattleEngine';
import { createMonster, maxHp } from '../src/systems/Monster';

const fixed = (v: number) => () => v;

describe('captura', () => {
  it('chance maior com menos vida', () => {
    const m = createMonster('verdakor', 5);
    const full = captureChance(m);
    m.hp = 1;
    const low = captureChance(m);
    expect(low).toBeGreaterThan(full * 2);
  });

  it('status aumenta a chance', () => {
    const m = createMonster('nevasco', 20);
    const base = captureChance(m);
    m.status = 'adormecido';
    expect(captureChance(m)).toBeCloseTo(Math.min(1, base * 2));
  });

  it('captura com sucesso vai para a equipe e encerra a batalha', () => {
    const party = [createMonster('ignis', 5)];
    const wild = createMonster('larvilo', 3);
    wild.hp = 1;
    const b = new BattleEngine({ party, enemies: [wild], kind: 'wild', rng: fixed(0.01) });
    const ev = b.turn({ kind: 'item', item: 'capsula', target: 0 });
    expect(b.outcome).toBe('capture');
    expect(party).toContain(wild);
    expect(ev.some((e) => e.t === 'capture' && e.success && e.shakes === 3)).toBe(true);
    expect(ev.some((e) => e.t === 'move' && e.side === 'enemy')).toBe(false);
  });

  it('falha: monstro escapa e ataca', () => {
    const party = [createMonster('ignis', 5)];
    const wild = createMonster('nevasco', 30);
    const b = new BattleEngine({ party, enemies: [wild], kind: 'wild', rng: fixed(0.99) });
    const ev = b.turn({ kind: 'item', item: 'capsula', target: 0 });
    expect(b.over).toBe(false);
    expect(ev.some((e) => e.t === 'capture' && !e.success)).toBe(true);
    expect(party).toHaveLength(1);
  });

  it('equipe cheia manda para a Caixa', () => {
    const party = Array.from({ length: PARTY_MAX }, () => createMonster('larvilo', 5));
    const box: ReturnType<typeof createMonster>[] = [];
    const wild = createMonster('brotinho', 2);
    wild.hp = 1;
    const b = new BattleEngine({ party, enemies: [wild], kind: 'wild', rng: fixed(0.01), box });
    b.turn({ kind: 'item', item: 'capsula', target: 0 });
    expect(box).toContain(wild);
    expect(party).toHaveLength(PARTY_MAX);
    expect(b.captured?.dest).toBe('box');
  });

  it('não captura monstro de treinador', () => {
    const wild = createMonster('umbrel', 5);
    const b = new BattleEngine({ party: [createMonster('ignis', 5)], enemies: [wild], kind: 'trainer', rng: fixed(0.01) });
    b.turn({ kind: 'item', item: 'capsula', target: 0 });
    expect(b.outcome).not.toBe('capture');
  });

  it('taxa de captura bate com a chance calculada', () => {
    const tmpl = createMonster('conchilo', 7);
    tmpl.hp = Math.floor(maxHp(tmpl) / 2);
    const expected = captureChance(tmpl);
    let ok = 0;
    for (let i = 0; i < 4000; i++) {
      const w = createMonster('conchilo', 7);
      w.hp = tmpl.hp;
      const b = new BattleEngine({ party: [createMonster('voltix', 9)], enemies: [w], kind: 'wild' });
      b.turn({ kind: 'item', item: 'capsula', target: 0 });
      if (b.outcome === 'capture') ok++;
    }
    expect(ok / 4000).toBeGreaterThan(expected - 0.04);
    expect(ok / 4000).toBeLessThan(expected + 0.04);
  });
});
