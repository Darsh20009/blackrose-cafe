---
name: Employee session restoration
description: Security rules for employee restore keys and logout behavior.
---

Treat an employee session-restore key as a bearer credential. Rotating or clearing the browser copy alone is not logout; the server must invalidate the exact active key.

**Why:** A restore key left valid after logout can recreate an employee session on a shared device or if the key was copied.

**How to apply:** Validate the employee identifier and key format, enforce a short expiry, rotate the key when it is used, and revoke the current key before completing employee logout. Keep local session indicators until server logout succeeds so a failed request can be retried.
