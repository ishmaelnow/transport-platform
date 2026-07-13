-- Safe invitation inspection details for invitation landing pages.
-- The raw token is still never stored; callers provide only the token hash.

drop function if exists public.inspect_tenant_invitation_token(text);

create or replace function public.inspect_tenant_invitation_token(token_hash text)
returns table (
  status text,
  tenant_display_name text,
  intended_role text,
  invitation_email text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  invitation_record record;
begin
  if length(btrim(token_hash)) = 0 then
    return query select 'invalid_token'::text, null::text, null::text, null::text;
    return;
  end if;

  select
    ti.status,
    ti.expires_at,
    ti.email,
    ti.intended_role,
    tc.display_name
    into invitation_record
  from public.tenant_invitations ti
  join public.tenant_configurations tc
    on tc.tenant_id = ti.tenant_id
  where ti.invitation_token_hash = token_hash
  limit 1;

  if invitation_record is null then
    return query select 'invalid_token'::text, null::text, null::text, null::text;
    return;
  end if;

  if invitation_record.status = 'cancelled' then
    return query select 'cancelled'::text, null::text, null::text, null::text;
    return;
  end if;

  if invitation_record.status = 'accepted' then
    return query select 'already_accepted'::text, null::text, null::text, null::text;
    return;
  end if;

  if invitation_record.status = 'expired' or invitation_record.expires_at <= now() then
    return query select 'expired'::text, null::text, null::text, null::text;
    return;
  end if;

  return query select
    'pending'::text,
    invitation_record.display_name::text,
    invitation_record.intended_role::text,
    invitation_record.email::text;
end;
$$;
