# Local Tenant Administration Seed

This runbook creates local development data for the Admin Tenant Administration UI.

It is for local Supabase only. Do not run this against production.

## Start Local Services

```bash
supabase start
```

Open Supabase Studio:

```text
http://127.0.0.1:54323
```

## Create Auth Users

In Supabase Studio, go to Authentication -> Users -> Add user.

Create these local users:

| Email                | Password            |
| -------------------- | ------------------- |
| `admin@example.test` | password you choose |
| `admin@email.test`   | `admin123`          |

Enable auto-confirm for local testing.

## Seed Tenant Foundation Rows

After both Auth users exist, run this in Supabase Studio SQL Editor:

```sql
do $$
declare
  v_tenant_id uuid := gen_random_uuid();
  v_admin_person_id uuid := gen_random_uuid();
  v_email_person_id uuid := gen_random_uuid();
  v_admin_membership_id uuid := gen_random_uuid();
  v_email_membership_id uuid := gen_random_uuid();
  v_admin_auth_id uuid;
  v_email_auth_id uuid;
begin
  select id into v_admin_auth_id
  from auth.users
  where email = 'admin@example.test';

  select id into v_email_auth_id
  from auth.users
  where email = 'admin@email.test';

  if v_admin_auth_id is null then
    raise exception 'Missing auth user: admin@example.test';
  end if;

  if v_email_auth_id is null then
    raise exception 'Missing auth user: admin@email.test';
  end if;

  insert into person_profiles (
    person_id,
    auth_user_id,
    status,
    display_name,
    primary_email,
    normalized_email,
    activated_at
  )
  values
    (v_admin_person_id, v_admin_auth_id, 'active', 'Local Admin', 'admin@example.test', 'admin@example.test', now()),
    (v_email_person_id, v_email_auth_id, 'active', 'Admin Email', 'admin@email.test', 'admin@email.test', now());

  insert into tenants (tenant_id, status)
  values (v_tenant_id, 'provisioning');

  insert into tenant_configurations (
    tenant_id,
    legal_name,
    display_name,
    default_time_zone,
    support_contact_email
  )
  values (
    v_tenant_id,
    'Local Transport Company LLC',
    'Local Transport Company',
    'America/Chicago',
    'support@example.test'
  );

  insert into tenant_capabilities (tenant_id, capability_key, enabled, enabled_at, disabled_at)
  values
    (v_tenant_id, 'tenant.memberships', true, now(), null),
    (v_tenant_id, 'tenant.roles', true, now(), null),
    (v_tenant_id, 'tenant.audit', true, now(), null),
    (v_tenant_id, 'app.admin', true, now(), null),
    (v_tenant_id, 'app.rider', false, null, now()),
    (v_tenant_id, 'app.driver', false, null, now());

  insert into tenant_memberships (
    membership_id,
    tenant_id,
    person_id,
    status,
    activated_at
  )
  values
    (v_admin_membership_id, v_tenant_id, v_admin_person_id, 'active', now()),
    (v_email_membership_id, v_tenant_id, v_email_person_id, 'active', now());

  insert into tenant_role_assignments (
    tenant_id,
    membership_id,
    role_key,
    status,
    assigned_at
  )
  values
    (v_tenant_id, v_admin_membership_id, 'tenant_owner', 'active', now()),
    (v_tenant_id, v_email_membership_id, 'tenant_owner', 'active', now());

  update tenants
  set status = 'active', activated_at = now()
  where tenant_id = v_tenant_id;

  insert into tenant_audit_events (
    tenant_id,
    event_name,
    actor_type,
    reason,
    correlation_id,
    resource_type,
    resource_id
  )
  values (
    v_tenant_id,
    'tenant.local_seed_created',
    'platform_system',
    'Local development tenant seed',
    gen_random_uuid(),
    'tenant',
    v_tenant_id::text
  );
end $$;
```

A successful run returns:

```text
Success. No rows returned
```

## Enable Platform Tenant Provisioning

The Tenant Administration UI only requires tenant membership. The Platform tab requires an active
`platform_owner` or `platform_admin` assignment.

For local development, run this after the seed above if `admin@email.test` should provision tenants:

```sql
insert into platform_role_assignments (
  person_id,
  role_key,
  status,
  assigned_at
)
select
  person_id,
  'platform_admin',
  'active',
  now()
from person_profiles
where normalized_email = 'admin@email.test'
on conflict do nothing;
```

After signing in as `admin@email.test`, the Admin app shows a Platform tab. That tab creates:

- a provisioning tenant
- platform-managed tenant configuration values
- default Tenant Foundation capabilities
- a pending first `tenant_owner` invitation
- a tenant audit event

It does not create transportation business records or public tenant signup.

## Run Admin App Locally

Use local Supabase public values:

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 \
NEXT_PUBLIC_SUPABASE_ANON_KEY='sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH' \
pnpm --filter @esh-platform/admin dev
```

Open:

```text
http://localhost:3000
```

## Troubleshooting

If login returns `Invalid login credentials`, the Auth user does not exist, is not confirmed, or the password is different.

If the Admin UI says there is no person profile or no active membership, rerun the SQL after confirming both Auth users exist.

If the seed partially ran and now conflicts on unique email values, reset local Supabase and seed again:

```bash
supabase db reset --local
```

Then recreate the Auth users and rerun the SQL.

If the dev server reports missing Supabase env vars, restart it with the `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` values shown above.

If Turbopack reports a workspace-root or `next/package.json` resolution error in WSL, use the Admin dev script, which runs Next with webpack:

```bash
pnpm --filter @esh-platform/admin dev
```
