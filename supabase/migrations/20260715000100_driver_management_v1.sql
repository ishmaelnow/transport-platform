-- Driver Management V1: tenant-scoped profiles, lifecycle enforcement, capability gating, and audit.

alter table public.tenant_capabilities drop constraint tenant_capabilities_key_check;
alter table public.tenant_capabilities add constraint tenant_capabilities_key_check check (
  capability_key in (
    'tenant.memberships', 'tenant.roles', 'tenant.audit', 'app.admin', 'app.rider', 'app.driver',
    'driver.management'
  )
);

create table public.driver_profiles (
  driver_profile_id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (tenant_id) on delete restrict,
  person_id uuid references public.person_profiles (person_id) on delete restrict,
  driver_number text not null,
  display_name text not null,
  email text,
  phone text,
  status text not null default 'draft',
  onboarding_date date,
  status_reason text,
  created_by_person_id uuid not null references public.person_profiles (person_id) on delete restrict,
  updated_by_person_id uuid not null references public.person_profiles (person_id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint driver_profiles_driver_number_not_blank check (length(btrim(driver_number)) > 0),
  constraint driver_profiles_display_name_not_blank check (length(btrim(display_name)) > 0),
  constraint driver_profiles_status_check check (
    status in ('draft', 'onboarding', 'active', 'suspended', 'inactive', 'archived')
  ),
  constraint driver_profiles_status_reason_check check (
    status not in ('suspended', 'inactive', 'archived') or length(btrim(status_reason)) > 0
  ),
  constraint driver_profiles_tenant_profile_unique unique (tenant_id, driver_profile_id),
  constraint driver_profiles_tenant_number_unique unique (tenant_id, driver_number)
);

create index driver_profiles_tenant_status_idx
  on public.driver_profiles (tenant_id, status, created_at desc);

create index driver_profiles_person_idx
  on public.driver_profiles (person_id)
  where person_id is not null;

create trigger driver_profiles_set_updated_at
  before update on public.driver_profiles
  for each row execute function public.set_updated_at();

create or replace function public.validate_driver_profile_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.driver_number := btrim(new.driver_number);
  new.display_name := btrim(new.display_name);
  new.email := nullif(lower(btrim(new.email)), '');
  new.phone := nullif(btrim(new.phone), '');
  new.status_reason := nullif(btrim(new.status_reason), '');

  if new.person_id is not null and not exists (
    select 1
    from public.tenant_memberships tm
    where tm.tenant_id = new.tenant_id
      and tm.person_id = new.person_id
      and tm.status = 'active'
      and (tm.expires_at is null or tm.expires_at > now())
  ) then
    raise exception 'linked driver person must have an active membership in the same tenant';
  end if;

  if tg_op = 'UPDATE' then
    if new.tenant_id <> old.tenant_id then
      raise exception 'driver tenant cannot change';
    end if;

    if new.status <> old.status and not (
      (old.status = 'draft' and new.status in ('onboarding', 'archived')) or
      (old.status = 'onboarding' and new.status in ('active', 'inactive', 'archived')) or
      (old.status = 'active' and new.status in ('suspended', 'inactive')) or
      (old.status = 'suspended' and new.status in ('active', 'inactive')) or
      (old.status = 'inactive' and new.status in ('onboarding', 'archived'))
    ) then
      raise exception 'invalid driver lifecycle transition from % to %', old.status, new.status;
    end if;
  end if;

  return new;
end;
$$;

create trigger driver_profiles_validate_change
  before insert or update on public.driver_profiles
  for each row execute function public.validate_driver_profile_change();

create or replace function public.can_read_driver_management(target_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_active_tenant_membership(target_tenant_id)
    and public.tenant_capability_enabled(target_tenant_id, 'driver.management');
$$;

create or replace function public.can_manage_driver_management(target_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_tenant_role(target_tenant_id, array['tenant_owner', 'tenant_admin'])
    and public.tenant_capability_enabled(target_tenant_id, 'driver.management');
$$;

create or replace function public.audit_driver_profile_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := public.current_person_id();
  event_reason text;
begin
  event_reason := coalesce(new.status_reason, case when tg_op = 'INSERT'
    then 'Driver profile created.' else 'Driver profile updated.' end);

  insert into public.tenant_audit_events (
    tenant_id, event_name, actor_type, actor_person_id, actor_platform_roles,
    reason, correlation_id, resource_type, resource_id, metadata
  ) values (
    new.tenant_id,
    case when tg_op = 'INSERT' then 'driver.created'
         when new.status is distinct from old.status then 'driver.status_changed'
         else 'driver.updated' end,
    'person', actor_id, '{}', event_reason, gen_random_uuid(), 'driver_profile',
    new.driver_profile_id::text,
    jsonb_build_object(
      'driver_number', new.driver_number,
      'previous_status', case when tg_op = 'UPDATE' then old.status else null end,
      'status', new.status
    )
  );

  return new;
end;
$$;

create trigger driver_profiles_audit_change
  after insert or update on public.driver_profiles
  for each row execute function public.audit_driver_profile_change();

alter table public.driver_profiles enable row level security;

create policy driver_profiles_select_authorized
  on public.driver_profiles for select to authenticated
  using (public.can_read_driver_management(tenant_id));

create policy driver_profiles_insert_manager
  on public.driver_profiles for insert to authenticated
  with check (
    public.can_manage_driver_management(tenant_id)
    and created_by_person_id = public.current_person_id()
    and updated_by_person_id = public.current_person_id()
  );

create policy driver_profiles_update_manager
  on public.driver_profiles for update to authenticated
  using (public.can_manage_driver_management(tenant_id))
  with check (
    public.can_manage_driver_management(tenant_id)
    and updated_by_person_id = public.current_person_id()
  );

insert into public.tenant_capabilities (
  tenant_id, capability_key, enabled, disabled_at, updated_by_person_id
)
select t.tenant_id, 'driver.management', false, now(), tc.created_by_person_id
from public.tenants t
join public.tenant_configurations tc on tc.tenant_id = t.tenant_id
on conflict (tenant_id, capability_key) do nothing;

grant select, insert, update on public.driver_profiles to authenticated;
