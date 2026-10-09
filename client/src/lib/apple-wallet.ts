import { apiUrl, isCapacitorNative } from "@/lib/server-url";

export function isAppleMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export async function openLoyaltyCardInAppleWallet(): Promise<void> {
  const configuredBase = apiUrl("/");
  const baseUrl = new URL(configuredBase || window.location.origin, window.location.href);
  if (baseUrl.protocol !== "https:" && baseUrl.protocol !== "http:") {
    throw new Error("تعذر تحديد عنوان الخادم لفتح بطاقة Apple Wallet");
  }

  const ticketEndpoint = new URL("/api/wallet/apple-pass-ticket", baseUrl);
  const ticketResponse = await fetch(ticketEndpoint, {
    method: "POST",
    credentials: "include",
  });
  const ticketData = await ticketResponse.json().catch(() => null);
  if (!ticketResponse.ok) {
    throw new Error(ticketData?.error || ticketData?.message || "تعذر تجهيز بطاقة Apple Wallet");
  }
  if (typeof ticketData?.url !== "string") {
    throw new Error("لم يرجع الخادم رابط بطاقة صالحًا");
  }

  const passUrl = new URL(ticketData.url, baseUrl).toString();
  if (isCapacitorNative()) {
    const { Browser } = await import(/* @vite-ignore */ "@capacitor/browser");
    await Browser.open({
      url: passUrl,
      presentationStyle: "fullscreen",
      toolbarColor: "#0d0d0d",
    });
    return;
  }

  window.location.assign(passUrl);
}
