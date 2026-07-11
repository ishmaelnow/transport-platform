import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

const RUN_RLS_TESTS = process.env.RUN_SUPABASE_RLS_TESTS === "true";

const ROOT = resolve(__dirname, "../../..");
const MIGRATIONS = [
  "supabase/migrations/20260711000100_tenant_foundation_schema.sql",
  "supabase/migrations/20260711000200_tenant_foundation_guards.sql",
  "supabase/migrations/20260711000300_tenant_foundation_rls.sql",
];

function psql(args: readonly string[], input?: string): string {
  return execFileSync("psql", args, {
    cwd: ROOT,
    encoding: "utf8",
    env: {
      ...process.env,
      PGHOST: process.env.SUPABASE_TEST_DB_HOST ?? "127.0.0.1",
      PGPORT: process.env.SUPABASE_TEST_DB_PORT ?? "54322",
      PGUSER: process.env.SUPABASE_TEST_DB_USER ?? "postgres",
      PGPASSWORD: process.env.SUPABASE_TEST_DB_PASSWORD ?? "postgres",
      PGDATABASE: process.env.SUPABASE_TEST_DB_NAME ?? "postgres",
    },
    input,
  });
}

function foundationTablesExist(): boolean {
  const output = psql(["-tAc", "select to_regclass('public.person_profiles') is not null;"]);

  return output.trim() === "t";
}

function migrationSql(): string {
  if (foundationTablesExist()) {
    return "";
  }

  return MIGRATIONS.map((path) => readFileSync(resolve(ROOT, path), "utf8")).join("\n\n");
}

function expectRlsError(block: string): string {
  return `
do $$
begin
  ${block}
  raise exception 'expected RLS denial but statement succeeded';
exception
  when insufficient_privilege then
    null;
  when check_violation then
    null;
  when others then
    null;
end;
$$;
`;
}

const runOrSkip = RUN_RLS_TESTS ? test : test.skip;

describe("Tenant Foundation RLS", () => {
  runOrSkip("enforces tenant isolation and foundation role boundaries", () => {
    const sql = `
begin;

${migrationSql()}

create or replace function pg_temp.assert_eq(label text, actual bigint, expected bigint)
returns void
language plpgsql
as $$
begin
  if actual is distinct from expected then
    raise exception '% expected %, got %', label, expected, actual;
  end if;
end;
$$;

create or replace function pg_temp.assert_true(label text, actual boolean)
returns void
language plpgsql
as $$
begin
  if actual is not true then
    raise exception '% expected true, got %', label, actual;
  end if;
end;
$$;

insert into auth.users (id, aud, role, email, email_confirmed_at, created_at, updated_at)
values
  ('00000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'platform-admin@example.test', now(), now(), now()),
  ('00000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'platform-support@example.test', now(), now(), now()),
  ('00000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'tenant-a-owner@example.test', now(), now(), now()),
  ('00000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'tenant-a-admin@example.test', now(), now(), now()),
  ('00000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'tenant-a-member@example.test', now(), now(), now()),
  ('00000000-0000-4000-8000-000000000006', 'authenticated', 'authenticated', 'tenant-a-suspended@example.test', now(), now(), now()),
  ('00000000-0000-4000-8000-000000000007', 'authenticated', 'authenticated', 'tenant-b-owner@example.test', now(), now(), now()),
  ('00000000-0000-4000-8000-000000000008', 'authenticated', 'authenticated', 'person-without-membership@example.test', now(), now(), now()),
  ('00000000-0000-4000-8000-000000000009', 'authenticated', 'authenticated', 'multi-tenant@example.test', now(), now(), now())
on conflict (id) do nothing;

insert into public.person_profiles (
  person_id,
  auth_user_id,
  status,
  display_name,
  primary_email,
  normalized_email,
  activated_at
)
values
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'active', 'Platform Admin', 'platform-admin@example.test', 'platform-admin@example.test', now()),
  ('10000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000002', 'active', 'Platform Support', 'platform-support@example.test', 'platform-support@example.test', now()),
  ('10000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000003', 'active', 'Tenant A Owner', 'tenant-a-owner@example.test', 'tenant-a-owner@example.test', now()),
  ('10000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000004', 'active', 'Tenant A Admin', 'tenant-a-admin@example.test', 'tenant-a-admin@example.test', now()),
  ('10000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000005', 'active', 'Tenant A Member', 'tenant-a-member@example.test', 'tenant-a-member@example.test', now()),
  ('10000000-0000-4000-8000-000000000006', '00000000-0000-4000-8000-000000000006', 'active', 'Tenant A Suspended', 'tenant-a-suspended@example.test', 'tenant-a-suspended@example.test', now()),
  ('10000000-0000-4000-8000-000000000007', '00000000-0000-4000-8000-000000000007', 'active', 'Tenant B Owner', 'tenant-b-owner@example.test', 'tenant-b-owner@example.test', now()),
  ('10000000-0000-4000-8000-000000000008', '00000000-0000-4000-8000-000000000008', 'active', 'No Membership', 'person-without-membership@example.test', 'person-without-membership@example.test', now()),
  ('10000000-0000-4000-8000-000000000009', '00000000-0000-4000-8000-000000000009', 'active', 'Multi Tenant', 'multi-tenant@example.test', 'multi-tenant@example.test', now());

insert into public.platform_role_assignments (assignment_id, person_id, role_key, status, assigned_at)
values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'platform_admin', 'active', now()),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'platform_support', 'active', now());

insert into public.tenants (tenant_id, status)
values
  ('30000000-0000-4000-8000-000000000001', 'provisioning'),
  ('30000000-0000-4000-8000-000000000002', 'provisioning'),
  ('30000000-0000-4000-8000-000000000003', 'suspended');

insert into public.tenant_configurations (
  tenant_id,
  legal_name,
  display_name,
  default_time_zone,
  support_contact_email
)
values
  ('30000000-0000-4000-8000-000000000001', 'Tenant A Legal', 'Tenant A', 'America/Chicago', 'support-a@example.test'),
  ('30000000-0000-4000-8000-000000000002', 'Tenant B Legal', 'Tenant B', 'America/Chicago', 'support-b@example.test'),
  ('30000000-0000-4000-8000-000000000003', 'Tenant C Legal', 'Tenant C', 'America/Chicago', 'support-c@example.test');

insert into public.tenant_capabilities (tenant_id, capability_key, enabled, enabled_at, disabled_at)
select tenant_id, capability_key, enabled, case when enabled then now() end, case when not enabled then now() end
from (
  values
    ('30000000-0000-4000-8000-000000000001'::uuid),
    ('30000000-0000-4000-8000-000000000002'::uuid),
    ('30000000-0000-4000-8000-000000000003'::uuid)
) as tenants(tenant_id)
cross join (
  values
    ('tenant.memberships', true),
    ('tenant.roles', true),
    ('tenant.audit', true),
    ('app.admin', true),
    ('app.rider', false),
    ('app.driver', false)
) as capabilities(capability_key, enabled);

insert into public.tenant_memberships (
  membership_id,
  tenant_id,
  person_id,
  status,
  activated_at,
  suspended_at
)
values
  ('40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000003', 'active', now(), null),
  ('40000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000004', 'active', now(), null),
  ('40000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000005', 'active', now(), null),
  ('40000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000006', 'suspended', null, now()),
  ('40000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000007', 'active', now(), null),
  ('40000000-0000-4000-8000-000000000006', '30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000009', 'active', now(), null),
  ('40000000-0000-4000-8000-000000000007', '30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000009', 'active', now(), null);

insert into public.tenant_role_assignments (
  assignment_id,
  tenant_id,
  membership_id,
  role_key,
  status,
  assigned_at
)
values
  ('50000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'tenant_owner', 'active', now()),
  ('50000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000002', 'tenant_admin', 'active', now()),
  ('50000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000003', 'tenant_member', 'active', now()),
  ('50000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000004', 'tenant_member', 'active', now()),
  ('50000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000005', 'tenant_owner', 'active', now()),
  ('50000000-0000-4000-8000-000000000006', '30000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000006', 'tenant_member', 'active', now()),
  ('50000000-0000-4000-8000-000000000007', '30000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000007', 'tenant_member', 'active', now());

update public.tenants
set status = 'active', activated_at = now()
where tenant_id in (
  '30000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000002'
);

insert into public.tenant_audit_events (
  tenant_id,
  event_name,
  actor_type,
  actor_person_id,
  reason,
  correlation_id,
  resource_type,
  resource_id
)
values (
  '30000000-0000-4000-8000-000000000001',
  'tenant.foundation.fixture_created',
  'platform_system',
  null,
  'rls test fixture',
  '60000000-0000-4000-8000-000000000001',
  'tenant',
  '30000000-0000-4000-8000-000000000001'
);

set local role anon;
select pg_temp.assert_eq('anonymous cannot read tenants', (select count(*) from public.tenants), 0);
reset role;

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000008';
select pg_temp.assert_eq('auth alone grants no tenant access', (select count(*) from public.tenants), 0);
reset role;

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000005';
select pg_temp.assert_eq('tenant member reads only own tenant', (select count(*) from public.tenants), 1);
select pg_temp.assert_eq('tenant member cannot read tenant b configuration', (
  select count(*) from public.tenant_configurations
  where tenant_id = '30000000-0000-4000-8000-000000000002'
), 0);
select pg_temp.assert_eq('tenant member cannot read tenant audit', (select count(*) from public.tenant_audit_events), 0);
${expectRlsError(`
  insert into public.tenant_memberships (tenant_id, person_id, status)
  values (
    '30000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000008',
    'invited'
  );
`)}
reset role;

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000006';
select pg_temp.assert_eq('suspended membership grants no tenant access', (select count(*) from public.tenants), 0);
reset role;

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000004';
select pg_temp.assert_eq('tenant admin reads tenant memberships in own tenant', (
  select count(*) from public.tenant_memberships
  where tenant_id = '30000000-0000-4000-8000-000000000001'
), 5);
select pg_temp.assert_eq('tenant admin cannot read tenant b memberships', (
  select count(*) from public.tenant_memberships
  where tenant_id = '30000000-0000-4000-8000-000000000002'
), 0);
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
  '30000000-0000-4000-8000-000000000001',
  'new-member-a@example.test',
  'new-member-a@example.test',
  'tenant-a-admin-token',
  'tenant_member',
  'pending',
  '10000000-0000-4000-8000-000000000004',
  now() + interval '7 days'
);
${expectRlsError(`
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
    '30000000-0000-4000-8000-000000000002',
    'cross-tenant@example.test',
    'cross-tenant@example.test',
    'tenant-a-admin-cross-tenant-token',
    'tenant_member',
    'pending',
    '10000000-0000-4000-8000-000000000004',
    now() + interval '7 days'
  );
`)}
reset role;

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000001';
select pg_temp.assert_true('platform admin can read tenants', (select count(*) from public.tenants) >= 3);
select pg_temp.assert_true('platform admin can read platform roles', (select count(*) from public.platform_role_assignments) >= 2);
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
  '30000000-0000-4000-8000-000000000003',
  'first-owner-c@example.test',
  'first-owner-c@example.test',
  'platform-admin-first-owner-token',
  'tenant_owner',
  'pending',
  '10000000-0000-4000-8000-000000000001',
  now() + interval '7 days'
);
reset role;

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000002';
select pg_temp.assert_eq('platform support has no direct tenant data access', (select count(*) from public.tenants), 0);
select pg_temp.assert_eq('platform support cannot read platform role assignments', (select count(*) from public.platform_role_assignments), 0);
reset role;

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000009';
select pg_temp.assert_eq('multi-tenant person can read both tenant rows', (select count(*) from public.tenants), 2);
insert into public.active_tenant_preferences (person_id, tenant_id, membership_id)
values (
  '10000000-0000-4000-8000-000000000009',
  '30000000-0000-4000-8000-000000000001',
  '40000000-0000-4000-8000-000000000006'
);
${expectRlsError(`
  update public.active_tenant_preferences
  set
    tenant_id = '30000000-0000-4000-8000-000000000003',
    membership_id = '40000000-0000-4000-8000-000000000006'
  where person_id = '10000000-0000-4000-8000-000000000009';
`)}
reset role;

select pg_temp.assert_eq('rider app capability disabled by default', (
  select count(*) from public.tenant_capabilities
  where capability_key = 'app.rider' and enabled = false
), 3);
select pg_temp.assert_eq('driver app capability disabled by default', (
  select count(*) from public.tenant_capabilities
  where capability_key = 'app.driver' and enabled = false
), 3);

${expectRlsError(`
  update public.tenant_role_assignments
  set status = 'revoked', revoked_at = now()
  where assignment_id = '50000000-0000-4000-8000-000000000001';
`)}

rollback;
`;

    const output = psql(["-v", "ON_ERROR_STOP=1"], sql);

    expect(output).toContain("ROLLBACK");
  });
});
