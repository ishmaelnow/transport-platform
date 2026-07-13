-- Platform provisioning operations.
-- Adds delivery state, idempotent tenant slugs, resend support, and safe closure for abandoned provisioning tenants.

alter table public.tenant_configurations
  add column tenant_slug text;

alter table public.tenant_configurations
  add constraint tenant_configurations_tenant_slug_check check (
    tenant_slug is null or tenant_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  );

create unique index tenant_configurations_tenant_slug_unique_idx
  on public.tenant_configurations (tenant_slug)
  where tenant_slug is not null;

alter table public.tenant_invitations
  add column email_delivery_status text not null default 'not_sent',
  add column email_delivery_attempted_at timestamptz,
  add column email_delivered_at timestamptz,
  add column email_delivery_error text;

alter table public.tenant_invitations
  add constraint tenant_invitations_email_delivery_status_check check (
    email_delivery_status in ('not_sent', 'pending', 'sent', 'failed')
  );

create index tenant_invitations_delivery_status_idx
  on public.tenant_invitations (email_delivery_status, created_at desc);

create or replace function public.provision_tenant_with_owner_invitation_v2(
  tenant_slug text,
  tenant_display_name text,
  tenant_legal_name text,
  tenant_default_time_zone text,
  tenant_support_contact_email text,
  tenant_branding_reference text,
  owner_email text,
  invitation_token_hash text,
  correlation_id uuid,
  reason text
)
returns table (
  provisioned_tenant_id uuid,
  provisioned_invitation_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_person_id uuid;
  actor_platform_roles text[];
  new_tenant_id uuid;
  new_invitation_id uuid;
  normalized_owner_email text;
  normalized_tenant_slug text;
begin
  if not public.is_platform_data_admin() then
    raise exception 'platform_owner or platform_admin role is required';
  end if;

  actor_person_id := public.current_person_id();

  if actor_person_id is null then
    raise exception 'active platform actor profile is required';
  end if;

  select coalesce(array_agg(pra.role_key order by pra.role_key), '{}')
    into actor_platform_roles
  from public.platform_role_assignments pra
  where pra.person_id = actor_person_id
    and pra.status = 'active'
    and pra.role_key in ('platform_owner', 'platform_admin')
    and (pra.expires_at is null or pra.expires_at > now());

  normalized_tenant_slug := lower(btrim(tenant_slug));

  if length(normalized_tenant_slug) = 0 then
    raise exception 'tenant slug is required';
  end if;

  if normalized_tenant_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'tenant slug must contain lowercase letters, numbers, and hyphens only';
  end if;

  if length(btrim(tenant_display_name)) = 0 then
    raise exception 'tenant display name is required';
  end if;

  if length(btrim(tenant_legal_name)) = 0 then
    raise exception 'tenant legal name is required';
  end if;

  if length(btrim(tenant_default_time_zone)) = 0 then
    raise exception 'tenant default time zone is required';
  end if;

  if length(btrim(tenant_support_contact_email)) = 0 then
    raise exception 'tenant support contact email is required';
  end if;

  if length(btrim(owner_email)) = 0 then
    raise exception 'first tenant owner email is required';
  end if;

  if length(btrim(invitation_token_hash)) = 0 then
    raise exception 'invitation token hash is required';
  end if;

  if length(btrim(reason)) = 0 then
    raise exception 'provisioning reason is required';
  end if;

  if exists (
    select 1
    from public.tenant_configurations tc
    join public.tenants t
      on t.tenant_id = tc.tenant_id
    where tc.tenant_slug = normalized_tenant_slug
      and t.status in ('provisioning', 'active', 'suspended')
  ) then
    raise exception 'tenant slug already exists';
  end if;

  normalized_owner_email := lower(btrim(owner_email));

  insert into public.tenants (status)
  values ('provisioning')
  returning tenants.tenant_id into new_tenant_id;

  insert into public.tenant_configurations (
    tenant_id,
    tenant_slug,
    legal_name,
    display_name,
    default_time_zone,
    support_contact_email,
    branding_reference,
    created_by_person_id,
    updated_by_person_id
  )
  values (
    new_tenant_id,
    normalized_tenant_slug,
    btrim(tenant_legal_name),
    btrim(tenant_display_name),
    btrim(tenant_default_time_zone),
    btrim(tenant_support_contact_email),
    nullif(btrim(tenant_branding_reference), ''),
    actor_person_id,
    actor_person_id
  );

  insert into public.tenant_capabilities (
    tenant_id,
    capability_key,
    enabled,
    enabled_at,
    disabled_at,
    updated_by_person_id
  )
  values
    (new_tenant_id, 'tenant.memberships', true, now(), null, actor_person_id),
    (new_tenant_id, 'tenant.roles', true, now(), null, actor_person_id),
    (new_tenant_id, 'tenant.audit', true, now(), null, actor_person_id),
    (new_tenant_id, 'app.admin', true, now(), null, actor_person_id),
    (new_tenant_id, 'app.rider', false, null, now(), actor_person_id),
    (new_tenant_id, 'app.driver', false, null, now(), actor_person_id);

  insert into public.tenant_invitations (
    tenant_id,
    email,
    normalized_email,
    invitation_token_hash,
    intended_role,
    status,
    invited_by_person_id,
    expires_at,
    email_delivery_status
  )
  values (
    new_tenant_id,
    btrim(owner_email),
    normalized_owner_email,
    invitation_token_hash,
    'tenant_owner',
    'pending',
    actor_person_id,
    now() + interval '7 days',
    'pending'
  )
  returning tenant_invitations.invitation_id into new_invitation_id;

  insert into public.tenant_audit_events (
    tenant_id,
    event_name,
    actor_type,
    actor_person_id,
    actor_platform_roles,
    reason,
    correlation_id,
    resource_type,
    resource_id,
    metadata
  )
  values (
    new_tenant_id,
    'tenant.provisioned',
    'person',
    actor_person_id,
    actor_platform_roles,
    btrim(reason),
    correlation_id,
    'tenant',
    new_tenant_id::text,
    jsonb_build_object(
      'first_owner_invitation_id', new_invitation_id,
      'first_owner_email', normalized_owner_email,
      'tenant_slug', normalized_tenant_slug
    )
  );

  return query select new_tenant_id, new_invitation_id;
end;
$$;

revoke all on function public.provision_tenant_with_owner_invitation_v2(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  uuid,
  text
) from public;

grant execute on function public.provision_tenant_with_owner_invitation_v2(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  uuid,
  text
) to authenticated;

create or replace function public.close_provisioning_tenant(
  target_tenant_id uuid,
  reason text,
  correlation_id uuid
)
returns table (
  closed_tenant_id uuid,
  closed_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_person_id uuid;
  actor_platform_roles text[];
  pending_invitation_count integer;
begin
  if not public.is_platform_data_admin() then
    raise exception 'platform_owner or platform_admin role is required';
  end if;

  actor_person_id := public.current_person_id();

  if actor_person_id is null then
    raise exception 'active platform actor profile is required';
  end if;

  if length(btrim(reason)) = 0 then
    raise exception 'closure reason is required';
  end if;

  select coalesce(array_agg(pra.role_key order by pra.role_key), '{}')
    into actor_platform_roles
  from public.platform_role_assignments pra
  where pra.person_id = actor_person_id
    and pra.status = 'active'
    and pra.role_key in ('platform_owner', 'platform_admin')
    and (pra.expires_at is null or pra.expires_at > now());

  update public.tenants t
     set status = 'closed',
         closed_at = coalesce(t.closed_at, now())
   where t.tenant_id = target_tenant_id
     and t.status = 'provisioning'
  returning t.tenant_id, t.status into closed_tenant_id, closed_status;

  if closed_tenant_id is null then
    raise exception 'only provisioning tenants can be closed by this operation';
  end if;

  update public.tenant_invitations ti
     set status = 'cancelled',
         cancelled_at = coalesce(ti.cancelled_at, now()),
         cancelled_by_person_id = actor_person_id
   where ti.tenant_id = target_tenant_id
     and ti.status = 'pending';

  get diagnostics pending_invitation_count = row_count;

  insert into public.tenant_audit_events (
    tenant_id,
    event_name,
    actor_type,
    actor_person_id,
    actor_platform_roles,
    reason,
    correlation_id,
    resource_type,
    resource_id,
    metadata
  )
  values (
    target_tenant_id,
    'tenant.provisioning_closed',
    'person',
    actor_person_id,
    actor_platform_roles,
    btrim(reason),
    correlation_id,
    'tenant',
    target_tenant_id::text,
    jsonb_build_object('cancelled_pending_invitations', pending_invitation_count)
  );

  return query select closed_tenant_id, closed_status;
end;
$$;

revoke all on function public.close_provisioning_tenant(uuid, text, uuid) from public;
grant execute on function public.close_provisioning_tenant(uuid, text, uuid) to authenticated;
