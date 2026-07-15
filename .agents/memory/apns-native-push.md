---
name: APNs native push architecture
description: How Apple Push Notifications are wired in the Black Rose Cafe native app
---

## Overview
The app uses two push systems in parallel:
- **Web Push (VAPID)** — for PWA / browser users (unchanged, in `server/push-service.ts`)
- **APNs** — for native iOS app users via `@capacitor/push-notifications` v8

## Client side
- `client/src/lib/native-push.ts` — registers for APNs, stores token in `localStorage` and POSTs to server
- `client/src/components/native-app-init.tsx` — mounts inside WouterRouter, calls `registerNativePush()` + `initIOSShortcuts()`
- Initialised via `<NativeAppInit />` inside `AppContent` in `App.tsx`

## Server side
- `APNsDeviceTokenModel` in `server/push-service.ts` — stores token + phone + employeeId + tenantId
- `POST /api/push/register-device` — saves token (no auth required; app calls after login)
- `POST /api/push/unregister-device` — removes token on logout
- `sendAPNsToCustomer(phone, title, body, data)` — looks up token by phone variants, sends via HTTP/2
- `sendAPNsToEmployees(tenantId, title, body, data)` — sends to all employee tokens

## APNs auth (JWT)
Uses ES256 JWT signed with `.p8` key. Required env vars:
- `APNS_KEY_ID` — 10-char key ID from Apple Developer portal
- `APNS_TEAM_ID` — 10-char team ID (same as `V4K6RM59LS` in codemagic.yaml)
- `APNS_P8_KEY` — contents of the `.p8` file, newlines as `\n`
- `APNS_BUNDLE_ID` — defaults to `blackrose.com.sa`

## When notifications fire
Order status changes in `PATCH /api/orders/:id/status` send APNs in addition to the existing fireNotify call.

**Why:** Web Push doesn't work in iOS native apps; APNs is the only way to reach the lock screen on iPhone.
