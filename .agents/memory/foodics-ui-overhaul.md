---
name: Foodics UI Overhaul
description: Complete UI/UX redesign to match Foodics (competitor) design language — purple theme, clean white sidebars, Foodics-style layout, QIROX STUDIO branding
---

## What Was Done

### Primary Color
- Changed `brand.ts` colors.primary from crimson rose (345 70% 42%) to QIROX Purple (262 83% 58% / #7C3AED)
- Changed CSS `--primary` in `index.css` to match
- `applyBrandColors()` in brand.ts now sets purple (was overriding CSS with old crimson)

### New Pages Created
- `/admin/branding` → `admin-branding.tsx` — logo upload, primary color picker with presets, name, contact, VAT/CR number. Saves to localStorage and applies colors via setProperty.
- `/admin/printing` → `admin-printing.tsx` — wrapper around PrinterSettingsPanel, dedicated route
- Routes added in `App.tsx` for both pages

### Admin Sidebar (`admin-sidebar.tsx`)
- Complete rewrite to Foodics style: white bg, collapsible sections with chevron, icon+text, purple active indicator (right border in RTL), QIROX STUDIO in footer
- Assets: `@assets/blackrose-staff-logo.png` and `@assets/qirox-logo.png`

### Admin Layout (`admin-layout.tsx`)
- Added purple gradient announcement bar at top
- Added white topbar with search, branch selector, bell, language toggle
- QIROX STUDIO footer at bottom

### Manager Sidebar (`manager-sidebar.tsx`)
- Changed from dark theme (`bg-[#0a0a0a]`) to Foodics white theme
- Same collapsible section structure with white bg, gray hover, purple active
- QIROX STUDIO footer, blackrose-staff-logo at top
- Mobile bottom nav changed to white bg with primary color

### Manager Layout (`manager-layout.tsx`)
- Added purple announcement bar + white topbar (same pattern as admin)
- Added QIROX STUDIO footer

### Employee Login (`employee-login.tsx`)
- Complete redesign: clean white card, purple announcement bar, purple buttons
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
- `applyInitialBranding()` checks localStorage `cafe-branding` first
- If saved branding has a primaryColor (hex), converts to HSL and applies
- Falls back to `applyBrandColors()` from brand.ts

## Key Decision
**Why:** The system was technically superior but looked dated compared to Foodics. Clean white + purple = instantly professional, trust-building.
**How to apply:** The primary color is now `262 83% 58%` everywhere. Any new component should use `text-primary`, `bg-primary`, `border-primary` from Tailwind — they will auto-pick up the purple.

## Foodics Design Language (extracted)
- White background (#FFFFFF)
- Sidebar: white, right side (RTL), sticky, `w-60`
- Active item: `bg-gray-100` with `3px right border` in primary color
- Section headers: icon + text + chevron, collapsible
- Purple announcement bar: `linear-gradient(90deg, #5b2de0, #7c3aed, #4f46e5)`
- White topbar: search + branch selector + bell + avatar
- Buttons: solid purple
- No dark mode, no gold shadows
