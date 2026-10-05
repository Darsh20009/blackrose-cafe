---
name: External Render npm installs
description: Prevent external deployment builds from relying on Replit-only npm package hosts.
---

When deploying a Replit project to an external host, every `resolved` tarball URL in `package-lock.json` must be reachable outside Replit. Replit may write multiple internal host variants, including `package-firewall.replit.local` and `package-firewall.replit.internal`; removing one offending package can reveal another blocked URL on the next build.

**Why:** External platforms such as Render cannot resolve Replit's private package-firewall DNS names, so `npm install` fails before the application build starts.

**How to apply:** Search the entire lockfile for `package-firewall.replit`, replace remaining tarball references with their public npm registry URLs or regenerate the lockfile against `https://registry.npmjs.org`, then verify a clean install and build.
