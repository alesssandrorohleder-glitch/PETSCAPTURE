import { ONLINE } from '../online.config';
import type { CloudBackend, CloudUser, SignUpResult } from './cloud/CloudBackend';
import { MockBackend } from './cloud/MockBackend';
import { SaveManager, type SaveFile } from './SaveManager';
import { Storage } from './Storage';
import { urlParam } from './UrlFlags';

/** Último save enviado/recebido da nuvem para cada conta (neste aparelho). */
interface SyncMeta {
  userId: string;
  savedAt: number;
}
const META_KEY = 'elementais.cloudsync';

export type SyncDecision = 'none' | 'upload' | 'download' | 'conflict';

/**
 * Decide o que fazer ao conectar a conta, comparando o save deste aparelho com o da nuvem.
 * - Só um lado tem progresso → copia para o outro.
 * - Mesmo aparelho e mesma conta: quem mudou desde a última sincronização vence.
 * - Os dois mudaram (ou o save local é de outra conta/de antes do login) → pergunta ao jogador.
 */
export function decideSync(local: SaveFile | null, cloud: SaveFile | null, meta: SyncMeta | null, userId: string): SyncDecision {
  if (!local && !cloud) return 'none';
  if (local && !cloud) return 'upload';
  if (!local && cloud) return 'download';
  const l = local!;
  const c = cloud!;
  if (l.savedAt === c.savedAt) return 'none';
  if (meta && meta.userId === userId) {
    const localChanged = l.savedAt > meta.savedAt;
    const cloudChanged = c.savedAt > meta.savedAt;
    if (localChanged && !cloudChanged) return 'upload';
    if (cloudChanged && !localChanged) return 'download';
  }
  return 'conflict';
}

type Listener = () => void;

/**
 * Login e salvamento online. O jogo sempre salva no aparelho; com a conta conectada,
 * também envia para a nuvem (com intervalo mínimo entre envios) e ao fechar a aba.
 */
class CloudSaveImpl {
  backend: CloudBackend | null = null;
  user: CloudUser | null = null;
  /** conflito aguardando a escolha do jogador */
  pending: { local: SaveFile; cloud: SaveFile } | null = null;
  lastUpload = 0;
  status: 'idle' | 'saving' | 'error' = 'idle';
  /** intervalo mínimo entre envios automáticos (ms) */
  minInterval = 15000;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private listeners = new Set<Listener>();
  private recoveryHandler: (() => void) | null = null;

  /**
   * true enquanto o Supabase não estiver configurado: o login continua aparecendo,
   * mas as contas ficam guardadas só neste navegador (MockBackend).
   */
  localOnly = false;

  /** Login disponível? (sempre, depois do init) */
  get enabled(): boolean {
    return this.backend !== null;
  }

  onChange(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  private changed(): void {
    this.listeners.forEach((l) => l());
  }

  /** Escolhe o servidor e restaura a sessão. Sem Supabase configurado, usa contas locais. */
  async init(backend?: CloudBackend): Promise<void> {
    this.localOnly = false;
    if (backend) this.backend = backend;
    else if (urlParam('cloud') === 'mock') this.backend = new MockBackend();
    else if (ONLINE.supabaseUrl && ONLINE.supabaseAnonKey) {
      // carregado só quando configurado, para não pesar o jogo de quem não usa
      const { SupabaseBackend } = await import('./cloud/SupabaseBackend');
      this.backend = new SupabaseBackend(ONLINE.supabaseUrl, ONLINE.supabaseAnonKey);
    } else {
      this.backend = new MockBackend();
      this.localOnly = true;
    }
    this.backend.onAuthChange((user, event) => {
      this.user = user;
      if (event === 'recovery') this.recoveryHandler?.();
      this.changed();
    });
    SaveManager.onSaved = (file) => this.schedule(file);
    try {
      this.user = await this.backend.currentUser();
      if (this.user) await this.sync();
    } catch {
      this.status = 'error';
    }
    this.changed();
  }

  /** O jogo chama ao voltar pelo link de "esqueci a senha". */
  onRecovery(fn: () => void): void {
    this.recoveryHandler = fn;
  }

  // ---------------------------------------------------------------- conta
  async signUp(email: string, password: string, name: string): Promise<SignUpResult> {
    const r = await this.backend!.signUp(email.trim(), password, name.trim());
    if (r.user) {
      this.user = r.user;
      await this.sync();
    }
    this.changed();
    return r;
  }

  async signIn(email: string, password: string): Promise<void> {
    this.user = await this.backend!.signIn(email.trim(), password);
    await this.sync();
    this.changed();
  }

  async signInWithGoogle(): Promise<void> {
    await this.backend!.signInWithGoogle(); // redireciona para o Google e volta ao jogo
  }

  async resetPassword(email: string): Promise<void> {
    await this.backend!.resetPassword(email.trim());
  }

  async updatePassword(password: string): Promise<void> {
    await this.backend!.updatePassword(password);
  }

  async signOut(): Promise<void> {
    await this.uploadNow().catch(() => false);
    await this.backend!.signOut();
    this.user = null;
    this.pending = null;
    this.changed();
  }

  async deleteAccount(): Promise<void> {
    await this.backend!.deleteAccount();
    Storage.remove(META_KEY);
    this.user = null;
    this.pending = null;
    this.changed();
  }

  // ---------------------------------------------------------------- sincronização
  private meta(): SyncMeta | null {
    return Storage.get<SyncMeta | null>(META_KEY, null);
  }
  private markSynced(file: SaveFile): void {
    if (this.user) Storage.set(META_KEY, { userId: this.user.id, savedAt: file.savedAt } satisfies SyncMeta);
  }

  /** Compara aparelho × nuvem e copia o que for preciso. Conflitos ficam em `pending`. */
  async sync(): Promise<SyncDecision> {
    if (!this.backend || !this.user) return 'none';
    const local = SaveManager.localFile();
    const cloud = await this.backend.load();
    const d = decideSync(local, cloud, this.meta(), this.user.id);
    if (d === 'upload') await this.push(local!);
    else if (d === 'download') {
      SaveManager.writeLocal(cloud!);
      this.markSynced(cloud!);
    } else if (d === 'conflict') this.pending = { local: local!, cloud: cloud! };
    else if (local) this.markSynced(local);
    this.changed();
    return d;
  }

  /** Resolve o conflito com a escolha do jogador. */
  async resolve(choice: 'local' | 'cloud'): Promise<void> {
    const p = this.pending;
    if (!p) return;
    this.pending = null;
    if (choice === 'cloud') {
      SaveManager.writeLocal(p.cloud);
      this.markSynced(p.cloud);
    } else await this.push(p.local);
    this.changed();
  }

  private async push(file: SaveFile): Promise<void> {
    this.status = 'saving';
    this.changed();
    try {
      await this.backend!.save(file);
      this.lastUpload = Date.now();
      this.markSynced(file);
      this.status = 'idle';
    } catch (e) {
      this.status = 'error';
      throw e;
    } finally {
      this.changed();
    }
  }

  /** Agenda um envio (chamado a cada salvamento local). */
  schedule(file: SaveFile): void {
    if (!this.user || this.pending) return;
    if (this.timer) clearTimeout(this.timer);
    const wait = Math.max(3000, this.minInterval - (Date.now() - this.lastUpload));
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.push(SaveManager.localFile() ?? file).catch(() => {});
    }, wait);
  }

  /** Envia agora (botão Salvar). Retorna true se foi para a nuvem. */
  async uploadNow(): Promise<boolean> {
    if (!this.user || this.pending) return false;
    const file = SaveManager.localFile();
    if (!file) return false;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    try {
      await this.push(file);
      return true;
    } catch {
      return false;
    }
  }

  /** Ao fechar a aba: envio de última hora. */
  flushOnExit(): void {
    if (!this.user || this.pending || !this.backend) return;
    const file = SaveManager.localFile();
    if (file) this.backend.saveOnExit(file);
  }
}

export const CloudSave = new CloudSaveImpl();
