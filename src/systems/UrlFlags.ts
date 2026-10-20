/**
 * Opções pela URL. Aceita "?nome=valor" (no seu site) e "#nome" ou "#nome-valor"
 * (links que só repassam o trecho depois do #, como a página de teste do claude.ai).
 * Ex.: ?gallery=1 ou #gallery · ?ads=sim ou #ads-sim · ?cloud=mock ou #cloud-mock
 */
export function urlParam(name: string): string | null {
  if (typeof window === 'undefined') return null;
  const q = new URLSearchParams(window.location.search).get(name);
  if (q !== null) return q;
  const hash = window.location.hash.replace(/^#/, '');
  for (const token of hash.split(/[&.]/)) {
    if (token === name) return '1';
    if (token.startsWith(`${name}-`)) return token.slice(name.length + 1);
    if (token.startsWith(`${name}=`)) return token.slice(name.length + 1);
  }
  return null;
}
