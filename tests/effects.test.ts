import { describe, expect, it } from 'vitest';
import { BattleEngine, xpReward } from '../src/systems/BattleEngine';
import { createMonster, evolutionTarget, evolve, gainXp, maxHp, statsOf, xpForLevel } from '../src/systems/Monster';
import { getSpecies } from '../src/data/monsters';

const fixed = (v: number) => () => v;
/** Batalha com o jogador sempre agindo primeiro (inimigo bem lento). */
const setup = (player: string, plv: number, enemy: string, elv: number, rng = fixed(0.5)) => {
  const p = createMonster(player, plv);
  const e = createMonster(enemy, elv);
  const b = new BattleEngine({ party: [p], enemies: [e], kind: 'wild', rng });
  return { p, e, b };
};
const texts = (ev: { t: string; text?: string }[]) => ev.filter((x) => x.t === 'msg').map((x) => x.text!).join(' | ');

describe('status', () => {
  it('Paralisia paralisa e reduz a velocidade pela metade', () => {
    const { b, e } = setup('voltix', 7, 'terragon', 5);
    const spdBefore = b.speed('enemy');
    b.turn({ kind: 'move', move: 'paralisia' });
    expect(e.status).toBe('paralisado');
    expect(b.speed('enemy')).toBeCloseTo(spdBefore / 2);
  });

  it('paralisado pode perder o turno (25%)', () => {
    const { b, e } = setup('voltix', 7, 'terragon', 5, fixed(0.1));
    e.status = 'paralisado';
    const ev = b.turn({ kind: 'move', move: 'campo_magnetico' });
    expect(texts(ev)).toContain('paralisado! Não consegue se mover');
  });

  it('Esporos do Sono: dorme 1-2 turnos e acorda', () => {
    const { b, p } = setup('verdakor', 12, 'ignis', 3);
    b.turn({ kind: 'move', move: 'esporos_sono' });
    expect(b.active('enemy').mon.status).toBe('adormecido');
    const all: string[] = [];
    for (let i = 0; i < 4 && !b.over; i++) all.push(texts(b.turn({ kind: 'move', move: 'folha_navalha' })));
    const joined = all.join(' ');
    expect(joined).toContain('dormindo');
    expect(p.hp).toBeGreaterThan(0);
  });

  it('Nevasca pode congelar por 1 turno; Gelo é imune', () => {
    // 0.07: congela (30%) mas não dá crítico (1/16)
    const { b, e } = setup('frostelle', 7, 'larvilo', 8, fixed(0.07));
    // o alvo mais lento perde a ação já neste turno e descongela no seguinte
    const ev = b.turn({ kind: 'move', move: 'nevasca' });
    expect(texts(ev)).toContain('congelado e não se move');
    expect(e.status).toBe('congelado');
    const ev2 = b.turn({ kind: 'move', move: 'espelho_congelado' });
    expect(texts(ev2)).toContain('descongelou');
    expect(e.status).toBeNull();

    const g = setup('frostelle', 7, 'frostelle', 3, fixed(0.07));
    g.b.turn({ kind: 'move', move: 'nevasca' });
    expect(g.e.status).toBeNull();
  });

  it('veneno tira 1/8 da vida no fim do turno', () => {
    const { b, e } = setup('verdakor', 9, 'terragon', 20, fixed(0.99));
    e.status = 'envenenado';
    const before = e.hp;
    b.turn({ kind: 'move', move: 'enxame' }); // 0.99 de rng -> erra (acc 90)
    expect(e.hp).toBe(before - Math.floor(maxHp(e) / 8));
  });
});

describe('efeitos de golpes', () => {
  it('Escudo de Chamas reduz o dano recebido', () => {
    const a = setup('ignis', 10, 'aquaris', 10);
    a.b.turn({ kind: 'move', move: 'escudo_chamas' });
    const hpShield = a.p.hp;
    const b2 = setup('ignis', 10, 'aquaris', 10);
    b2.b.turn({ kind: 'move', move: 'faisca' });
    // sem escudo perde mais vida no mesmo cenário
    expect(maxHp(a.p) - hpShield).toBeLessThan(maxHp(b2.p) - b2.p.hp);
  });

  it('Muralha de Rocha bloqueia o próximo golpe', () => {
    const { b, p } = setup('terragon', 7, 'ignis', 2); // inimigo mais lento
    const ev = b.turn({ kind: 'move', move: 'muralha_rocha' });
    expect(texts(ev)).toContain('bloqueou');
    expect(p.hp).toBe(maxHp(p));
  });

  it('Passo Fantasma esquiva do próximo golpe', () => {
    const { b, p } = setup('umbrel', 7, 'terragon', 7);
    const ev = b.turn({ kind: 'move', move: 'passo_fantasma' });
    expect(texts(ev)).toContain('esquivou');
    expect(p.hp).toBe(maxHp(p));
  });

  it('Cura da Maré recupera metade da vida', () => {
    const { b, p } = setup('aquaris', 7, 'larvilo', 2);
    p.hp = 1;
    b.turn({ kind: 'move', move: 'cura_mare' });
    expect(p.hp).toBeGreaterThanOrEqual(1 + Math.floor(maxHp(p) / 2) - 5);
  });

  it('Drenar Energia rouba vida', () => {
    const { b, p } = setup('umbrel', 7, 'terragon', 9);
    p.hp = 5;
    const ev = b.turn({ kind: 'move', move: 'drenar_energia' });
    expect(texts(ev)).toContain('drenou');
  });

  it('Campo Magnético aumenta a defesa (+2)', () => {
    const { b } = setup('voltix', 5, 'larvilo', 2);
    b.turn({ kind: 'move', move: 'campo_magnetico' });
    expect(b.active('player').stages.def).toBe(2);
  });

  it('Bolha Prisão reduz a velocidade do inimigo', () => {
    const { b } = setup('aquaris', 5, 'terragon', 5);
    b.turn({ kind: 'move', move: 'bolha_prisao' });
    expect(b.active('enemy').stages.spd).toBe(-1);
  });

  it('Ilusão faz o inimigo errar mais', () => {
    const { b } = setup('umbrel', 5, 'terragon', 5);
    b.turn({ kind: 'move', move: 'ilusao' });
    expect(b.active('enemy').stages.acc).toBe(-2);
  });

  it('Redemoinho causa dano extra por 2 turnos', () => {
    const { b } = setup('aquaris', 10, 'terragon', 10);
    const ev = b.turn({ kind: 'move', move: 'redemoinho' });
    expect(texts(ev)).toContain('redemoinho');
    expect(b.active('enemy').dot?.turns).toBe(1);
  });

  it('Tremor pode atordoar', () => {
    const { b } = setup('terragon', 7, 'larvilo', 5, fixed(0.1));
    const ev = b.turn({ kind: 'move', move: 'tremor' });
    expect(texts(ev)).toContain('atordoado');
  });

  it('Espelho Congelado reflete dano', () => {
    const { b } = setup('frostelle', 7, 'ignis', 2);
    const ev = b.turn({ kind: 'move', move: 'espelho_congelado' });
    expect(texts(ev)).toContain('refletiu');
  });
});

describe('XP, nível e evolução', () => {
  it('curva de XP', () => {
    expect(xpForLevel(5)).toBe(125);
    expect(createMonster('ignis', 5).xp).toBe(125);
  });

  it('vencer dá XP; subir de nível aumenta vida', () => {
    const { b, p } = setup('ignis', 5, 'verdakor', 4);
    const xp0 = p.xp;
    for (let i = 0; i < 10 && !b.over; i++) b.turn({ kind: 'move', move: 'faisca' });
    expect(b.outcome).toBe('win');
    expect(p.xp).toBe(xp0 + xpReward(createMonster('verdakor', 4), 'wild'));
  });

  it('aprende golpe ao subir; com 4 golpes pede escolha', () => {
    const m = createMonster('ignis', 6);
    expect(m.moves).toHaveLength(3);
    const r = gainXp(m, xpForLevel(7) - m.xp);
    expect(r.levels).toEqual([7]);
    expect(r.learned).toEqual(['escudo_chamas']);
    const r2 = gainXp(m, xpForLevel(10) - m.xp);
    expect(r2.pending).toEqual(['rajada_solar']);
    const r3 = gainXp(m, xpForLevel(15) - m.xp);
    expect(r3.supreme).toBe('fenix_ancestral');
  });

  it('evolui no nível 10 mantendo golpes', () => {
    const m = createMonster('ignis', 9);
    expect(evolutionTarget(m)).toBeNull();
    gainXp(m, xpForLevel(10) - m.xp);
    expect(evolutionTarget(m)).toBe('ignis_evo');
    const hpBefore = statsOf(m).hp;
    evolve(m);
    expect(m.species).toBe('ignis_evo');
    expect(statsOf(m).hp).toBeGreaterThan(hpBefore);
    expect(getSpecies(m.species).name).toBe('Ignis Evoluído');
  });

  it('XP de treinador vale 1.5x', () => {
    const e = createMonster('umbrel', 10);
    expect(xpReward(e, 'trainer')).toBe(Math.floor(xpReward(e, 'wild') * 1.5));
  });
});
