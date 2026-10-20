import { describe, expect, it } from 'vitest';
import { getMove } from '../src/data/moves';
import { getSpecies } from '../src/data/monsters';
import { MAPS } from '../src/data/maps';
import { TRAINERS } from '../src/data/trainers';
import { effectiveness } from '../src/data/typeChart';
import { BattleEngine } from '../src/systems/BattleEngine';
import { createMonster, movesForLevel } from '../src/systems/Monster';

/** Jogador "razoável": escolhe o golpe de maior dano esperado. */
function bestMove(b: BattleEngine): string {
  const me = b.active('player').mon;
  const foe = b.active('enemy').mon;
  const score = (id: string) => {
    const mv = getMove(id);
    if (mv.supreme) return -1;
    const stab = getSpecies(me.species).types.includes(mv.type) ? 1.5 : 1;
    return mv.power * stab * effectiveness(mv.type, getSpecies(foe.species).types) * (mv.accuracy / 100);
  };
  return b.usableMoves('player').reduce((a, c) => (score(c) > score(a) ? c : a));
}

/** Membro da equipe com melhor golpe contra o alvo (o jogador escolheria esse para começar). */
function bestLead(party: ReturnType<typeof createMonster>[], foe: ReturnType<typeof createMonster>): number {
  const val = (m: ReturnType<typeof createMonster>) =>
    Math.max(...movesForLevel(m.species, m.level).map((id) => {
      const mv = getMove(id);
      return mv.power * effectiveness(mv.type, getSpecies(foe.species).types) * (getSpecies(m.species).types.includes(mv.type) ? 1.5 : 1);
    })) / effectiveness(getSpecies(foe.species).types[0], getSpecies(m.species).types);
  return party.reduce((best, m, i) => (val(m) > val(party[best]) ? i : best), 0);
}

/** Taxa de vitória de uma equipe (lista de [espécie, nível]) contra os selvagens do mapa. */
function teamWinRate(team: [string, number][], mapId: string, n = 300): number {
  const table = MAPS[mapId].encounters!;
  const total = table.reduce((s, e) => s + e.weight, 0);
  let wins = 0;
  for (let i = 0; i < n; i++) {
    let r = Math.random() * total;
    const e = table.find((x) => (r -= x.weight) < 0) ?? table[0];
    const wild = createMonster(e.species, e.min + Math.floor(Math.random() * (e.max - e.min + 1)));
    const party = team.map(([sp, lv]) => createMonster(sp, lv));
    const lead = bestLead(party, wild);
    [party[0], party[lead]] = [party[lead], party[0]];
    const b = new BattleEngine({ party, enemies: [wild], kind: 'wild' });
    for (let t = 0; t < 60 && !b.over; t++) {
      const ev = b.turn({ kind: 'move', move: bestMove(b) });
      if (ev.some((x) => x.t === 'needSwitch')) {
        const next = party.findIndex((m) => m.hp > 0);
        b.sendReplacement(next);
      }
    }
    if (b.outcome === 'win') wins++;
  }
  return wins / n;
}

function winRate(starter: string, level: number, mapId: string, n = 400): number {
  const table = MAPS[mapId].encounters!;
  const total = table.reduce((s, e) => s + e.weight, 0);
  let wins = 0;
  for (let i = 0; i < n; i++) {
    let r = Math.random() * total;
    const e = table.find((x) => (r -= x.weight) < 0) ?? table[0];
    const wild = createMonster(e.species, e.min + Math.floor(Math.random() * (e.max - e.min + 1)));
    const b = new BattleEngine({ party: [createMonster(starter, level)], enemies: [wild], kind: 'wild' });
    for (let t = 0; t < 50 && !b.over; t++) b.turn({ kind: 'move', move: bestMove(b) });
    if (b.outcome === 'win') wins++;
  }
  return wins / n;
}

describe('equilíbrio da Floresta (pet inicial Nv5, vida cheia)', () => {
  for (const t of TRAINERS.filter((x) => x.selectable)) {
    it(`${t.starter} vence a maioria dos encontros`, () => {
      const rate = winRate(t.starter, 5, 'floresta');
      console.log(`  ${t.starter}: ${(rate * 100).toFixed(0)}% de vitórias`);
      expect(rate).toBeGreaterThan(0.7);
    });
  }
});


/** Rota: bioma, nível esperado do pet inicial e monstros capturados antes (1 por bioma anterior). */
const ROUTE: [string, number, string[]][] = [
  ['praia', 9, ['verdakor']],
  ['planalto', 12, ['verdakor', 'conchilo']],
  ['canion', 16, ['verdakor', 'conchilo', 'zumbolt']],
  ['picos', 20, ['verdakor', 'conchilo', 'zumbolt', 'pedrusco']],
  ['ruinas', 26, ['verdakor', 'conchilo', 'zumbolt', 'pedrusco', 'nevasco']],
];

describe('equilíbrio dos biomas (equipe realista)', () => {
  for (const [map, level, caught] of ROUTE) {
    it(`${map}: cada pet inicial + capturados vence a maioria (Nv ${level})`, () => {
      const out = TRAINERS.filter((x) => x.selectable).map((t) => {
        const starter = level >= 10 ? `${t.starter}_evo` : t.starter;
        const solo = teamWinRate([[starter, level]], map);
        const team = teamWinRate([[starter, level], ...caught.map((c) => [c, level - 2] as [string, number])], map);
        return { name: t.starter, solo, team };
      });
      console.log(`  ${map}: ` + out.map((o) => `${o.name} ${(o.solo * 100).toFixed(0)}%→${(o.team * 100).toFixed(0)}%`).join(', '));
      for (const o of out) expect(o.team, o.name).toBeGreaterThan(0.75);
    });
  }
});
