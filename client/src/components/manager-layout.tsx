import { ReactNode, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Menu, Bell, Search, ChevronDown, X } from "lucide-react";
import { ManagerSidebar, MobileBottomNav } from "./manager-sidebar";
import { ManagerNotificationCenter } from "./manager-notification-center";
import { LanguageToggle } from "./language-toggle";
import { brand } from "@/lib/brand";
import { useTranslation } from "react-i18next";
import qiroxLogo from "@assets/qirox-logo.png";

interface ManagerLayoutProps {
  children: ReactNode;
}

export function ManagerLayout({ children }: ManagerLayoutProps) {
  const [, navigate] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showBar, setShowBar] = useState(true);
  const { i18n } = useTranslation();
  const isAr = i18n.language !== 'en';

  const { data: session } = useQuery<any>({
    queryKey: ["/api/verify-session"],
  });

  const manager = session?.employee || session?.manager || null;
  const role = manager?.role || "manager";

  const handleLogout = async () => {
    await fetch("/api/employees/logout", { method: "POST" });
    localStorage.removeItem("qirox-restore-key");
    navigate("/manager/login");
  };

  return (
    <div className="flex h-screen bg-[#f8f9fa] overflow-hidden" dir="rtl">
      <ManagerSidebar
        manager={manager}
        onLogout={handleLogout}
        role={role}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <main className="flex-1 overflow-auto pb-16 lg:pb-0 relative min-w-0 flex flex-col">

        {/* ── Purple Announcement Bar (Foodics-style) ── */}
        {showBar && (
          <div
            className="flex items-center justify-between gap-3 px-4 py-2 text-white text-xs shrink-0"
            style={{ background: 'hsl(var(--primary))' }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-base leading-none opacity-90">✦</span>
              <span className="truncate">
                {isAr
                  ? `${brand.nameAr} — تابع أداء فريقك وعملياتك اليومية في الوقت الفعلي.`
                  : `${brand.nameEn} — Track your team performance and daily operations in real time.`}
              </span>
              <button className="font-semibold underline opacity-90 hover:opacity-100 shrink-0 whitespace-nowrap">
                {isAr ? 'استكشف الآن' : 'Explore now'}
              </button>
            </div>
            <button
              onClick={() => setShowBar(false)}
              className="p-0.5 rounded hover:bg-white/20 shrink-0"
              aria-label="إغلاق"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ── Top Header (Foodics-style) ── */}
        <div className="sticky top-0 z-30 flex items-center gap-2 px-4 py-2 bg-white border-b border-gray-200 shrink-0">

          {/* RIGHT (RTL start): mobile menu + branch/user selector */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="فتح القائمة"
            >
              <Menu className="w-5 h-5 text-gray-600" />
            </button>

            {manager && (
              <div className="hidden sm:flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5 cursor-pointer hover:bg-gray-50 transition-colors bg-white">
                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                  <span className="text-white text-[9px] font-bold leading-none">
                    {(manager.fullName || 'M')[0].toUpperCase()}
                  </span>
                </div>
                <span className="text-sm text-gray-700 font-medium max-w-[120px] truncate">
                  {manager.fullName || (isAr ? 'مدير' : 'Manager')}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              </div>
            )}
          </div>

          {/* CENTER: search */}
          <div className="flex-1 flex items-center justify-center">
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 w-full max-w-xs">
              <Search className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                type="text"
                placeholder={isAr ? 'بحث...' : 'Search...'}
                className="bg-transparent text-sm text-gray-600 placeholder-gray-400 outline-none w-full min-w-0"
              />
            </div>
          </div>

          {/* LEFT (RTL end): notifications + language */}
          <div className="flex items-center gap-1 shrink-0">
            <ManagerNotificationCenter />
            <LanguageToggle variant="outline" />
          </div>
        </div>

        {/* ── Page Content ── */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>

        {/* ── Footer ── */}
        <div className="hidden lg:flex items-center justify-center gap-2 py-1.5 px-4 border-t border-gray-200 bg-white shrink-0">
          <img src={qiroxLogo} alt="QIROX STUDIO" className="w-3.5 h-3.5 object-contain opacity-50" />
          <span className="text-[10px] text-gray-400">
            {isAr ? 'مُطوَّر بواسطة' : 'Powered by'}{' '}
            <strong className="text-gray-500">QIROX STUDIO</strong>
          </span>
        </div>
      </main>

      <MobileBottomNav manager={manager} />
    </div>
  );
}
