---
name: Foodics UI Overhaul
description: Foodics-style admin layout with white sidebars, crimson brand colors, and QIROX STUDIO branding
---

## What Was Done

### Primary Color
- Default primary is deep crimson `#9f1239`; lighter primary is `#e11d48`.
- The selected primary color is stored in the tenant's `BusinessConfig` record and exposed only through the safe public settings response.
- Admin changes use an admin-only endpoint; client startup loads the public color and applies `--primary`, `--primary-light`, and `--ring`.

### New Pages Created
- `/admin/branding` → `admin-branding.tsx` — logo upload, primary color picker with presets, name, contact, VAT/CR number. Primary color is shared centrally; other branding fields remain browser-local.
- `/admin/printing` → `admin-printing.tsx` — wrapper around PrinterSettingsPanel, dedicated route
- Routes added in `App.tsx` for both pages

### Admin Sidebar (`admin-sidebar.tsx`)
- Complete rewrite to Foodics style: white bg, collapsible sections with chevron, icon+text, primary-color active indicator (right border in RTL), QIROX STUDIO in footer
- Assets: `@assets/blackrose-staff-logo.png` and `@assets/qirox-logo.png`

### Admin Layout (`admin-layout.tsx`)
- Added primary-color announcement bar at top
- Added white topbar with search, branch selector, bell, language toggle
- QIROX STUDIO footer at bottom

### Manager Sidebar (`manager-sidebar.tsx`)
- Changed from dark theme (`bg-[#0a0a0a]`) to Foodics white theme
- Same collapsible section structure with white bg, gray hover, primary-color active
- QIROX STUDIO footer, blackrose-staff-logo at top
- Mobile bottom nav changed to white bg with primary color

### Manager Layout (`manager-layout.tsx`)
- Added primary-color announcement bar + white topbar (same pattern as admin)
- Added QIROX STUDIO footer

### Employee Login (`employee-login.tsx`)
- Complete redesign: clean white card, red brand accents and buttons
- QIROX STUDIO footer with logo
- Kept all login logic (QR scan, remember me, activate, install PWA)

### Print System (`printer-settings-panel.tsx`)
- Mode selector now shows ONLY: Bluetooth ⭐ and USB (wired)
- Removed: network LAN, local relay, cloud queue, browser print from the dropdown

### Flutter → WebView (`flutter_app/`)
- `pubspec.yaml` → added webview_flutter packages, removed native dependencies
- `lib/main.dart` → simplified to just launch WebViewApp
- `lib/webview_app.dart` → NEW: full WebView screen pointing to `https://blackrose.com.sa`
- Loading spinner (purple), offline error state with retry button
- UserAgent: `BlackRoseApp/3.1.0 Flutter/WebView`

### Brand Loading at Startup (`main.tsx`)
- `applyBrandColors()` sets the default theme, then `/api/public/settings` applies the shared tenant color.

## Key Decision
**Why:** The user asked for dark and light red instead of purple, and the previous browser-local color did not persist or sync across devices.
**How to apply:** Use `text-primary`, `bg-primary`, and `border-primary` for brand accents. Keep semantic chart and status colors independent of the brand. Save primary color changes through the protected tenant branding endpoint and load them from public settings.

## Foodics Design Language (extracted)
- White background (#FFFFFF)
- Sidebar: white, right side (RTL), sticky, `w-60`
- Active item: `bg-gray-100` with `3px right border` in primary color
- Section headers: icon + text + chevron, collapsible
- Crimson announcement bar uses the primary theme color.
- White topbar: search + branch selector + bell + avatar
- Buttons: solid primary color
- No dark mode, no gold shadows
