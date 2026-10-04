-- Inventario MANUAL de canais. Sem integracoes, seed ou alteracoes no nucleo.
begin;

create table public.digital_channels (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  location_id uuid,
  type text not null,
  url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint digital_channels_type_check
    check (type in ('SITE', 'WHATSAPP', 'GOOGLE_BUSINESS_PROFILE')),
  -- Barreira basica dos tres tipos do MVP, nao um parser universal.
  -- Autoridade nao vazia/sem credenciais; rejeita whitespace em vez de trim.
  constraint digital_channels_url_check check (
    char_length(url) between 1 and 2048
    and url ~ '^https://[^/?#@[:space:][:cntrl:]]+([/?#]|$)'
    and url !~ '[[:space:][:cntrl:]]'
  ),
  constraint digital_channels_organization_id_fkey
    foreign key (organization_id) references public.organizations(id)
    on delete restrict on update no action not deferrable,
  constraint digital_channels_organization_location_fkey
    foreign key (organization_id, location_id)
    references public.locations(organization_id, id) match simple
    on delete restrict on update no action not deferrable
);

-- Sem equivalente na tabela filha: atende tenant, unidade e referencias da FK.
create index digital_channels_organization_location_idx
  on public.digital_channels (organization_id, location_id);

create function public.set_digital_channels_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if new.url is distinct from old.url
     or new.location_id is distinct from old.location_id then
    new.updated_at := statement_timestamp();
  else
    new.updated_at := old.updated_at;
  end if;
  return new;
end;
$$;

revoke all on function public.set_digital_channels_updated_at() from public, anon, authenticated;
create trigger digital_channels_set_updated_at
  before update on public.digital_channels
  for each row execute function public.set_digital_channels_updated_at();

alter table public.digital_channels enable row level security;
revoke all on table public.digital_channels from public, anon, authenticated;
grant select on public.digital_channels to authenticated;
grant insert (organization_id, location_id, type, url), update (location_id, url)
  on public.digital_channels to authenticated;

-- Mesmo grafo existente: papeis e membros nao dependem de canais.
create policy digital_channels_select_member_or_admin on public.digital_channels
  for select to authenticated
  using (
    exists (select 1 from public.user_global_roles where role = 'ADMIN_ADSCOM')
    or exists (
      select 1 from public.organization_members
      where organization_id = digital_channels.organization_id and user_id = (select auth.uid())
    )
  );
create policy digital_channels_insert_admin on public.digital_channels
  for insert to authenticated
  with check (exists (select 1 from public.user_global_roles where role = 'ADMIN_ADSCOM'));
create policy digital_channels_update_admin on public.digital_channels
  for update to authenticated
  using (exists (select 1 from public.user_global_roles where role = 'ADMIN_ADSCOM'))
  with check (exists (select 1 from public.user_global_roles where role = 'ADMIN_ADSCOM'));

-- Sem DELETE e sem escrita de id/organization_id/type/datas no UPDATE da API.
commit;
