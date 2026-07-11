-- Tenant Foundation RLS helpers and policies.
-- Supabase Auth proves identity only; tenant access comes from active membership.

create or replace function public.current_person_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select pp.person_id
  from public.person_profiles pp
  where pp.auth_user_id = auth.uid()
  limit 1;
$$;

create or replace function public.current_person_is_active()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.person_profiles pp
    where pp.auth_user_id = auth.uid()
      and pp.status = 'active'
  );
$$;

create or replace function public.current_person_normalized_email()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select pp.normalized_email
  from public.person_profiles pp
  where pp.auth_user_id = auth.uid()
  limit 1;
$$;

create or replace function public.has_active_platform_role(required_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.person_profiles pp
    join public.platform_role_assignments pra
      on pra.person_id = pp.person_id
    where pp.auth_user_id = auth.uid()
      and pp.status = 'active'
      and pra.status = 'active'
      and pra.role_key = any(required_roles)
      and (pra.expires_at is null or pra.expires_at > now())
  );
$$;

create or replace function public.is_platform_data_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_active_platform_role(array['platform_owner', 'platform_admin']);
$$;

create or replace function public.has_active_tenant_membership(target_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.person_profiles pp
    join public.tenant_memberships tm
      on tm.person_id = pp.person_id
    join public.tenants t
      on t.tenant_id = tm.tenant_id
    where pp.auth_user_id = auth.uid()
      and pp.status = 'active'
      and tm.tenant_id = target_tenant_id
      and tm.status = 'active'
      and (tm.expires_at is null or tm.expires_at > now())
      and t.status = 'active'
  );
$$;

create or replace function public.has_tenant_role(target_tenant_id uuid, required_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.person_profiles pp
    join public.tenant_memberships tm
      on tm.person_id = pp.person_id
    join public.tenants t
      on t.tenant_id = tm.tenant_id
    join public.tenant_role_assignments tra
      on tra.membership_id = tm.membership_id
     and tra.tenant_id = tm.tenant_id
    where pp.auth_user_id = auth.uid()
      and pp.status = 'active'
      and t.status = 'active'
      and tm.tenant_id = target_tenant_id
      and tm.status = 'active'
      and (tm.expires_at is null or tm.expires_at > now())
      and tra.status = 'active'
      and tra.role_key = any(required_roles)
      and (tra.expires_at is null or tra.expires_at > now())
  );
$$;

create or replace function public.tenant_capability_enabled(
  target_tenant_id uuid,
  required_capability text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tenant_capabilities tc
    where tc.tenant_id = target_tenant_id
      and tc.capability_key = required_capability
      and tc.enabled = true
  );
$$;

create or replace function public.can_manage_tenant_memberships(target_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_platform_data_admin()
    or (
      public.has_tenant_role(target_tenant_id, array['tenant_owner', 'tenant_admin'])
      and public.tenant_capability_enabled(target_tenant_id, 'tenant.memberships')
    );
$$;

create or replace function public.can_manage_tenant_roles(target_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_platform_data_admin()
    or (
      public.has_tenant_role(target_tenant_id, array['tenant_owner', 'tenant_admin'])
      and public.tenant_capability_enabled(target_tenant_id, 'tenant.roles')
    );
$$;

create or replace function public.can_read_tenant_audit(target_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_platform_data_admin()
    or (
      public.has_tenant_role(target_tenant_id, array['tenant_owner', 'tenant_admin'])
      and public.tenant_capability_enabled(target_tenant_id, 'tenant.audit')
    );
$$;

alter table public.person_profiles enable row level security;
alter table public.tenants enable row level security;
alter table public.tenant_configurations enable row level security;
alter table public.tenant_capabilities enable row level security;
alter table public.tenant_memberships enable row level security;
alter table public.tenant_invitations enable row level security;
alter table public.platform_role_assignments enable row level security;
alter table public.tenant_role_assignments enable row level security;
alter table public.tenant_audit_events enable row level security;
alter table public.active_tenant_preferences enable row level security;

create policy person_profiles_select_own_or_platform_admin
  on public.person_profiles
  for select
  to authenticated
  using (
    auth_user_id = auth.uid()
    or public.is_platform_data_admin()
  );

create policy person_profiles_platform_admin_insert
  on public.person_profiles
  for insert
  to authenticated
  with check (public.is_platform_data_admin());

create policy person_profiles_platform_admin_update
  on public.person_profiles
  for update
  to authenticated
  using (public.is_platform_data_admin())
  with check (public.is_platform_data_admin());

create policy tenants_select_member_or_platform_admin
  on public.tenants
  for select
  to authenticated
  using (
    public.has_active_tenant_membership(tenant_id)
    or public.is_platform_data_admin()
  );

create policy tenants_platform_admin_insert
  on public.tenants
  for insert
  to authenticated
  with check (public.is_platform_data_admin());

create policy tenants_platform_admin_update
  on public.tenants
  for update
  to authenticated
  using (public.is_platform_data_admin())
  with check (public.is_platform_data_admin());

create policy tenant_configurations_select_member_or_platform_admin
  on public.tenant_configurations
  for select
  to authenticated
  using (
    public.has_active_tenant_membership(tenant_id)
    or public.is_platform_data_admin()
  );

create policy tenant_configurations_platform_admin_insert
  on public.tenant_configurations
  for insert
  to authenticated
  with check (public.is_platform_data_admin());

create policy tenant_configurations_owner_admin_update
  on public.tenant_configurations
  for update
  to authenticated
  using (
    public.is_platform_data_admin()
    or public.has_tenant_role(tenant_id, array['tenant_owner', 'tenant_admin'])
  )
  with check (
    public.is_platform_data_admin()
    or public.has_tenant_role(tenant_id, array['tenant_owner', 'tenant_admin'])
  );

create policy tenant_capabilities_select_member_or_platform_admin
  on public.tenant_capabilities
  for select
  to authenticated
  using (
    public.has_active_tenant_membership(tenant_id)
    or public.is_platform_data_admin()
  );

create policy tenant_capabilities_platform_admin_insert
  on public.tenant_capabilities
  for insert
  to authenticated
  with check (public.is_platform_data_admin());

create policy tenant_capabilities_platform_admin_update
  on public.tenant_capabilities
  for update
  to authenticated
  using (public.is_platform_data_admin())
  with check (public.is_platform_data_admin());

create policy tenant_memberships_select_own_tenant_admin_or_platform_admin
  on public.tenant_memberships
  for select
  to authenticated
  using (
    person_id = public.current_person_id()
    or public.can_manage_tenant_memberships(tenant_id)
    or public.is_platform_data_admin()
  );

create policy tenant_memberships_manager_insert
  on public.tenant_memberships
  for insert
  to authenticated
  with check (public.can_manage_tenant_memberships(tenant_id));

create policy tenant_memberships_manager_update
  on public.tenant_memberships
  for update
  to authenticated
  using (public.can_manage_tenant_memberships(tenant_id))
  with check (public.can_manage_tenant_memberships(tenant_id));

create policy tenant_invitations_select_manager_platform_or_invitee
  on public.tenant_invitations
  for select
  to authenticated
  using (
    public.can_manage_tenant_memberships(tenant_id)
    or public.is_platform_data_admin()
    or (
      status = 'pending'
      and normalized_email = public.current_person_normalized_email()
      and expires_at > now()
    )
  );

create policy tenant_invitations_manager_insert
  on public.tenant_invitations
  for insert
  to authenticated
  with check (public.can_manage_tenant_memberships(tenant_id));

create policy tenant_invitations_manager_update
  on public.tenant_invitations
  for update
  to authenticated
  using (public.can_manage_tenant_memberships(tenant_id))
  with check (public.can_manage_tenant_memberships(tenant_id));

create policy platform_role_assignments_select_platform_admin
  on public.platform_role_assignments
  for select
  to authenticated
  using (public.is_platform_data_admin());

create policy platform_role_assignments_platform_admin_insert
  on public.platform_role_assignments
  for insert
  to authenticated
  with check (public.is_platform_data_admin());

create policy platform_role_assignments_platform_admin_update
  on public.platform_role_assignments
  for update
  to authenticated
  using (public.is_platform_data_admin())
  with check (public.is_platform_data_admin());

create policy tenant_role_assignments_select_authorized
  on public.tenant_role_assignments
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.tenant_memberships tm
      where tm.membership_id = tenant_role_assignments.membership_id
        and tm.person_id = public.current_person_id()
    )
    or public.can_manage_tenant_roles(tenant_id)
    or public.is_platform_data_admin()
  );

create policy tenant_role_assignments_manager_insert
  on public.tenant_role_assignments
  for insert
  to authenticated
  with check (public.can_manage_tenant_roles(tenant_id));

create policy tenant_role_assignments_manager_update
  on public.tenant_role_assignments
  for update
  to authenticated
  using (public.can_manage_tenant_roles(tenant_id))
  with check (public.can_manage_tenant_roles(tenant_id));

create policy tenant_audit_events_select_tenant_auditor_or_platform_admin
  on public.tenant_audit_events
  for select
  to authenticated
  using (
    public.is_platform_data_admin()
    or (
      tenant_id is not null
      and public.can_read_tenant_audit(tenant_id)
    )
  );

create policy active_tenant_preferences_select_own
  on public.active_tenant_preferences
  for select
  to authenticated
  using (person_id = public.current_person_id());

create policy active_tenant_preferences_insert_own_active_membership
  on public.active_tenant_preferences
  for insert
  to authenticated
  with check (
    person_id = public.current_person_id()
    and public.has_active_tenant_membership(tenant_id)
    and exists (
      select 1
      from public.tenant_memberships tm
      where tm.membership_id = active_tenant_preferences.membership_id
        and tm.tenant_id = active_tenant_preferences.tenant_id
        and tm.person_id = active_tenant_preferences.person_id
        and tm.status = 'active'
    )
  );

create policy active_tenant_preferences_update_own_active_membership
  on public.active_tenant_preferences
  for update
  to authenticated
  using (person_id = public.current_person_id())
  with check (
    person_id = public.current_person_id()
    and public.has_active_tenant_membership(tenant_id)
    and exists (
      select 1
      from public.tenant_memberships tm
      where tm.membership_id = active_tenant_preferences.membership_id
        and tm.tenant_id = active_tenant_preferences.tenant_id
        and tm.person_id = active_tenant_preferences.person_id
        and tm.status = 'active'
    )
  );

create policy active_tenant_preferences_delete_own
  on public.active_tenant_preferences
  for delete
  to authenticated
  using (person_id = public.current_person_id());
