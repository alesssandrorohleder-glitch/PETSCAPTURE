import { createClient, type Session, type SupabaseClient, type User } from '@supabase/supabase-js';
import type { SaveFile } from '../SaveManager';
import { CloudError, friendlyError, type CloudBackend, type CloudUser, type SignUpResult } from './CloudBackend';

const toUser = (u: User): CloudUser => ({
  id: u.id,
  email: u.email ?? '',
  name: (u.user_metadata?.name as string | undefined) ?? (u.user_metadata?.full_name as string | undefined) ?? (u.email ?? '').split('@')[0],
});

/** Endereço para onde os links de e-mail (confirmação, nova senha) devem voltar. */
const backUrl = () => window.location.origin + window.location.pathname;

export class SupabaseBackend implements CloudBackend {
  readonly kind = 'supabase' as const;
  private sb: SupabaseClient;
  private session: Session | null = null;

  constructor(
    private url: string,
    private anonKey: string,
  ) {
    this.sb = createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
    this.sb.auth.onAuthStateChange((_e, s) => (this.session = s));
  }

  private fail(e: unknown): never {
    const msg = e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e);
    throw new CloudError(friendlyError(msg));
  }

  async currentUser(): Promise<CloudUser | null> {
    const { data } = await this.sb.auth.getSession();
    this.session = data.session;
    return data.session?.user ? toUser(data.session.user) : null;
  }

  onAuthChange(cb: (user: CloudUser | null, event: 'signin' | 'signout' | 'recovery') => void): void {
    this.sb.auth.onAuthStateChange((event, s) => {
      this.session = s;
      if (event === 'PASSWORD_RECOVERY') cb(s?.user ? toUser(s.user) : null, 'recovery');
      else if (event === 'SIGNED_IN') cb(s?.user ? toUser(s.user) : null, 'signin');
      else if (event === 'SIGNED_OUT') cb(null, 'signout');
    });
  }

  async signUp(email: string, password: string, name: string): Promise<SignUpResult> {
    const { data, error } = await this.sb.auth.signUp({ email, password, options: { data: { name }, emailRedirectTo: backUrl() } });
    if (error) this.fail(error);
    return { user: data.session?.user ? toUser(data.session.user) : null, needsConfirmation: !data.session };
  }

  async signIn(email: string, password: string): Promise<CloudUser> {
    const { data, error } = await this.sb.auth.signInWithPassword({ email, password });
    if (error) this.fail(error);
    return toUser(data.user);
  }

  async signInWithGoogle(): Promise<void> {
    const { error } = await this.sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: backUrl() } });
    if (error) this.fail(error);
  }

  async resetPassword(email: string): Promise<void> {
    const { error } = await this.sb.auth.resetPasswordForEmail(email, { redirectTo: backUrl() });
    if (error) this.fail(error);
  }

  async updatePassword(password: string): Promise<void> {
    const { error } = await this.sb.auth.updateUser({ password });
    if (error) this.fail(error);
  }

  async signOut(): Promise<void> {
    await this.sb.auth.signOut();
  }

  async load(): Promise<SaveFile | null> {
    const uid = this.session?.user.id;
    if (!uid) return null;
    const { data, error } = await this.sb.from('saves').select('data').eq('user_id', uid).maybeSingle();
    if (error) this.fail(error);
    return (data?.data as SaveFile | undefined) ?? null;
  }

  private row(file: SaveFile) {
    return {
      user_id: this.session!.user.id,
      data: file,
      trainer: file.state.trainerId,
      play_seconds: Math.floor(file.state.playSeconds),
      updated_at: new Date(file.savedAt).toISOString(),
    };
  }

  async save(file: SaveFile): Promise<void> {
    if (!this.session) throw new CloudError('Você não está conectado.');
    const { error } = await this.sb.from('saves').upsert(this.row(file), { onConflict: 'user_id' });
    if (error) this.fail(error);
  }

  saveOnExit(file: SaveFile): void {
    if (!this.session) return;
    try {
      // keepalive: o navegador termina o envio mesmo com a aba fechando
      void fetch(`${this.url}/rest/v1/saves?on_conflict=user_id`, {
        method: 'POST',
        keepalive: true,
        headers: {
          apikey: this.anonKey,
          Authorization: `Bearer ${this.session.access_token}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify(this.row(file)),
      });
    } catch {
      /* fechar a aba nunca pode travar */
    }
  }

  async deleteAccount(): Promise<void> {
    const { error } = await this.sb.rpc('delete_my_account');
    if (error) this.fail(error);
    await this.sb.auth.signOut();
  }
}
