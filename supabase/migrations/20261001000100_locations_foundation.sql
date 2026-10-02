-- Unidades subordinadas ao tenant existente. Sem backfill ou unidades automaticas.
begin;

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  name text not null check (length(btrim(name)) > 0 and length(name) <= 160),
  created_at timestamptz not null default now(),
  -- Tambem atende consultas por organization_id e futuras FKs compostas.
  constraint locations_organization_id_id_key unique (organization_id, id)
);

alter table public.locations enable row level security;
revoke all on table public.locations from public, anon, authenticated;
grant select on public.locations to authenticated;
grant insert (organization_id, name), update (name) on public.locations to authenticated;

-- Mesmo grafo da fundacao: membros/papeis nao dependem de locations.
create policy locations_select_member_or_admin on public.locations
  for select to authenticated
  using (
    exists (select 1 from public.user_global_roles where role = 'ADMIN_ADSCOM')
    or exists (
      select 1 from public.organization_members
      where organization_id = locations.organization_id and user_id = (select auth.uid())
    )
  );
create policy locations_insert_admin on public.locations
  for insert to authenticated
  with check (exists (select 1 from public.user_global_roles where role = 'ADMIN_ADSCOM'));
create policy locations_update_admin on public.locations
  for update to authenticated
  using (exists (select 1 from public.user_global_roles where role = 'ADMIN_ADSCOM'))
  with check (exists (select 1 from public.user_global_roles where role = 'ADMIN_ADSCOM'));

-- Sem DELETE e sem UPDATE de organization_id/id/created_at pela API comum.
commit;
