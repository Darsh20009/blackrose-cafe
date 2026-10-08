import { apiUrl, isCapacitorNative } from "@/lib/server-url";

export function isAppleMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export async function openLoyaltyCardInAppleWallet(): Promise<void> {
  const passUrl = apiUrl("/api/wallet/apple-pass");
  if (isCapacitorNative()) {
    const { Browser } = await import(/* @vite-ignore */ "@capacitor/browser");
    await Browser.open({
      url: passUrl,
      presentationStyle: "popover",
      toolbarColor: "#0d0d0d",
    });
    return;
  }

  window.location.assign(passUrl);
}
