/**
 * ☁ CONFIGURAÇÃO DO LOGIN E SALVAMENTO ONLINE (Supabase)
 *
 * Coloque os dados do seu projeto Supabase (Project Settings → API) em variáveis de ambiente
 * na Vercel/Netlify, ou num arquivo .env na raiz para testar no seu computador:
 *
 *   VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
 *   VITE_SUPABASE_ANON_KEY=eyJhbGciOi...   (a chave "anon" / "publishable" — é pública, pode ir no site)
 *
 * NUNCA coloque a chave "service_role"/"secret" aqui.
 * Sem esses dados, o jogo funciona normalmente salvando só no aparelho.
 * Passo a passo completo no README (seção "Login e salvamento online").
 */
export const ONLINE = {
  supabaseUrl: (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? '',
  supabaseAnonKey: (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? '',
  /** Mostrar "Entrar com Google" (ative o provedor Google no Supabase antes). */
  googleLogin: (import.meta.env.VITE_GOOGLE_LOGIN as string | undefined) === 'true',
};
