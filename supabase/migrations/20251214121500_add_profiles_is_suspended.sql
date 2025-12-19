alter table public.profiles
add column if not exists is_suspended boolean not null default false;

create index if not exists profiles_is_suspended_idx
on public.profiles (is_suspended);
