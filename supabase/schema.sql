create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  name text primary key,
  password text,
  password_hash text,
  created_at timestamptz not null default now()
);

alter table public.admin_users
  add column if not exists password_hash text;

alter table public.admin_users
  alter column password drop not null;

update public.admin_users
set password_hash = crypt(password, gen_salt('bf'))
where (password_hash is null or password_hash = '')
  and password is not null;

update public.admin_users
set password = null
where password is not null;

create table if not exists public.attendance_records (
  attendance_date date not null,
  employee_id text not null,
  status text not null check (status in ('hadir','sakit','izin','cuti','terlambat','tugas','tubel')),
  updated_by text,
  updated_at timestamptz not null default now(),
  primary key (attendance_date, employee_id)
);

create table if not exists public.daily_reports (
  report_date date primary key,
  generated_by text not null,
  summary_json jsonb not null default '{}'::jsonb,
  records_json jsonb not null default '{}'::jsonb,
  report_text text not null,
  absent_by_department jsonb not null default '[]'::jsonb,
  generated_at timestamptz not null default now()
);

alter table public.daily_reports
  add column if not exists records_json jsonb not null default '{}'::jsonb;

create or replace function public.verify_admin_login(p_name text, p_password text)
returns table(name text)
language sql
security definer
as $$
  select au.name
  from public.admin_users au
  where au.name = p_name
    and au.password_hash is not null
    and au.password_hash = crypt(p_password, au.password_hash)
  limit 1;
$$;

create index if not exists attendance_records_date_idx
  on public.attendance_records(attendance_date);

create or replace function public.set_attendance_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_set_attendance_updated_at on public.attendance_records;
create trigger trg_set_attendance_updated_at
before update on public.attendance_records
for each row
execute function public.set_attendance_updated_at();

-- Sesuaikan password sesuai kebutuhan internal
insert into public.admin_users (name, password, password_hash)
values
  ('Aprianus Aryantho Rondak, S.STP', null, crypt('Bpad2026', gen_salt('bf'))),
  ('Kristoforus R. Hayong, S.Kom., MM', null, crypt('Bpad2026', gen_salt('bf'))),
  ('Marselinus Tahu Tetik', null, crypt('Bpad2026', gen_salt('bf'))),
  ('Joachim A. K. Ulin, SM', null, crypt('Bpad2026', gen_salt('bf'))),
  ('Sandy A. J. L. Pranadjaya, SH', null, crypt('Bpad2026', gen_salt('bf'))),
  ('Melkisedek Koa, A.Md', null, crypt('Bpad2026', gen_salt('bf')))
on conflict (name) do update
set
  password = null,
  password_hash = excluded.password_hash;
