import { ReactNode, useState } from 'react';
import { AdminSidebar } from './admin-sidebar';
import { Menu, Bell, User } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { brand } from '@/lib/brand';
import { useLocation } from 'wouter';
import { StaffShortcuts } from './staff-shortcuts';

interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
}

const adminPageTitles: Record<string, [string, string]> = {
  "/admin/dashboard": ["لوحة الإدارة", "Admin dashboard"],
  "/admin/employees": ["الموظفون", "Employees"],
  "/admin/reports": ["التقارير", "Reports"],
  "/admin/settings": ["إعدادات المتجر", "Store settings"],
  "/admin/coupons": ["أكواد الخصم", "Discount codes"],
  "/admin/branches": ["الفروع", "Branches"],
  "/admin/profile": ["حسابي", "My account"],
  "/admin/payment-logs": ["سجل المدفوعات", "Payment log"],
  "/admin/notifications": ["الإشعارات", "Notifications"],
  "/admin/api": ["مفاتيح API", "API keys"],
};

export function AdminLayout({ children, title }: AdminLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { i18n } = useTranslation();
  const isAr = i18n.language !== 'en';
  const [location, navigate] = useLocation();

  const { data: session } = useQuery<any>({ queryKey: ['/api/verify-session'] });
  const staffRole = session?.employee?.role || session?.manager?.role || "manager";
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
        role={staffRole}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <main className="flex-1 overflow-auto relative min-w-0 flex flex-col">

        {/* ── Top Bar ── */}
        <div className="sticky top-0 z-30 flex items-center gap-3 px-4 py-2 bg-white border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Menu className="w-5 h-5 text-gray-600" />
            </button>
            <div className="hidden sm:flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5 bg-white select-none">
              <span className="text-sm text-gray-700 font-medium max-w-[160px] truncate">
                {isAr ? brand.nameAr : brand.nameEn}
              </span>
            </div>
          </div>

          <div className="flex-1 text-center text-sm font-semibold text-gray-700">
            {title || adminPageTitles[location]?.[isAr ? 0 : 1] || (isAr ? 'لوحة الإدارة' : 'Admin workspace')}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => navigate(["admin", "owner"].includes(staffRole) ? "/admin/profile" : "/manager/profile")}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label={isAr ? 'حسابي' : 'My account'}
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

            <StaffShortcuts scope="admin" role={staffRole} />

            <button
              onClick={() => navigate('/admin/notifications')}
              className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label={isAr ? 'الإشعارات' : 'Notifications'}
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
