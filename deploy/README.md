# Deployment

This directory contains deployment manifests, release configuration, and environment overlays.

Deployment assets should describe how built applications and services are released into environments. Keep provider resources and account-level infrastructure in `infra/`.

Environment-specific deployment configuration should be explicit, reviewable, and free of secrets.

See `vercel.md` for the Vercel monorepo project layout and deployment checklist.
