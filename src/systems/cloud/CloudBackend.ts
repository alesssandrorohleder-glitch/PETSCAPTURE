import type { SaveFile } from '../SaveManager';

export interface CloudUser {
  id: string;
  email: string;
  /** nome do jogador */
  name: string;
}

export interface SignUpResult {
  user: CloudUser | null;
  /** o servidor pediu confirmação por e-mail antes de entrar */
  needsConfirmation: boolean;
}

/** Servidor de contas e saves. Implementações: Supabase (real) e Mock (testes). */
export interface CloudBackend {
  readonly kind: 'supabase' | 'mock';
  currentUser(): Promise<CloudUser | null>;
  /** chamado ao entrar/sair; `recovery` = voltou pelo link de "esqueci a senha" */
  onAuthChange(cb: (user: CloudUser | null, event: 'signin' | 'signout' | 'recovery') => void): void;
  signUp(email: string, password: string, name: string): Promise<SignUpResult>;
  signIn(email: string, password: string): Promise<CloudUser>;
  signInWithGoogle(): Promise<void>;
  resetPassword(email: string): Promise<void>;
  updatePassword(password: string): Promise<void>;
  signOut(): Promise<void>;
  load(): Promise<SaveFile | null>;
  save(file: SaveFile): Promise<void>;
  /** envio de última hora ao fechar a aba (não espera resposta) */
  saveOnExit(file: SaveFile): void;
  deleteAccount(): Promise<void>;
}

/** Erro com mensagem já pronta para o jogador. */
export class CloudError extends Error {}

/** Traduz mensagens comuns de erro para o português. */
export function friendlyError(raw: string): string {
  const m = raw.toLowerCase();
  if (m.includes('invalid login') || m.includes('invalid credentials')) return 'E-mail ou senha incorretos.';
  if (m.includes('already registered') || m.includes('already been registered') || m.includes('user already exists')) return 'Já existe uma conta com esse e-mail. Tente entrar.';
  if (m.includes('email not confirmed')) return 'Confirme seu e-mail (veja a caixa de entrada) e tente de novo.';
  if (m.includes('password') && (m.includes('6') || m.includes('short') || m.includes('weak'))) return 'A senha precisa ter pelo menos 6 caracteres.';
  if (m.includes('rate limit') || m.includes('too many')) return 'Muitas tentativas. Espere um pouco e tente de novo.';
  if (m.includes('failed to fetch') || m.includes('network')) return 'Sem conexão com o servidor. Verifique sua internet.';
  if (m.includes('invalid email') || m.includes('unable to validate email')) return 'E-mail inválido.';
  return 'Não foi possível concluir agora. Tente de novo em instantes.';
}
