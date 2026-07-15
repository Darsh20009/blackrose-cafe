import { ReactNode, useState } from 'react';
import { AdminSidebar } from './admin-sidebar';
import { LanguageToggle } from './language-toggle';
import { Menu, Search, Bell, ChevronDown, X, User, LayoutGrid } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { brand } from '@/lib/brand';
import { useLocation } from 'wouter';

interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
}

export function AdminLayout({ children, title }: AdminLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showBar, setShowBar] = useState(true);
  const { i18n } = useTranslation();
  const isAr = i18n.language !== 'en';
  const [, navigate] = useLocation();

  const { data: session } = useQuery<any>({ queryKey: ['/api/verify-session'] });
  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ['/api/notifications/unread-count'],
    refetchInterval: 30_000,
    retry: false,
  });
  const unreadCount = unreadData?.count ?? 0;
  const managerName: string = session?.employee?.fullName || session?.manager?.fullName || '';

  return (
    <div className="flex h-screen bg-[#f8f9fa] overflow-hidden" dir="rtl">
      <AdminSidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <main className="flex-1 overflow-auto relative min-w-0 flex flex-col">

        {/* ── Announcement Bar (Foodics-style purple banner) ── */}
        {showBar && (
          <div
            className="flex items-center justify-between gap-3 px-4 py-2 text-white text-xs shrink-0"
            style={{ background: 'linear-gradient(90deg, #5b2de0, hsl(var(--primary)), #4f46e5)' }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm leading-none">✦</span>
              <span className="truncate">
                {isAr
                  ? `ذكاء الأعمال لديك جاهز الآن — اكتشف مؤشرات قوية وتابع أداءك في الوقت الفعلي.`
                  : `Business intelligence is ready — discover powerful insights and track your performance in real time.`}
              </span>
              <button className="font-semibold underline opacity-90 hover:opacity-100 shrink-0 whitespace-nowrap">
                {isAr ? 'اضغط هنا للبدء' : 'Get started'}
              </button>
            </div>
            <button
              onClick={() => setShowBar(false)}
              className="p-0.5 rounded hover:bg-white/20 shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ── Top Bar (Foodics-style) ── */}
        <div className="sticky top-0 z-30 flex items-center gap-3 px-4 py-2 bg-white border-b border-gray-200 shrink-0">

          {/* RIGHT (RTL start): mobile menu button + café name/branch selector */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Menu className="w-5 h-5 text-gray-600" />
            </button>

            {/* Café name + branch selector pill (matches Foodics right-side dropdown) */}
            <div className="hidden sm:flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5 cursor-pointer hover:bg-gray-50 transition-colors bg-white select-none">
              <span className="text-sm text-gray-700 font-medium max-w-[160px] truncate">
                {isAr ? brand.nameAr : brand.nameEn}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            </div>
          </div>

          {/* CENTER: search bar */}
          <div className="flex-1 flex items-center justify-center">
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 w-full max-w-sm">
              <Search className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                type="text"
                placeholder={isAr ? 'اختر الفئة...' : 'Search...'}
                className="bg-transparent text-sm text-gray-600 placeholder-gray-400 outline-none w-full min-w-0"
              />
            </div>
          </div>

          {/* LEFT (RTL end): person + grid + bell — exactly like Foodics */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Person / avatar */}
            <button
              onClick={() => navigate('/admin/settings')}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              title={managerName || (isAr ? 'الحساب' : 'Account')}
            >
              {managerName ? (
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-white text-[10px] font-bold leading-none">
                    {managerName[0].toUpperCase()}
                  </span>
                </div>
              ) : (
                <User className="w-5 h-5 text-gray-500" />
              )}
            </button>

            {/* Grid / apps */}
            <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <LayoutGrid className="w-5 h-5 text-gray-500" />
            </button>

            {/* Bell */}
            <button
              onClick={() => navigate('/admin/notifications')}
              className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Bell className="w-5 h-5 text-gray-500" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
              )}
            </button>
          </div>
        </div>

        {/* ── Page Content ── */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
