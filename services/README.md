# Backend Services

This directory contains independently deployable backend services.

Services own runtime behavior behind stable contracts. They may expose APIs, process jobs, consume events, or coordinate platform workflows. A service should have a clear operational boundary, deployment lifecycle, and ownership model.

Do not place shared utilities here. Reusable platform primitives belong in `packages/`. Service-specific implementation should stay inside the service that owns it.
