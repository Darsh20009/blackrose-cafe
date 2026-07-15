import { ReactNode, useState } from 'react';
import { AdminSidebar } from './admin-sidebar';
import { LanguageToggle } from './language-toggle';
import { Menu, Search, Bell, ChevronDown, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { brand } from '@/lib/brand';
import qiroxLogo from "@assets/qirox-logo.png";

interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
}

export function AdminLayout({ children, title }: AdminLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showBar, setShowBar] = useState(true);
  const { i18n } = useTranslation();
  const isAr = i18n.language !== 'en';

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ['/api/notifications/unread-count'],
    refetchInterval: 30_000,
    retry: false,
  });
  const unreadCount = unreadData?.count ?? 0;

  return (
    <div className="flex h-screen bg-[#f8f9fa] overflow-hidden" dir="rtl">
      <AdminSidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <main className="flex-1 overflow-auto relative min-w-0 flex flex-col">

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
                  ? `${brand.platformNameAr} — نظام إدارة متكامل، تابع أداءك وتحليلاتك في الوقت الفعلي.`
                  : `${brand.platformNameEn} — Complete management system, track your performance in real time.`}
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

          {/* RIGHT (RTL start): mobile menu + cafe/branch selector */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="فتح القائمة"
            >
              <Menu className="w-5 h-5 text-gray-600" />
            </button>

            {/* Cafe name pill */}
            <div className="hidden sm:flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5 cursor-pointer hover:bg-gray-50 transition-colors bg-white">
              <div className="w-4 h-4 rounded bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-primary text-[8px] font-black leading-none">
                  {(isAr ? brand.shortNameAr : brand.shortNameEn)?.[0] ?? ''}
                </span>
              </div>
              <span className="text-sm text-gray-700 font-medium max-w-[140px] truncate">
                {isAr ? brand.nameAr : brand.nameEn}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            </div>
          </div>

          {/* CENTER: search bar */}
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

          {/* LEFT (RTL end): bell + language */}
          <div className="flex items-center gap-1 shrink-0">
            <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <Bell className="w-5 h-5 text-gray-500" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
              )}
            </button>
            <LanguageToggle variant="outline" />
          </div>
        </div>

        {/* ── Page Content ── */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-center gap-2 py-1.5 px-4 border-t border-gray-200 bg-white shrink-0">
          <img src={qiroxLogo} alt="QIROX STUDIO" className="w-3.5 h-3.5 object-contain opacity-50" />
          <span className="text-[10px] text-gray-400">
            {isAr ? 'مُطوَّر بواسطة' : 'Powered by'}{' '}
            <span className="font-semibold text-gray-500">QIROX STUDIO</span>
          </span>
        </div>
      </main>
    </div>
  );
}
