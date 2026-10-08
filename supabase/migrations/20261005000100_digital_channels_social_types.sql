-- Expansao aditiva dos tipos de canais manuais; sem alteracao de permissoes.
begin;

alter table public.digital_channels drop constraint digital_channels_type_check;
alter table public.digital_channels add constraint digital_channels_type_check
  check (type in (
    'SITE', 'WHATSAPP', 'GOOGLE_BUSINESS_PROFILE',
    'INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'LINKEDIN', 'YOUTUBE'
  ));

commit;
