import type { SaveFile } from '../SaveManager';
import { Storage } from '../Storage';
import { CloudError, type CloudBackend, type CloudUser, type SignUpResult } from './CloudBackend';

interface MockAccount extends CloudUser {
  password: string;
  save: SaveFile | null;
}
interface MockDb {
  accounts: MockAccount[];
  session: string | null;
}

const KEY = 'elementais.mockcloud';

/**
 * Servidor simulado (guarda tudo no próprio navegador) para testar o fluxo de login
 * sem um projeto Supabase. Ative com ?cloud=mock (ou #cloud-mock). NÃO é seguro: só para testes.
 */
export class MockBackend implements CloudBackend {
  readonly kind = 'mock' as const;
  private listeners: ((u: CloudUser | null, e: 'signin' | 'signout' | 'recovery') => void)[] = [];

  private db(): MockDb {
    return Storage.get<MockDb>(KEY, { accounts: [], session: null });
  }
  private write(db: MockDb): void {
    Storage.set(KEY, db);
  }
  private me(): MockAccount | undefined {
    const db = this.db();
    return db.accounts.find((a) => a.id === db.session);
  }
  private emit(u: CloudUser | null, e: 'signin' | 'signout' | 'recovery'): void {
    this.listeners.forEach((l) => l(u, e));
  }
  private pub(a: MockAccount): CloudUser {
    return { id: a.id, email: a.email, name: a.name };
  }

  async currentUser(): Promise<CloudUser | null> {
    const a = this.me();
    return a ? this.pub(a) : null;
  }
  onAuthChange(cb: (u: CloudUser | null, e: 'signin' | 'signout' | 'recovery') => void): void {
    this.listeners.push(cb);
  }
  async signUp(email: string, password: string, name: string): Promise<SignUpResult> {
    const db = this.db();
    if (password.length < 6) throw new CloudError('A senha precisa ter pelo menos 6 caracteres.');
    if (db.accounts.some((a) => a.email === email.toLowerCase())) throw new CloudError('Já existe uma conta com esse e-mail. Tente entrar.');
    const acc: MockAccount = { id: `u${Date.now().toString(36)}`, email: email.toLowerCase(), name, password, save: null };
    db.accounts.push(acc);
    db.session = acc.id;
    this.write(db);
    this.emit(this.pub(acc), 'signin');
    return { user: this.pub(acc), needsConfirmation: false };
  }
  async signIn(email: string, password: string): Promise<CloudUser> {
    const db = this.db();
    const acc = db.accounts.find((a) => a.email === email.toLowerCase() && a.password === password);
    if (!acc) throw new CloudError('E-mail ou senha incorretos.');
    db.session = acc.id;
    this.write(db);
    this.emit(this.pub(acc), 'signin');
    return this.pub(acc);
  }
  async signInWithGoogle(): Promise<void> {
    throw new CloudError('O login com Google não funciona no modo de teste.');
  }
  async resetPassword(): Promise<void> {
    /* no modo de teste não há e-mail */
  }
  async updatePassword(password: string): Promise<void> {
    const db = this.db();
    const acc = db.accounts.find((a) => a.id === db.session);
    if (acc) acc.password = password;
    this.write(db);
  }
  async signOut(): Promise<void> {
    const db = this.db();
    db.session = null;
    this.write(db);
    this.emit(null, 'signout');
  }
  async load(): Promise<SaveFile | null> {
    return this.me()?.save ?? null;
  }
  async save(file: SaveFile): Promise<void> {
    const db = this.db();
    const acc = db.accounts.find((a) => a.id === db.session);
    if (!acc) throw new CloudError('Você não está conectado.');
    acc.save = JSON.parse(JSON.stringify(file)) as SaveFile;
    this.write(db);
  }
  saveOnExit(file: SaveFile): void {
    void this.save(file).catch(() => {});
  }
  async deleteAccount(): Promise<void> {
    const db = this.db();
    db.accounts = db.accounts.filter((a) => a.id !== db.session);
    db.session = null;
    this.write(db);
    this.emit(null, 'signout');
  }
}
