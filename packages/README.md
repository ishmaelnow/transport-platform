# Shared Packages

This directory contains internal shared libraries.

Packages are for reusable platform capabilities and cross-application primitives. They should remain small, cohesive, and framework-aware only when necessary.

Good candidates for future packages include tenant context, authorization primitives, configuration loading, observability helpers, event contracts, validation utilities, and shared UI components. Business workflows should not be placed here unless they are intentionally extracted behind a stable domain boundary.
