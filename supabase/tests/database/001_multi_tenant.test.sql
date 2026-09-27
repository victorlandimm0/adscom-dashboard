-- Somente Supabase LOCAL descartável. Fixtures em transação; rollback ao final.

begin;

create extension if not exists pgtap with schema extensions;

set local search_path = public, extensions;

select no_plan();

insert into auth.users (id) values ('10000000-0000-4000-8000-000000000001'),('10000000-0000-4000-8000-000000000002'),('10000000-0000-4000-8000-000000000003'),('10000000-0000-4000-8000-000000000004'),('10000000-0000-4000-8000-000000000005'),('10000000-0000-4000-8000-000000000006');

insert into public.organizations (id,name) values ('20000000-0000-4000-8000-000000000001','TESTE RLS A'),('20000000-0000-4000-8000-000000000002','TESTE RLS B');

insert into public.organization_members (organization_id,user_id) values ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001'),('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002'),('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000003'),('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000003');

insert into public.user_global_roles (user_id,role) values ('10000000-0000-4000-8000-000000000005','ADMIN_ADSCOM'),('10000000-0000-4000-8000-000000000006','ADMIN_ADSCOM');

reset role;

set local request.jwt.claims = '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}';

set local role authenticated;

select is((select count(*) from public.organizations), 1::bigint, 'A: cliente A ve somente uma empresa');

select is((select count(*) from public.organizations where id='20000000-0000-4000-8000-000000000001'), 1::bigint, 'A: empresa A visivel');

select is((select count(*) from public.organizations where id='20000000-0000-4000-8000-000000000002'), 0::bigint, 'B: UUID direto da empresa B invisivel');

select is((select count(*) from public.organization_members), 1::bigint, 'Cliente le somente o proprio vinculo');

select is((select count(*) from public.user_global_roles), 0::bigint, 'Cliente nao ve papeis de administradores');

select throws_ok($sql$insert into public.organizations(name) values ('TESTE INDEVIDO')$sql$, '42501', null, 'C: cliente nao cria empresa');

select throws_ok($sql$insert into public.organization_members(organization_id,user_id) values ('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001')$sql$, '42501', null, 'D: cliente nao se vincula a B');

select throws_ok($sql$insert into public.user_global_roles(user_id,role) values ('10000000-0000-4000-8000-000000000001','ADMIN_ADSCOM')$sql$, '42501', null, 'E: cliente nao se promove');

with changed as (update public.organizations set name='TESTE INDEVIDO' where id='20000000-0000-4000-8000-000000000001' returning id) select is((select count(*) from changed), 0::bigint, 'Cliente nao edita nem sua empresa');

with changed as (update public.organization_members set organization_id='20000000-0000-4000-8000-000000000002' where user_id='10000000-0000-4000-8000-000000000001' returning user_id) select is((select count(*) from changed), 0::bigint, 'Cliente nao muda organization_id');

with changed as (delete from public.organization_members where user_id='10000000-0000-4000-8000-000000000001' returning user_id) select is((select count(*) from changed), 0::bigint, 'Cliente nao remove vinculos');

select throws_ok($sql$delete from public.organizations where id='20000000-0000-4000-8000-000000000001'$sql$, '42501', null, 'Cliente nao exclui empresa');

select throws_ok($sql$update public.user_global_roles set role=role$sql$, '42501', null, 'Cliente nao altera papeis globais');

select throws_ok($sql$delete from public.user_global_roles$sql$, '42501', null, 'Cliente nao remove papeis globais');

reset role;

set local request.jwt.claims = '{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}';

set local role authenticated;

select is((select count(*) from public.organizations where id='20000000-0000-4000-8000-000000000001'), 0::bigint, 'B nao ve A');

select is((select count(*) from public.organizations), 1::bigint, 'B ve sua empresa');

reset role;

set local request.jwt.claims = '{"sub":"10000000-0000-4000-8000-000000000003","role":"authenticated"}';

set local role authenticated;

select is((select count(*) from public.organizations), 2::bigint, 'Usuario com dois vinculos ve ambas');

reset role;

set local request.jwt.claims = '{"sub":"10000000-0000-4000-8000-000000000004","role":"authenticated"}';

set local role authenticated;

select is((select count(*) from public.organizations), 0::bigint, 'Sem vinculo nao ve empresas');

reset role;

set local request.jwt.claims = '{}';

set local role anon;

select throws_ok($sql$select * from public.organizations$sql$, '42501', null, 'H: anon nao consulta organizations');

select throws_ok($sql$select * from public.organization_members$sql$, '42501', null, 'H: anon nao consulta organization_members');

select throws_ok($sql$select * from public.user_global_roles$sql$, '42501', null, 'H: anon nao consulta user_global_roles');

select throws_ok($sql$insert into public.organizations(name) values ('TESTE ANON')$sql$, '42501', null, 'Anon nao escreve');

reset role;

set local request.jwt.claims = '{"sub":"10000000-0000-4000-8000-000000000005","role":"authenticated"}';

set local role authenticated;

select is((select count(*) from public.organizations), 2::bigint, 'F: admin ve A e B sem vinculos');

select is((select count(*) from public.organization_members), 4::bigint, 'Admin ve todos os vinculos');

select is((select count(*) from public.user_global_roles), 1::bigint, 'Admin le somente a propria concessao');

select lives_ok($sql$insert into public.organizations(name) values ('TESTE RLS C')$sql$, 'G: admin cria empresa');

with changed as (update public.organizations set name='TESTE RLS A editada' where id='20000000-0000-4000-8000-000000000001' returning id) select is((select count(*) from changed), 1::bigint, 'Admin edita empresa');

select lives_ok($sql$insert into public.organization_members(organization_id,user_id) values ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000004')$sql$, 'Admin cria vinculo');

with changed as (update public.organization_members set organization_id='20000000-0000-4000-8000-000000000002' where user_id='10000000-0000-4000-8000-000000000004' returning user_id) select is((select count(*) from changed), 1::bigint, 'Admin edita vinculo com WITH CHECK');

with changed as (delete from public.organization_members where user_id='10000000-0000-4000-8000-000000000004' returning user_id) select is((select count(*) from changed), 1::bigint, 'Admin remove vinculo');

select throws_ok($sql$insert into public.user_global_roles(user_id,role) values ('10000000-0000-4000-8000-000000000001','ADMIN_ADSCOM')$sql$, '42501', null, 'Admin nao concede papel global');

select throws_ok($sql$delete from public.user_global_roles$sql$, '42501', null, 'Admin nao revoga papel global via API');

select throws_ok($sql$update public.user_global_roles set role=role$sql$, '42501', null, 'Admin nao edita papel global');

select throws_ok($sql$delete from public.organizations where id='20000000-0000-4000-8000-000000000001'$sql$, '42501', null, 'Admin nao exclui empresa');

select throws_ok($sql$update public.organizations set id='20000000-0000-4000-8000-000000000002' where id='20000000-0000-4000-8000-000000000001'$sql$, '42501', null, 'ID da empresa protegido por grant de coluna');

select throws_ok($sql$insert into public.organizations(name) values ('   ')$sql$, '23514', null, 'Nome vazio recusado');

select throws_ok($sql$insert into public.organization_members(organization_id,user_id,role) values ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000004','ADMIN_ADSCOM')$sql$, '23514', null, 'Papel global nao cabe no vinculo');

select lives_ok($sql$delete from public.organization_members where user_id='10000000-0000-4000-8000-000000000001'$sql$, 'Admin revoga vinculo A');

reset role;

set local request.jwt.claims = '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}';

set local role authenticated;

select is((select count(*) from public.organizations), 0::bigint, 'I: vinculo revogado retira acesso no proximo statement');

reset role;

delete from public.user_global_roles where user_id='10000000-0000-4000-8000-000000000005';

reset role;

set local request.jwt.claims = '{"sub":"10000000-0000-4000-8000-000000000005","role":"authenticated"}';

set local role authenticated;

select is((select count(*) from public.organizations), 0::bigint, 'Revogacao de admin retira acesso sem renovar claims');

select throws_ok($sql$insert into public.organizations(name) values ('TESTE REVOGADO')$sql$, '42501', null, 'Admin revogado nao escreve');

reset role;

select throws_ok($sql$delete from public.organizations where id='20000000-0000-4000-8000-000000000002'$sql$, '23503', null, 'FK impede exclusao de empresa com vinculos');

select throws_ok($sql$insert into public.user_global_roles(user_id,role) values ('10000000-0000-4000-8000-000000000001','CLIENTE')$sql$, '23514', null, 'CHECK restringe papeis globais');

delete from auth.users where id='10000000-0000-4000-8000-000000000003';

select is((select count(*) from public.organization_members where user_id='10000000-0000-4000-8000-000000000003'), 0::bigint, 'Excluir usuario remove vinculos por CASCADE');

delete from auth.users where id='10000000-0000-4000-8000-000000000006';

select is((select count(*) from public.user_global_roles where user_id='10000000-0000-4000-8000-000000000006'), 0::bigint, 'Excluir usuario remove papeis por CASCADE');

select ok((select relrowsecurity from pg_class where oid='public.organizations'::regclass), 'RLS ativa em organizations');

select ok((select relrowsecurity from pg_class where oid='public.organization_members'::regclass), 'RLS ativa em organization_members');

select ok((select relrowsecurity from pg_class where oid='public.user_global_roles'::regclass), 'RLS ativa em user_global_roles');

select * from finish();

rollback;
