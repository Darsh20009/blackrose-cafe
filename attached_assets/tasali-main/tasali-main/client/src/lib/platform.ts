import { Capacitor } from "@capacitor/core";

/**
 * Returns true when the app is running inside a native Capacitor shell (iOS/Android).
 * Returns false in a standard web browser or Replit preview.
 */
export function isCapacitorNative(): boolean {
  return Capacitor.isNativePlatform();
}
