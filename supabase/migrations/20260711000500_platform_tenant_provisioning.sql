-- Platform tenant provisioning workflow.
-- Creates the tenant foundation rows and first tenant-owner invitation in one audited operation.

create or replace function public.provision_tenant_with_owner_invitation(
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
  tenant_id uuid,
  invitation_id uuid
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
begin
  if not public.is_platform_data_admin() then
    raise exception 'platform_owner or platform_admin role is required';
  end if;

  actor_person_id := public.current_person_id();
  select coalesce(array_agg(pra.role_key order by pra.role_key), '{}')
    into actor_platform_roles
  from public.platform_role_assignments pra
  where pra.person_id = actor_person_id
    and pra.status = 'active'
    and pra.role_key in ('platform_owner', 'platform_admin')
    and (pra.expires_at is null or pra.expires_at > now());

  if actor_person_id is null then
    raise exception 'active platform actor profile is required';
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

  normalized_owner_email := lower(btrim(owner_email));

  insert into public.tenants (status)
  values ('provisioning')
  returning tenants.tenant_id into new_tenant_id;

  insert into public.tenant_configurations (
    tenant_id,
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
    expires_at
  )
  values (
    new_tenant_id,
    btrim(owner_email),
    normalized_owner_email,
    invitation_token_hash,
    'tenant_owner',
    'pending',
    actor_person_id,
    now() + interval '7 days'
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
      'first_owner_email', normalized_owner_email
    )
  );

  return query select new_tenant_id, new_invitation_id;
end;
$$;

revoke all on function public.provision_tenant_with_owner_invitation(
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

grant execute on function public.provision_tenant_with_owner_invitation(
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
