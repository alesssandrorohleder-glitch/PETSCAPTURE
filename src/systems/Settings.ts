import { Storage } from './Storage';

export interface GameSettings {
  soundOn: boolean;
  /** pet da frente da equipe acompanha o jogador pelo mapa */
  petFollow: boolean;
}

const KEY = 'elementais.settings';
const defaults: GameSettings = { soundOn: true, petFollow: true };

let current: GameSettings = { ...defaults, ...Storage.get<Partial<GameSettings>>(KEY, {}) };

export const Settings = {
  get: (): Readonly<GameSettings> => current,
  update(patch: Partial<GameSettings>): void {
    current = { ...current, ...patch };
    Storage.set(KEY, current);
  },
};
