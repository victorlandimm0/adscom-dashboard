-- Estado final da sequencia de migrations. Fixtures exclusivamente em rollback.
begin;
set local search_path = public, extensions;
select plan(12);
insert into public.organizations(id,name) values ('23000000-0000-4000-8000-000000000001','TESTE SOCIAL TYPES');

select lives_ok(format('insert into public.digital_channels(organization_id,type,url) values (%L,%L,%L)',
  '23000000-0000-4000-8000-000000000001', channel_type, 'https://example.test/manual'),
  'CHECK aceita ' || channel_type)
from unnest(array['SITE','WHATSAPP','GOOGLE_BUSINESS_PROFILE','INSTAGRAM','FACEBOOK','TIKTOK','LINKEDIN','YOUTUBE']) channel_type;

select throws_ok(format('insert into public.digital_channels(organization_id,type,url) values (%L,%L,%L)',
  '23000000-0000-4000-8000-000000000001', channel_type, 'https://example.test/manual'),
  '23514', null, 'CHECK rejeita valor fora do conjunto: ' || channel_type)
from unnest(array['','UNKNOWN_CHANNEL','instagram','YOUTUBE ']) channel_type;

select * from finish();
rollback;
