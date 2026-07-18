import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { preCacheOnLogin } from "@/lib/offline-cashier";
import { requestAndSubscribeEmployee } from "@/lib/push-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AtSign, Lock, Loader2, Eye, EyeOff, QrCode, Download, ArrowLeft } from "lucide-react";
import type { Employee } from "@shared/schema";
import { Html5QrcodeScanner } from "html5-qrcode";
import blackroseLogoStaff from "@assets/blackrose-staff-logo.png";
import qiroxLogo from "@assets/qirox-logo.png";
import qiroxLogoStaff from "@assets/qirox-logo-staff.png";
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

/* ─── Animated glowing orb ─── */
function GlowOrb({ x, y, size, color, delay }: { x: string; y: string; size: number; color: string; delay: number }) {
  return (
    <div
      className="absolute rounded-full opacity-20 blur-3xl animate-pulse"
      style={{
        left: x, top: y,
        width: size, height: size,
        background: color,
        animationDelay: `${delay}s`,
        animationDuration: `${3 + delay}s`,
      }}
    />
  );
}

/* ─── Typing animation hook ─── */
function useTypingEffect(texts: string[], speed = 80, pause = 2000) {
  const [display, setDisplay] = useState("");
  const [textIdx, setTextIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = texts[textIdx];
    let timer: ReturnType<typeof setTimeout>;

    if (!deleting && charIdx < current.length) {
      timer = setTimeout(() => setCharIdx(c => c + 1), speed);
    } else if (!deleting && charIdx === current.length) {
      timer = setTimeout(() => setDeleting(true), pause);
    } else if (deleting && charIdx > 0) {
      timer = setTimeout(() => setCharIdx(c => c - 1), speed / 2);
    } else if (deleting && charIdx === 0) {
      setDeleting(false);
      setTextIdx(i => (i + 1) % texts.length);
    }

    setDisplay(current.slice(0, charIdx));
    return () => clearTimeout(timer);
  }, [charIdx, deleting, textIdx, texts, speed, pause]);

  return display;
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

  const animatedText = useTypingEffect([
    "QIROX STUDIO",
    "كيروكس استديو",
    "نظام إدارة المطاعم",
    "Cafe Management System",
  ], 70, 1800);

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
    <div className="min-h-screen flex" dir="rtl">

      {/* ══════════════════════════════════════════════
          RIGHT PANEL — Brand / Animation (desktop/iPad)
      ══════════════════════════════════════════════ */}
      <div className="hidden lg:flex flex-col items-center justify-center relative w-[55%] overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0a0a14 0%, #130d2e 40%, #0d0d1a 100%)" }}>

        {/* Glowing background orbs */}
        <GlowOrb x="10%" y="15%" size={320} color="hsl(262 83% 58%)" delay={0} />
        <GlowOrb x="60%" y="60%" size={280} color="hsl(262 83% 38%)" delay={1.5} />
        <GlowOrb x="5%" y="65%" size={200} color="#3b1f6e" delay={0.8} />
        <GlowOrb x="70%" y="5%" size={180} color="hsl(262 83% 50%)" delay={2} />

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "40px 40px" }} />

        {/* Floating dots */}
        {[...Array(12)].map((_, i) => (
          <div key={i} className="absolute rounded-full bg-white/10 animate-pulse"
            style={{
              width: 4 + (i % 4) * 2,
              height: 4 + (i % 4) * 2,
              left: `${10 + (i * 73) % 80}%`,
              top: `${5 + (i * 53) % 90}%`,
              animationDelay: `${i * 0.4}s`,
              animationDuration: `${2 + (i % 3)}s`,
            }} />
        ))}

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center text-center px-12 select-none">

          {/* QIROX Logo */}
          <div className="mb-8 relative">
            <div className="w-24 h-24 rounded-2xl flex items-center justify-center relative"
              style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.3), rgba(109,40,217,0.2))", border: "1px solid rgba(139,92,246,0.4)" }}>
              <div className="absolute inset-0 rounded-2xl blur-xl opacity-40"
                style={{ background: "hsl(262 83% 58%)" }} />
              <img src={qiroxLogoStaff} alt="QIROX" className="w-14 h-14 object-contain relative z-10" />
            </div>
            {/* Ring glow */}
            <div className="absolute -inset-3 rounded-3xl opacity-20 blur-lg"
              style={{ background: "hsl(262 83% 58%)" }} />
          </div>

          {/* Animated brand text */}
          <div className="mb-3 h-12 flex items-center">
            <h1 className="text-3xl font-black tracking-widest text-white drop-shadow-lg">
              {animatedText}
              <span className="inline-block w-[2px] h-8 bg-purple-400 mr-1 align-middle animate-pulse" />
            </h1>
          </div>

          {/* Static subtitle */}
          <p className="text-purple-300/70 text-sm font-light tracking-wider mb-10 uppercase">
            Staff Portal · بوابة الموظفين
          </p>

          {/* Café brand section */}
          <div className="flex flex-col items-center gap-3">
            <div className="h-px w-32 bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
            <div className="flex items-center gap-3 px-6 py-3 rounded-xl"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <img src={blackroseLogoStaff} alt={brand.platformNameEn}
                className="w-8 h-8 object-contain rounded-lg opacity-90" />
              <div className="text-right">
                <p className="text-white/90 text-sm font-bold leading-none">{brand.platformNameAr}</p>
                <p className="text-white/40 text-[10px] mt-0.5">{brand.platformNameEn}</p>
              </div>
            </div>
            <div className="h-px w-32 bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
          </div>

          {/* Bottom tagline */}
          <p className="mt-10 text-white/25 text-xs tracking-widest uppercase">
            Powered by QIROX STUDIO
          </p>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          LEFT PANEL — Login Form
      ══════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col items-center justify-center bg-white px-6 py-10 lg:px-10 relative min-h-screen lg:min-h-0">

        {/* Mobile-only brand header */}
        <div className="lg:hidden flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "linear-gradient(135deg, hsl(262 83% 58%), hsl(262 83% 40%))" }}>
            <img src={qiroxLogoStaff} alt="QIROX" className="w-10 h-10 object-contain" />
          </div>
          <h1 className="text-lg font-black text-gray-900">QIROX STUDIO</h1>
          <p className="text-xs text-gray-400 mt-0.5">كيروكس استديو</p>
        </div>

        <div className="w-full max-w-md">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-black text-gray-900 mb-1">
              {tc("أهلاً بعودتك 👋", "Welcome Back 👋")}
            </h2>
            <p className="text-gray-500 text-sm">
              {tc("سجّل دخولك للوصول إلى لوحة التحكم", "Sign in to access the dashboard")}
            </p>
          </div>

          {showQRScanner ? (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-gray-900 text-center">
                {tc("مسح بطاقة الموظف", "Scan Employee Card")}
              </h3>
              <p className="text-sm text-gray-500 text-center">
                {tc("وجّه الكاميرا نحو QR الكود الموجود على بطاقتك", "Point the camera at the QR code on your card")}
              </p>
              <div id="qr-reader" className="w-full overflow-hidden rounded-xl border border-gray-200" />
              {error && <p className="text-red-500 text-sm text-center">{error}</p>}
              <Button type="button" variant="outline" onClick={() => { setError(""); setShowQRScanner(false); }} className="w-full">
                {tc("إلغاء", "Cancel")}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {tc("اسم المستخدم", "Username")}
                </label>
                <div className="relative">
                  <AtSign className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder={tc("اسم المستخدم أو الجوال أو الإيميل", "Username, Phone or Email")}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pr-9 border-gray-200 bg-gray-50 focus:bg-white h-11 text-sm"
                    data-testid="input-username"
                    autoFocus
                    autoComplete="username email tel"
                    disabled={loginMutation.isPending}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-gray-700">
                    {tc("كلمة المرور", "Password")}
                  </label>
                  <button
                    type="button"
                    onClick={() => setLocation("/employee/forgot-password")}
                    className="text-xs text-purple-600 hover:underline"
                    data-testid="link-forgot-password"
                  >
                    {tc("نسيت كلمة المرور؟", "Forgot password?")}
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-9 pl-9 border-gray-200 bg-gray-50 focus:bg-white h-11 text-sm"
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
              </div>

              {/* Remember me */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 accent-purple-600"
                />
                <span className="text-sm text-gray-600">{tc("تذكرني", "Remember me")}</span>
              </label>

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <p className="text-red-600 text-sm" data-testid="text-error">{error}</p>
                </div>
              )}

              {/* Login button */}
              <Button
                type="submit"
                disabled={loginMutation.isPending}
                className="w-full h-11 font-bold text-sm rounded-xl"
                style={{ background: "linear-gradient(135deg, hsl(262 83% 58%), hsl(262 83% 45%))" }}
                data-testid="button-login"
              >
                {loginMutation.isPending ? (
                  <><Loader2 className="ml-2 h-4 w-4 animate-spin" />{tc("جارٍ تسجيل الدخول...", "Signing in...")}</>
                ) : tc("دخول", "Sign In")}
              </Button>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-xs text-gray-400">{tc("أو", "or")}</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>

              {/* Secondary actions */}
              <div className="space-y-2">
                <Button type="button" variant="outline" onClick={() => { setError(""); setShowQRScanner(true); }}
                  className="w-full border-gray-200 text-gray-700 text-sm h-10 rounded-xl" data-testid="button-scan-qr">
                  <QrCode className="w-4 h-4 ml-2 text-purple-600" />
                  {tc("مسح بطاقة الموظف", "Scan Employee Card")}
                </Button>
                <Button type="button" variant="outline"
                  onClick={() => setLocation("/employee/general-checkin")}
                  className="w-full border-gray-200 text-gray-700 text-sm h-10 rounded-xl" data-testid="button-general-checkin">
                  <QrCode className="w-4 h-4 ml-2 text-gray-400" />
                  {tc("صفحة التحضير العامة", "General Check-in Terminal")}
                </Button>
              </div>

              {/* New employee */}
              <div className="pt-2 border-t border-gray-100 space-y-1">
                <p className="text-xs text-gray-400 text-center mb-2">{tc("موظف جديد؟", "New employee?")}</p>
                <Button type="button" variant="ghost"
                  onClick={() => setLocation("/employee/activate")}
                  className="w-full text-purple-600 hover:bg-purple-50 text-sm h-9 rounded-xl" data-testid="button-activate">
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
                }} className="w-full text-gray-400 hover:text-gray-600 text-xs h-8 rounded-xl">
                  <Download className="ml-2 h-3.5 w-3.5" />
                  {tc("تحميل تطبيق الموظفين", "Download Staff App")}
                </Button>
              </div>
            </form>
          )}

          {/* Back */}
          <div className="mt-6 text-center space-y-3">
            <button onClick={() => setLocation("/employee/gateway")}
              className="flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-purple-600 transition-colors mx-auto"
              data-testid="link-back">
              <ArrowLeft className="w-3.5 h-3.5" />
              {tc("رجوع للبوابة الرئيسية", "Back to Gateway")}
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
