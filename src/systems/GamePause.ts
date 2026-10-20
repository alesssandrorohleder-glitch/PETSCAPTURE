/**
 * Pausa o som e os controles do jogo enquanto algo cobre a tela
 * (anúncio, janela de login...). Vários motivos podem pausar ao mesmo tempo.
 */
const reasons = new Set<string>();
let apply: (paused: boolean) => void = () => {};

export const GamePause = {
  init(fn: (paused: boolean) => void): void {
    apply = fn;
  },
  set(reason: string, on: boolean): void {
    if (on) reasons.add(reason);
    else reasons.delete(reason);
    apply(reasons.size > 0);
  },
};
