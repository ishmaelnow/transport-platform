-- Tenant invitation acceptance workflow.
-- Keeps raw invitation tokens outside the database and performs acceptance atomically.

create or replace function public.inspect_tenant_invitation_token(token_hash text)
returns table (
  status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  invitation_record record;
begin
  if length(btrim(token_hash)) = 0 then
    return query select 'invalid_token'::text;
    return;
  end if;

  select ti.status, ti.expires_at
    into invitation_record
  from public.tenant_invitations ti
  where ti.invitation_token_hash = token_hash
  limit 1;

  if invitation_record is null then
    return query select 'invalid_token'::text;
    return;
  end if;

  if invitation_record.status = 'cancelled' then
    return query select 'cancelled'::text;
    return;
  end if;

  if invitation_record.status = 'accepted' then
    return query select 'already_accepted'::text;
    return;
  end if;

  if invitation_record.status = 'expired' or invitation_record.expires_at <= now() then
    return query select 'expired'::text;
    return;
  end if;

  return query select 'pending'::text;
end;
$$;

create or replace function public.accept_tenant_invitation(token_hash text)
returns table (
  status text,
  tenant_id uuid,
  membership_id uuid,
  person_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  invitation_record public.tenant_invitations%rowtype;
  auth_user_id uuid;
  auth_email text;
  target_person_id uuid;
  target_membership_id uuid;
begin
  auth_user_id := auth.uid();
  auth_email := lower(btrim(coalesce(auth.jwt() ->> 'email', '')));

  if auth_user_id is null or auth_email = '' then
    raise exception 'authentication is required';
  end if;

  if length(btrim(token_hash)) = 0 then
    return query select 'invalid_token'::text, null::uuid, null::uuid, null::uuid;
    return;
  end if;

  select *
    into invitation_record
  from public.tenant_invitations ti
  where ti.invitation_token_hash = token_hash
  for update;

  if not found then
    return query select 'invalid_token'::text, null::uuid, null::uuid, null::uuid;
    return;
  end if;

  if invitation_record.status = 'cancelled' then
    return query select 'cancelled'::text, invitation_record.tenant_id, null::uuid, null::uuid;
    return;
  end if;

  if invitation_record.status = 'accepted' then
    select pp.person_id
      into target_person_id
    from public.person_profiles pp
    where pp.auth_user_id = auth_user_id
       or pp.person_id = invitation_record.accepted_by_person_id
    limit 1;

    select tm.membership_id
      into target_membership_id
    from public.tenant_memberships tm
    where tm.tenant_id = invitation_record.tenant_id
      and tm.person_id = target_person_id
    limit 1;

    return query select
      'already_accepted'::text,
      invitation_record.tenant_id,
      target_membership_id,
      target_person_id;
    return;
  end if;

  if invitation_record.status = 'expired' or invitation_record.expires_at <= now() then
    update public.tenant_invitations
    set status = 'expired'
    where invitation_id = invitation_record.invitation_id
      and status = 'pending';

    return query select 'expired'::text, invitation_record.tenant_id, null::uuid, null::uuid;
    return;
  end if;

  if invitation_record.normalized_email <> auth_email then
    return query select 'email_mismatch'::text, invitation_record.tenant_id, null::uuid, null::uuid;
    return;
  end if;

  select pp.person_id
    into target_person_id
  from public.person_profiles pp
  where pp.normalized_email = invitation_record.normalized_email
  for update;

  if target_person_id is null then
    insert into public.person_profiles (
      auth_user_id,
      status,
      display_name,
      primary_email,
      normalized_email,
      activated_at
    )
    values (
      auth_user_id,
      'active',
      invitation_record.email,
      invitation_record.email,
      invitation_record.normalized_email,
      now()
    )
    returning person_profiles.person_id into target_person_id;
  else
    update public.person_profiles pp
    set
      auth_user_id = case
        when pp.auth_user_id is null then auth_user_id
        else pp.auth_user_id
      end,
      status = 'active',
      activated_at = coalesce(pp.activated_at, now()),
      deactivated_at = null,
      suspended_at = null
    where pp.person_id = target_person_id
      and (pp.auth_user_id is null or pp.auth_user_id = auth_user_id)
    returning pp.person_id into target_person_id;

    if target_person_id is null then
      raise exception 'person profile email is already linked to another auth identity';
    end if;
  end if;

  insert into public.tenant_memberships (
    tenant_id,
    person_id,
    status,
    invited_at,
    activated_at,
    created_by_person_id,
    updated_by_person_id
  )
  values (
    invitation_record.tenant_id,
    target_person_id,
    'active',
    invitation_record.created_at,
    now(),
    invitation_record.invited_by_person_id,
    target_person_id
  )
  on conflict (tenant_id, person_id)
  do update set
    status = 'active',
    activated_at = coalesce(public.tenant_memberships.activated_at, now()),
    suspended_at = null,
    removed_at = null,
    expires_at = null,
    updated_by_person_id = target_person_id
  returning tenant_memberships.membership_id into target_membership_id;

  insert into public.tenant_role_assignments (
    tenant_id,
    membership_id,
    role_key,
    status,
    assigned_by_person_id,
    assigned_at
  )
  select
    invitation_record.tenant_id,
    target_membership_id,
    invitation_record.intended_role,
    'active',
    invitation_record.invited_by_person_id,
    now()
  where not exists (
    select 1
    from public.tenant_role_assignments tra
    where tra.tenant_id = invitation_record.tenant_id
      and tra.membership_id = target_membership_id
      and tra.role_key = invitation_record.intended_role
      and tra.status = 'active'
      and (tra.expires_at is null or tra.expires_at > now())
  );

  update public.tenant_invitations
  set
    status = 'accepted',
    accepted_by_person_id = target_person_id,
    accepted_at = now()
  where invitation_id = invitation_record.invitation_id;

  insert into public.active_tenant_preferences (
    person_id,
    tenant_id,
    membership_id,
    selected_at
  )
  values (
    target_person_id,
    invitation_record.tenant_id,
    target_membership_id,
    now()
  )
  on conflict (person_id)
  do update set
    tenant_id = excluded.tenant_id,
    membership_id = excluded.membership_id,
    selected_at = excluded.selected_at;

  if invitation_record.intended_role = 'tenant_owner'
     and public.tenant_has_active_owner(invitation_record.tenant_id) then
    update public.tenants
    set status = 'active',
        activated_at = coalesce(activated_at, now())
    where tenants.tenant_id = invitation_record.tenant_id
      and tenants.status = 'provisioning';
  end if;

  insert into public.tenant_audit_events (
    tenant_id,
    event_name,
    actor_type,
    actor_person_id,
    reason,
    correlation_id,
    resource_type,
    resource_id,
    metadata
  )
  values (
    invitation_record.tenant_id,
    'tenant.invitation_accepted',
    'person',
    target_person_id,
    'Tenant invitation accepted',
    gen_random_uuid(),
    'tenant_invitation',
    invitation_record.invitation_id::text,
    jsonb_build_object(
      'membership_id', target_membership_id,
      'role_key', invitation_record.intended_role
    )
  );

  return query select
    'accepted'::text,
    invitation_record.tenant_id,
    target_membership_id,
    target_person_id;
end;
$$;

revoke all on function public.inspect_tenant_invitation_token(text) from public;
revoke all on function public.accept_tenant_invitation(text) from public;

grant execute on function public.inspect_tenant_invitation_token(text) to anon, authenticated;
grant execute on function public.accept_tenant_invitation(text) to authenticated;
