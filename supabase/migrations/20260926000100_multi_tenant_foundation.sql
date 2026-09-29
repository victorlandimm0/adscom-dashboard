-- Fundação ADSCOM. Sem dados de clientes, usuários ou concessões administrativas.
begin;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) > 0),
  created_at timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'CLIENTE' check (role = 'CLIENTE'),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);
create index organization_members_user_id_idx
  on public.organization_members (user_id, organization_id);

create table public.user_global_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role = 'ADMIN_ADSCOM'),
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.user_global_roles enable row level security;

-- Revogar privilégios padrão antes de conceder o mínimo necessário.
revoke all on table public.organizations, public.organization_members,
  public.user_global_roles from public, anon, authenticated;
grant select on public.organizations, public.organization_members,
  public.user_global_roles to authenticated;
grant insert (name), update (name) on public.organizations to authenticated;
grant insert (organization_id, user_id, role), update (organization_id, user_id, role)
  on public.organization_members to authenticated;
grant delete on public.organization_members to authenticated;

-- Grafo sem ciclos: papéis -> auth.uid(); membros -> papéis;
-- organizações -> membros/papéis. Nenhuma função SECURITY DEFINER é necessária.
create policy global_roles_select_own on public.user_global_roles
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy members_select_own_or_admin on public.organization_members
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (select 1 from public.user_global_roles where role = 'ADMIN_ADSCOM')
  );
create policy members_insert_admin on public.organization_members
  for insert to authenticated
  with check (exists (select 1 from public.user_global_roles where role = 'ADMIN_ADSCOM'));
create policy members_update_admin on public.organization_members
  for update to authenticated
  using (exists (select 1 from public.user_global_roles where role = 'ADMIN_ADSCOM'))
  with check (exists (select 1 from public.user_global_roles where role = 'ADMIN_ADSCOM'));
create policy members_delete_admin on public.organization_members
  for delete to authenticated
  using (exists (select 1 from public.user_global_roles where role = 'ADMIN_ADSCOM'));

create policy organizations_select_member_or_admin on public.organizations
  for select to authenticated
  using (
    exists (select 1 from public.user_global_roles where role = 'ADMIN_ADSCOM')
    or exists (
      select 1 from public.organization_members
      where organization_id = organizations.id and user_id = (select auth.uid())
    )
  );
create policy organizations_insert_admin on public.organizations
  for insert to authenticated
  with check (exists (select 1 from public.user_global_roles where role = 'ADMIN_ADSCOM'));
create policy organizations_update_admin on public.organizations
  for update to authenticated
  using (exists (select 1 from public.user_global_roles where role = 'ADMIN_ADSCOM'))
  with check (exists (select 1 from public.user_global_roles where role = 'ADMIN_ADSCOM'));

commit;
