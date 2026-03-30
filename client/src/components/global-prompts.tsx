import { useState, useEffect, useCallback } from "react";
import { Bell, Download, Smartphone, Share2, PlusSquare, X, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import blackroseLogo from "@assets/blackrose-logo.png";
import { brand } from "@/lib/brand";

const NOTIF_DISMISSED_KEY = "qirox_notif_prompted";
const INSTALL_DISMISSED_KEY = "qirox_install_prompted";

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true;
}

function isEmployeePage() {
  const path = window.location.pathname;
  return path.startsWith('/employee') || path.startsWith('/manager') ||
    path.startsWith('/admin') || path.startsWith('/qirox') ||
    path === '/0' || path.startsWith('/owner') || path.startsWith('/executive');
}

function isiOSVersionSupported() {
  const match = navigator.userAgent.match(/OS (\d+)_/);
  if (!match) return false;
  return parseInt(match[1]) >= 16;
}

export function GlobalPrompts() {
  const [showNotif, setShowNotif] = useState(false);
  const [showInstall, setShowInstall] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showIOSNotifBlocked, setShowIOSNotifBlocked] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    if (isEmployeePage()) return;
    if (typeof window === "undefined") return;

    const notifTimer = setTimeout(() => {
      // iOS in non-standalone mode: don't show notification prompt — it will fail
      // Instead guide them to install first
      if (isIOS() && !isStandalone()) {
        const dismissed = localStorage.getItem(INSTALL_DISMISSED_KEY);
        if (dismissed && Date.now() - parseInt(dismissed) < 7 * 24 * 60 * 60 * 1000) return;
        setShowIOSGuide(true);
        return;
      }

      if (!("Notification" in window)) return;
      if (Notification.permission !== "default") return;
      const dismissed = sessionStorage.getItem(NOTIF_DISMISSED_KEY);
      if (dismissed) return;
      setShowNotif(true);
    }, 2500);

    return () => clearTimeout(notifTimer);
  }, []);

  useEffect(() => {
    if (isEmployeePage()) return;
    if (isStandalone() || isIOS()) return;

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const installTimer = setTimeout(() => {
      if (isStandalone()) return;
      const dismissed = localStorage.getItem(INSTALL_DISMISSED_KEY);
      if (dismissed) {
        const dismissedAt = parseInt(dismissed);
        if (Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000) return;
      }
      if (Notification.permission !== "default") {
        setShowInstall(true);
      }
    }, 5000);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      clearTimeout(installTimer);
    };
  }, []);

  useEffect(() => {
    if (isIOS() || isEmployeePage()) return;
    if (!showNotif && ("Notification" in window) && Notification.permission !== "default" && !showInstall && !isStandalone()) {
      const dismissed = localStorage.getItem(INSTALL_DISMISSED_KEY);
      if (!dismissed || Date.now() - parseInt(dismissed) > 7 * 24 * 60 * 60 * 1000) {
        const timer = setTimeout(() => setShowInstall(true), 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [showNotif]);

  function getCustomerUserId(): string {
    try {
      const stored = localStorage.getItem("qahwa-customer") || localStorage.getItem("currentCustomer");
      if (stored) {
        const cust = JSON.parse(stored);
        if (cust?.id || cust?._id) return cust.id || cust._id;
        if (cust?.phone) return `phone:${cust.phone}`;
      }
    } catch {}
    return "visitor";
  }

  const handleNotifEnable = async () => {
    setNotifLoading(true);
    try {
      // On iOS non-standalone: cannot subscribe — show guide instead
      if (isIOS() && !isStandalone()) {
        setShowNotif(false);
        setShowIOSGuide(true);
        return;
      }

      const result = await Notification.requestPermission();
      if (result === "granted") {
        try {
          const registration = await navigator.serviceWorker.ready;
          const resp = await fetch("/api/push/vapid-key");
          const { publicKey } = await resp.json();
          if (publicKey) {
            const padding = '='.repeat((4 - publicKey.length % 4) % 4);
            const base64 = (publicKey + padding).replace(/-/g, '+').replace(/_/g, '/');
            const rawData = window.atob(base64);
            const arr = new Uint8Array(rawData.length);
            for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i);

            const existingSub = await registration.pushManager.getSubscription();
            const subscription = existingSub || await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: arr,
            });
            const userId = getCustomerUserId();
            await fetch("/api/push/subscribe", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                subscription: subscription.toJSON(),
                userType: "customer",
                userId,
              }),
            });
          }
        } catch (e: any) {
          console.warn("[Push] Subscribe error:", e);
          // If subscription failed on iOS standalone — show explanation
          if (isIOS() && isStandalone()) {
            setShowIOSNotifBlocked(true);
          }
        }
      }
      setShowNotif(false);
      sessionStorage.setItem(NOTIF_DISMISSED_KEY, "1");
    } finally {
      setNotifLoading(false);
    }
  };

  const handleNotifDismiss = () => {
    setShowNotif(false);
    sessionStorage.setItem(NOTIF_DISMISSED_KEY, "1");
  };

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setShowInstall(false);
      }
      setDeferredPrompt(null);
    } else if (isIOS()) {
      setShowIOSGuide(true);
    }
    localStorage.setItem(INSTALL_DISMISSED_KEY, String(Date.now()));
  };

  const handleInstallDismiss = () => {
    setShowInstall(false);
    localStorage.setItem(INSTALL_DISMISSED_KEY, String(Date.now()));
  };

  const handleIOSGuideDismiss = () => {
    setShowIOSGuide(false);
    localStorage.setItem(INSTALL_DISMISSED_KEY, String(Date.now()));
  };

  if (isEmployeePage()) return null;

  return (
    <>
      {/* Standard notification prompt — shown on Android/desktop when not iOS non-standalone */}
      {showNotif && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/70 backdrop-blur-sm" dir="rtl">
          <div className="w-full max-w-md animate-in slide-in-from-bottom-8 duration-500 pb-safe">
            <div className="bg-[#111827] rounded-t-3xl shadow-2xl border-t border-white/10 px-6 pt-5 pb-8">
              <div className="flex justify-center mb-4">
                <div className="w-10 h-1 rounded-full bg-white/20" />
              </div>

              <div className="flex flex-col items-center text-center mb-6">
                <div className="relative mb-3">
                  <img src={blackroseLogo} alt="BLACK ROSE" className="w-20 h-20 rounded-3xl shadow-xl border border-white/10" />
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-[#2D9B6E] rounded-full flex items-center justify-center shadow-lg border-2 border-[#111827]">
                    <Bell className="w-4 h-4 text-white" />
                  </div>
                </div>
                <h2 className="text-xl font-black text-white mt-1">فعّل الإشعارات</h2>
                <p className="text-sm text-white/60 mt-1 leading-relaxed max-w-xs">
                  لمتابعة حالة طلبك لحظة بلحظة وتلقّي أحدث العروض الحصرية
                </p>
              </div>

              <div className="space-y-3 mb-6">
                {[
                  { emoji: "📦", text: "تنبيه فوري عند قبول وتجهيز طلبك" },
                  { emoji: "☕", text: "إشعار لحظي عند جاهزية طلبك" },
                  { emoji: "🎁", text: "عروض حصرية ومكافآت خاصة لك" },
                  { emoji: "⚡", text: "تحديثات فورية بدون فتح التطبيق" },
                ].map((item) => (
                  <div key={item.text} className="flex items-center gap-3 bg-white/5 rounded-2xl px-4 py-3">
                    <span className="text-lg">{item.emoji}</span>
                    <span className="text-sm text-white/80 font-medium">{item.text}</span>
                  </div>
                ))}
              </div>

              <Button
                onClick={handleNotifEnable}
                disabled={notifLoading}
                className="w-full h-14 rounded-2xl text-base font-black bg-[#2D9B6E] hover:bg-[#25845d] text-white shadow-lg shadow-[#2D9B6E]/30 gap-2"
              >
                {notifLoading ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> جاري التفعيل...</>
                ) : (
                  <><Bell className="w-5 h-5" /> تفعيل الإشعارات</>
                )}
              </Button>

              <button
                onClick={handleNotifDismiss}
                className="w-full text-center text-white/30 text-xs mt-3 py-2 hover:text-white/50 transition-colors"
              >
                ليس الآن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Android install prompt (non-iOS) */}
      {showInstall && !showNotif && (
        <div className="fixed bottom-20 left-3 right-3 z-[100] animate-in slide-in-from-bottom-6 duration-500" dir="rtl">
          <div className="bg-[#111827] text-white rounded-3xl shadow-2xl border border-white/10 overflow-hidden">
            <div className="flex items-center gap-3 p-4">
              <img src={blackroseLogo} alt={brand.shortNameEn} className="w-12 h-12 rounded-2xl shrink-0 border border-white/10" />
              <div className="flex-1 min-w-0">
                <p className="font-black text-sm leading-tight">{brand.nameEn}</p>
                <p className="text-[11px] text-white/60 mt-0.5">ثبّت التطبيق على جهازك</p>
              </div>
              <Button
                onClick={handleInstall}
                size="sm"
                className="bg-[#2D9B6E] hover:bg-[#25845d] text-white rounded-xl font-bold text-xs px-4 h-9 shrink-0 gap-1.5"
              >
                <Download className="w-4 h-4" />
                حمّل
              </Button>
              <button onClick={handleInstallDismiss} className="p-1.5 rounded-full hover:bg-white/10 transition-colors shrink-0">
                <X className="w-4 h-4 text-white/50" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* iOS Install Guide — shown immediately for iOS non-standalone users */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 backdrop-blur-sm" dir="rtl">
          <div className="w-full max-w-md bg-white rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom-8 duration-400 pb-safe">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>
            <div className="px-6 pt-2 pb-6">
              <div className="flex items-center gap-3 mb-4">
                <img src={blackroseLogo} alt={brand.shortNameEn} className="w-14 h-14 rounded-2xl shadow-md" />
                <div>
                  <h2 className="text-lg font-black text-gray-900">فعّل إشعارات {brand.nameAr || brand.nameEn}</h2>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                    الإشعارات على iPhone تتطلب تثبيت التطبيق أولاً
                  </p>
                </div>
              </div>

              {/* iOS version warning */}
              {isIOS() && !isiOSVersionSupported() && (
                <div className="mb-4 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                  <p className="text-xs text-amber-700 leading-relaxed">
                    الإشعارات تتطلب iOS 16.4 أو أحدث. يبدو أن نسختك أقدم من ذلك.
                  </p>
                </div>
              )}

              <div className="space-y-3 mb-5">
                {[
                  {
                    step: "1",
                    title: 'اضغط على أيقونة "مشاركة"',
                    sub: 'الأيقونة في أسفل شاشة Safari',
                    icon: Share2,
                    highlight: true,
                  },
                  {
                    step: "2",
                    title: '"أضف إلى الشاشة الرئيسية"',
                    sub: "مرّر لأسفل في القائمة واختر هذا الخيار",
                    icon: PlusSquare,
                    highlight: false,
                  },
                  {
                    step: "3",
                    title: 'اضغط "إضافة" للتأكيد',
                    sub: "ثم افتح التطبيق من الشاشة الرئيسية وفعّل الإشعارات",
                    icon: null,
                    highlight: false,
                  },
                ].map((item) => (
                  <div
                    key={item.step}
                    className={`flex items-center gap-4 p-3 rounded-2xl ${item.highlight ? "bg-[#2D9B6E]/10 border border-[#2D9B6E]/20" : "bg-gray-50"}`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#2D9B6E]/10 flex items-center justify-center shrink-0">
                      <span className="text-xl font-bold text-[#2D9B6E]">{item.step}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-800 flex items-center gap-1">
                        {item.icon && <item.icon className="inline w-3.5 h-3.5 text-[#2D9B6E]" />}
                        {item.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{item.sub}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 mb-5">
                <p className="text-xs text-blue-700 leading-relaxed text-center">
                  💡 بعد إضافة التطبيق وفتحه من الشاشة الرئيسية، ستظهر نافذة تفعيل الإشعارات تلقائياً
                </p>
              </div>

              <Button
                onClick={handleIOSGuideDismiss}
                className="w-full rounded-2xl h-12 font-bold text-sm bg-[#2D9B6E] text-white"
              >
                فهمت، شكراً
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* iOS Notification blocked explanation */}
      {showIOSNotifBlocked && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 backdrop-blur-sm" dir="rtl">
          <div className="w-full max-w-md bg-white rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom-8 duration-400 pb-safe">
            <div className="px-6 pt-5 pb-6">
              <div className="flex flex-col items-center text-center mb-5">
                <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-3">
                  <Bell className="w-8 h-8 text-amber-500" />
                </div>
                <h2 className="text-lg font-black text-gray-900">لم تكتمل عملية التفعيل</h2>
                <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                  إشعارات iPhone تعمل فقط عند استخدام التطبيق المثبّت على الشاشة الرئيسية
                </p>
              </div>
              <Button
                onClick={() => { setShowIOSNotifBlocked(false); setShowIOSGuide(true); }}
                className="w-full rounded-2xl h-12 font-bold text-sm bg-[#2D9B6E] text-white mb-2"
              >
                <Smartphone className="w-4 h-4 mr-2" />
                كيف أضيف التطبيق؟
              </Button>
              <Button
                variant="ghost"
                onClick={() => setShowIOSNotifBlocked(false)}
                className="w-full rounded-2xl h-10 text-sm text-gray-400"
              >
                لاحقاً
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
