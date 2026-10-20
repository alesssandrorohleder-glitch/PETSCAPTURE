-- ============================================================================
-- Elementais — banco de dados do login e salvamento online (Supabase)
-- Como usar: no painel do Supabase, abra "SQL Editor" → "New query",
-- cole TODO este arquivo e clique em "Run". Pode rodar de novo sem problema.
-- ============================================================================

-- Um save por jogador
create table if not exists public.saves (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  data         jsonb not null,
  trainer      text,
  play_seconds integer not null default 0,
  updated_at   timestamptz not null default now()
);

-- Limite de tamanho do save (evita abuso; um save normal tem poucos KB)
alter table public.saves drop constraint if exists save_size;
alter table public.saves add constraint save_size check (pg_column_size(data) < 200000);

-- Segurança: cada jogador só lê e altera o PRÓPRIO save (Row Level Security)
alter table public.saves enable row level security;

drop policy if exists "ler o próprio save" on public.saves;
create policy "ler o próprio save" on public.saves
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "criar o próprio save" on public.saves;
create policy "criar o próprio save" on public.saves
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "atualizar o próprio save" on public.saves;
create policy "atualizar o próprio save" on public.saves
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "apagar o próprio save" on public.saves;
create policy "apagar o próprio save" on public.saves
  for delete to authenticated using ((select auth.uid()) = user_id);

-- "Excluir conta" dentro do jogo (LGPD): apaga o usuário que está logado e o save dele
create or replace function public.delete_my_account()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.users where id = auth.uid();
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
