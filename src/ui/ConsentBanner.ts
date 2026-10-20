import { AdManager, type Consent } from '../systems/AdManager';

/**
 * Aviso de cookies/consentimento (LGPD/GDPR), em HTML por cima do jogo.
 * Aparece na primeira visita e pode ser reaberto em Opções.
 */
export function showConsentBanner(force = false): void {
  if (!AdManager.enabled && !force) return;
  if (!force && AdManager.consent()) return;
  document.querySelector('.consent')?.remove();
  const el = document.createElement('div');
  el.className = 'consent';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', 'Privacidade e cookies');
  el.innerHTML = `
    <p><strong>Privacidade e cookies.</strong> Este jogo é gratuito e exibe anúncios do Google, que podem usar cookies
    para mostrar anúncios personalizados. Seu progresso fica salvo só neste navegador.
    <a href="./privacy.html" target="_blank" rel="noopener">Política de Privacidade</a></p>
    <div class="consent__actions">
      <button data-c="rejected">Recusar (anúncios não personalizados)</button>
      <button data-c="accepted" class="primary">Aceitar</button>
    </div>`;
  el.querySelectorAll('button').forEach((b) =>
    b.addEventListener('click', () => {
      AdManager.setConsent(b.getAttribute('data-c') as Consent);
      el.remove();
    }),
  );
  document.body.appendChild(el);
}
