/**
 * Kiosk lock — keeps the POS UI in fullscreen mode and re-asserts it whenever
 * an OS gesture (e.g. Android's edge-swipe "recent apps" preview) briefly
 * kicks the page out.  Automatically cleans up on unmount.
 *
 * Returns a cleanup function suitable for useEffect's return value.
 */
export function enableKioskLock(): () => void {
  let active = true;

  function requestFullscreen() {
    if (!active) return;
    const el = document.documentElement;
    if (document.fullscreenElement) return; // already fullscreen
    el.requestFullscreen?.({ navigationUI: "hide" }).catch(() => {
      // Browser may block non-gesture-initiated fullscreen — silently ignore
    });
  }

  function handleVisibilityChange() {
    if (!active) return;
    if (document.visibilityState === "visible") {
      // Re-assert fullscreen after returning from background
      setTimeout(requestFullscreen, 300);
    }
  }

  function handleFullscreenChange() {
    if (!active) return;
    if (!document.fullscreenElement) {
      // We were kicked out — try to get back in after a short delay
      setTimeout(requestFullscreen, 500);
    }
  }

  // Initial request (only succeeds if called from a user gesture context,
  // but we attempt it anyway so we're in fullscreen from the start if possible)
  requestFullscreen();

  document.addEventListener("visibilitychange", handleVisibilityChange);
  document.addEventListener("fullscreenchange", handleFullscreenChange);

  return () => {
    active = false;
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    document.removeEventListener("fullscreenchange", handleFullscreenChange);
  };
}
