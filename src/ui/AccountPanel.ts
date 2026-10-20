import { MAPS } from '../data/maps';
import { getTrainer } from '../data/trainers';
import { ONLINE } from '../online.config';
import { CloudError } from '../systems/cloud/CloudBackend';
import { CloudSave } from '../systems/CloudSave';
import { GamePause } from '../systems/GamePause';
import { formatPlayTime, SaveManager, type SaveFile } from '../systems/SaveManager';

/**
 * Janela de conta (HTML por cima do jogo): entrar, criar conta, esqueci a senha,
 * conta conectada e escolha de progresso quando aparelho e nuvem estão diferentes.
 */
type View = 'login' | 'signup' | 'forgot' | 'account' | 'conflict' | 'recovery' | 'delete';

let root: HTMLDivElement | null = null;
let onClose: (() => void) | null = null;

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function describe(file: SaveFile): string {
  const sum = SaveManager.summary(file);
  if (!sum) return 'Progresso inválido';
  const levels = sum.partyLevels.length ? `equipe Nv ${Math.max(...sum.partyLevels)}` : '';
  const when = new Date(file.savedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  return `<strong>${esc(getTrainer(sum.trainerId).name)}</strong> · ${esc(MAPS[sum.mapId]?.name ?? '')}<br>${formatPlayTime(sum.playSeconds)} de jogo · ${levels}<br><small>salvo em ${when}</small>`;
}

export function closeAccountPanel(): void {
  root?.remove();
  root = null;
  GamePause.set('account', false);
  const cb = onClose;
  onClose = null;
  cb?.();
}

/** Abre a janela. `done` é chamado ao fechar (o menu se atualiza). */
export function openAccountPanel(view?: View, done?: () => void): void {
  if (!CloudSave.enabled) return;
  onClose = done ?? onClose;
  if (!root) {
    root = document.createElement('div');
    root.className = 'acct';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'Conta do jogador');
    root.addEventListener('keydown', (e) => e.key === 'Escape' && !CloudSave.pending && closeAccountPanel());
    document.body.appendChild(root);
    GamePause.set('account', true);
  }
  render(view ?? (CloudSave.pending ? 'conflict' : CloudSave.user ? 'account' : 'login'));
}

function render(view: View, message = '', isError = false): void {
  if (!root) return;
  const msg = message ? `<p class="acct__msg${isError ? ' acct__msg--err' : ''}" role="status">${esc(message)}</p>` : '';
  const close = `<button type="button" class="acct__close" data-act="close" aria-label="Fechar">✕</button>`;
  const google = ONLINE.googleLogin ? `<button type="button" class="acct__google" data-act="google">Entrar com Google</button><div class="acct__or">ou</div>` : '';
  let body = '';
  switch (view) {
    case 'login':
      body = `${close}<h2>Entrar</h2><p class="acct__lead">Entre para salvar seu progresso online e continuar em qualquer aparelho.</p>${google}
        <form data-form="login">
          <label for="acct-email">E-mail</label><input id="acct-email" name="email" type="email" autocomplete="email" required>
          <label for="acct-pass">Senha</label><input id="acct-pass" name="password" type="password" autocomplete="current-password" required minlength="6">
          ${msg}<button type="submit" class="primary">Entrar</button>
        </form>
        <p class="acct__links"><button type="button" class="link" data-act="forgot">Esqueci minha senha</button> · <button type="button" class="link" data-act="signup">Criar conta</button></p>`;
      break;
    case 'signup':
      body = `${close}<h2>Criar conta</h2><p class="acct__lead">É grátis. Seu progresso fica salvo na nuvem.</p>${google}
        <form data-form="signup">
          <label for="acct-name">Nome de jogador</label><input id="acct-name" name="name" type="text" autocomplete="nickname" required maxlength="16" placeholder="Ex.: Domador123">
          <label for="acct-email">E-mail</label><input id="acct-email" name="email" type="email" autocomplete="email" required>
          <label for="acct-pass">Senha (mínimo 6 caracteres)</label><input id="acct-pass" name="password" type="password" autocomplete="new-password" required minlength="6">
          ${msg}<button type="submit" class="primary">Criar conta</button>
        </form>
        <p class="acct__links">Já tem conta? <button type="button" class="link" data-act="login">Entrar</button></p>
        <p class="acct__fine">Ao criar a conta você concorda com a <a href="./privacy.html" target="_blank" rel="noopener">Política de Privacidade</a>.</p>`;
      break;
    case 'forgot':
      body = `${close}<h2>Esqueci minha senha</h2><p class="acct__lead">Enviaremos um link para você criar uma nova senha.</p>
        <form data-form="forgot">
          <label for="acct-email">E-mail da conta</label><input id="acct-email" name="email" type="email" autocomplete="email" required>
          ${msg}<button type="submit" class="primary">Enviar link</button>
        </form>
        <p class="acct__links"><button type="button" class="link" data-act="login">Voltar</button></p>`;
      break;
    case 'recovery':
      body = `<h2>Nova senha</h2>
        <form data-form="recovery">
          <label for="acct-pass">Nova senha (mínimo 6 caracteres)</label><input id="acct-pass" name="password" type="password" autocomplete="new-password" required minlength="6">
          ${msg}<button type="submit" class="primary">Salvar nova senha</button>
        </form>`;
      break;
    case 'account': {
      const u = CloudSave.user!;
      const last = CloudSave.lastUpload ? new Date(CloudSave.lastUpload).toLocaleTimeString('pt-BR', { timeStyle: 'short' }) : '—';
      const state = CloudSave.status === 'error' ? 'Não foi possível enviar (sem conexão?). Tentaremos de novo.' : CloudSave.status === 'saving' ? 'Enviando…' : `Último envio: ${last}`;
      body = `${close}<h2>Sua conta</h2>
        <p class="acct__user"><strong>${esc(u.name)}</strong><br><small>${esc(u.email)}</small></p>
        <p class="acct__lead">☁ Seu progresso é salvo online automaticamente. ${esc(state)}</p>
        ${msg}
        <div class="acct__col">
          <button type="button" class="primary" data-act="upload">Salvar na nuvem agora</button>
          <button type="button" data-act="signout">Sair da conta</button>
          <button type="button" class="danger" data-act="delete">Excluir conta</button>
        </div>`;
      break;
    }
    case 'delete':
      body = `<h2>Excluir conta?</h2><p class="acct__lead">Sua conta e o progresso salvo online serão apagados para sempre. O progresso salvo neste aparelho continua.</p>
        ${msg}<div class="acct__col"><button type="button" class="danger" data-act="confirm-delete">Sim, excluir minha conta</button><button type="button" data-act="account">Cancelar</button></div>`;
      break;
    case 'conflict': {
      const p = CloudSave.pending!;
      body = `<h2>Qual progresso usar?</h2><p class="acct__lead">Este aparelho e a sua conta têm jogos diferentes. Escolha qual continuar. O outro será substituído.</p>
        <div class="acct__choices">
          <button type="button" class="acct__choice" data-act="use-cloud"><span class="acct__tag">☁ Na conta</span><span>${describe(p.cloud)}</span></button>
          <button type="button" class="acct__choice" data-act="use-local"><span class="acct__tag">📱 Neste aparelho</span><span>${describe(p.local)}</span></button>
        </div>${msg}`;
      break;
    }
  }
  // mantém o e-mail e o nome já digitados ao redesenhar (ex.: depois de uma senha errada)
  const kept = new Map<string, string>();
  root.querySelectorAll<HTMLInputElement>('#acct-email, #acct-name').forEach((i) => kept.set(i.id, i.value));
  root.innerHTML = `<div class="acct__box">${body}</div>`;
  kept.forEach((v, id) => {
    const el = root!.querySelector<HTMLInputElement>(`#${id}`);
    if (el) el.value = v;
  });
  const firstEmpty = [...root.querySelectorAll<HTMLInputElement>('input')].find((i) => !i.value);
  (firstEmpty ?? root.querySelector<HTMLInputElement>('input'))?.focus();
  root.querySelectorAll<HTMLButtonElement>('[data-act]').forEach((b) => b.addEventListener('click', () => void act(b.dataset.act!, view)));
  root.querySelector('form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    void submit((e.target as HTMLFormElement).dataset.form as View, new FormData(e.target as HTMLFormElement));
  });
}

async function busy<T>(view: View, fn: () => Promise<T>): Promise<T | undefined> {
  root?.querySelectorAll('button, input').forEach((el) => ((el as HTMLButtonElement).disabled = true));
  try {
    return await fn();
  } catch (e) {
    render(view, e instanceof CloudError ? e.message : 'Não foi possível concluir agora. Tente de novo.', true);
    return undefined;
  }
}

async function afterLogin(): Promise<void> {
  if (CloudSave.pending) render('conflict');
  else render('account', 'Conectado! Seu progresso está salvo online.');
}

async function submit(form: View, data: FormData): Promise<void> {
  const email = String(data.get('email') ?? '');
  const password = String(data.get('password') ?? '');
  if (form === 'login') {
    if ((await busy('login', () => CloudSave.signIn(email, password).then(() => true))) !== undefined) await afterLogin();
  } else if (form === 'signup') {
    const r = await busy('signup', () => CloudSave.signUp(email, password, String(data.get('name') ?? '')));
    if (!r) return;
    if (r.needsConfirmation) render('login', 'Conta criada! Abra o link que enviamos para o seu e-mail e depois entre aqui.');
    else await afterLogin();
  } else if (form === 'forgot') {
    if ((await busy('forgot', () => CloudSave.resetPassword(email).then(() => true))) !== undefined) render('login', 'Se o e-mail tiver conta, o link para criar uma nova senha chegará em instantes.');
  } else if (form === 'recovery') {
    if ((await busy('recovery', () => CloudSave.updatePassword(password).then(() => true))) !== undefined) render('account', 'Senha alterada!');
  }
}

async function act(action: string, view: View): Promise<void> {
  switch (action) {
    case 'close':
      return closeAccountPanel();
    case 'login':
    case 'signup':
    case 'forgot':
    case 'account':
    case 'delete':
      return render(action);
    case 'google':
      await busy(view, () => CloudSave.signInWithGoogle());
      return;
    case 'upload': {
      const ok = await busy('account', () => CloudSave.uploadNow());
      if (ok !== undefined) render('account', ok ? '✓ Progresso salvo na nuvem.' : 'Não há progresso para salvar ainda, ou estamos sem conexão.', !ok);
      return;
    }
    case 'signout':
      if ((await busy('account', () => CloudSave.signOut().then(() => true))) !== undefined) render('login', 'Você saiu da conta. O progresso continua salvo neste aparelho.');
      return;
    case 'confirm-delete':
      if ((await busy('delete', () => CloudSave.deleteAccount().then(() => true))) !== undefined) render('login', 'Conta excluída.');
      return;
    case 'use-cloud':
    case 'use-local':
      if ((await busy('conflict', () => CloudSave.resolve(action === 'use-cloud' ? 'cloud' : 'local').then(() => true))) !== undefined) render('account', 'Pronto! Seu progresso foi sincronizado.');
      return;
  }
}
