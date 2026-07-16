create or replace function public.submit_driver_application(target_tenant_id uuid, applicant_name text, applicant_email text, applicant_phone text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare application_id uuid;
begin
  if length(btrim(applicant_name)) < 2 or applicant_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'Valid name and email are required'; end if;
  insert into public.driver_applications (tenant_id, full_name, email, phone)
  values (target_tenant_id, btrim(applicant_name), lower(btrim(applicant_email)), nullif(btrim(applicant_phone), ''))
  returning driver_application_id into application_id;
  return application_id;
end;
$$;
grant execute on function public.submit_driver_application(uuid, text, text, text) to anon, authenticated;
