import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, CreditCard, CheckCircle, XCircle, RefreshCw, AlertCircle, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DriverComponentProps } from "../types";

declare global {
  interface Window { GeideaCheckout?: any; }
}

const SDK_URL = "https://js.geidea.net/GeideaCheckoutSDK.js";
const SDK_TIMEOUT_MS = 20000;

const loadGeideaSDK = (): Promise<void> =>
  new Promise((resolve, reject) => {
    if (window.GeideaCheckout) { resolve(); return; }
    let tid: ReturnType<typeof setTimeout> | null = null;
    const cleanup = (el: HTMLScriptElement) => {
      if (tid) clearTimeout(tid);
      el.removeEventListener("load", onLoad);
      el.removeEventListener("error", onErr);
    };
    const onLoad = (e: Event) => { const el = e.currentTarget as HTMLScriptElement; cleanup(el); window.GeideaCheckout ? resolve() : reject(new Error("sdk_not_available")); };
    const onErr = (e: Event) => { const el = e.currentTarget as HTMLScriptElement; cleanup(el); reject(new Error("sdk_load_failed")); };
    const existing = document.getElementById("geidea-sdk");
    if (existing) existing.remove();
    const s = document.createElement("script");
    s.id = "geidea-sdk"; s.src = SDK_URL; s.async = true;
    s.addEventListener("load", onLoad);
    s.addEventListener("error", onErr);
    document.head.appendChild(s);
    tid = setTimeout(() => { s.removeEventListener("load", onLoad); s.removeEventListener("error", onErr); reject(new Error("sdk_load_timeout")); }, SDK_TIMEOUT_MS);
  });

type State = "loading" | "ready" | "processing" | "success" | "error";

export default function GeideaDriver({ request, callbacks, config, isTestMode }: DriverComponentProps) {
  const [state, setState] = useState<State>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [popupBlocked, setPopupBlocked] = useState(false);
  const sessionCfg = useRef<any>(null);
  const checkoutRef = useRef<any>(null);
  const popupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);

  const clearTimer = () => { if (popupTimer.current) { clearTimeout(popupTimer.current); popupTimer.current = null; } };

  const prepare = async () => {
    if (!mounted.current) return;
    setState("loading"); setErrorMsg(""); sessionCfg.current = null;
    if (isTestMode) { if (mounted.current) setState("ready"); return; }
    try {
      await loadGeideaSDK();
      if (!mounted.current || !window.GeideaCheckout) throw new Error("sdk_not_available");
      const res = await fetch("/api/payments/geidea/session-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: request.amount, currency: request.currency, merchantReferenceId: request.referenceId, callbackUrl: `${window.location.origin}/api/payments/geidea/callback` }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || "session_config_failed"); }
      sessionCfg.current = await res.json();
      if (mounted.current) setState("ready");
    } catch (err: any) {
      if (!mounted.current) return;
      const msg = err.message === "sdk_load_timeout" ? "استغرق تحميل بوابة الدفع وقتاً طويلاً" : "تعذّر الاتصال ببوابة Geidea";
      setState("error"); setErrorMsg(msg); callbacks.onError(msg);
    }
  };

  useEffect(() => { mounted.current = true; prepare(); return () => { mounted.current = false; clearTimer(); }; }, []);

  const handleTestPay = async () => {
    setState("processing");
    try {
      const res = await fetch("/api/payments/simulate-success", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderNumber: request.referenceId, amount: request.amount, currency: request.currency }) });
      const data = await res.json();
      if (res.ok && data.success) { if (mounted.current) setState("success"); callbacks.onSuccess({ success: true, provider: "geidea_sim", transactionId: data.transactionId }); }
      else throw new Error(data.error);
    } catch { if (mounted.current) { setState("error"); setErrorMsg("فشل في محاكاة الدفع"); } }
  };

  const handlePay = () => {
    if (isTestMode) { handleTestPay(); return; }
    const cfg = sessionCfg.current;
    if (!cfg || !window.GeideaCheckout) { prepare(); return; }
    setState("processing"); setPopupBlocked(false);
    popupTimer.current = setTimeout(() => { if (mounted.current) setPopupBlocked(true); }, 10000);
    try {
      checkoutRef.current = new window.GeideaCheckout(
        (order: any) => { clearTimer(); if (mounted.current) setState("success"); callbacks.onSuccess({ success: true, provider: "geidea", transactionId: order?.order?.orderId, raw: order }); },
        (order: any) => { clearTimer(); const msg = order?.detailedResponseMessage || "فشل الدفع"; if (mounted.current) { setState("error"); setErrorMsg(msg); } callbacks.onError(msg); },
        (_order: any) => { clearTimer(); if (mounted.current) { setState("ready"); setPopupBlocked(false); } callbacks.onCancel(); }
      );
      const params: any = { merchantPublicKey: cfg.merchantPublicKey, orderAmount: parseFloat(cfg.orderAmount), orderCurrency: cfg.orderCurrency, merchantReferenceId: cfg.merchantReferenceId, callbackUrl: cfg.callbackUrl, returnUrl: `${window.location.origin}/payment-return`, signature: cfg.signature, timestamp: cfg.timestamp, language: "ar", showEmail: false, showPhone: false };
      if (request.customerEmail) params.customerEmail = request.customerEmail;
      if (request.customerPhone) { const p = request.customerPhone.replace(/^\+966|^966|^0/, ""); params.customerPhone = p; params.customerMobileCountryCode = "966"; }
      checkoutRef.current.startSession(params);
    } catch (err: any) {
      clearTimer();
      const msg = "تعذّر فتح نموذج الدفع";
      if (mounted.current) { setState("error"); setErrorMsg(msg); }
      callbacks.onError(msg);
    }
  };

  if (state === "success") return (
    <div className="flex flex-col items-center gap-4 p-8 bg-green-50 dark:bg-green-950/30 rounded-xl border border-green-200">
      <CheckCircle className="w-14 h-14 text-green-500" />
      <p className="font-bold text-xl text-green-700">تم الدفع بنجاح!</p>
      {isTestMode && <p className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">⚗️ وضع الاختبار — لم يُخصم مبلغ حقيقي</p>}
    </div>
  );

  if (state === "error") return (
    <div className="flex flex-col items-center gap-4 p-8 bg-red-50 dark:bg-red-950/30 rounded-xl border border-red-200">
      <XCircle className="w-12 h-12 text-red-500" />
      <p className="font-bold text-lg text-red-700">تعذّر إتمام الدفع</p>
      <p className="text-sm text-muted-foreground">{errorMsg}</p>
      <Button variant="outline" onClick={() => { setState("loading"); prepare(); }} className="gap-2">
        <RefreshCw className="w-4 h-4" /> حاول مرة أخرى
      </Button>
    </div>
  );

  if (state === "loading") return (
    <div className="flex flex-col items-center gap-4 p-10 bg-primary/5 rounded-xl border border-primary/20">
      <Loader2 className="w-10 h-10 animate-spin text-primary" />
      <p className="font-semibold">جاري تجهيز بوابة Geidea...</p>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Wifi className="w-3 h-3" /><span>يتطلب اتصالاً بالإنترنت</span></div>
    </div>
  );

  if (state === "processing") return (
    <div className="flex flex-col items-center gap-4 p-8 bg-primary/5 rounded-xl border border-primary/20">
      {popupBlocked ? (
        <>
          <AlertCircle className="w-10 h-10 text-amber-500" />
          <p className="font-semibold">لم تظهر نافذة الدفع؟</p>
          <p className="text-sm text-muted-foreground">قد يكون المتصفح قد حجب النافذة المنبثقة</p>
          <Button onClick={handlePay} className="gap-2"><CreditCard className="w-4 h-4" />افتح نافذة الدفع</Button>
        </>
      ) : (
        <>
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="font-semibold">{isTestMode ? "جاري محاكاة الدفع..." : "جاري فتح نافذة الدفع..."}</p>
          {isTestMode && <p className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">⚗️ وضع الاختبار</p>}
        </>
      )}
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-4 p-8 bg-primary/5 rounded-xl border border-primary/20">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "#1B4FBB" }}>
        <CreditCard className="w-6 h-6 text-white" />
      </div>
      <div className="text-center space-y-1">
        <p className="font-semibold text-lg">بوابة Geidea جاهزة</p>
        <p className="text-sm text-muted-foreground">اضغط لفتح نموذج الدفع الآمن</p>
      </div>
      <Button size="lg" onClick={handlePay} className="gap-2 w-full max-w-xs" data-testid="button-geidea-pay">
        <CreditCard className="w-4 h-4" />ادفع الآن — {request.amount.toFixed(2)} ر.س
      </Button>
      <p className="text-xs text-muted-foreground">🔒 دفع آمن ومشفّر بواسطة Geidea</p>
    </div>
  );
}
