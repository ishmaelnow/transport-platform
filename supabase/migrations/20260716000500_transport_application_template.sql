create or replace function public.submit_transport_driver_application(application_tenant_slug text, applicant_name text, applicant_email text, applicant_phone text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare target_tenant uuid;
begin
  select tenant_id into target_tenant from public.tenant_configurations where tenant_slug = lower(btrim(application_tenant_slug));
  if target_tenant is null then raise exception 'Transportation application link is invalid'; end if;
  return public.submit_driver_application(target_tenant, applicant_name, applicant_email, applicant_phone);
end;
$$;
grant execute on function public.submit_transport_driver_application(text, text, text, text) to anon, authenticated;
