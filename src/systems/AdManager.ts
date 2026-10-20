import { ADS, EXAMPLE_PUBLISHER_ID, type AdMode } from '../ads.config';
import { Storage } from './Storage';
import { urlParam } from './UrlFlags';

/**
 * Anúncios via Google H5 Games Ads (Ad Placement API do AdSense para jogos).
 *
 * Regras do jogo:
 * - Intersticial só entre batalhas, no máximo 1 a cada 3 minutos.
 * - Recompensado só quando o jogador escolhe assistir.
 * - Se o anúncio falhar, for bloqueado ou não houver anúncio, o jogo segue normalmente.
 */

export type Consent = 'accepted' | 'rejected';
export type RewardResult = 'viewed' | 'dismissed' | 'unavailable';
type Resolved = Exclude<AdMode, 'auto'>;

const CONSENT_KEY = 'elementais.consent';

interface PlacementInfo {
  breakStatus?: string;
}
interface AdBreakParams {
  type: 'next' | 'reward' | 'start' | 'pause' | 'browse' | 'preroll';
  name: string;
  beforeAd?: () => void;
  afterAd?: () => void;
  beforeReward?: (showAdFn: () => void) => void;
  adDismissed?: () => void;
  adViewed?: () => void;
  adBreakDone?: (info: PlacementInfo) => void;
}
type AdsWindow = Window & { adsbygoogle?: unknown[] & { requestNonPersonalizedAds?: number } };

/** Regra de frequência do intersticial (pura, testável). */
export function interstitialAllowed(nowSec: number, sessionStartSec: number, lastShownSec: number | null): boolean {
  if (nowSec - sessionStartSec < ADS.firstInterstitialAfterSec) return false;
  return lastShownSec === null || nowSec - lastShownSec >= ADS.interstitialIntervalSec;
}

/** Decide o modo efetivo (URL > configuração; 'auto' simula enquanto o ID for o de exemplo). */
export function resolveMode(configured: AdMode, publisherId: string, urlParam: string | null): Resolved {
  const fromUrl: Record<string, Resolved> = { sim: 'simulated', simulated: 'simulated', test: 'test', live: 'live', off: 'off' };
  if (urlParam && fromUrl[urlParam]) return fromUrl[urlParam];
  if (configured !== 'auto') return configured;
  return publisherId === EXAMPLE_PUBLISHER_ID ? 'simulated' : 'live';
}

const now = () => Date.now() / 1000;

class AdManagerImpl {
  mode: Resolved = 'off';
  /** início da sessão (público para testes) */
  sessionStart = now();
  private lastInterstitial: number | null = null;
  private scriptState: 'none' | 'loading' | 'ready' | 'failed' = 'none';
  private muteHook: (paused: boolean) => void = () => {};
  showing = false;

  /** `pauseHook(true)` deve silenciar o jogo e bloquear os controles enquanto o anúncio aparece. */
  init(muteHook: (paused: boolean) => void): void {
    this.muteHook = muteHook;
    const param = urlParam('ads');
    this.mode = resolveMode(ADS.mode, ADS.publisherId, param);
    const c = this.consent();
    if (c) this.loadScript(c);
  }

  get enabled(): boolean {
    return this.mode !== 'off';
  }

  consent(): Consent | null {
    return Storage.get<Consent | null>(CONSENT_KEY, null);
  }

  /** Chamado pelo aviso de cookies. Recusar = anúncios não personalizados. */
  setConsent(c: Consent): void {
    Storage.set(CONSENT_KEY, c);
    const w = window as AdsWindow;
    if (w.adsbygoogle) w.adsbygoogle.requestNonPersonalizedAds = c === 'rejected' ? 1 : 0;
    this.loadScript(c);
  }

  private loadScript(c: Consent): void {
    if ((this.mode !== 'test' && this.mode !== 'live') || this.scriptState !== 'none') return;
    const w = window as AdsWindow;
    w.adsbygoogle = w.adsbygoogle || [];
    w.adsbygoogle.requestNonPersonalizedAds = c === 'rejected' ? 1 : 0;
    const s = document.createElement('script');
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADS.publisherId}`;
    s.setAttribute('data-ad-client', ADS.publisherId);
    s.setAttribute('data-ad-frequency-hint', `${ADS.interstitialIntervalSec}s`);
    if (this.mode === 'test') s.setAttribute('data-adbreak-test', 'on');
    s.onload = () => {
      this.scriptState = 'ready';
      this.push({ preloadAdBreaks: 'on', sound: 'on' });
    };
    s.onerror = () => (this.scriptState = 'failed'); // bloqueador de anúncios, sem internet...
    this.scriptState = 'loading';
    document.head.appendChild(s);
  }

  private push(o: AdBreakParams | Record<string, unknown>): void {
    try {
      (window as AdsWindow).adsbygoogle?.push(o);
    } catch {
      /* o jogo nunca para por causa de anúncio */
    }
  }

  private get realAvailable(): boolean {
    return (this.mode === 'test' || this.mode === 'live') && this.scriptState === 'ready';
  }

  /** Pode mostrar um intersticial agora? (respeita os 3 minutos) */
  canShowInterstitial(): boolean {
    return this.enabled && !this.showing && interstitialAllowed(now(), this.sessionStart, this.lastInterstitial);
  }

  /** Intersticial entre batalhas. Sempre resolve (com ou sem anúncio). */
  async interstitial(name: string): Promise<void> {
    if (!this.canShowInterstitial()) return;
    this.lastInterstitial = now();
    if (this.mode === 'simulated') return this.simulate('interstitial').then(() => undefined);
    if (!this.realAvailable) return;
    await new Promise<void>((resolve) => {
      let started = false;
      const done = () => {
        this.showing = false;
        this.muteHook(false);
        resolve();
      };
      this.push({
        type: 'next',
        name,
        beforeAd: () => {
          started = true;
          this.showing = true;
          this.muteHook(true);
        },
        afterAd: () => this.muteHook(false),
        adBreakDone: done,
      } satisfies AdBreakParams);
      setTimeout(() => !started && done(), ADS.timeoutMs);
    });
  }

  /** Anúncio recompensado. 'viewed' = dar a recompensa. */
  async rewarded(name: string): Promise<RewardResult> {
    if (!this.enabled || this.showing) return 'unavailable';
    if (this.mode === 'simulated') return this.simulate('reward');
    if (!this.realAvailable) return 'unavailable';
    return new Promise<RewardResult>((resolve) => {
      let result: RewardResult = 'unavailable';
      let started = false;
      const finish = () => {
        this.showing = false;
        this.muteHook(false);
        resolve(result);
      };
      this.push({
        type: 'reward',
        name,
        beforeReward: (showAdFn) => {
          started = true;
          showAdFn(); // o jogo já perguntou ao jogador antes de chamar rewarded()
        },
        beforeAd: () => {
          this.showing = true;
          this.muteHook(true);
        },
        afterAd: () => this.muteHook(false),
        adDismissed: () => (result = 'dismissed'),
        adViewed: () => (result = 'viewed'),
        adBreakDone: finish,
      } satisfies AdBreakParams);
      setTimeout(() => !started && finish(), ADS.timeoutMs);
    });
  }

  /** Anúncio de mentira (modo simulado): mostra como e quando os anúncios aparecem. */
  private simulate(kind: 'interstitial' | 'reward'): Promise<RewardResult> {
    this.showing = true;
    this.muteHook(true);
    return new Promise((resolve) => {
      const wrap = document.createElement('div');
      wrap.className = 'sim-ad';
      const seconds = kind === 'reward' ? 5 : 3;
      wrap.innerHTML = `
        <div class="sim-ad__box" role="dialog" aria-label="Anúncio simulado">
          <div class="sim-ad__tag">${kind === 'reward' ? 'ANÚNCIO RECOMPENSADO' : 'ANÚNCIO'} · SIMULAÇÃO</div>
          <p>Aqui vai aparecer o anúncio do Google quando o seu ID do AdSense estiver configurado.</p>
          <p class="sim-ad__count"></p>
          <div class="sim-ad__actions">
            ${kind === 'reward' ? '<button class="sim-ad__skip">Fechar sem recompensa</button>' : ''}
            <button class="sim-ad__done" disabled>Aguarde…</button>
          </div>
        </div>`;
      document.body.appendChild(wrap);
      const count = wrap.querySelector('.sim-ad__count') as HTMLElement;
      const done = wrap.querySelector('.sim-ad__done') as HTMLButtonElement;
      let left = seconds;
      const close = (r: RewardResult) => {
        clearInterval(timer);
        wrap.remove();
        this.showing = false;
        this.muteHook(false);
        resolve(r);
      };
      const tick = () => {
        count.textContent = left > 0 ? `${left}…` : '';
        if (left <= 0 && done.disabled) {
          done.disabled = false;
          done.textContent = kind === 'reward' ? 'Receber recompensa' : 'Fechar anúncio';
          done.focus();
        }
        left--;
      };
      tick();
      const timer = setInterval(tick, 1000);
      done.onclick = () => close('viewed');
      (wrap.querySelector('.sim-ad__skip') as HTMLButtonElement | null)?.addEventListener('click', () => close('dismissed'));
    });
  }
}

export const AdManager = new AdManagerImpl();
