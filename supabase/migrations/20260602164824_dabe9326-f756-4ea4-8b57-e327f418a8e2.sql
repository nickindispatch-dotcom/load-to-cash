
-- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile read" on public.profiles for select to authenticated using (id = auth.uid());
create policy "own profile insert" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid());

-- auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  insert into public.settings (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end; $$;

-- settings
create table public.settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  sender_name text default '',
  company_name text default '',
  phone text default '',
  email text default '',
  address text default '',
  logo_url text,
  zelle text default '',
  cashapp text default '',
  bank_transfer text default '',
  default_fee_pct numeric not null default 5,
  default_template_id uuid,
  invoice_counter integer not null default 1000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.settings to authenticated;
grant all on public.settings to service_role;
alter table public.settings enable row level security;
create policy "own settings all" on public.settings for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- carriers
create table public.carriers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default '',
  mc_number text default '',
  address text default '',
  phone text default '',
  created_at timestamptz not null default now()
);
create index on public.carriers(user_id);
grant select, insert, update, delete on public.carriers to authenticated;
grant all on public.carriers to service_role;
alter table public.carriers enable row level security;
create policy "own carriers" on public.carriers for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- invoices (declared before loads for FK)
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  invoice_number text not null,
  invoice_date date not null default current_date,
  due_date date not null default (current_date + interval '30 days'),
  carrier_id uuid references public.carriers(id) on delete set null,
  gross numeric not null default 0,
  fee_pct numeric not null default 5,
  fee_amount numeric not null default 0,
  due numeric not null default 0,
  status text not null default 'unpaid',
  template_id uuid,
  pdf_url text,
  xlsx_url text,
  notes text,
  created_at timestamptz not null default now()
);
create index on public.invoices(user_id);
grant select, insert, update, delete on public.invoices to authenticated;
grant all on public.invoices to service_role;
alter table public.invoices enable row level security;
create policy "own invoices" on public.invoices for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- loads
create table public.loads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  carrier_id uuid references public.carriers(id) on delete set null,
  invoice_id uuid references public.invoices(id) on delete set null,
  load_number text default '',
  broker text default '',
  pickup_date date,
  pickup_city text default '',
  pickup_state text default '',
  delivery_city text default '',
  delivery_state text default '',
  rate numeric not null default 0,
  source_file_url text,
  raw_extraction jsonb,
  created_at timestamptz not null default now()
);
create index on public.loads(user_id);
create index on public.loads(invoice_id);
grant select, insert, update, delete on public.loads to authenticated;
grant all on public.loads to service_role;
alter table public.loads enable row level security;
create policy "own loads" on public.loads for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- templates
create table public.invoice_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  config jsonb not null default '{}'::jsonb,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.invoice_templates(user_id);
grant select, insert, update, delete on public.invoice_templates to authenticated;
grant all on public.invoice_templates to service_role;
alter table public.invoice_templates enable row level security;
create policy "templates read own or defaults" on public.invoice_templates for select to authenticated using (user_id = auth.uid() or user_id is null);
create policy "templates insert own" on public.invoice_templates for insert to authenticated with check (user_id = auth.uid());
create policy "templates update own" on public.invoice_templates for update to authenticated using (user_id = auth.uid());
create policy "templates delete own" on public.invoice_templates for delete to authenticated using (user_id = auth.uid());

-- seed defaults
insert into public.invoice_templates (user_id, name, config, is_default) values
  (null, 'Professional', '{"primary":"#1e3a8a","accent":"#3b82f6","headerStyle":"bar","font":"helvetica"}'::jsonb, true),
  (null, 'Modern', '{"primary":"#0f172a","accent":"#10b981","headerStyle":"minimal","font":"helvetica"}'::jsonb, false),
  (null, 'Minimal', '{"primary":"#000000","accent":"#666666","headerStyle":"plain","font":"helvetica"}'::jsonb, false);

-- trigger for new users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at trigger on settings
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
create trigger settings_touch before update on public.settings
  for each row execute function public.touch_updated_at();
