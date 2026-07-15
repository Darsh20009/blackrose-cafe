import { useState } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { CheckCircle2, ChevronRight, ChevronLeft, Palette, LayoutDashboard, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { brand } from "@/lib/brand";
import blackroseLogo from "@assets/blackrose-logo.png";

// ── Step definitions ─────────────────────────────────────────────────────────
type WizardStep = "welcome" | "dashboard" | "branding" | "done";

const STEPS: WizardStep[] = ["welcome", "dashboard", "branding", "done"];

export default function AdminSetupWizard() {
  const [, navigate] = useLocation();
  const { i18n } = useTranslation();
  const isAr = i18n.language !== "en";

  const [step, setStep] = useState<WizardStep>("welcome");
  const [dashStyle, setDashStyle] = useState<"detailed" | "simple">("detailed");
  const [brandName, setBrandName] = useState(brand.nameAr);

  const tc = (ar: string, en: string) => (isAr ? ar : en);
  const stepIndex = STEPS.indexOf(step);

  // Save wizard choice and go to dashboard
  const finish = () => {
    localStorage.setItem("admin_setup_done", "1");
    localStorage.setItem("admin_dash_style", dashStyle);
    if (brandName.trim()) {
      const current = JSON.parse(localStorage.getItem("cafe-branding") || "{}");
      localStorage.setItem("cafe-branding", JSON.stringify({ ...current, nameAr: brandName, nameEn: brandName }));
    }
    navigate("/admin/dashboard");
  };

  const next = () => {
    const idx = STEPS.indexOf(step);
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1]);
    else finish();
  };
  const back = () => {
    const idx = STEPS.indexOf(step);
    if (idx > 0) setStep(STEPS[idx - 1]);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-3xl">

        {/* Header */}
        <div className="text-center mb-8">
          <img src={blackroseLogo} alt="Logo" className="h-14 mx-auto mb-4 object-contain" />
          <h1 className="text-2xl font-black text-gray-900">{tc("مرحباً بك في لوحة الإدارة", "Welcome to Admin Dashboard")}</h1>
          <p className="text-gray-500 mt-1 text-sm">{tc("أكمل الإعداد السريع لبدء العمل", "Complete quick setup to get started")}</p>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all
                ${i < stepIndex ? 'bg-primary text-white' : i === stepIndex ? 'bg-primary text-white ring-4 ring-primary/20' : 'bg-gray-200 text-gray-500'}`}>
                {i < stepIndex ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-1 w-12 rounded-full transition-all ${i < stepIndex ? 'bg-primary' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">

          {/* ── STEP: Welcome ──────────────────────────────────────────────── */}
          {step === "welcome" && (
            <div className="text-center">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-xl font-black mb-3">{tc("إعداد النظام", "System Setup")}</h2>
              <p className="text-gray-500 text-sm max-w-md mx-auto leading-relaxed">
                {tc(
                  "سنساعدك في ضبط الإعدادات الأساسية. يمكنك تغيير أي شيء لاحقاً من لوحة الإدارة.",
                  "We'll help you configure the basics. You can change anything later from the admin panel."
                )}
              </p>
            </div>
          )}

          {/* ── STEP: Dashboard Style ───────────────────────────────────────── */}
          {step === "dashboard" && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                  <LayoutDashboard className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-black text-lg">{tc("اختر شكل لوحة التحكم", "Choose Dashboard Style")}</h2>
                  <p className="text-sm text-gray-500">{tc("يمكن تغييره لاحقاً من الإعدادات", "Can be changed later in settings")}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Detailed dashboard */}
                <button
                  onClick={() => setDashStyle("detailed")}
                  className={`relative border-2 rounded-xl overflow-hidden transition-all text-right
                    ${dashStyle === "detailed" ? "border-primary shadow-lg shadow-primary/10" : "border-gray-200 hover:border-gray-300"}`}
                >
                  {dashStyle === "detailed" && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center z-10">
                      <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                  {/* Preview via iframe */}
                  <div className="h-44 bg-gray-50 overflow-hidden pointer-events-none">
                    <iframe
                      src="/admin/dashboard?preview=1"
                      className="w-full h-full scale-50 origin-top-left"
                      style={{ width: "200%", height: "200%", transform: "scale(0.5)", transformOrigin: "top right" }}
                      tabIndex={-1}
                      title="detailed preview"
                    />
                  </div>
                  <div className="p-4">
                    <p className="font-black text-sm">{tc("لوحة تفصيلية", "Detailed Dashboard")}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{tc("إحصاءات شاملة وتحليلات متقدمة", "Full analytics & advanced stats")}</p>
                  </div>
                </button>

                {/* Simple dashboard */}
                <button
                  onClick={() => setDashStyle("simple")}
                  className={`relative border-2 rounded-xl overflow-hidden transition-all text-right
                    ${dashStyle === "simple" ? "border-primary shadow-lg shadow-primary/10" : "border-gray-200 hover:border-gray-300"}`}
                >
                  {dashStyle === "simple" && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center z-10">
                      <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                  {/* Simple preview mockup */}
                  <div className="h-44 bg-gray-50 flex items-center justify-center">
                    <div className="grid grid-cols-2 gap-3 p-4 w-full">
                      {["المبيعات", "الطلبات", "الموظفون", "المخزون"].map(label => (
                        <div key={label} className="bg-white rounded-lg p-3 shadow-sm border text-center">
                          <div className="h-2 bg-primary/20 rounded mb-2" />
                          <div className="text-xs text-gray-400 font-bold">{label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="font-black text-sm">{tc("لوحة بسيطة", "Simple Dashboard")}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{tc("أرقام سريعة وواضحة فقط", "Quick clean numbers only")}</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* ── STEP: Branding ──────────────────────────────────────────────── */}
          {step === "branding" && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Palette className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-black text-lg">{tc("اسم المنشأة", "Business Name")}</h2>
                  <p className="text-sm text-gray-500">{tc("يظهر في الإيصالات وصفحة العملاء", "Shown on receipts and customer pages")}</p>
                </div>
              </div>

              <div className="space-y-4 max-w-sm">
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">{tc("الاسم", "Name")}</label>
                  <Input
                    value={brandName}
                    onChange={e => setBrandName(e.target.value)}
                    placeholder={tc("اسم المقهى أو المطعم", "Café or restaurant name")}
                    className="h-11"
                  />
                </div>
                <p className="text-xs text-gray-400">
                  {tc("يمكنك تحميل الشعار وتغيير الألوان من صفحة إعدادات العلامة التجارية", "You can upload a logo and change colors from the Branding settings page")}
                </p>
              </div>
            </div>
          )}

          {/* ── STEP: Done ─────────────────────────────────────────────────── */}
          {step === "done" && (
            <div className="text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-xl font-black mb-3">{tc("كل شيء جاهز! 🎉", "All set! 🎉")}</h2>
              <p className="text-gray-500 text-sm max-w-md mx-auto leading-relaxed">
                {tc(
                  "تم حفظ الإعدادات. يمكنك الآن استخدام لوحة الإدارة بالكامل.",
                  "Settings saved. You can now use the full admin dashboard."
                )}
              </p>
            </div>
          )}
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between mt-6">
          <Button
            variant="ghost"
            onClick={step === "welcome" ? () => { localStorage.setItem("admin_setup_done","1"); navigate("/admin/dashboard"); } : back}
            className="gap-2 text-gray-500"
          >
            {step === "welcome" ? tc("تخطي الإعداد", "Skip setup") : (<><ChevronRight className="w-4 h-4" />{tc("رجوع", "Back")}</>)}
          </Button>

          <Button onClick={step === "done" ? finish : next} className="gap-2 min-w-[140px]">
            {step === "done" ? tc("ابدأ الآن", "Get Started") : (<>{tc("التالي", "Next")}<ChevronLeft className="w-4 h-4" /></>)}
          </Button>
        </div>

      </div>
    </div>
  );
}
