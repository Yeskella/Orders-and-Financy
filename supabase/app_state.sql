create table if not exists public.app_state (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

drop policy if exists "app_state_select_main" on public.app_state;
create policy "app_state_select_main"
on public.app_state
for select
to anon
using (id = 'main');

drop policy if exists "app_state_insert_main" on public.app_state;
create policy "app_state_insert_main"
on public.app_state
for insert
to anon
with check (id = 'main');

drop policy if exists "app_state_update_main" on public.app_state;
create policy "app_state_update_main"
on public.app_state
for update
to anon
using (id = 'main')
with check (id = 'main');

insert into public.app_state (id, payload)
values ('main', '{}'::jsonb)
on conflict (id) do nothing;
