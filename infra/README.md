# Infrastructure

This directory contains infrastructure-as-code and cloud resource definitions.

Infrastructure code should describe durable platform resources such as networks, compute, databases, queues, object storage, secrets backends, monitoring, and access control.

Deployment behavior that changes per release or environment belongs in `deploy/`. Non-secret configuration defaults belong in `config/`.
