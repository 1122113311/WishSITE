-- Run this once in Supabase Dashboard > SQL Editor.
-- Create your owner account first in Authentication > Users.

create table if not exists public.product_reservations (
  category text not null check (category in ('sleep', 'clothes', 'bathing', 'walks', 'play', 'other')),
  product_id text not null check (length(product_id) between 1 and 120),
  product_name text not null check (length(product_name) between 1 and 140),
  created_at timestamptz not null default now(),
  primary key (category, product_id)
);

alter table public.product_reservations enable row level security;
revoke all on table public.product_reservations from public, anon, authenticated;
grant select, insert on table public.product_reservations to anon, authenticated;
grant delete on table public.product_reservations to authenticated;

drop policy if exists "Anyone can view product reservations" on public.product_reservations;
create policy "Anyone can view product reservations"
  on public.product_reservations for select
  to anon, authenticated
  using (true);

drop policy if exists "Anyone can reserve a product" on public.product_reservations;
create policy "Anyone can reserve a product"
  on public.product_reservations for insert
  to anon, authenticated
  with check (
    category in ('sleep', 'clothes', 'bathing', 'walks', 'play', 'other')
    and length(product_id) between 1 and 120
    and length(product_name) between 1 and 140
  );

create table if not exists public.reservation_admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);
alter table public.reservation_admins enable row level security;
revoke all on table public.reservation_admins from public, anon, authenticated;

create or replace function public.is_reservation_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.reservation_admins
    where user_id = (select auth.uid())
  );
$$;
revoke all on function public.is_reservation_admin() from public;
grant execute on function public.is_reservation_admin() to authenticated;

drop policy if exists "Only reservation admins can cancel" on public.product_reservations;
create policy "Only reservation admins can cancel"
  on public.product_reservations for delete
  to authenticated
  using ((select public.is_reservation_admin()));


