# Platform Packages

This directory is reserved for shared platform primitives.

Platform packages should support cross-cutting SaaS concerns such as tenant context, authorization foundations, configuration, observability, audit metadata, event contracts, and integration utilities.

Do not place transportation-specific workflows here. Platform packages should make business modules safer and easier to build without knowing the details of those modules.
