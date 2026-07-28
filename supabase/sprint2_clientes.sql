-- Ejecutar una sola vez en Supabase > SQL Editor
alter table public.clients add column if not exists phone_landline text;
alter table public.clients add column if not exists address_number text;
alter table public.clients add column if not exists address_block text;
alter table public.clients add column if not exists address_stair text;
alter table public.clients add column if not exists address_floor text;
alter table public.clients add column if not exists address_door text;
alter table public.clients add column if not exists province text;
alter table public.clients add column if not exists bank_holder text;
alter table public.clients add column if not exists iban text;
alter table public.clients add column if not exists marketing_email boolean not null default false;
alter table public.clients add column if not exists marketing_whatsapp boolean not null default false;
alter table public.clients add column if not exists marketing_sms boolean not null default false;
alter table public.clients add column if not exists marketing_offers boolean not null default false;
alter table public.clients add column if not exists assigned_label text;
create unique index if not exists clients_tax_id_unique on public.clients (upper(tax_id)) where tax_id is not null;
