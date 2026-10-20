import { describe, expect, it } from 'vitest';
import { MAPS, TILES, START_POSITION, type MapDef } from '../src/data/maps';
import { MOVES } from '../src/data/moves';
import { movesForLevel } from '../src/systems/Monster';
import { rollEncounter } from '../src/systems/Encounters';
import { TRAINERS } from '../src/data/trainers';
import { SPECIES } from '../src/data/monsters';

describe('mapas', () => {
  for (const map of Object.values(MAPS)) {
    describe(map.id, () => {
      const w = map.grid[0].length;
      const solidAt = (x: number, y: number) => {
        const ch = map.grid[y]?.[x];
        if (ch === undefined || TILES[ch].solid) return true;
        return map.buildings.some((b) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h);
      };
      it('todas as linhas têm o mesmo tamanho', () => {
        map.grid.forEach((row, i) => expect(row.length, `linha ${i}`).toBe(w));
      });
      it('só usa tiles conhecidos', () => {
        for (const row of map.grid) for (const ch of row) expect(TILES[ch], `tile "${ch}"`).toBeDefined();
      });
      it('warps levam a tiles livres de mapas existentes', () => {
        for (const wp of map.warps) {
          const dest = MAPS[wp.to];
          expect(dest, wp.to).toBeDefined();
          const ch = dest.grid[wp.ty][wp.tx];
          expect(TILES[ch].solid).toBe(false);
        }
      });
      it('NPCs e placas ficam em tiles livres', () => {
        for (const n of [...map.npcs, ...map.signs]) expect(solidAt(n.x, n.y), `${n.x},${n.y}`).toBe(false);
      });
      it('todas as saídas, NPCs, placas e portas são alcançáveis a partir de uma saída', () => {
        const start = map.warps[0];
        const seen = reach(map, start.x, start.y);
        for (const w of map.warps) expect(seen.has(`${w.x},${w.y}`), `saída ${w.x},${w.y}`).toBe(true);
        const near = (x: number, y: number) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen.has(`${x + dx},${y + dy}`));
        for (const n of [...map.npcs, ...map.signs]) expect(near(n.x, n.y), `objeto ${n.x},${n.y}`).toBe(true);
        for (const b of map.buildings) expect(seen.has(`${b.x + Math.floor(b.w / 2)},${b.y + b.h}`), 'porta').toBe(true);
      });
      it('encontros usam espécies existentes e que sabem golpes no nível mínimo', () => {
        for (const e of [...(map.encounters ?? []), ...(map.rare ?? [])]) {
          expect(SPECIES[e.species], e.species).toBeDefined();
          expect(movesForLevel(e.species, e.min).length, `${e.species} Nv${e.min}`).toBeGreaterThan(0);
        }
      });
      it('porta de cada prédio dá para um tile livre', () => {
        for (const b of map.buildings) expect(solidAt(b.x + Math.floor(b.w / 2), b.y + b.h)).toBe(false);
      });
    });
  }
  it('posição inicial é livre', () => {
    const m = MAPS[START_POSITION.map];
    expect(TILES[m.grid[START_POSITION.y][START_POSITION.x]].solid).toBe(false);
  });
});

/** Busca em largura pelos tiles livres a partir de (x,y). */
function reach(map: MapDef, x0: number, y0: number): Set<string> {
  const free = (x: number, y: number) => {
    const ch = map.grid[y]?.[x];
    if (ch === undefined || TILES[ch].solid) return false;
    if (map.buildings.some((b) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h)) return false;
    return !map.npcs.some((n) => n.x === x && n.y === y) && !map.signs.some((n) => n.x === x && n.y === y);
  };
  const seen = new Set([`${x0},${y0}`]);
  const q = [[x0, y0]];
  while (q.length) {
    const [x, y] = q.shift()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const k = `${x + dx},${y + dy}`;
      if (!seen.has(k) && free(x + dx, y + dy)) {
        seen.add(k);
        q.push([x + dx, y + dy]);
      }
    }
  }
  return seen;
}

describe('mundo', () => {
  it('todos os mapas estão ligados a partir da vila', () => {
    const seen = new Set(['vila']);
    const q = ['vila'];
    while (q.length) for (const w of MAPS[q.shift()!].warps) if (!seen.has(w.to)) (seen.add(w.to), q.push(w.to));
    expect([...seen].sort()).toEqual(Object.keys(MAPS).sort());
  });
  it('todos os golpes dos monstros existem', () => {
    for (const sp of Object.values(SPECIES)) for (const l of sp.learnset) expect(MOVES[l.move], `${sp.id}:${l.move}`).toBeDefined();
  });
  it('pet inicial raro aparece ~3% e nunca o do jogador', () => {
    let rares = 0;
    const n = 20000;
    for (let i = 0; i < n; i++) {
      const r = rollEncounter(MAPS.canion, 'ignis_evo')!; // jogador com Ignis evoluído: só Terragon pode ser raro
      if (r.rare) {
        rares++;
        expect(r.species).not.toBe('ignis');
      }
    }
    expect(rares / n).toBeGreaterThan(0.02);
    expect(rares / n).toBeLessThan(0.04);
  });
});

describe('treinadores', () => {
  it('5 selecionáveis, Noctis não', () => {
    expect(TRAINERS.filter((t) => t.selectable)).toHaveLength(5);
    expect(TRAINERS.find((t) => t.id === 'noctis')?.selectable).toBe(false);
  });
  it('pet inicial existe', () => {
    for (const t of TRAINERS) expect(SPECIES[t.starter], t.starter).toBeDefined();
  });
  it('evoluções apontam para espécies existentes', () => {
    for (const sp of Object.values(SPECIES)) if (sp.evolution) expect(SPECIES[sp.evolution.into]).toBeDefined();
  });
});

import { WANDERERS } from '../src/data/wanderers';

describe('treinadores andarilhos', () => {
  it('um por mapa, com espécies existentes', () => {
    for (const map of Object.keys(MAPS)) expect(WANDERERS.filter((w) => w.map === map), map).toHaveLength(1);
    for (const w of WANDERERS) for (const [sp] of w.team) expect(SPECIES[sp], sp).toBeDefined();
  });
  it('começam num tile livre e alcançável, com espaço para andar', () => {
    for (const w of WANDERERS) {
      const map = MAPS[w.map];
      const seen = reach(map, map.warps[0].x, map.warps[0].y);
      expect(seen.has(`${w.home.x},${w.home.y}`), `${w.id} em ${w.home.x},${w.home.y}`).toBe(true);
      let free = 0;
      for (let dx = -w.radius; dx <= w.radius; dx++) for (let dy = -w.radius; dy <= w.radius; dy++) if (seen.has(`${w.home.x + dx},${w.home.y + dy}`)) free++;
      expect(free, w.id).toBeGreaterThan(8);
    }
  });
});

describe('raros', () => {
  it('Umbrel aparece raramente nas Ruínas da Lua', () => {
    expect(MAPS.ruinas.rare?.map((r) => r.species)).toContain('umbrel');
  });
});
