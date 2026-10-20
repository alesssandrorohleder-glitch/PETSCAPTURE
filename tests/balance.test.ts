import { describe, expect, it } from 'vitest';
import { getMove } from '../src/data/moves';
import { getSpecies } from '../src/data/monsters';
import { MAPS } from '../src/data/maps';
import { TRAINERS } from '../src/data/trainers';
import { effectiveness } from '../src/data/typeChart';
import { BattleEngine } from '../src/systems/BattleEngine';
import { createMonster } from '../src/systems/Monster';

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
