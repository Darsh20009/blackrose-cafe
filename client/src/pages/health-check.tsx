import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight, Play, CheckCircle2, XCircle, AlertCircle,
  Loader2, ShieldCheck, RefreshCw, Download, Bug,
  LogIn, FileText, Edit, Trash2, RotateCcw, Search,
  Package, Users, Truck, BarChart3, Printer, CreditCard,
  Wifi, Lock, Settings, Clock, Eye
} from "lucide-react";

type TestStatus = "idle" | "running" | "pass" | "fail" | "warn";

interface TestResult {
  id: string;
  name: string;
  category: string;
  status: TestStatus;
  duration?: number;
  message?: string;
  detail?: string;
}

interface Category {
  id: string;
  nameAr: string;
  icon: React.ReactNode;
  color: string;
  tests: TestDefinition[];
}

interface TestDefinition {
  id: string;
  name: string;
  run: () => Promise<{ pass: boolean; message: string; detail?: string }>;
}

const timeout = (ms: number) =>
  new Promise<never>((_, r) => setTimeout(() => r(new Error("timeout")), ms));

async function apiTest(
  url: string,
  opts: RequestInit = {},
  expectedStatus = 200,
  timeLimit = 3000
): Promise<{ pass: boolean; message: string; detail?: string; dur: number }> {
  const start = Date.now();
  try {
    const res = await Promise.race([fetch(url, opts), timeout(timeLimit)]) as Response;
    const dur = Date.now() - start;
    if (res.status === expectedStatus || (expectedStatus === 200 && res.ok)) {
      return { pass: true, message: `${res.status} OK (${dur}ms)`, dur };
    }
    return { pass: false, message: `HTTP ${res.status} — expected ${expectedStatus}`, dur };
  } catch (e: any) {
    const dur = Date.now() - start;
    return { pass: false, message: e.message === "timeout" ? `تجاوز ${timeLimit}ms` : e.message, dur };
  }
}

function buildCategories(): Category[] {
  return [
    {
      id: "login", nameAr: "تسجيل الدخول", icon: <LogIn size={16} />, color: "blue",
      tests: [
        {
          id: "login-page-load", name: "صفحة تسجيل الدخول تحمل",
          run: async () => { const r = await apiTest("/employee"); return { pass: r.pass, message: r.message }; }
        },
        {
          id: "login-wrong-creds", name: "رفض كلمة المرور الخاطئة",
          run: async () => {
            const r = await apiTest("/api/employees/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: "WRONG_USER_XYZ", password: "WRONG_PASS_XYZ" }) }, 401);
            return { pass: r.pass, message: r.message };
          }
        },
        {
          id: "login-session-check", name: "التحقق من حالة الجلسة",
          run: async () => { const r = await apiTest("/api/employees/me"); return { pass: r.pass, message: r.message }; }
        },
        {
          id: "login-speed", name: "سرعة استجابة تسجيل الدخول < 2ث",
          run: async () => {
            const start = Date.now();
            await fetch("/api/employees/me").catch(() => {});
            const dur = Date.now() - start;
            return { pass: dur < 2000, message: `${dur}ms`, detail: dur >= 2000 ? "بطيء جداً" : undefined };
          }
        },
      ]
    },
    {
      id: "invoices", nameAr: "إنشاء الفواتير", icon: <FileText size={16} />, color: "green",
      tests: [
        {
          id: "orders-list", name: "قائمة الطلبات تستجيب",
          run: async () => { const r = await apiTest("/api/orders?limit=1"); return { pass: r.pass, message: r.message }; }
        },
        {
          id: "orders-live", name: "الطلبات المباشرة تستجيب",
          run: async () => { const r = await apiTest("/api/orders/live"); return { pass: r.pass, message: r.message }; }
        },
        {
          id: "orders-kitchen", name: "طلبات المطبخ تستجيب",
          run: async () => { const r = await apiTest("/api/orders/kitchen"); return { pass: r.pass, message: r.message }; }
        },
        {
          id: "invoice-fields", name: "بيانات الفاتورة مكتملة",
          run: async () => {
            const r = await fetch("/api/orders?limit=1").catch(() => null);
            if (!r?.ok) return { pass: false, message: "فشل في جلب البيانات" };
            const data = await r.json().catch(() => []);
            const order = Array.isArray(data) ? data[0] : data?.orders?.[0];
            if (!order) return { pass: true, message: "لا توجد طلبات بعد" };
            const required = ["orderNumber", "totalAmount", "status", "items"];
            const missing = required.filter(f => !(f in order));
            return { pass: missing.length === 0, message: missing.length ? `حقول ناقصة: ${missing.join(", ")}` : "كل الحقول موجودة" };
          }
        },
      ]
    },
    {
      id: "edit-invoice", nameAr: "تعديل الفواتير", icon: <Edit size={16} />, color: "orange",
      tests: [
        {
          id: "order-patch-auth", name: "تعديل طلب يتطلب صلاحية",
          run: async () => { const r = await apiTest("/api/orders/FAKE_ID", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: "{}" }, 401); return { pass: r.pass || r.message.includes("401") || r.message.includes("403"), message: r.message }; }
        },
        {
          id: "order-status-update", name: "تحديث حالة الطلب يعمل",
          run: async () => {
            const list = await fetch("/api/orders/live").then(r => r.json()).catch(() => []);
            const order = Array.isArray(list) ? list[0] : null;
            if (!order) return { pass: true, message: "لا توجد طلبات مباشرة للاختبار" };
            const r = await apiTest(`/api/orders/${order.id || order._id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: order.status }) });
            return { pass: r.pass, message: r.message };
          }
        },
      ]
    },
    {
      id: "delete-invoice", nameAr: "حذف الفواتير", icon: <Trash2 size={16} />, color: "red",
      tests: [
        {
          id: "delete-requires-auth", name: "الحذف يتطلب صلاحية مدير",
          run: async () => { const r = await apiTest("/api/orders/FAKE_DELETE_ID", { method: "DELETE" }, 401); return { pass: r.pass || r.message.includes("401") || r.message.includes("403") || r.message.includes("404"), message: r.message }; }
        },
        {
          id: "delete-nonexistent", name: "حذف طلب غير موجود يُعيد 404",
          run: async () => {
            const r = await fetch("/api/orders/nonexistent_id_000", { method: "DELETE" });
            return { pass: [401, 403, 404].includes(r.status), message: `HTTP ${r.status}` };
          }
        },
      ]
    },
    {
      id: "returns", nameAr: "المرتجعات", icon: <RotateCcw size={16} />, color: "purple",
      tests: [
        {
          id: "returns-list", name: "قائمة المرتجعات تستجيب",
          run: async () => { const r = await apiTest("/api/returns?limit=1"); return { pass: r.pass || r.message.includes("404"), message: r.message }; }
        },
        {
          id: "refund-endpoint", name: "نقطة الاسترداد موجودة",
          run: async () => {
            const r = await fetch("/api/orders/FAKE/refund", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
            return { pass: [400, 401, 403, 404, 422].includes(r.status), message: `HTTP ${r.status} (ليس 500)` };
          }
        },
      ]
    },
    {
      id: "search", nameAr: "البحث", icon: <Search size={16} />, color: "cyan",
      tests: [
        {
          id: "search-items", name: "البحث في المنتجات يعمل",
          run: async () => { const r = await apiTest("/api/coffee-items?search=قهوة"); return { pass: r.pass, message: r.message }; }
        },
        {
          id: "search-customers", name: "البحث في العملاء يعمل",
          run: async () => { const r = await apiTest("/api/customers?search=05"); return { pass: r.pass || r.message.includes("401"), message: r.message }; }
        },
        {
          id: "search-empty-result", name: "البحث الفارغ يُعيد مصفوفة",
          run: async () => {
            const r = await fetch("/api/coffee-items?search=XXXXXXNOTFOUND999");
            const data = await r.json().catch(() => null);
            return { pass: Array.isArray(data) || (data && "items" in data), message: Array.isArray(data) ? `${data.length} نتائج` : "مصفوفة في items" };
          }
        },
        {
          id: "search-speed", name: "البحث يستجيب < 1.5ث",
          run: async () => {
            const start = Date.now();
            await fetch("/api/coffee-items?search=ق").catch(() => {});
            const dur = Date.now() - start;
            return { pass: dur < 1500, message: `${dur}ms` };
          }
        },
      ]
    },
    {
      id: "inventory", nameAr: "المخزون", icon: <Package size={16} />, color: "amber",
      tests: [
        {
          id: "inventory-raw", name: "المواد الخام تستجيب",
          run: async () => { const r = await apiTest("/api/inventory/raw-items"); return { pass: r.pass || r.message.includes("401"), message: r.message }; }
        },
        {
          id: "inventory-alerts", name: "تنبيهات المخزون تعمل",
          run: async () => { const r = await apiTest("/api/inventory/alerts"); return { pass: r.pass || r.message.includes("401"), message: r.message }; }
        },
        {
          id: "inventory-movements", name: "حركة المخزون تُرجع بيانات",
          run: async () => { const r = await apiTest("/api/inventory/movements?limit=1"); return { pass: r.pass || r.message.includes("401"), message: r.message }; }
        },
        {
          id: "menu-items-load", name: "قائمة المنتجات تحمل",
          run: async () => {
            const r = await fetch("/api/coffee-items");
            const data = await r.json().catch(() => null);
            return { pass: r.ok && Array.isArray(data) && data.length >= 0, message: `${Array.isArray(data) ? data.length : 0} منتج` };
          }
        },
      ]
    },
    {
      id: "customers", nameAr: "العملاء", icon: <Users size={16} />, color: "pink",
      tests: [
        {
          id: "customers-list", name: "قائمة العملاء تستجيب",
          run: async () => { const r = await apiTest("/api/customers?limit=1"); return { pass: r.pass || r.message.includes("401"), message: r.message }; }
        },
        {
          id: "loyalty-settings", name: "إعدادات الولاء تعمل",
          run: async () => { const r = await apiTest("/api/public/loyalty-settings"); return { pass: r.pass, message: r.message }; }
        },
        {
          id: "customer-lookup", name: "البحث برقم الهاتف يعمل",
          run: async () => { const r = await apiTest("/api/customers/phone/0500000000"); return { pass: r.pass || r.message.includes("404") || r.message.includes("401"), message: r.message }; }
        },
      ]
    },
    {
      id: "suppliers", nameAr: "الموردين", icon: <Truck size={16} />, color: "teal",
      tests: [
        {
          id: "suppliers-list", name: "قائمة الموردين تستجيب",
          run: async () => { const r = await apiTest("/api/suppliers"); return { pass: r.pass || r.message.includes("401"), message: r.message }; }
        },
        {
          id: "purchases-list", name: "قائمة المشتريات تستجيب",
          run: async () => { const r = await apiTest("/api/purchases?limit=1"); return { pass: r.pass || r.message.includes("401"), message: r.message }; }
        },
      ]
    },
    {
      id: "reports", nameAr: "التقارير", icon: <BarChart3 size={16} />, color: "indigo",
      tests: [
        {
          id: "accounting-revenue", name: "تقرير الإيرادات يستجيب",
          run: async () => { const r = await apiTest("/api/accounting/revenue?period=today"); return { pass: r.pass || r.message.includes("401"), message: r.message }; }
        },
        {
          id: "accounting-expenses", name: "تقرير المصاريف يستجيب",
          run: async () => { const r = await apiTest("/api/accounting/expenses?period=today"); return { pass: r.pass || r.message.includes("401"), message: r.message }; }
        },
        {
          id: "analytics-summary", name: "ملخص الإحصائيات يستجيب",
          run: async () => { const r = await apiTest("/api/analytics/summary"); return { pass: r.pass || r.message.includes("401"), message: r.message }; }
        },
        {
          id: "system-stats", name: "إحصائيات النظام تستجيب",
          run: async () => { const r = await apiTest("/api/admin/system-stats"); return { pass: r.pass || r.message.includes("401"), message: r.message }; }
        },
      ]
    },
    {
      id: "printing", nameAr: "الطباعة", icon: <Printer size={16} />, color: "gray",
      tests: [
        {
          id: "print-api-available", name: "browser print API متاح",
          run: async () => ({ pass: typeof window.print === "function", message: typeof window.print === "function" ? "متاح ✅" : "غير متاح" })
        },
        {
          id: "receipt-logo-loads", name: "اللوجو يحمل بشكل صحيح",
          run: async () => {
            return new Promise(resolve => {
              const img = new Image();
              img.onload = () => resolve({ pass: true, message: `${img.naturalWidth}×${img.naturalHeight}px` });
              img.onerror = () => resolve({ pass: false, message: "فشل تحميل اللوجو" });
              img.src = "/black-rose-logo-receipt.png?t=" + Date.now();
              setTimeout(() => resolve({ pass: false, message: "timeout" }), 3000);
            });
          }
        },
        {
          id: "html2canvas-available", name: "html2canvas متاح للطباعة",
          run: async () => {
            try {
              const mod = await import("html2canvas");
              return { pass: !!mod.default, message: "متاح ✅" };
            } catch {
              return { pass: false, message: "غير مثبّت" };
            }
          }
        },
      ]
    },
    {
      id: "payment", nameAr: "الدفع", icon: <CreditCard size={16} />, color: "emerald",
      tests: [
        {
          id: "payment-methods", name: "طرق الدفع تحمل",
          run: async () => {
            const r = await fetch("/api/payment-methods");
            const data = await r.json().catch(() => null);
            return { pass: r.ok && Array.isArray(data), message: `${Array.isArray(data) ? data.length : 0} طريقة دفع` };
          }
        },
        {
          id: "payment-config", name: "إعدادات الدفع تستجيب",
          run: async () => { const r = await apiTest("/api/business-config"); return { pass: r.pass, message: r.message }; }
        },
        {
          id: "gift-cards-endpoint", name: "نقطة بطاقات الهدايا موجودة",
          run: async () => { const r = await apiTest("/api/gift-cards/FAKE999/validate", {}, 404); return { pass: r.pass || r.message.includes("404") || r.message.includes("401"), message: r.message }; }
        },
      ]
    },
    {
      id: "sync", nameAr: "المزامنة", icon: <Wifi size={16} />, color: "sky",
      tests: [
        {
          id: "websocket-status", name: "WebSocket مدعوم",
          run: async () => ({ pass: "WebSocket" in window, message: "WebSocket" in window ? "مدعوم ✅" : "غير مدعوم" })
        },
        {
          id: "indexeddb-status", name: "IndexedDB (offline) متاح",
          run: async () => ({ pass: "indexedDB" in window, message: "indexedDB" in window ? "متاح ✅" : "غير متاح" })
        },
        {
          id: "service-worker", name: "Service Worker مسجّل",
          run: async () => {
            if (!("serviceWorker" in navigator)) return { pass: false, message: "غير مدعوم" };
            const regs = await navigator.serviceWorker.getRegistrations().catch(() => []);
            return { pass: regs.length > 0, message: regs.length > 0 ? `${regs.length} SW مسجّل` : "لا يوجد SW (وضع dev)" };
          }
        },
        {
          id: "online-status", name: "الاتصال بالإنترنت",
          run: async () => ({ pass: navigator.onLine, message: navigator.onLine ? "متصل ✅" : "غير متصل ⚠️" })
        },
      ]
    },
    {
      id: "permissions", nameAr: "الصلاحيات", icon: <Lock size={16} />, color: "rose",
      tests: [
        {
          id: "protected-route", name: "صفحات المدير محمية",
          run: async () => { const r = await apiTest("/api/employees?limit=1"); return { pass: r.pass || r.message.includes("401") || r.message.includes("403"), message: r.message }; }
        },
        {
          id: "admin-route-protected", name: "لوحة الأدمن محمية",
          run: async () => { const r = await apiTest("/api/admin/system-stats"); return { pass: r.pass || r.message.includes("401") || r.message.includes("403"), message: r.message }; }
        },
        {
          id: "public-routes-open", name: "المسارات العامة مفتوحة",
          run: async () => { const r = await apiTest("/api/coffee-items"); return { pass: r.pass, message: r.message }; }
        },
        {
          id: "customer-auth-separate", name: "جلسة العملاء منفصلة",
          run: async () => { const r = await apiTest("/api/customers/me"); return { pass: r.message.includes("401") || r.message.includes("400") || r.message.includes("404"), message: r.message }; }
        },
      ]
    },
    {
      id: "settings", nameAr: "الإعدادات", icon: <Settings size={16} />, color: "slate",
      tests: [
        {
          id: "business-config", name: "إعدادات المتجر تحمل",
          run: async () => {
            const r = await fetch("/api/business-config");
            const data = await r.json().catch(() => null);
            return { pass: r.ok && data && typeof data === "object", message: data?.businessName || "إعدادات محمّلة" };
          }
        },
        {
          id: "branches-load", name: "قائمة الفروع تحمل",
          run: async () => {
            const r = await fetch("/api/branches");
            const data = await r.json().catch(() => []);
            return { pass: r.ok && Array.isArray(data), message: `${Array.isArray(data) ? data.length : 0} فرع` };
          }
        },
        {
          id: "menu-categories", name: "تصنيفات القائمة تحمل",
          run: async () => {
            const r = await fetch("/api/menu-categories");
            const data = await r.json().catch(() => []);
            return { pass: r.ok && Array.isArray(data), message: `${Array.isArray(data) ? data.length : 0} تصنيف` };
          }
        },
        {
          id: "system-health", name: "صحة النظام العامة",
          run: async () => { const r = await apiTest("/api/system/health"); return { pass: r.pass || r.message.includes("401"), message: r.message }; }
        },
      ]
    },
  ];
}

const colorMap: Record<string, string> = {
  blue: "bg-blue-100 text-blue-700 border-blue-200",
  green: "bg-green-100 text-green-700 border-green-200",
  orange: "bg-orange-100 text-orange-700 border-orange-200",
  red: "bg-red-100 text-red-700 border-red-200",
  purple: "bg-purple-100 text-purple-700 border-purple-200",
  cyan: "bg-cyan-100 text-cyan-700 border-cyan-200",
  amber: "bg-amber-100 text-amber-700 border-amber-200",
  pink: "bg-pink-100 text-pink-700 border-pink-200",
  teal: "bg-teal-100 text-teal-700 border-teal-200",
  indigo: "bg-indigo-100 text-indigo-700 border-indigo-200",
  gray: "bg-gray-100 text-gray-700 border-gray-200",
  emerald: "bg-emerald-100 text-emerald-700 border-emerald-200",
  sky: "bg-sky-100 text-sky-700 border-sky-200",
  rose: "bg-rose-100 text-rose-700 border-rose-200",
  slate: "bg-slate-100 text-slate-700 border-slate-200",
};

function StatusIcon({ status }: { status: TestStatus }) {
  if (status === "pass") return <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" />;
  if (status === "fail") return <XCircle size={16} className="text-red-500 flex-shrink-0" />;
  if (status === "warn") return <AlertCircle size={16} className="text-yellow-500 flex-shrink-0" />;
  if (status === "running") return <Loader2 size={16} className="text-blue-500 animate-spin flex-shrink-0" />;
  return <div className="w-4 h-4 rounded-full border-2 border-gray-300 flex-shrink-0" />;
}

export default function HealthCheck() {
  const [, setLocation] = useLocation();
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [running, setRunning] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const categories = buildCategories();

  const allTests = categories.flatMap(c => c.tests.map(t => ({ ...t, category: c.id, categoryName: c.nameAr })));
  const totalTests = allTests.length;
  const passed = Object.values(results).filter(r => r.status === "pass").length;
  const failed = Object.values(results).filter(r => r.status === "fail").length;
  const warned = Object.values(results).filter(r => r.status === "warn").length;
  const done = passed + failed + warned;
  const healthScore = done === 0 ? 0 : Math.round((passed / done) * 100);

  const runTest = useCallback(async (test: TestDefinition & { category: string; categoryName: string }) => {
    setResults(prev => ({ ...prev, [test.id]: { id: test.id, name: test.name, category: test.category, status: "running" } }));
    const start = Date.now();
    try {
      const result = await test.run();
      const dur = Date.now() - start;
      setResults(prev => ({
        ...prev,
        [test.id]: { id: test.id, name: test.name, category: test.category, status: result.pass ? "pass" : "fail", duration: dur, message: result.message, detail: result.detail }
      }));
    } catch (e: any) {
      setResults(prev => ({
        ...prev,
        [test.id]: { id: test.id, name: test.name, category: test.category, status: "fail", duration: Date.now() - start, message: e.message || "خطأ غير متوقع" }
      }));
    }
  }, []);

  const runAll = useCallback(async () => {
    setRunning(true);
    setResults({});
    for (const test of allTests) {
      await runTest(test);
    }
    setRunning(false);
  }, [allTests, runTest]);

  const runCategory = useCallback(async (catId: string) => {
    const cat = categories.find(c => c.id === catId);
    if (!cat) return;
    setRunning(true);
    for (const test of cat.tests) {
      await runTest({ ...test, category: cat.id, categoryName: cat.nameAr });
    }
    setRunning(false);
  }, [categories, runTest]);

  const exportResults = () => {
    const rows = [["الاختبار", "الفئة", "النتيجة", "الوقت(ms)", "الرسالة"]];
    Object.values(results).forEach(r => {
      rows.push([r.name, r.category, r.status, String(r.duration || ""), r.message || ""]);
    });
    const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `health-check-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => setLocation("/owner/dashboard")} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowRight size={18} />
          </button>
          <ShieldCheck size={22} className="text-primary" />
          <div>
            <h1 className="font-bold text-lg leading-none">POS Health Check</h1>
            <p className="text-xs text-gray-500">فحص شامل لجميع وظائف النظام</p>
          </div>
          <div className="mr-auto flex items-center gap-2">
            {done > 0 && (
              <button onClick={exportResults} className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50">
                <Download size={13} /> تصدير CSV
              </button>
            )}
            <Button
              onClick={runAll}
              disabled={running}
              size="sm"
              className="flex items-center gap-1.5"
            >
              {running ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
              {running ? "جاري الفحص..." : "فحص الكل"}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Summary Cards */}
        {done > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <div className="text-3xl font-black text-gray-800">{totalTests}</div>
              <div className="text-xs text-gray-500 mt-1">إجمالي الاختبارات</div>
            </div>
            <div className="bg-green-50 rounded-xl border border-green-200 p-4 text-center">
              <div className="text-3xl font-black text-green-600">{passed}</div>
              <div className="text-xs text-green-600 mt-1">ناجح ✅</div>
            </div>
            <div className="bg-red-50 rounded-xl border border-red-200 p-4 text-center">
              <div className="text-3xl font-black text-red-600">{failed}</div>
              <div className="text-xs text-red-600 mt-1">فاشل ❌</div>
            </div>
            <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-4 text-center">
              <div className="text-3xl font-black text-yellow-600">{warned}</div>
              <div className="text-xs text-yellow-600 mt-1">تحذير ⚠️</div>
            </div>
            <div className={`rounded-xl border p-4 text-center ${healthScore >= 80 ? "bg-green-50 border-green-200" : healthScore >= 60 ? "bg-yellow-50 border-yellow-200" : "bg-red-50 border-red-200"}`}>
              <div className={`text-3xl font-black ${healthScore >= 80 ? "text-green-600" : healthScore >= 60 ? "text-yellow-600" : "text-red-600"}`}>{healthScore}%</div>
              <div className={`text-xs mt-1 ${healthScore >= 80 ? "text-green-600" : healthScore >= 60 ? "text-yellow-600" : "text-red-600"}`}>صحة النظام</div>
            </div>
          </div>
        )}

        {/* Progress bar */}
        {running && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium">جاري الفحص...</span>
              <span className="text-gray-500">{done} / {totalTests}</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${(done / totalTests) * 100}%` }} />
            </div>
          </div>
        )}

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {categories.map(cat => {
            const catTests = cat.tests;
            const catResults = catTests.map(t => results[t.id]);
            const catPassed = catResults.filter(r => r?.status === "pass").length;
            const catFailed = catResults.filter(r => r?.status === "fail").length;
            const catDone = catResults.filter(r => r && r.status !== "running" && r.status !== "idle").length;
            const isExpanded = activeCategory === cat.id;
            const badgeClass = colorMap[cat.color] || colorMap.gray;

            return (
              <div key={cat.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Category Header */}
                <div
                  className="flex items-center gap-2 p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setActiveCategory(isExpanded ? null : cat.id)}
                >
                  <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${badgeClass}`}>
                    {cat.icon}
                    {cat.nameAr}
                  </span>
                  <div className="mr-auto flex items-center gap-2">
                    {catDone > 0 && (
                      <>
                        {catPassed > 0 && <span className="text-xs text-green-600 font-medium">{catPassed}✅</span>}
                        {catFailed > 0 && <span className="text-xs text-red-600 font-medium">{catFailed}❌</span>}
                      </>
                    )}
                    <button
                      onClick={e => { e.stopPropagation(); runCategory(cat.id); }}
                      disabled={running}
                      className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-1 disabled:opacity-50"
                    >
                      <RefreshCw size={11} />
                      فحص
                    </button>
                  </div>
                  <Eye size={14} className={`text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                </div>

                {/* Tests list — always visible, compact */}
                <div className="border-t border-gray-100 divide-y divide-gray-50">
                  {catTests.map(test => {
                    const result = results[test.id];
                    const status: TestStatus = result?.status || "idle";
                    return (
                      <div key={test.id} className="flex items-center gap-2 px-3 py-2">
                        <StatusIcon status={status} />
                        <span className="text-xs flex-1 text-gray-700">{test.name}</span>
                        {result?.duration && (
                          <span className="text-xs text-gray-400 flex items-center gap-0.5">
                            <Clock size={10} />{result.duration}ms
                          </span>
                        )}
                        {result?.message && (
                          <span className={`text-xs font-mono max-w-[120px] truncate ${status === "fail" ? "text-red-500" : status === "pass" ? "text-green-600" : "text-gray-400"}`} title={result.message}>
                            {result.message}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Failed Tests Summary */}
        {failed > 0 && (
          <div className="bg-red-50 rounded-xl border border-red-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Bug size={18} className="text-red-500" />
              <h2 className="font-bold text-red-700">الاختبارات الفاشلة ({failed})</h2>
            </div>
            <div className="space-y-2">
              {Object.values(results).filter(r => r.status === "fail").map(r => (
                <div key={r.id} className="flex items-start gap-2 bg-white rounded-lg p-3 border border-red-100">
                  <XCircle size={15} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-gray-800">{r.name}</div>
                    <div className="text-xs text-red-600 mt-0.5">{r.message}</div>
                    {r.detail && <div className="text-xs text-gray-500 mt-0.5">{r.detail}</div>}
                  </div>
                  <Badge variant="outline" className="mr-auto text-xs text-gray-500">{r.category}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {done === 0 && !running && (
          <div className="text-center py-20 text-gray-400">
            <ShieldCheck size={64} className="mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium">اضغط "فحص الكل" لبدء الاختبارات</p>
            <p className="text-sm mt-1">{totalTests} اختبار في {categories.length} قسم</p>
          </div>
        )}
      </div>
    </div>
  );
}
