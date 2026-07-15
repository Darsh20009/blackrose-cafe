/**
 * ios-shortcuts.ts
 * Handles iOS Home Screen Quick Actions (long-press shortcuts on the app icon).
 *
 * When a shortcut is tapped:
 *   iOS → AppDelegate.performActionFor → opens URL: blackrose://shortcut/<type>
 *   Capacitor App plugin fires "appUrlOpen"
 *   This module intercepts it and navigates to the correct in-app page
 *
 * Shortcut types defined in Info.plist (injected by codemagic.yaml):
 *   blackrose.com.sa.neworder   → /menu
 *   blackrose.com.sa.reorder    → /my-orders
 *   blackrose.com.sa.wallet     → /my-card
 */

import { isCapacitorNative } from "@/lib/server-url";

type NavFn = (path: string) => void;

const SHORTCUT_ROUTES: Record<string, string> = {
  "blackrose.com.sa.neworder":  "/menu",
  "blackrose.com.sa.reorder":   "/my-orders",
  "blackrose.com.sa.wallet":    "/my-card",
  neworder:                     "/menu",
  reorder:                      "/my-orders",
  wallet:                       "/my-card",
};

function parseShortcutFromUrl(url: string): string | null {
  try {
    // Expected form: blackrose://shortcut/blackrose.com.sa.neworder
    // or:            blackrose://shortcut/neworder
    const u = new URL(url);
    if (u.protocol !== "blackrose:") return null;
    if (u.host === "shortcut") {
      const type = u.pathname.replace(/^\//, "");
      return SHORTCUT_ROUTES[type] || null;
    }
    // Bare scheme: blackrose:///menu
    if (u.host === "" && u.pathname) {
      return u.pathname.startsWith("/") ? u.pathname : "/" + u.pathname;
    }
  } catch {}
  return null;
}

let _initialized = false;

/**
 * Call once at app startup (after login).
 * Listens for appUrlOpen events from Capacitor and navigates to the right page.
 */
export async function initIOSShortcuts(navigate: NavFn): Promise<void> {
  if (!isCapacitorNative()) return;
  if (_initialized) return;
  _initialized = true;

  try {
    const { App } = await import("@capacitor/app");

    // Handle shortcut while app is already running
    App.addListener("appUrlOpen", (event: { url: string }) => {
      const route = parseShortcutFromUrl(event.url);
      if (route) {
        console.info("[iOSShortcuts] Navigating to:", route);
        navigate(route);
      }
    });

    // Handle shortcut that launched the app cold
    const launchUrl = await App.getLaunchUrl();
    if (launchUrl?.url) {
      const route = parseShortcutFromUrl(launchUrl.url);
      if (route) {
        // Small delay so the router is fully mounted
        setTimeout(() => navigate(route), 400);
      }
    }
  } catch (err) {
    console.error("[iOSShortcuts] Init failed:", err);
  }
}
