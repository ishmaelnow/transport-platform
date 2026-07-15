-- Ensure tenants provisioned by existing or future provisioning paths receive the gated module key.

create or replace function public.seed_driver_management_capability()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.tenant_capabilities (
    tenant_id, capability_key, enabled, disabled_at, updated_by_person_id
  )
  values (
    new.tenant_id, 'driver.management', false, now(), public.current_person_id()
  )
  on conflict (tenant_id, capability_key) do nothing;
  return new;
end;
$$;

create trigger tenants_seed_driver_management_capability
  after insert on public.tenants
  for each row execute function public.seed_driver_management_capability();
