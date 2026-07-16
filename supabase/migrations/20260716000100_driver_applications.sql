create table public.driver_applications (
  driver_application_id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (tenant_id) on delete restrict,
  driver_profile_id uuid references public.driver_profiles (driver_profile_id) on delete set null,
  full_name text not null,
  email text not null,
  phone text,
  application_status text not null default 'submitted' check (application_status in ('submitted','under_review','approved','rejected','withdrawn')),
  submitted_at timestamptz not null default now(),
  reviewed_by_person_id uuid references public.person_profiles (person_id) on delete restrict,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index driver_applications_tenant_status_idx on public.driver_applications (tenant_id, application_status, submitted_at desc);
create trigger driver_applications_set_updated_at before update on public.driver_applications for each row execute function public.set_updated_at();
alter table public.driver_applications enable row level security;
create policy driver_applications_select on public.driver_applications for select to authenticated using (public.can_read_driver_management(tenant_id));
create policy driver_applications_insert on public.driver_applications for insert to authenticated with check (public.can_manage_driver_management(tenant_id));
create policy driver_applications_update on public.driver_applications for update to authenticated using (public.can_manage_driver_management(tenant_id)) with check (public.can_manage_driver_management(tenant_id));
grant select, insert, update on public.driver_applications to authenticated;

create or replace function public.approve_driver_application(target_application_id uuid, actor_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare app public.driver_applications; new_driver uuid;
begin
  select * into app from public.driver_applications where driver_application_id = target_application_id for update;
  if app.driver_application_id is null then raise exception 'application not found'; end if;
  if app.application_status = 'approved' and app.driver_profile_id is not null then return app.driver_profile_id; end if;
  insert into public.driver_profiles (tenant_id, driver_number, display_name, email, phone, status, created_by_person_id, updated_by_person_id)
  values (app.tenant_id, lpad((select coalesce(max(nullif(driver_number, '')::int), 0) + 1 from public.driver_profiles where tenant_id = app.tenant_id and driver_number ~ '^[0-9]+$')::text, 3, '0'), app.full_name, app.email, app.phone, 'draft', actor_id, actor_id)
  returning driver_profile_id into new_driver;
  update public.driver_applications set application_status = 'approved', driver_profile_id = new_driver, reviewed_by_person_id = actor_id, reviewed_at = now() where driver_application_id = target_application_id;
  return new_driver;
end;
$$;
