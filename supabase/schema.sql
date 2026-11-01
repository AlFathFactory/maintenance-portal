-- Run once in the SQL Editor of the chosen Supabase project.
-- Anonymous visitors may read equipment profiles. Only listed maintenance admins may edit.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists public.maintenance_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.equipment (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  type text not null check (type in ('machine', 'crane')),
  name text not null check (length(trim(name)) > 0),
  code text not null default '',
  model text not null default '',
  power text not null default '',
  length_spec text not null default '',
  p_spec text not null default '',
  made_in text not null default '',
  location text not null default '',
  max_load text not null default '',
  height text not null default '',
  width text not null default '',
  status text not null default 'unknown' check (status in ('unknown', 'operational', 'out_of_service', 'maintenance')),
  last_maintenance_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.maintenance_records (
  id uuid primary key default gen_random_uuid(),
  equipment_id uuid not null references public.equipment(id) on delete cascade,
  kind text not null check (kind in ('repair', 'periodic')),
  performed_on date not null,
  notes text not null check (length(trim(notes)) > 0),
  status_after text check (status_after in ('operational', 'out_of_service', 'maintenance')),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists maintenance_records_equipment_date_idx
  on public.maintenance_records(equipment_id, performed_on desc);

alter table public.maintenance_admins enable row level security;
alter table public.equipment enable row level security;
alter table public.maintenance_records enable row level security;

revoke all on public.maintenance_admins from anon, authenticated;
revoke all on public.equipment from anon, authenticated;
revoke all on public.maintenance_records from anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select on public.equipment to anon, authenticated;
grant insert, update on public.equipment to authenticated;
grant select on public.maintenance_admins to authenticated;
grant select, insert on public.maintenance_records to authenticated;

create policy "Admins can see their own membership" on public.maintenance_admins
  for select to authenticated using (user_id = (select auth.uid()));

create policy "Anyone can read equipment" on public.equipment
  for select to anon, authenticated using (true);

create policy "Admins can add equipment" on public.equipment
  for insert to authenticated with check (
    exists (select 1 from public.maintenance_admins a where a.user_id = (select auth.uid()))
  );

create policy "Admins can edit equipment" on public.equipment
  for update to authenticated
  using (exists (select 1 from public.maintenance_admins a where a.user_id = (select auth.uid())))
  with check (exists (select 1 from public.maintenance_admins a where a.user_id = (select auth.uid())));

create policy "Admins can read maintenance records" on public.maintenance_records
  for select to authenticated using (
    exists (select 1 from public.maintenance_admins a where a.user_id = (select auth.uid()))
  );

create policy "Admins can add maintenance records" on public.maintenance_records
  for insert to authenticated with check (
    created_by = (select auth.uid())
    and exists (select 1 from public.maintenance_admins a where a.user_id = (select auth.uid()))
  );

-- Keep the public last-service date and optional status in sync with each new record.
create or replace function private.apply_maintenance_record()
returns trigger language plpgsql set search_path = '' as $$
begin
  update public.equipment
     set last_maintenance_on = greatest(last_maintenance_on, new.performed_on),
         status = coalesce(new.status_after, status),
         updated_at = now()
   where id = new.equipment_id;
  return new;
end;
$$;
revoke all on function private.apply_maintenance_record() from public, anon, authenticated;
drop trigger if exists apply_maintenance_record on public.maintenance_records;
create trigger apply_maintenance_record
  after insert on public.maintenance_records
  for each row execute function private.apply_maintenance_record();

-- Add the first admin after creating a user in Authentication > Users:
-- insert into public.maintenance_admins (user_id) values ('PASTE_AUTH_USER_UUID');
