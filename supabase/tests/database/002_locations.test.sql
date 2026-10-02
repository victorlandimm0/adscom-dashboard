-- SOMENTE LOCAL. Fixtures independentes e rollback, sem alterar testes anteriores.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select no_plan();

insert into auth.users(id) values
('11000000-0000-4000-8000-000000000001'),
('11000000-0000-4000-8000-000000000002'),
('11000000-0000-4000-8000-000000000003'),
('11000000-0000-4000-8000-000000000004');
insert into public.organizations(id,name) values
('21000000-0000-4000-8000-000000000001','TESTE LOCATION A'),
('21000000-0000-4000-8000-000000000002','TESTE LOCATION B'),
('21000000-0000-4000-8000-000000000003','TESTE SEM UNIDADE');
insert into public.organization_members(organization_id,user_id) values
('21000000-0000-4000-8000-000000000001','11000000-0000-4000-8000-000000000001'),
('21000000-0000-4000-8000-000000000002','11000000-0000-4000-8000-000000000002');
insert into public.user_global_roles(user_id,role) values
('11000000-0000-4000-8000-000000000003','ADMIN_ADSCOM');
select is((select count(*) from public.locations where organization_id in ('21000000-0000-4000-8000-000000000001','21000000-0000-4000-8000-000000000002','21000000-0000-4000-8000-000000000003')),0::bigint,'Organizacoes nao geram unidades automaticamente');
insert into public.locations(id,organization_id,name) values
('31000000-0000-4000-8000-000000000001','21000000-0000-4000-8000-000000000001','A1'),
('31000000-0000-4000-8000-000000000002','21000000-0000-4000-8000-000000000002','B1');

set local request.jwt.claims = '{"sub":"11000000-0000-4000-8000-000000000001","role":"authenticated"}';
set local role authenticated;
select is((select name from public.locations where id='31000000-0000-4000-8000-000000000001'),'A1','A le unidade A');
select is((select count(*) from public.locations where id='31000000-0000-4000-8000-000000000002'),0::bigint,'A nao le UUID de B');
select throws_ok($$insert into public.locations(organization_id,name) values ('21000000-0000-4000-8000-000000000001','negada')$$,'42501',null,'Cliente nao cria nem em sua empresa');
with changed as (update public.locations set name='negado' where id='31000000-0000-4000-8000-000000000001' returning id) select is((select count(*) from changed),0::bigint,'Cliente nao edita nome');
select throws_ok($$update public.locations set organization_id='21000000-0000-4000-8000-000000000002' where id='31000000-0000-4000-8000-000000000001'$$,'42501',null,'Cliente nao move tenant');
select throws_ok($$delete from public.locations where id='31000000-0000-4000-8000-000000000001'$$,'42501',null,'Cliente nao exclui');
reset role;
set local request.jwt.claims = '{"sub":"11000000-0000-4000-8000-000000000002","role":"authenticated"}';
set local role authenticated;
select is((select name from public.locations where id='31000000-0000-4000-8000-000000000002'),'B1','B le unidade B');
select is((select count(*) from public.locations where id='31000000-0000-4000-8000-000000000001'),0::bigint,'B nao le UUID de A');
reset role;
set local request.jwt.claims = '{"sub":"11000000-0000-4000-8000-000000000004","role":"authenticated"}';
set local role authenticated;
select is((select count(*) from public.locations),0::bigint,'Sem vinculo nao le unidades');
reset role;
set local request.jwt.claims = '{}';
set local role anon;
select throws_ok($$select * from public.locations$$,'42501',null,'Anonimo nao le');
select throws_ok($$insert into public.locations(organization_id,name) values ('21000000-0000-4000-8000-000000000001','negada')$$,'42501',null,'Anonimo nao cria');
reset role;
set local request.jwt.claims = '{"sub":"11000000-0000-4000-8000-000000000003","role":"authenticated"}';
set local role authenticated;
select is((select count(*) from public.locations where organization_id in ('21000000-0000-4000-8000-000000000001','21000000-0000-4000-8000-000000000002')),2::bigint,'Admin sem membership le A e B');
select lives_ok($$insert into public.locations(organization_id,name) values ('21000000-0000-4000-8000-000000000001','A2')$$,'Admin cria segunda unidade');
select ok((select id is not null and created_at is not null from public.locations where organization_id='21000000-0000-4000-8000-000000000001' and name='A2'),'Defaults geram UUID e data');
with changed as (update public.locations set name='A1 editada' where id='31000000-0000-4000-8000-000000000001' returning id) select is((select count(*) from changed),1::bigint,'Admin edita nome');
select throws_ok($$insert into public.locations(organization_id,name) values ('21000000-0000-4000-8000-000000000099','orfã')$$,'23503',null,'FK recusa empresa inexistente');
select throws_ok($$insert into public.locations(name) values ('orfã')$$,'23502',null,'Empresa obrigatoria');
select throws_ok($$insert into public.locations(organization_id) values ('21000000-0000-4000-8000-000000000001')$$,'23502',null,'Nome obrigatorio');
select throws_ok($$insert into public.locations(organization_id,name) values ('21000000-0000-4000-8000-000000000001','   ')$$,'23514',null,'Nome em branco recusado');
select throws_ok($$insert into public.locations(organization_id,name) values ('21000000-0000-4000-8000-000000000001',repeat('x',161))$$,'23514',null,'Nome maior que 160 recusado');
select lives_ok($$insert into public.locations(organization_id,name) values ('21000000-0000-4000-8000-000000000002',repeat('x',160))$$,'Limite 160 aceito');
select throws_ok($$update public.locations set organization_id='21000000-0000-4000-8000-000000000002' where id='31000000-0000-4000-8000-000000000001'$$,'42501',null,'Nem admin move tenant');
select throws_ok($$update public.locations set id=gen_random_uuid() where id='31000000-0000-4000-8000-000000000001'$$,'42501',null,'ID imutavel na API');
select throws_ok($$update public.locations set created_at=now() where id='31000000-0000-4000-8000-000000000001'$$,'42501',null,'Data protegida');
select throws_ok($$insert into public.locations(id,organization_id,name) values (gen_random_uuid(),'21000000-0000-4000-8000-000000000001','ID arbitrario')$$,'42501',null,'Insert nao aceita ID do cliente');
select throws_ok($$delete from public.locations where id='31000000-0000-4000-8000-000000000001'$$,'42501',null,'Exclusao fisica tambem negada ao admin');
reset role;

-- Sonda em schema nao exposto, criada na transacao e removida pelo rollback.
create schema locations_test;
create table locations_test.location_reference_probe (
 organization_id uuid not null,
 location_id uuid not null,
 foreign key (organization_id,location_id) references public.locations(organization_id,id)
);
select lives_ok($$insert into locations_test.location_reference_probe values ('21000000-0000-4000-8000-000000000001','31000000-0000-4000-8000-000000000001')$$,'Par composto correto aceito');
select throws_ok($$insert into locations_test.location_reference_probe values ('21000000-0000-4000-8000-000000000002','31000000-0000-4000-8000-000000000001')$$,'23503',null,'Par de empresas diferentes recusado');
select throws_ok($$update locations_test.location_reference_probe set organization_id='21000000-0000-4000-8000-000000000002'$$,'23503',null,'Update cross-organization recusado');
insert into public.locations(organization_id,name) values ('21000000-0000-4000-8000-000000000003','Sem membros');
select throws_ok($$delete from public.organizations where id='21000000-0000-4000-8000-000000000003'$$,'23503',null,'RESTRICT protege empresa com unidade mesmo sem membros');
select ok((select relrowsecurity from pg_class where oid='public.locations'::regclass),'RLS habilitada');
select ok(not has_table_privilege('authenticated','public.locations','DELETE'),'Grant DELETE ausente');
select ok(not has_column_privilege('authenticated','public.locations','organization_id','UPDATE'),'Grant de mover tenant ausente');

delete from public.organization_members where user_id='11000000-0000-4000-8000-000000000001';
set local request.jwt.claims = '{"sub":"11000000-0000-4000-8000-000000000001","role":"authenticated"}';
set local role authenticated;
select is((select count(*) from public.locations),0::bigint,'Revogacao do vinculo retira unidades');
reset role;
delete from public.user_global_roles where user_id='11000000-0000-4000-8000-000000000003';
set local request.jwt.claims = '{"sub":"11000000-0000-4000-8000-000000000003","role":"authenticated"}';
set local role authenticated;
select is((select count(*) from public.locations),0::bigint,'Revogacao de admin retira leitura');
select throws_ok($$insert into public.locations(organization_id,name) values ('21000000-0000-4000-8000-000000000001','revogado')$$,'42501',null,'Admin revogado nao cria');
with changed as (update public.locations set name='revogado' where id='31000000-0000-4000-8000-000000000001' returning id) select is((select count(*) from changed),0::bigint,'Admin revogado nao edita');
reset role;
select * from finish();
rollback;
