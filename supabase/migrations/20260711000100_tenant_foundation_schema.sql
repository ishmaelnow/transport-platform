-- Tenant Foundation schema.
-- This migration creates only the approved platform identity and tenant foundation tables.

create extension if not exists pgcrypto with schema extensions;

create table public.person_profiles (
  person_id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users (id) on delete set null,
  status text not null default 'invited',
  display_name text,
  primary_email text not null,
  normalized_email text not null unique,
  locale text,
  time_zone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  activated_at timestamptz,
  suspended_at timestamptz,
  deactivated_at timestamptz,
  deleted_at timestamptz,
  anonymized_at timestamptz,
  constraint person_profiles_status_check check (
    status in ('invited', 'active', 'suspended', 'deactivated', 'deleted')
  ),
  constraint person_profiles_normalized_email_check check (
    normalized_email = lower(btrim(primary_email))
  ),
  constraint person_profiles_primary_email_not_blank check (length(btrim(primary_email)) > 0),
  constraint person_profiles_display_name_not_blank check (
    display_name is null or length(btrim(display_name)) > 0
  )
);

create index person_profiles_auth_user_id_idx on public.person_profiles (auth_user_id);
create index person_profiles_normalized_email_idx on public.person_profiles (normalized_email);
create index person_profiles_status_idx on public.person_profiles (status);

create table public.tenants (
  tenant_id uuid primary key default gen_random_uuid(),
  status text not null default 'provisioning',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  activated_at timestamptz,
  suspended_at timestamptz,
  closing_at timestamptz,
  closed_at timestamptz,
  deleted_at timestamptz,
  anonymized_at timestamptz,
  constraint tenants_status_check check (
    status in ('provisioning', 'active', 'suspended', 'closing', 'closed', 'deleted')
  )
);

create index tenants_status_idx on public.tenants (status);
create index tenants_created_at_idx on public.tenants (created_at);

create table public.tenant_configurations (
  tenant_id uuid primary key references public.tenants (tenant_id) on delete cascade,
  legal_name text not null,
  display_name text not null,
  default_time_zone text not null,
  support_contact_email text not null,
  branding_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by_person_id uuid references public.person_profiles (person_id) on delete set null,
  updated_by_person_id uuid references public.person_profiles (person_id) on delete set null,
  constraint tenant_configurations_legal_name_not_blank check (length(btrim(legal_name)) > 0),
  constraint tenant_configurations_display_name_not_blank check (length(btrim(display_name)) > 0),
  constraint tenant_configurations_time_zone_not_blank check (length(btrim(default_time_zone)) > 0),
  constraint tenant_configurations_support_email_not_blank check (
    length(btrim(support_contact_email)) > 0
  )
);

create table public.tenant_capabilities (
  tenant_id uuid not null references public.tenants (tenant_id) on delete cascade,
  capability_key text not null,
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  enabled_at timestamptz,
  disabled_at timestamptz,
  updated_by_person_id uuid references public.person_profiles (person_id) on delete set null,
  primary key (tenant_id, capability_key),
  constraint tenant_capabilities_key_check check (
    capability_key in (
      'tenant.memberships',
      'tenant.roles',
      'tenant.audit',
      'app.admin',
      'app.rider',
      'app.driver'
    )
  )
);

create index tenant_capabilities_tenant_enabled_idx on public.tenant_capabilities (tenant_id, enabled);
create index tenant_capabilities_key_idx on public.tenant_capabilities (capability_key);

create table public.tenant_memberships (
  membership_id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (tenant_id) on delete cascade,
  person_id uuid not null references public.person_profiles (person_id) on delete restrict,
  status text not null default 'invited',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  invited_at timestamptz,
  activated_at timestamptz,
  suspended_at timestamptz,
  removed_at timestamptz,
  expires_at timestamptz,
  created_by_person_id uuid references public.person_profiles (person_id) on delete set null,
  updated_by_person_id uuid references public.person_profiles (person_id) on delete set null,
  unique (tenant_id, person_id),
  unique (membership_id, tenant_id),
  constraint tenant_memberships_status_check check (
    status in ('invited', 'active', 'suspended', 'removed', 'expired')
  )
);

create index tenant_memberships_person_status_idx on public.tenant_memberships (person_id, status);
create index tenant_memberships_tenant_status_idx on public.tenant_memberships (tenant_id, status);
create index tenant_memberships_tenant_person_idx on public.tenant_memberships (tenant_id, person_id);

create table public.tenant_invitations (
  invitation_id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (tenant_id) on delete cascade,
  email text not null,
  normalized_email text not null,
  invitation_token_hash text not null unique,
  intended_role text not null,
  status text not null default 'pending',
  invited_by_person_id uuid references public.person_profiles (person_id) on delete set null,
  accepted_by_person_id uuid references public.person_profiles (person_id) on delete set null,
  cancelled_by_person_id uuid references public.person_profiles (person_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  cancelled_at timestamptz,
  constraint tenant_invitations_normalized_email_check check (
    normalized_email = lower(btrim(email))
  ),
  constraint tenant_invitations_email_not_blank check (length(btrim(email)) > 0),
  constraint tenant_invitations_intended_role_check check (
    intended_role in ('tenant_owner', 'tenant_admin', 'tenant_member')
  ),
  constraint tenant_invitations_status_check check (
    status in ('pending', 'accepted', 'cancelled', 'expired')
  )
);

create unique index tenant_invitations_one_pending_email_idx
  on public.tenant_invitations (tenant_id, normalized_email)
  where status = 'pending';

create index tenant_invitations_tenant_status_idx on public.tenant_invitations (tenant_id, status);
create index tenant_invitations_email_status_idx on public.tenant_invitations (normalized_email, status);
create index tenant_invitations_expires_at_idx on public.tenant_invitations (expires_at);

create table public.platform_role_assignments (
  assignment_id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.person_profiles (person_id) on delete restrict,
  role_key text not null,
  status text not null default 'pending',
  assigned_by_person_id uuid references public.person_profiles (person_id) on delete set null,
  revoked_by_person_id uuid references public.person_profiles (person_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  assigned_at timestamptz,
  revoked_at timestamptz,
  expires_at timestamptz,
  constraint platform_role_assignments_role_key_check check (
    role_key in ('platform_owner', 'platform_admin', 'platform_support', 'service_principal')
  ),
  constraint platform_role_assignments_status_check check (
    status in ('pending', 'active', 'revoked', 'expired')
  )
);

create unique index platform_role_assignments_one_active_role_idx
  on public.platform_role_assignments (person_id, role_key)
  where status = 'active';

create index platform_role_assignments_person_status_idx
  on public.platform_role_assignments (person_id, status);
create index platform_role_assignments_role_status_idx
  on public.platform_role_assignments (role_key, status);

create table public.tenant_role_assignments (
  assignment_id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  membership_id uuid not null,
  role_key text not null,
  status text not null default 'pending',
  assigned_by_person_id uuid references public.person_profiles (person_id) on delete set null,
  revoked_by_person_id uuid references public.person_profiles (person_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  assigned_at timestamptz,
  revoked_at timestamptz,
  expires_at timestamptz,
  foreign key (membership_id, tenant_id)
    references public.tenant_memberships (membership_id, tenant_id)
    on delete cascade,
  constraint tenant_role_assignments_role_key_check check (
    role_key in ('tenant_owner', 'tenant_admin', 'tenant_member')
  ),
  constraint tenant_role_assignments_status_check check (
    status in ('pending', 'active', 'revoked', 'expired')
  )
);

create unique index tenant_role_assignments_one_active_role_idx
  on public.tenant_role_assignments (membership_id, role_key)
  where status = 'active';

create index tenant_role_assignments_tenant_role_status_idx
  on public.tenant_role_assignments (tenant_id, role_key, status);
create index tenant_role_assignments_membership_status_idx
  on public.tenant_role_assignments (membership_id, status);
create index tenant_role_assignments_tenant_membership_idx
  on public.tenant_role_assignments (tenant_id, membership_id);

create table public.tenant_audit_events (
  audit_event_id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants (tenant_id) on delete restrict,
  event_name text not null,
  actor_type text not null,
  actor_person_id uuid references public.person_profiles (person_id) on delete set null,
  actor_platform_roles text[] not null default '{}',
  reason text not null,
  correlation_id uuid not null,
  resource_type text not null,
  resource_id text not null,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint tenant_audit_events_event_name_not_blank check (length(btrim(event_name)) > 0),
  constraint tenant_audit_events_actor_type_check check (
    actor_type in ('person', 'service_principal', 'platform_system')
  ),
  constraint tenant_audit_events_reason_not_blank check (length(btrim(reason)) > 0),
  constraint tenant_audit_events_resource_type_not_blank check (length(btrim(resource_type)) > 0),
  constraint tenant_audit_events_resource_id_not_blank check (length(btrim(resource_id)) > 0),
  constraint tenant_audit_events_metadata_object_check check (jsonb_typeof(metadata) = 'object')
);

create index tenant_audit_events_tenant_occurred_idx
  on public.tenant_audit_events (tenant_id, occurred_at desc);
create index tenant_audit_events_actor_occurred_idx
  on public.tenant_audit_events (actor_person_id, occurred_at desc);
create index tenant_audit_events_resource_idx
  on public.tenant_audit_events (resource_type, resource_id);
create index tenant_audit_events_correlation_id_idx on public.tenant_audit_events (correlation_id);
create index tenant_audit_events_event_name_idx on public.tenant_audit_events (event_name);

create table public.active_tenant_preferences (
  person_id uuid primary key references public.person_profiles (person_id) on delete cascade,
  tenant_id uuid not null,
  membership_id uuid not null,
  selected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (membership_id, tenant_id)
    references public.tenant_memberships (membership_id, tenant_id)
    on delete cascade
);

create index active_tenant_preferences_tenant_person_idx
  on public.active_tenant_preferences (tenant_id, person_id);
