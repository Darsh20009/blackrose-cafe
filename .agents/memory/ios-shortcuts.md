---
name: iOS Home Screen Quick Actions
description: How iOS App Shortcuts (long-press icon) are implemented
---

## Shortcuts defined (3)
| Shortcut type | Title | Navigates to |
|---|---|---|
| `blackrose.com.sa.neworder` | طلب جديد | `/menu` |
| `blackrose.com.sa.reorder` | إعادة آخر طلب | `/my-orders` |
| `blackrose.com.sa.wallet` | محفظتي | `/my-card` |

## How it works
1. `codemagic.yaml` injects `UIApplicationShortcutItems` into `ios/App/App/Info.plist` via PlistBuddy
2. `codemagic.yaml` also injects a `performActionFor shortcutItem` method into `AppDelegate.swift` via python3
3. The AppDelegate method opens `blackrose://shortcut/menu` (or `/my-orders`, `/my-card`)
4. The `blackrose://` URL scheme is registered in Info.plist via `CFBundleURLTypes`
5. `@capacitor/app`'s `appUrlOpen` listener in `client/src/lib/ios-shortcuts.ts` receives the URL and navigates

## File locations
- `client/src/lib/ios-shortcuts.ts` — deep link parser + `initIOSShortcuts(navigate)` function
- `client/src/components/native-app-init.tsx` — calls `initIOSShortcuts` with wouter's `setLocation`
- `codemagic.yaml` — "Inject Info.plist" and "Inject AppDelegate" steps

**Why:** iOS shortcuts can't open URLs natively; AppDelegate must open a registered URL scheme which Capacitor then surfaces as `appUrlOpen`.
