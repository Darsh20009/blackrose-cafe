---
name: External Render npm installs
description: Prevent external deployment builds from relying on Replit-only npm package hosts.
---

When deploying a Replit project to an external host, every `resolved` tarball URL in `package-lock.json` must be reachable outside Replit. Replit may write multiple internal host variants, including `package-firewall.replit.local` and `package-firewall.replit.internal`. These URLs can include an `/npm/` path prefix; public npm tarball URLs use the same remainder without that prefix. `npm install --package-lock-only` does not rewrite existing locked `resolved` URLs, so explicitly normalize them or regenerate the lockfile from a clean state. External build commands must also override any Replit-only registry configured in `.npmrc`.

**Why:** External platforms such as Render cannot resolve Replit's private package-firewall DNS names. npm may report a generic internal exit-handler error instead of a clear DNS failure, and the lockfile can keep pointing to the private host even when the public registry is selected.

**How to apply:** Search the entire lockfile for all `package-firewall.replit` variants, map their tarball paths to `https://registry.npmjs.org` (strip the leading `/npm` segment), and run external installs with `--registry=https://registry.npmjs.org`. Then verify a clean install and build on the target host. Check the actual deployment log command: a manual Render dashboard setting can override `render.yaml`, so syncing the YAML alone may not change the command used.
