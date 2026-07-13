# Admin Application Configuration

The Admin app centralizes runtime configuration in `apps/admin/src/lib/config.ts`.

## Public Variables

These values are safe for client components and browser Supabase access:

- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase publishable/anonymous key used with RLS.

## Server-Only Variables

These values must only be read by server routes and server-side helpers:

- `RESEND_API_KEY`: Resend API key for invitation email delivery.
- `INVITATION_FROM_EMAIL`: verified sender used for invitation emails.
- `INVITATION_BASE_URL`: base URL used to generate invitation links.
- `TENANT_ADMIN_BASE_URL`: base URL used after successful invitation acceptance.

`RESEND_API_KEY` must never be imported into client components or exposed through public config.

## Local Development

Create `apps/admin/.env.local` from `apps/admin/.env.example`.

Local invitation links should use:

```env
INVITATION_BASE_URL=http://localhost:3000
TENANT_ADMIN_BASE_URL=http://localhost:3001
```

## Production

Production should set the same variables in the hosting environment. The invitation base URL should
match the deployed Admin domain, for example:

```env
INVITATION_BASE_URL=https://admin.transportplatform.com
TENANT_ADMIN_BASE_URL=https://tenant.transportplatform.com
```

The exact production domain can change without code changes because invitation links are
environment-driven.

## Validation

The configuration module validates required values and URL formats. Missing or invalid values throw
a developer-facing error that names each missing variable and points to `apps/admin/.env.local` for
local setup.
