import { readFileSync, writeFileSync } from "node:fs";

const lockfilePath = new URL("../package-lock.json", import.meta.url);
const lockfile = JSON.parse(readFileSync(lockfilePath, "utf8"));
let rewrittenCount = 0;

for (const packageInfo of Object.values(lockfile.packages ?? {})) {
  if (typeof packageInfo.resolved !== "string") continue;

  const resolved = new URL(packageInfo.resolved);
  if (!resolved.hostname.startsWith("package-firewall.replit.")) continue;

  // Replit's registry proxy prefixes tarball paths with /npm; the public npm
  // registry serves those same tarballs without that prefix.
  const publicPath = resolved.pathname.replace(/^\/npm(?=\/)/, "");
  packageInfo.resolved = `https://registry.npmjs.org${publicPath}${resolved.search}`;
  rewrittenCount += 1;
}

if (rewrittenCount > 0) {
  writeFileSync(lockfilePath, `${JSON.stringify(lockfile, null, 2)}\n`);
}

console.log(`[external npm] Rewrote ${rewrittenCount} Replit registry URLs for the public npm registry.`);
