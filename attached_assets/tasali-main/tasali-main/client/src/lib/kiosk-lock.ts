/**
 * Kiosk Lock — prevents the device from going to sleep / locking
 * while the POS is active. Uses the Screen Wake Lock API where supported.
 */

let wakeLock: WakeLockSentinel | null = null;

export function enableKioskLock(): () => void {
  if (typeof navigator === "undefined" || !("wakeLock" in navigator)) {
    return () => {}; // no-op on unsupported browsers
  }

  let active = true;

  const acquire = async () => {
    if (!active) return;
    try {
      const lock = await (navigator as any).wakeLock.request("screen") as WakeLockSentinel;
      wakeLock = lock;
      lock.addEventListener("release", () => {
        if (active) acquire(); // re-acquire if released unexpectedly
      });
    } catch {
      // Wake lock request failed — ignore silently
    }
  };

  acquire();

  // Re-acquire when tab becomes visible again
  const onVisibility = () => {
    if (document.visibilityState === "visible") acquire();
  };
  document.addEventListener("visibilitychange", onVisibility);

  return () => {
    active = false;
    document.removeEventListener("visibilitychange", onVisibility);
    const lock = wakeLock;
    if (lock) {
      lock.release().catch(() => {});
      wakeLock = null;
    }
  };
}
