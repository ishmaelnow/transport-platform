create table public.driver_onboarding_checklists (
  driver_profile_id uuid primary key references public.driver_profiles (driver_profile_id) on delete cascade,
  tenant_id uuid not null references public.tenants (tenant_id) on delete restrict,
  personal_details_complete boolean not null default false,
  personal_photo_complete boolean not null default false,
  vehicle_details_complete boolean not null default false,
  vehicle_photo_complete boolean not null default false,
  documents_reviewed boolean not null default false,
  review_status text not null default 'pending' check (review_status in ('pending','approved','rejected')),
  review_notes text,
  reviewed_by_person_id uuid references public.person_profiles (person_id) on delete restrict,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, driver_profile_id)
);
create trigger driver_onboarding_set_updated_at before update on public.driver_onboarding_checklists for each row execute function public.set_updated_at();
alter table public.driver_onboarding_checklists enable row level security;
create policy driver_onboarding_select on public.driver_onboarding_checklists for select to authenticated using (public.can_read_driver_management(tenant_id));
create policy driver_onboarding_insert on public.driver_onboarding_checklists for insert to authenticated with check (public.can_manage_driver_management(tenant_id));
create policy driver_onboarding_update on public.driver_onboarding_checklists for update to authenticated using (public.can_manage_driver_management(tenant_id)) with check (public.can_manage_driver_management(tenant_id));
grant select, insert, update on public.driver_onboarding_checklists to authenticated;
insert into public.driver_onboarding_checklists (driver_profile_id, tenant_id) select driver_profile_id, tenant_id from public.driver_profiles on conflict do nothing;
create or replace function public.create_driver_onboarding_checklist() returns trigger language plpgsql security definer set search_path = public as $$ begin insert into public.driver_onboarding_checklists (driver_profile_id, tenant_id) values (new.driver_profile_id, new.tenant_id) on conflict do nothing; return new; end; $$;
create trigger driver_profiles_create_onboarding after insert on public.driver_profiles for each row execute function public.create_driver_onboarding_checklist();
