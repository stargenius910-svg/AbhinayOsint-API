-- Run this in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.api_configs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  route text not null,
  public_id text not null unique,
  upstream_url text not null,
  owner_label text,
  enabled boolean not null default true,
  request_limit bigint,
  limit_period text not null default 'day' check (limit_period in ('day','month','total')),
  requests_used bigint not null default 0,
  period_started_at timestamptz not null default now(),
  transform jsonb not null default '{"developer":"Abhinay","remove_fields":["youtube"],"show_usage":true}'::jsonb,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
alter table public.api_configs enable row level security;

-- The application uses the service-role key for admin/API operations.
-- Do not expose SUPABASE_SERVICE_ROLE_KEY to the browser.
-- No public policies are created intentionally.

create index if not exists api_configs_route_public_id_idx
on public.api_configs(route, public_id);