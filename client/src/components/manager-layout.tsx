import { ReactNode, useState } from "react";
import { logoutEmployeePortal } from "@/lib/portal-logout";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Menu, User } from "lucide-react";
import { ManagerSidebar, MobileBottomNav } from "./manager-sidebar";
import { ManagerNotificationCenter } from "./manager-notification-center";
import { brand } from "@/lib/brand";
import { useTranslation } from "react-i18next";
import { StaffShortcuts } from "./staff-shortcuts";
import { SubscriptionCountdown } from "./subscription-countdown";

interface ManagerLayoutProps {
  children: ReactNode;
}

const managerPageTitles: Record<string, [string, string]> = {
  "/manager/dashboard": ["لوحة المدير", "Manager dashboard"],
  "/manager/orders": ["الطلبات", "Orders"],
  "/manager/employees": ["الموظفون", "Employees"],
  "/manager/employees/hub": ["إدارة الموظفين", "Staff management"],
  "/manager/attendance": ["الحضور والانصراف", "Attendance"],
  "/manager/accounting": ["المحاسبة", "Accounting"],
  "/manager/coupons": ["أكواد الخصم", "Discount codes"],
  "/manager/loyalty": ["برنامج الولاء", "Loyalty program"],
  "/manager/promotions": ["العروض", "Promotions"],
  "/manager/delivery": ["التوصيل", "Delivery"],
  "/manager/profile": ["حسابي", "My account"],
  "/manager/unified-reports": ["التقارير", "Reports"],
};

export function ManagerLayout({ children }: ManagerLayoutProps) {
  const [location, navigate] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { i18n } = useTranslation();
  const isAr = i18n.language !== 'en';

  const { data: session } = useQuery<any>({
    queryKey: ["/api/verify-session"],
  });

  const manager = session?.employee || session?.manager || null;
  const role = manager?.role || "manager";
  const managerName: string = manager?.fullName || '';

  const handleLogout = async () => {
    await logoutEmployeePortal("/manager");
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

        {/* ── Top Bar ── */}
        <div className="sticky top-0 z-30 flex items-center gap-3 px-4 py-2 bg-white border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Menu className="w-5 h-5 text-gray-600" />
            </button>
            {manager && (
              <div className="hidden sm:flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5 bg-white select-none">
                <span className="text-sm text-gray-700 font-medium max-w-[160px] truncate">
                  {isAr ? brand.nameAr : brand.nameEn}
                </span>
              </div>
            )}
          </div>

          <div className="flex-1 text-center text-sm font-semibold text-gray-700">
            <div>{managerPageTitles[location]?.[isAr ? 0 : 1] || (isAr ? 'لوحة المدير' : 'Manager workspace')}</div>
            <SubscriptionCountdown />
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => navigate("/manager/profile")}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label={isAr ? "حسابي" : "My account"}
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

            <StaffShortcuts scope="manager" />

            <ManagerNotificationCenter />
          </div>
        </div>

        {/* ── Page Content ── */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>

      <MobileBottomNav manager={manager} />
    </div>
  );
}
