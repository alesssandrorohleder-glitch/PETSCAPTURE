/**
 * ⚙️ CONFIGURAÇÃO DE ANÚNCIOS — o único lugar que você precisa editar.
 *
 * 1. Troque `publisherId` pelo seu ID do AdSense (formato "ca-pub-1234567890123456").
 * 2. Atualize também public/ads.txt com o mesmo número (sem o "ca-").
 * 3. Deixe `mode: 'auto'`. Enquanto o ID for o de exemplo, o jogo mostra anúncios
 *    SIMULADOS (para testar o fluxo). Com o seu ID, mostra anúncios reais.
 *
 * Também dá para trocar o modo pela URL: ?ads=sim | test | live | off
 */
export type AdMode = 'auto' | 'simulated' | 'test' | 'live' | 'off';

export const ADS = {
  publisherId: 'ca-pub-0000000000000000',
  mode: 'auto' as AdMode,
  /** intervalo mínimo entre intersticiais (segundos) — o pedido é no máximo 1 a cada 3 min */
  interstitialIntervalSec: 180,
  /** não mostrar intersticial nos primeiros N segundos da sessão */
  firstInterstitialAfterSec: 180,
  /** moedas do anúncio recompensado */
  rewardCoins: 50,
  /** espera máxima para o Google responder antes de seguir o jogo sem anúncio (ms) */
  timeoutMs: 3500,
};

export const EXAMPLE_PUBLISHER_ID = 'ca-pub-0000000000000000';
