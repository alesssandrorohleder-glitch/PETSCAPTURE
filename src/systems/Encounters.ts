import { RARE_STARTER_RATE, type MapDef } from '../data/maps';
import { getSpecies } from '../data/monsters';

export interface EncounterRoll {
  species: string;
  level: number;
  rare: boolean;
}

/** Espécie base de uma forma evoluída (ex.: ignis_evo -> ignis). */
const baseOf = (species: string): string =>
  species.endsWith('_evo') ? species.slice(0, -4) : getSpecies(species).id;

/**
 * Sorteia o monstro de um encontro no mato alto.
 * Cada pet inicial raro do mapa tem 3% de chance — exceto o do próprio jogador.
 */
export function rollEncounter(map: MapDef, playerStarter: string, rng: () => number = Math.random): EncounterRoll | null {
  const between = (min: number, max: number) => min + Math.floor(rng() * (max - min + 1));
  for (const r of map.rare ?? []) {
    if (baseOf(r.species) === baseOf(playerStarter)) continue;
    if (rng() < RARE_STARTER_RATE) return { species: r.species, level: between(r.min, r.max), rare: true };
  }
  const table = map.encounters ?? [];
  if (!table.length) return null;
  let roll = rng() * table.reduce((s, e) => s + e.weight, 0);
  const pick = table.find((e) => (roll -= e.weight) < 0) ?? table[table.length - 1];
  return { species: pick.species, level: between(pick.min, pick.max), rare: false };
}
