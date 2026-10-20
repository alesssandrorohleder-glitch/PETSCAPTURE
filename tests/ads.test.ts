import { describe, expect, it } from 'vitest';
import { ADS } from '../src/ads.config';
import { interstitialAllowed, resolveMode } from '../src/systems/AdManager';
import { BattleEngine } from '../src/systems/BattleEngine';
import { createMonster, maxHp } from '../src/systems/Monster';

describe('frequência do intersticial', () => {
  it('nunca nos primeiros 3 minutos da sessão', () => {
    expect(interstitialAllowed(100, 0, null)).toBe(false);
    expect(interstitialAllowed(ADS.firstInterstitialAfterSec, 0, null)).toBe(true);
  });
  it('no máximo 1 a cada 3 minutos', () => {
    expect(interstitialAllowed(1000, 0, 900)).toBe(false);
    expect(interstitialAllowed(1000, 0, 1000 - 180)).toBe(true);
  });
});

describe('modo dos anúncios', () => {
  it('ID de exemplo = simulado; ID real = ao vivo; URL manda', () => {
    expect(resolveMode('auto', 'ca-pub-0000000000000000', null)).toBe('simulated');
    expect(resolveMode('auto', 'ca-pub-1234567890123456', null)).toBe('live');
    expect(resolveMode('auto', 'ca-pub-1234567890123456', 'test')).toBe('test');
    expect(resolveMode('live', 'ca-pub-1', 'off')).toBe('off');
  });
});

describe('recompensas', () => {
  it('reviver depois de perder (uma vez)', () => {
    const p = createMonster('ignis', 2);
    const b = new BattleEngine({ party: [p], enemies: [createMonster('umbrel_evo', 50)], kind: 'trainer', rng: () => 0.5 });
    b.turn({ kind: 'move', move: 'faisca' });
    expect(b.outcome).toBe('lose');
    const ev = b.reviveAfterLoss();
    expect(ev.length).toBeGreaterThan(0);
    expect(b.over).toBe(false);
    expect(p.hp).toBe(Math.ceil(maxHp(p) / 2));
    b.turn({ kind: 'move', move: 'faisca' });
    expect(b.outcome).toBe('lose');
    expect(b.reviveAfterLoss()).toEqual([]);
  });
  it('dobrar XP dá o mesmo XP de novo', () => {
    const p = createMonster('ignis', 5);
    const b = new BattleEngine({ party: [p], enemies: [createMonster('larvilo', 2)], kind: 'wild', rng: () => 0.5 });
    while (!b.over) b.turn({ kind: 'move', move: 'faisca' });
    const gained = b.xpGained.get(p.uid)!;
    const xp = p.xp;
    b.doubleXp();
    expect(p.xp).toBe(xp + gained);
  });
});
