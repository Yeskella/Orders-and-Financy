create table if not exists public.app_meta (
  id text primary key,
  settings jsonb not null default '{}'::jsonb,
  view text not null default 'planner',
  calendar_month text not null default '',
  planner_selected_date text not null default '',
  dogs_selected_date text not null default '',
  money_active_tab_id text not null default '',
  feed_filters jsonb not null default '{"search":"","mode":"active"}'::jsonb,
  updated_at text not null default ''
);

create table if not exists public.planner_entries (
  id text primary key,
  date text not null default '',
  text text not null default '',
  repeat_monthly boolean not null default false,
  created_at text not null default '',
  created_by text not null default '',
  updated_at text not null default '',
  updated_by text not null default ''
);

create table if not exists public.dogs_entries (
  id text primary key,
  date text not null default '',
  text text not null default '',
  repeat_monthly boolean not null default false,
  created_at text not null default '',
  created_by text not null default '',
  updated_at text not null default '',
  updated_by text not null default ''
);

create table if not exists public.posts (
  id text primary key,
  author text not null default '',
  text text not null default '',
  images jsonb not null default '[]'::jsonb,
  pinned boolean not null default false,
  archived boolean not null default false,
  created_at text not null default '',
  created_by text not null default '',
  updated_at text not null default '',
  updated_by text not null default '',
  start_date text not null default '',
  end_date text not null default ''
);

create table if not exists public.post_comments (
  id text primary key,
  post_id text not null references public.posts(id) on delete cascade,
  author text not null default '',
  text text not null default '',
  parent_id text not null default '',
  created_at text not null default '',
  created_by text not null default '',
  updated_at text not null default '',
  updated_by text not null default ''
);

alter table public.post_comments
  add column if not exists parent_id text not null default '';

create table if not exists public.money_tabs (
  id text primary key,
  title text not null default '',
  position integer not null default 0,
  created_at text not null default '',
  created_by text not null default '',
  updated_at text not null default '',
  updated_by text not null default ''
);

create table if not exists public.money_groups (
  id text primary key,
  tab_id text not null references public.money_tabs(id) on delete cascade,
  title text not null default '',
  position integer not null default 0,
  created_at text not null default '',
  created_by text not null default '',
  updated_at text not null default '',
  updated_by text not null default ''
);

create table if not exists public.money_items (
  id text primary key,
  group_id text not null references public.money_groups(id) on delete cascade,
  name text not null default '',
  cost text not null default '',
  completed boolean not null default false,
  is_new boolean not null default false,
  position integer not null default 0,
  created_at text not null default '',
  created_by text not null default '',
  updated_at text not null default '',
  updated_by text not null default ''
);

alter table public.app_meta enable row level security;
alter table public.planner_entries enable row level security;
alter table public.dogs_entries enable row level security;
alter table public.posts enable row level security;
alter table public.post_comments enable row level security;
alter table public.money_tabs enable row level security;
alter table public.money_groups enable row level security;
alter table public.money_items enable row level security;

drop policy if exists "app_meta_all" on public.app_meta;
create policy "app_meta_all" on public.app_meta for all to anon using (true) with check (true);

drop policy if exists "planner_entries_all" on public.planner_entries;
create policy "planner_entries_all" on public.planner_entries for all to anon using (true) with check (true);

drop policy if exists "dogs_entries_all" on public.dogs_entries;
create policy "dogs_entries_all" on public.dogs_entries for all to anon using (true) with check (true);

drop policy if exists "posts_all" on public.posts;
create policy "posts_all" on public.posts for all to anon using (true) with check (true);

drop policy if exists "post_comments_all" on public.post_comments;
create policy "post_comments_all" on public.post_comments for all to anon using (true) with check (true);

drop policy if exists "money_tabs_all" on public.money_tabs;
create policy "money_tabs_all" on public.money_tabs for all to anon using (true) with check (true);

drop policy if exists "money_groups_all" on public.money_groups;
create policy "money_groups_all" on public.money_groups for all to anon using (true) with check (true);

drop policy if exists "money_items_all" on public.money_items;
create policy "money_items_all" on public.money_items for all to anon using (true) with check (true);

insert into public.app_meta (id)
values ('main')
on conflict (id) do nothing;
