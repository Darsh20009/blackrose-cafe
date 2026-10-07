---
name: Portal password bootstrap
description: Safe startup behavior for the owner and admin portal passwords.
---

Configured default portal passwords are bootstrap credentials, not ongoing synchronization values. Apply each configured password once to an existing account that has not yet been seeded, then preserve later password changes across restarts.

**Why:** Rewriting owner/admin passwords on every server restart prevents account owners from keeping a password they changed themselves. Existing legacy employee documents may also be incomplete, so startup activation should update only the required fields rather than saving the whole document and triggering unrelated validation.

**How to apply:** When changing portal-account startup logic, retain the one-time seed marker, use update operations that do not validate unrelated legacy fields, and mark intentional password changes so startup will not replace them later.
