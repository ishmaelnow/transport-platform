create or replace function public.list_transport_application_tenants()
returns table (tenant_slug text, display_name text)
language sql security definer set search_path = public as $$
  select tc.tenant_slug, tc.display_name
  from public.tenant_configurations tc
  join public.tenants t on t.tenant_id = tc.tenant_id
  join public.tenant_capabilities cap on cap.tenant_id = tc.tenant_id and cap.capability_key = 'driver.management' and cap.enabled
  where t.status = 'active' and tc.tenant_slug is not null
  order by tc.display_name;
$$;
grant execute on function public.list_transport_application_tenants() to anon, authenticated;
