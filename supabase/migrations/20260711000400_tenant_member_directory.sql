-- Tenant member directory read model.
-- Exposes safe profile fields for tenant administrators without broadening person_profiles RLS.

create or replace function public.tenant_member_directory(target_tenant_id uuid)
returns table (
  tenant_id uuid,
  membership_id uuid,
  person_id uuid,
  display_name text,
  primary_email text,
  person_status text,
  membership_status text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    tm.tenant_id,
    tm.membership_id,
    pp.person_id,
    pp.display_name,
    pp.primary_email,
    pp.status as person_status,
    tm.status as membership_status
  from public.tenant_memberships tm
  join public.person_profiles pp
    on pp.person_id = tm.person_id
  where tm.tenant_id = target_tenant_id
    and public.can_manage_tenant_memberships(target_tenant_id);
$$;

revoke all on function public.tenant_member_directory(uuid) from public;
grant execute on function public.tenant_member_directory(uuid) to authenticated;
