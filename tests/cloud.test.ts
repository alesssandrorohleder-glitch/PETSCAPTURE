import { beforeEach, describe, expect, it } from 'vitest';

/** localStorage de mentira (o Vitest roda em Node). */
const mem = new Map<string, string>();
(globalThis as unknown as { window: unknown }).window = {
  localStorage: {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => void mem.set(k, v),
    removeItem: (k: string) => void mem.delete(k),
  },
  location: { search: '', hash: '' },
};

const { CloudSave, decideSync } = await import('../src/systems/CloudSave');
const { MockBackend } = await import('../src/systems/cloud/MockBackend');
const { GameState } = await import('../src/systems/GameState');
const { SaveManager, SAVE_KEY } = await import('../src/systems/SaveManager');

const file = (savedAt: number) => ({ version: 1, savedAt, state: GameState.newGame('kael') });

describe('decisão de sincronização', () => {
  const me = 'u1';
  it('só um lado tem progresso', () => {
    expect(decideSync(null, null, null, me)).toBe('none');
    expect(decideSync(file(1), null, null, me)).toBe('upload');
    expect(decideSync(null, file(1), null, me)).toBe('download');
  });
  it('mesma conta neste aparelho: quem mudou desde a última sincronização vence', () => {
    const meta = { userId: me, savedAt: 100 };
    expect(decideSync(file(200), file(100), meta, me)).toBe('upload');
    expect(decideSync(file(100), file(300), meta, me)).toBe('download');
    expect(decideSync(file(200), file(300), meta, me)).toBe('conflict');
  });
  it('save local de antes do login (ou de outra conta) com nuvem diferente: pergunta', () => {
    expect(decideSync(file(200), file(300), null, me)).toBe('conflict');
    expect(decideSync(file(200), file(300), { userId: 'outra', savedAt: 300 }, me)).toBe('conflict');
  });
  it('mesmo save dos dois lados: nada a fazer', () => {
    expect(decideSync(file(5), file(5), null, me)).toBe('none');
  });
});

describe('fluxo de conta (servidor simulado)', () => {
  beforeEach(() => mem.clear());

  it('criar conta envia o progresso; outro aparelho baixa ao entrar', async () => {
    await CloudSave.init(new MockBackend());
    const st = GameState.newGame('yuki');
    st.money = 4321;
    SaveManager.save();
    await CloudSave.signUp('ana@exemplo.com', 'segredo1', 'Ana');
    expect(CloudSave.user?.name).toBe('Ana');
    expect(await CloudSave.backend!.load()).not.toBeNull();

    // "outro aparelho": sem save local e sem registro de sincronização
    await CloudSave.signOut();
    mem.delete(SAVE_KEY);
    mem.delete('elementais.cloudsync');
    expect(SaveManager.localFile()).toBeNull();
    await CloudSave.signIn('ana@exemplo.com', 'segredo1');
    expect(SaveManager.load()).toBe(true);
    expect(GameState.get().trainerId).toBe('yuki');
    expect(GameState.get().money).toBe(4321);
  });

  it('progresso diferente nos dois lados: espera a escolha do jogador', async () => {
    await CloudSave.init(new MockBackend());
    GameState.newGame('kael');
    SaveManager.save();
    await CloudSave.signUp('bia@exemplo.com', 'segredo1', 'Bia');
    await CloudSave.signOut();
    // neste aparelho começa outro jogo sem conta; depois entra
    mem.delete('elementais.cloudsync');
    await new Promise((r) => setTimeout(r, 5)); // garante outro horário de salvamento
    GameState.newGame('marina');
    SaveManager.save();
    await CloudSave.signIn('bia@exemplo.com', 'segredo1');
    expect(CloudSave.pending).not.toBeNull();
    await CloudSave.resolve('cloud');
    expect(CloudSave.pending).toBeNull();
    SaveManager.load();
    expect(GameState.get().trainerId).toBe('kael');
  });

  it('senha errada e e-mail repetido dão mensagens claras', async () => {
    await CloudSave.init(new MockBackend());
    await CloudSave.signUp('caio@exemplo.com', 'segredo1', 'Caio');
    await CloudSave.signOut();
    await expect(CloudSave.signIn('caio@exemplo.com', 'errada')).rejects.toThrow('E-mail ou senha incorretos.');
    await expect(CloudSave.signUp('caio@exemplo.com', 'segredo1', 'Caio')).rejects.toThrow('Já existe uma conta');
  });

  it('salvar agora envia para a nuvem; excluir conta apaga o progresso online', async () => {
    await CloudSave.init(new MockBackend());
    await CloudSave.signUp('davi@exemplo.com', 'segredo1', 'Davi');
    GameState.newGame('raijin');
    SaveManager.save();
    expect(await CloudSave.uploadNow()).toBe(true);
    expect((await CloudSave.backend!.load())?.state.trainerId).toBe('raijin');
    await CloudSave.deleteAccount();
    expect(CloudSave.user).toBeNull();
    await expect(CloudSave.signIn('davi@exemplo.com', 'segredo1')).rejects.toThrow();
  });
});
