---
name: PWA Icon Generation
description: How PWA icons are generated and which files to update when re-branding
---

## Rule
All PWA icons are generated programmatically from the QIROX logo asset. Never hand-edit icon PNGs.

## How to regenerate
```
node scripts/generate-pwa-icons.mjs
```

Source: `attached_assets/qirox-logo-customer.png` (customer portal)
Source: `attached_assets/qirox-logo-staff.png` (staff portal)
Output: `public/icon-*.png`, `public/logo-*.png`, `public/apple-touch-icon.png`, `public/employee-logo-*.png`

**Why:** Icons need to be consistent across 25 sizes. Manual editing causes version drift. The script uses sharp to resize with proper padding (14% standard, 18% maskable safe zone) on a #0D0D0D background.

## Cache busting
Icons are versioned in `client/index.html` with `?v=N`. Bump N when regenerating icons to force browser cache refresh. Currently at v9.

## Apple Wallet logos
The Apple Wallet route (`/api/wallet/apple-pass` in server/routes.ts) also uses sharp at runtime to generate icon.png and logo.png from the same customer logo source. Falls back to solid green if the asset is missing.

## Key files
- `scripts/generate-pwa-icons.mjs` — generation script
- `public/manifest.json` — customer PWA manifest
- `public/employee-manifest.json` — staff PWA manifest  
- `client/index.html` — apple-touch-icon links + meta tags + splash screens
- `client/src/components/pwa-install.tsx` — install UI for iOS/Android/Tablet
