alter table public.tenant_configurations add column if not exists driver_application_slug text;
create unique index if not exists tenant_configurations_driver_application_slug_idx on public.tenant_configurations (driver_application_slug) where driver_application_slug is not null;
update public.tenant_configurations tc set driver_application_slug = lower(regexp_replace(tc.display_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || right(tc.tenant_id::text, 8) where tc.driver_application_slug is null;
create or replace function public.submit_driver_application_by_slug(application_slug text, applicant_name text, applicant_email text, applicant_phone text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare application_id uuid; target_tenant uuid;
begin
  select tenant_id into target_tenant from public.tenant_configurations where driver_application_slug = lower(btrim(application_slug));
  if target_tenant is null then raise exception 'Application link is invalid'; end if;
  select public.submit_driver_application(target_tenant, applicant_name, applicant_email, applicant_phone) into application_id;
  return application_id;
end;
$$;
grant execute on function public.submit_driver_application_by_slug(text, text, text, text) to anon, authenticated;
