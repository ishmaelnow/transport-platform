# Vercel deployment

Deploy the monorepo as three Vercel projects connected to the renamed `esh-platform` repository. This preserves the existing application boundaries and lets each Next.js app have its own domain and environment variables.

| Vercel project | Root Directory | Suggested project name | Local port |
| -------------- | -------------- | ---------------------- | ---------- |
| Admin          | `apps/admin`   | `esh-platform-admin`   | 3000       |
| Rider/tenant   | `apps/rider`   | `esh-platform-rider`   | 3001       |
| Driver         | `apps/driver`  | `esh-platform-driver`  | 3002       |

For each project:

1. Import the Git repository whose current remote is `ishmaelnow/esh-platform`.
2. Set the Root Directory from the table and leave **Include files outside the root directory in the Build Step** enabled so pnpm workspace packages are available.
3. Use the detected Next.js framework, `pnpm install --frozen-lockfile` as the install command, and `pnpm build` as the build command. The committed app-level `vercel.json` files also declare the framework.
4. Configure the variables listed in `docs/development/environment-variables.md`. All three projects need the two public Supabase variables; only Admin needs the server-side Admin variables.
5. Assign domains, then set Admin's `INVITATION_BASE_URL` to the Admin origin and `TENANT_ADMIN_BASE_URL` to the Rider/tenant origin. Add both origins and callback paths to the Supabase Auth URL configuration.
6. Deploy each project and verify `/api/health`; then exercise Admin authentication and invitation redirects against the assigned domains.

Vercel's generated `.vercel/project.json` is machine/account-specific and remains uncommitted. Running `vercel link --repo` from each app directory can link an existing project locally; linking or creating cloud projects requires Vercel account authorization and cannot be represented safely in repository configuration.
