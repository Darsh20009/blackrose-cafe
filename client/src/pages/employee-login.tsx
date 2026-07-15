import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { preCacheOnLogin } from "@/lib/offline-cashier";
import { requestAndSubscribeEmployee } from "@/lib/push-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AtSign, Lock, Loader2, Eye, EyeOff, QrCode, Download } from "lucide-react";
import type { Employee } from "@shared/schema";
import { Html5QrcodeScanner } from "html5-qrcode";
import blackroseLogoStaff from "@assets/blackrose-staff-logo.png";
import qiroxLogo from "@assets/qirox-logo.png";
import { useTranslate } from "@/lib/useTranslate";
import { brand } from "@/lib/brand";

function useAutoRedirectIfLoggedIn() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    const stored = localStorage.getItem("currentEmployee");
    if (stored) {
      try {
        const emp = JSON.parse(stored);
        if (emp?.role) {
          if (emp.role === "admin") setLocation("/admin/dashboard");
          else if (emp.role === "owner") setLocation("/owner/dashboard");
          else if (emp.role === "manager" || emp.role === "branch_manager") setLocation("/manager/dashboard");
          else if (emp.role === "cleaner") setLocation("/employee/attendance");
          else setLocation("/employee/home");
        }
      } catch {}
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

export default function EmployeeLogin() {
  useAutoRedirectIfLoggedIn();
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [showQRScanner, setShowQRScanner] = useState(false);
  const qrScannerRef = useRef<Html5QrcodeScanner | null>(null);
  const tc = useTranslate();
  const [rememberMe, setRememberMe] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    document.title = tc("تسجيل دخول الموظفين", "Employee Login") + ` — ${brand.platformNameEn}`;
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    const stored = localStorage.getItem("currentEmployee");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed?.id) {
          const r = parsed.role;
          if (r === "admin" || r === "owner") window.location.href = "/admin/dashboard";
          else if (r === "manager" || r === "branch_manager") window.location.href = "/manager/dashboard";
          else if (r === "cleaner") window.location.href = "/employee/attendance";
          else window.location.href = "/employee/home";
          return;
        }
      } catch {}
    }
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const loginMutation = useMutation({
    mutationFn: async (credentials: { username?: string; employeeId?: string; password?: string }) => {
      const isQRLogin = !!credentials.employeeId && !credentials.password;
      const endpoint = isQRLogin ? "/api/employees/login-qr" : "/api/employees/login";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify(credentials),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || tc("فشل تسجيل الدخول", "Login failed"));
      return data as Employee;
    },
    onSuccess: (employee: any) => {
      if (employee.restoreKey) {
        localStorage.setItem("qirox-restore-key", employee.restoreKey);
        delete employee.restoreKey;
      }
      localStorage.setItem("currentEmployee", JSON.stringify(employee));
      preCacheOnLogin().catch(() => {});
      requestAndSubscribeEmployee(employee).catch(() => {});
      const role = employee.role;
      if (role === "admin") window.location.href = "/admin/dashboard";
      else if (role === "owner") window.location.href = "/owner/dashboard";
      else if (role === "manager" || role === "branch_manager") window.location.href = "/manager/dashboard";
      else if (role === "cleaner") window.location.href = "/employee/attendance";
      else window.location.href = "/employee/home";
    },
    onError: (err: any) => {
      setError(err?.message || tc("بيانات تسجيل الدخول غير صحيحة", "Invalid login credentials"));
      setPassword("");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!username || !password) {
      setError(tc("الرجاء إدخال اسم المستخدم وكلمة المرور", "Please enter your username and password"));
      return;
    }
    loginMutation.mutate({ username: username.trim().toLowerCase(), password });
  };

  useEffect(() => {
    if (!showQRScanner) return;
    const scanner = new Html5QrcodeScanner("qr-reader", { fps: 10, qrbox: { width: 250, height: 250 } }, false);
    scanner.render(
      (decodedText) => {
        try {
          const scannedId = decodedText.trim();
          if (scannedId) {
            setError("");
            scanner.clear();
            setShowQRScanner(false);
            loginMutation.mutate({ employeeId: scannedId });
          } else {
            setError(tc("صيغة الباركود غير صحيحة", "Invalid QR code format"));
          }
        } catch {
          setError(tc("خطأ في قراءة الباركود", "Error reading QR code"));
        }
      },
      (err) => console.debug("QR scan error:", err)
    );
    qrScannerRef.current = scanner;
    return () => { qrScannerRef.current?.clear().catch(() => {}); };
  }, [showQRScanner]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" dir="rtl">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          {/* Logo + Name */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 mb-4 bg-white rounded-2xl shadow-sm border border-gray-100">
              <img src={blackroseLogoStaff} alt={brand.platformNameEn} className="w-14 h-14 object-contain" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">{brand.platformNameAr}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{tc("بوابة الموظفين", "Employee Portal")}</p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {showQRScanner ? (
              <div className="p-6 space-y-4">
                <h2 className="text-lg font-bold text-gray-900 text-center">
                  {tc("مسح بطاقة الموظف", "Scan Employee Card")}
                </h2>
                <p className="text-sm text-gray-500 text-center">
                  {tc("وجه الكاميرا نحو QR الكود الموجود على بطاقتك", "Point the camera at the QR code on your card")}
                </p>
                <div id="qr-reader" className="w-full overflow-hidden rounded-xl border border-gray-200" />
                {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                <Button type="button" variant="outline" onClick={() => { setError(""); setShowQRScanner(false); }} className="w-full">
                  {tc("إلغاء", "Cancel")}
                </Button>
              </div>
            ) : (
              <div className="p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-1">{tc("تسجيل الدخول", "Sign In")}</h2>
                <p className="text-sm text-gray-500 mb-5">{tc("أدخل بيانات حسابك للوصول", "Enter your account credentials")}</p>

                <form onSubmit={handleSubmit} className="space-y-3">
                  {/* Username */}
                  <div className="relative">
                    <AtSign className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder={tc("اسم المستخدم أو الجوال أو الإيميل", "Username, Phone or Email")}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="pr-9 bg-gray-50 border-gray-200 focus:bg-white text-sm"
                      data-testid="input-username"
                      autoFocus
                      autoComplete="username email tel"
                      disabled={loginMutation.isPending}
                    />
                  </div>

                  {/* Password */}
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder={tc("كلمة المرور", "Password")}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-9 pl-9 bg-gray-50 border-gray-200 focus:bg-white text-sm"
                      data-testid="input-password"
                      autoComplete="current-password"
                      disabled={loginMutation.isPending}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      data-testid="button-toggle-password"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  {/* Remember + Forgot */}
                  <div className="flex items-center justify-between pt-0.5">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        id="remember-me"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-gray-600">{tc("تذكرني", "Remember me")}</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setLocation("/employee/forgot-password")}
                      className="text-xs text-primary hover:underline"
                      data-testid="link-forgot-password"
                    >
                      {tc("نسيت كلمة المرور؟", "Forgot password?")}
                    </button>
                  </div>

                  {/* Error */}
                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      <p className="text-red-600 text-sm" data-testid="text-error">{error}</p>
                    </div>
                  )}

                  {/* Login button */}
                  <Button
                    type="submit"
                    disabled={loginMutation.isPending}
                    className="w-full font-semibold mt-1"
                    data-testid="button-login"
                  >
                    {loginMutation.isPending ? (
                      <><Loader2 className="ml-2 h-4 w-4 animate-spin" />{tc("جاري تسجيل الدخول...", "Signing in...")}</>
                    ) : tc("دخول", "Sign In")}
                  </Button>
                </form>

                {/* Divider */}
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-gray-100" />
                  <span className="text-xs text-gray-400">{tc("أو", "or")}</span>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>

                {/* Secondary actions */}
                <div className="space-y-2">
                  <Button type="button" variant="outline" onClick={() => { setError(""); setShowQRScanner(true); }} className="w-full border-gray-200 text-gray-700 text-sm" data-testid="button-scan-qr">
                    <QrCode className="w-4 h-4 ml-2 text-primary" />
                    {tc("مسح بطاقة الموظف", "Scan Employee Card")}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setLocation("/employee/general-checkin")} className="w-full border-gray-200 text-gray-700 text-sm" data-testid="button-general-checkin">
                    <QrCode className="w-4 h-4 ml-2 text-gray-400" />
                    {tc("صفحة التحضير العامة", "General Check-in Terminal")}
                  </Button>
                </div>

                {/* Activate + Install */}
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                  <p className="text-xs text-gray-400 text-center">{tc("موظف جديد؟", "New employee?")}</p>
                  <Button type="button" variant="ghost" onClick={() => setLocation("/employee/activate")} className="w-full text-primary hover:bg-primary/5 text-sm" data-testid="button-activate">
                    {tc("تفعيل حساب جديد", "Activate New Account")}
                  </Button>
                  <Button type="button" variant="ghost" onClick={async () => {
                    if (deferredPrompt) {
                      deferredPrompt.prompt();
                      const { outcome } = await deferredPrompt.userChoice;
                      if (outcome === 'accepted') setDeferredPrompt(null);
                    } else {
                      const ua = navigator.userAgent.toLowerCase();
                      if (/iphone|ipad|ipod/.test(ua)) {
                        alert(tc("لتثبيت النظام على iPhone: اضغط على زر 'مشاركة' ثم 'إضافة إلى الشاشة الرئيسية'", "To install on iPhone: tap 'Share' then 'Add to Home Screen'"));
                      } else {
                        alert(tc("لتثبيت النظام: اضغط على القائمة (⋮) ثم 'تثبيت التطبيق'", "To install: tap the menu (⋮) then 'Install App'"));
                      }
                    }
                  }} className="w-full text-gray-400 hover:text-gray-600 text-xs">
                    <Download className="ml-2 h-3.5 w-3.5" />
                    {tc("تحميل تطبيق الموظفين", "Download Staff App")}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Back + QIROX */}
          <div className="text-center mt-4 space-y-3">
            <button onClick={() => setLocation("/employee/gateway")} className="text-sm text-gray-400 hover:text-primary transition-colors" data-testid="link-back">
              {tc("← رجوع للبوابة الرئيسية", "← Back to Gateway")}
            </button>
            <div className="flex items-center justify-center gap-1.5">
              <img src={qiroxLogo} alt="QIROX STUDIO" className="w-4 h-4 object-contain opacity-40" />
              <span className="text-[10px] text-gray-400">
                {tc('بواسطة', 'by')} <strong className="text-gray-500">QIROX STUDIO</strong>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
