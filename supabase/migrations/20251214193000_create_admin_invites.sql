create table if not exists public.admin_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role text not null default 'admin',
  token uuid not null unique default gen_random_uuid(),
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null
);

create index if not exists admin_invites_email_idx
  on public.admin_invites (lower(email));

create index if not exists admin_invites_token_idx
  on public.admin_invites (token);

alter table public.admin_invites enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'admin_invites'
      and policyname = 'admin_manage_admin_invites'
  ) then
    create policy admin_manage_admin_invites
      on public.admin_invites
      for all
      to authenticated
      using (
        exists (
          select 1
          from public.profiles p
          where p.user_id = auth.uid()
            and p.role in ('admin', 'super_admin')
        )
      )
      with check (
        exists (
          select 1
          from public.profiles p
          where p.user_id = auth.uid()
            and p.role in ('admin', 'super_admin')
        )
      );
  end if;
end $$;
