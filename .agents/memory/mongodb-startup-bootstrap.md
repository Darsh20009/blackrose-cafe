---
name: MongoDB startup bootstrap
description: Handling idempotent admin and migration work during server startup under MongoDB pool pressure.
---

Run startup admin initialization and one-time migrations after the main routes and initial seed work are registered. Treat transient connection-pool checkout failures as retryable; a connected MongoDB state does not guarantee the pool is free during startup.

**Why:** The initial admin and subscription migration attempt overlapped startup database work and timed out. Deferring initialization and retrying allowed the idempotent migration to complete.

**How to apply:** For startup authentication bootstrap or data migrations, use an idempotent marker, bounded retry with backoff, and a success log that reports only aggregate counts.
