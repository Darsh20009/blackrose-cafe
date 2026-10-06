/**
 * Unified platform detection utility.
 * Single source of truth for app vs web, and device type detection.
 */

export type DeviceType = "iphone" | "ipad" | "android" | "desktop";

/** True when the web app is running inside the Flutter WebView wrapper. */
export function isFlutterWebView(): boolean {
  return typeof navigator !== "undefined" && navigator.userAgent.includes("Flutter/WebView");
}

/** True only for the iOS Flutter app, whose registered return scheme is qirox://. */
export function isFlutterIOSWebView(): boolean {
  return isFlutterWebView() && /\(iOS\)/i.test(navigator.userAgent);
}

/** Opens a secure payment URL through the Flutter bridge, which launches Safari. */
export function openFlutterPaymentInSafari(url: string): boolean {
  if (!isFlutterWebView() || typeof window === "undefined") return false;

  try {
    const paymentUrl = new URL(url, window.location.origin);
    const bridge = (window as any).BlackRosePayment;
    if (paymentUrl.protocol !== "https:" || typeof bridge?.postMessage !== "function") return false;
    bridge.postMessage(paymentUrl.toString());
    return true;
  } catch {
    return false;
  }
}

/** Adds the Flutter iOS return marker without changing browser or Android checkouts. */
export function withFlutterAppReturn(url: string): string {
  if (!isFlutterIOSWebView() || typeof window === "undefined") return url;

  try {
    const returnUrl = new URL(url, window.location.origin);
    returnUrl.searchParams.set("appReturn", "qirox");
    return returnUrl.toString();
  } catch {
    return url;
  }
}

/** True when running inside a Capacitor native wrapper (iOS/Android app) */
export function isCapacitorNative(): boolean {
  try {
    // 1. Capacitor runtime flag (most reliable)
    if (!!(window as any).Capacitor?.isNative) return true;
    if (window.location.protocol === "capacitor:") return true;
    if (window.location.hostname === "localhost" && !!(window as any).Capacitor) return true;
    // 2. Custom user-agent injected by the BlackRose native app
    if (navigator.userAgent.includes("BlackRoseApp")) return true;
    return false;
  } catch {
    return false;
  }
}

/** True when running as an installed PWA (standalone mode) */
export function isPWAStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

/** Detect the current device type */
export function getDeviceType(): DeviceType {
  if (typeof window === "undefined") return "desktop";
  const ua = navigator.userAgent;
  const isIOS = /iphone|ipod/i.test(ua) && !(window as any).MSStream;
  const isIPad =
    /ipad/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (isIOS) return "iphone";
  if (isIPad) return "ipad";
  if (/android/i.test(ua)) return "android";
  return "desktop";
}

/** True only on iPhone, iPad, or Android — NOT on desktop/laptop */
export function isMobileDevice(): boolean {
  return getDeviceType() !== "desktop";
}

/** True on desktop/laptop (Windows, Mac, Linux) */
export function isDesktopDevice(): boolean {
  return getDeviceType() === "desktop";
}

/** True on iOS (iPhone or iPad) */
export function isIOS(): boolean {
  const dt = getDeviceType();
  return dt === "iphone" || dt === "ipad";
}

/** True on Android */
export function isAndroid(): boolean {
  return getDeviceType() === "android";
}
