import { describe, expect, it } from 'vitest';
import { effectiveness } from '../src/data/typeChart';
import { MOVES, getMove } from '../src/data/moves';
import { SPECIES } from '../src/data/monsters';
import { BattleEngine, calcDamage } from '../src/systems/BattleEngine';
import { createMonster, maxHp, movesForLevel, supremeMove } from '../src/systems/Monster';

/** rng determinístico */
const seq = (...vals: number[]) => {
  let i = 0;
  return () => vals[i++ % vals.length];
};

describe('tabela de tipos', () => {
  it('casos da tabela do projeto', () => {
    expect(effectiveness('fogo', ['grama'])).toBe(2);
    expect(effectiveness('fogo', ['agua'])).toBe(0.5);
    expect(effectiveness('agua', ['fogo'])).toBe(2);
    expect(effectiveness('eletrico', ['terra'])).toBe(0.5);
    expect(effectiveness('terra', ['eletrico'])).toBe(2);
    expect(effectiveness('sombra', ['sombra'])).toBe(2);
    expect(effectiveness('inseto', ['sombra'])).toBe(2);
    expect(effectiveness('sombra', ['inseto'])).toBe(0.5);
    expect(effectiveness('gelo', ['fogo'])).toBe(0.5);
    expect(effectiveness('eletrico', ['gelo'])).toBe(1);
  });
  it('dois tipos multiplicam', () => {
    expect(effectiveness('fogo', ['grama', 'inseto'])).toBe(4);
    expect(effectiveness('agua', ['grama', 'inseto'])).toBe(0.5);
  });
});

describe('dados de golpes', () => {
  it('todo golpe do learnset existe', () => {
    for (const sp of Object.values(SPECIES)) for (const l of sp.learnset) expect(MOVES[l.move], `${sp.id}: ${l.move}`).toBeDefined();
  });
  it('Ignis Nv5 conhece Faísca, Cauda Brasa e Garra Ígnea; supremo só no 15', () => {
    expect(movesForLevel('ignis', 5)).toEqual(['faisca', 'cauda_brasa', 'garra_ignea']);
    expect(supremeMove('ignis', 14)).toBeNull();
    expect(supremeMove('ignis', 15)).toBe('fenix_ancestral');
  });
  it('máximo de 4 golpes normais', () => {
    expect(movesForLevel('ignis', 30)).toHaveLength(4);
  });
});

describe('dano', () => {
  const ignis = createMonster('ignis', 5);
  const verdakor = createMonster('verdakor', 5);
  it('fogo em Verdakor (grama/inseto) é 4x', () => {
    const r = calcDamage(ignis, verdakor, getMove('faisca'), seq(0.99, 1));
    expect(r.eff).toBe(4);
    expect(r.crit).toBe(false);
    expect(r.damage).toBeGreaterThan(10);
  });
  it('crítico aumenta o dano', () => {
    const normal = calcDamage(ignis, verdakor, getMove('faisca'), seq(0.99, 0.5)).damage;
    const crit = calcDamage(ignis, verdakor, getMove('faisca'), seq(0.0, 0.5)).damage;
    expect(crit).toBeGreaterThan(normal);
  });
  it('dano mínimo é 1', () => {
    const tiny = createMonster('ignis', 1);
    const big = createMonster('terragon_evo', 50);
    expect(calcDamage(tiny, big, getMove('faisca'), seq(0.99, 0)).damage).toBeGreaterThanOrEqual(1);
  });
});

describe('BattleEngine', () => {
  it('Ignis vence Verdakor com Faísca', () => {
    const ignis = createMonster('ignis', 5);
    const wild = createMonster('verdakor', 3);
    const b = new BattleEngine({ party: [ignis], enemies: [wild], kind: 'wild', rng: seq(0.5) });
    let guard = 0;
    while (!b.over && guard++ < 20) b.turn({ kind: 'move', move: 'faisca' });
    expect(b.outcome).toBe('win');
    expect(wild.hp).toBe(0);
  });

  it('mais rápido ataca primeiro; prioridade passa na frente', () => {
    const slow = createMonster('terragon', 5);
    const fast = createMonster('voltix', 5);
    const b = new BattleEngine({ party: [slow], enemies: [fast], kind: 'wild', rng: seq(0.5) });
    const ev = b.turn({ kind: 'move', move: 'arremesso_pedra' });
    const first = ev.find((e) => e.t === 'move');
    expect(first && first.t === 'move' && first.side).toBe('enemy');

    const p = createMonster('voltix', 5);
    const e = createMonster('voltix', 30);
    const b2 = new BattleEngine({ party: [p], enemies: [e], kind: 'wild', rng: seq(0.5) });
    const ev2 = b2.turn({ kind: 'move', move: 'investida_relampago' });
    const f2 = ev2.find((x) => x.t === 'move');
    expect(f2 && f2.t === 'move' && f2.side).toBe('player');
  });

  it('não foge de treinador', () => {
    const b = new BattleEngine({ party: [createMonster('ignis', 5)], enemies: [createMonster('umbrel', 5)], kind: 'trainer', rng: seq(0) });
    const ev = b.turn({ kind: 'run' });
    expect(b.over).toBe(false);
    expect(ev.some((e) => e.t === 'msg' && e.text.includes('Não dá para fugir'))).toBe(true);
  });

  it('foge de selvagem quando é mais rápido', () => {
    const b = new BattleEngine({ party: [createMonster('voltix', 10)], enemies: [createMonster('verdakor', 2)], kind: 'wild', rng: seq(0.9) });
    b.turn({ kind: 'run' });
    expect(b.outcome).toBe('run');
  });

  it('derrota quando todos desmaiam; troca obrigatória se houver outro', () => {
    const a = createMonster('ignis', 2);
    const c = createMonster('aquaris', 2);
    const boss = createMonster('umbrel_evo', 40);
    const b = new BattleEngine({ party: [a, c], enemies: [boss], kind: 'trainer', rng: seq(0.5) });
    const ev = b.turn({ kind: 'move', move: 'faisca' });
    expect(ev.some((e) => e.t === 'needSwitch')).toBe(true);
    b.sendReplacement(1);
    expect(b.active('player').mon).toBe(c);
    b.turn({ kind: 'move', move: 'jato_dagua' });
    expect(b.outcome).toBe('lose');
  });

  it('supremo só pode ser usado 1 vez', () => {
    const p = createMonster('ignis', 15);
    const e = createMonster('terragon', 15); // mais lento que Ignis Nv15
    const b = new BattleEngine({ party: [p], enemies: [e], kind: 'wild', rng: seq(0.5) });
    expect(b.usableMoves('player')).toContain('fenix_ancestral');
    b.turn({ kind: 'move', move: 'fenix_ancestral' });
    expect(b.usableMoves('player')).not.toContain('fenix_ancestral');
  });

  it('poção cura sem passar do máximo', () => {
    const p = createMonster('ignis', 5);
    p.hp = 1;
    const b = new BattleEngine({ party: [p], enemies: [createMonster('verdakor', 1)], kind: 'wild', rng: seq(0.99) });
    b.turn({ kind: 'item', item: 'pocao', target: 0 });
    expect(p.hp).toBeLessThanOrEqual(maxHp(p));
    expect(p.hp).toBeGreaterThan(1);
  });
});
