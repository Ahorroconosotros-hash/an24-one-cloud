-- ONE v18 · ONE Mail · base multiempresa / multiusuario
-- Ejecutar una sola vez en Supabase SQL Editor. Es idempotente.
create extension if not exists "uuid-ossp";

create table if not exists one_mail_accounts (
  id uuid primary key default uuid_generate_v4(),
  tenant_key text not null default 'legacy-an24',
  one_user_id uuid not null references one_users(id) on delete cascade,
  display_name text not null,
  email_address text not null,
  provider text not null default 'IMAP/SMTP',
  username text not null,
  password_encrypted text not null,
  signature_text text,
  smtp_host text not null,
  smtp_port integer not null default 465,
  smtp_secure boolean not null default true,
  imap_host text not null,
  imap_port integer not null default 993,
  imap_secure boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table one_mail_accounts add column if not exists signature_text text;
create index if not exists one_mail_accounts_user_idx on one_mail_accounts(one_user_id, active);
create index if not exists one_mail_accounts_tenant_idx on one_mail_accounts(tenant_key);

create table if not exists one_mail_messages (
  id uuid primary key default uuid_generate_v4(),
  tenant_key text not null default 'legacy-an24',
  account_id uuid references one_mail_accounts(id) on delete set null,
  one_user_id uuid references one_users(id) on delete set null,
  client_id uuid,
  contract_id uuid,
  opportunity_id uuid,
  direction text not null check (direction in ('inbound','outbound')),
  message_id text,
  from_address text,
  to_addresses text[] default '{}',
  cc_addresses text[] default '{}',
  subject text,
  body_text text,
  body_html text,
  status text not null default 'sent',
  error text,
  sent_at timestamptz,
  received_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists one_mail_messages_user_idx on one_mail_messages(one_user_id, created_at desc);
create index if not exists one_mail_messages_client_idx on one_mail_messages(client_id, created_at desc);
create index if not exists one_mail_messages_tenant_idx on one_mail_messages(tenant_key, created_at desc);

alter table one_mail_accounts enable row level security;
alter table one_mail_messages enable row level security;
-- ONE accede a estas tablas exclusivamente desde sus rutas de servidor mediante service role.
