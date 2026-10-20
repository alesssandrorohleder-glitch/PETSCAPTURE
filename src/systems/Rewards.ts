import { ADS } from '../ads.config';
import { AdManager } from './AdManager';
import { GameState } from './GameState';
import { SaveManager } from './SaveManager';

/** "Assistir anúncio para ganhar 50 moedas". Retorna a mensagem para mostrar ao jogador. */
export async function watchForCoins(): Promise<string> {
  const r = await AdManager.rewarded('ganhar-moedas');
  if (r === 'viewed') {
    GameState.get().money += ADS.rewardCoins;
    SaveManager.save();
    return `Você ganhou ${ADS.rewardCoins} moedas! Obrigado por apoiar o jogo.`;
  }
  return r === 'dismissed' ? 'O anúncio foi fechado antes do fim, então não houve recompensa.' : 'Nenhum anúncio disponível agora. Tente de novo mais tarde.';
}
