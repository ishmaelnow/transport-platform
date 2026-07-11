-- Tenant Foundation database guards.
-- These triggers enforce lifecycle invariants that must hold regardless of API path.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger person_profiles_set_updated_at
  before update on public.person_profiles
  for each row execute function public.set_updated_at();

create trigger tenants_set_updated_at
  before update on public.tenants
  for each row execute function public.set_updated_at();

create trigger tenant_configurations_set_updated_at
  before update on public.tenant_configurations
  for each row execute function public.set_updated_at();

create trigger tenant_capabilities_set_updated_at
  before update on public.tenant_capabilities
  for each row execute function public.set_updated_at();

create trigger tenant_memberships_set_updated_at
  before update on public.tenant_memberships
  for each row execute function public.set_updated_at();

create trigger tenant_invitations_set_updated_at
  before update on public.tenant_invitations
  for each row execute function public.set_updated_at();

create trigger platform_role_assignments_set_updated_at
  before update on public.platform_role_assignments
  for each row execute function public.set_updated_at();

create trigger tenant_role_assignments_set_updated_at
  before update on public.tenant_role_assignments
  for each row execute function public.set_updated_at();

create trigger active_tenant_preferences_set_updated_at
  before update on public.active_tenant_preferences
  for each row execute function public.set_updated_at();

create or replace function public.prevent_tenant_id_change()
returns trigger
language plpgsql
as $$
begin
  if old.tenant_id is distinct from new.tenant_id then
    raise exception 'tenant_id cannot be changed after creation';
  end if;

  return new;
end;
$$;

create trigger tenant_configurations_prevent_tenant_id_change
  before update on public.tenant_configurations
  for each row execute function public.prevent_tenant_id_change();

create trigger tenant_capabilities_prevent_tenant_id_change
  before update on public.tenant_capabilities
  for each row execute function public.prevent_tenant_id_change();

create trigger tenant_memberships_prevent_tenant_id_change
  before update on public.tenant_memberships
  for each row execute function public.prevent_tenant_id_change();

create trigger tenant_invitations_prevent_tenant_id_change
  before update on public.tenant_invitations
  for each row execute function public.prevent_tenant_id_change();

create trigger tenant_role_assignments_prevent_tenant_id_change
  before update on public.tenant_role_assignments
  for each row execute function public.prevent_tenant_id_change();

create trigger active_tenant_preferences_prevent_tenant_id_change
  before update on public.active_tenant_preferences
  for each row execute function public.prevent_tenant_id_change();

create or replace function public.prevent_membership_identity_change()
returns trigger
language plpgsql
as $$
begin
  if old.membership_id is distinct from new.membership_id then
    raise exception 'membership_id cannot be changed after creation';
  end if;

  if old.person_id is distinct from new.person_id then
    raise exception 'membership person_id cannot be changed after creation';
  end if;

  return new;
end;
$$;

create trigger tenant_memberships_prevent_identity_change
  before update on public.tenant_memberships
  for each row execute function public.prevent_membership_identity_change();

create or replace function public.prevent_role_assignment_identity_change()
returns trigger
language plpgsql
as $$
begin
  if old.assignment_id is distinct from new.assignment_id then
    raise exception 'assignment_id cannot be changed after creation';
  end if;

  if old.membership_id is distinct from new.membership_id then
    raise exception 'membership_id cannot be changed after tenant role assignment creation';
  end if;

  return new;
end;
$$;

create trigger tenant_role_assignments_prevent_identity_change
  before update on public.tenant_role_assignments
  for each row execute function public.prevent_role_assignment_identity_change();

create or replace function public.prevent_audit_event_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'tenant audit events are append-only';
end;
$$;

create trigger tenant_audit_events_prevent_update
  before update on public.tenant_audit_events
  for each row execute function public.prevent_audit_event_mutation();

create trigger tenant_audit_events_prevent_delete
  before delete on public.tenant_audit_events
  for each row execute function public.prevent_audit_event_mutation();

create or replace function public.tenant_has_active_owner(target_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tenant_memberships tm
    join public.tenant_role_assignments tra
      on tra.membership_id = tm.membership_id
     and tra.tenant_id = tm.tenant_id
    where tm.tenant_id = target_tenant_id
      and tm.status = 'active'
      and (tm.expires_at is null or tm.expires_at > now())
      and tra.role_key = 'tenant_owner'
      and tra.status = 'active'
      and (tra.expires_at is null or tra.expires_at > now())
  );
$$;

create or replace function public.prevent_active_tenant_without_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'active' and not public.tenant_has_active_owner(new.tenant_id) then
    raise exception 'tenant cannot be active without at least one active tenant_owner';
  end if;

  return new;
end;
$$;

create trigger tenants_require_owner_before_active
  before insert or update of status on public.tenants
  for each row execute function public.prevent_active_tenant_without_owner();

create or replace function public.prevent_final_tenant_owner_loss()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_tenant_id uuid;
  target_membership_id uuid;
  tenant_lifecycle text;
  active_owner_count integer;
begin
  if tg_table_name = 'tenant_role_assignments' then
    if tg_op = 'DELETE' then
      if old.role_key <> 'tenant_owner' or old.status <> 'active' then
        return old;
      end if;

      target_tenant_id := old.tenant_id;
      target_membership_id := old.membership_id;
    else
      if old.role_key <> 'tenant_owner'
        or old.status <> 'active'
        or (
          new.role_key = 'tenant_owner'
          and new.status = 'active'
          and (new.expires_at is null or new.expires_at > now())
        )
      then
        return new;
      end if;

      target_tenant_id := old.tenant_id;
      target_membership_id := old.membership_id;
    end if;
  elsif tg_table_name = 'tenant_memberships' then
    if tg_op = 'DELETE' then
      if old.status <> 'active' then
        return old;
      end if;

      target_tenant_id := old.tenant_id;
      target_membership_id := old.membership_id;
    else
      if old.status <> 'active'
        or (
          new.status = 'active'
          and (new.expires_at is null or new.expires_at > now())
        )
      then
        return new;
      end if;

      target_tenant_id := old.tenant_id;
      target_membership_id := old.membership_id;
    end if;
  end if;

  select status into tenant_lifecycle
  from public.tenants
  where tenant_id = target_tenant_id;

  if tenant_lifecycle is distinct from 'active' then
    if tg_op = 'DELETE' then
      return old;
    end if;

    return new;
  end if;

  select count(*) into active_owner_count
  from public.tenant_memberships tm
  join public.tenant_role_assignments tra
    on tra.membership_id = tm.membership_id
   and tra.tenant_id = tm.tenant_id
  where tm.tenant_id = target_tenant_id
    and tm.membership_id <> target_membership_id
    and tm.status = 'active'
    and (tm.expires_at is null or tm.expires_at > now())
    and tra.role_key = 'tenant_owner'
    and tra.status = 'active'
    and (tra.expires_at is null or tra.expires_at > now());

  if active_owner_count = 0 then
    raise exception 'cannot remove the final active tenant_owner from an active tenant';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create trigger tenant_memberships_prevent_final_owner_loss
  before update of status, expires_at or delete on public.tenant_memberships
  for each row execute function public.prevent_final_tenant_owner_loss();

create trigger tenant_role_assignments_prevent_final_owner_loss
  before update of role_key, status, expires_at or delete on public.tenant_role_assignments
  for each row execute function public.prevent_final_tenant_owner_loss();
