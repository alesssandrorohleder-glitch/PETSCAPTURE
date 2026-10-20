import { describe, expect, it } from 'vitest';
import { MAPS, TILES, START_POSITION } from '../src/data/maps';
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
