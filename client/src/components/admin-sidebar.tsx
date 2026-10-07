import { useEffect, useState } from 'react';
import { logoutEmployeePortal } from '@/lib/portal-logout';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard, Users, FileText, Settings, LogOut, Bell,
  GitBranch, Mail, Coffee, Star, ClipboardList, CreditCard,
  ChevronDown, X, Package, BarChart3, ShoppingCart,
  Palette, Printer, Code2, Gift, HelpCircle, Store, Megaphone,
  BookOpen, Warehouse, UserCheck, Shield, Ticket
} from 'lucide-react';
import { brand } from "@/lib/brand";
import blackroseLogoStaff from "@assets/blackrose-staff-logo.png";

interface AdminSidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  role?: string;
}

// ── Direct (top-level) nav items — like Foodics: الملخص, الطلبات, العملاء ──
const TOP_ITEMS = (isAr: boolean) => [
  { label: isAr ? 'الملخص' : 'Overview', icon: LayoutDashboard, path: '/admin/dashboard' },
  { label: isAr ? 'الطلبات' : 'Orders', icon: ShoppingCart, path: '/manager/orders' },
  { label: isAr ? 'الموظفون' : 'Employees', icon: Users, path: '/admin/employees' },
  { label: isAr ? 'الإعدادات' : 'Settings', icon: Settings, path: '/admin/settings', roles: ['admin', 'owner'] },
];

// ── Collapsible groups — like Foodics: التقارير, المخزون, قائمة المنتجات, إدارة, التسويق ──
const NAV_GROUPS = (isAr: boolean, unreadCount: number) => [
  {
    key: 'reports',
    label: isAr ? 'التقارير' : 'Reports',
    icon: BarChart3,
    items: [
      { label: isAr ? 'تقارير المبيعات' : 'Sales Reports', icon: FileText, path: '/admin/reports' },
      { label: isAr ? 'سجل الدفعات' : 'Payment Logs', icon: CreditCard, path: '/admin/payment-logs' },
    ],
  },
  {
    key: 'inventory',
    label: isAr ? 'المخزون' : 'Inventory',
    icon: Warehouse,
    items: [
      { label: isAr ? 'نظرة المخزون' : 'Inventory', icon: Warehouse, path: '/manager/inventory' },
      { label: isAr ? 'المواد الخام' : 'Raw Items', icon: Package, path: '/manager/inventory/raw-items' },
      { label: isAr ? 'المشتريات' : 'Purchases', icon: ClipboardList, path: '/manager/inventory/purchases' },
    ],
  },
  {
    key: 'menu',
    label: isAr ? 'قائمة المنتجات' : 'Products',
    icon: Coffee,
    items: [
      { label: isAr ? 'إدارة القائمة' : 'Menu Management', icon: Coffee, path: '/employee/menu-management' },
      { label: isAr ? 'حجوزات الطاولات' : 'Table Reservations', icon: BookOpen, path: '/manager/reservations' },
      { label: isAr ? 'حجوزات المنتجات' : 'Product Reservations', icon: Star, path: '/manager/product-reservations' },
    ],
  },
  {
    key: 'management',
    label: isAr ? 'إدارة' : 'Management',
    icon: Settings,
    items: [
      { label: isAr ? 'أكواد الخصم' : 'Discount codes', icon: Ticket, path: '/admin/coupons' },
      { label: isAr ? 'الفروع' : 'Branches', icon: GitBranch, path: '/admin/branches' },
      { label: isAr ? 'الإشعارات' : 'Notifications', icon: Bell, path: '/admin/notifications', badge: unreadCount > 0 ? unreadCount : undefined },
      { label: isAr ? 'الهوية' : 'Branding', icon: Palette, path: '/admin/branding', roles: ['admin', 'owner'] },
      { label: isAr ? 'الطباعة' : 'Printing', icon: Printer, path: '/admin/printing' },
      { label: isAr ? 'مفاتيح API' : 'API keys', icon: Code2, path: '/admin/api' },
    ],
  },
  {
    key: 'marketing',
    label: isAr ? 'التسويق' : 'Marketing',
    icon: Megaphone,
    items: [
      { label: isAr ? 'التسويق البريدي' : 'Email Marketing', icon: Mail, path: '/admin/email' },
    ],
  },
];

// ── Shared: one nav item button ──
function NavItemButton({
  label, icon: Icon, path, active, onClick, badge, indent = false
}: {
  label: string; icon: any; path: string; active: boolean;
  onClick: () => void; badge?: number; indent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      data-testid={`sidebar-link-${path.split('/').pop()}`}
      className={`relative w-full flex items-center gap-3 py-2 text-sm transition-all ${
        indent ? 'pr-10 pl-4' : 'px-4'
      } ${
        active
          ? 'bg-gray-100 text-primary font-semibold'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      {/* Active indicator — left edge (facing content, since sidebar is on right in RTL) */}
      {active && <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-primary rounded-r-full" />}
      <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-primary' : 'text-gray-400'}`} />
      <span className="flex-1 text-right">{label}</span>
      {badge ? (
        <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
          {badge > 99 ? '99+' : badge}
        </span>
      ) : null}
    </button>
  );
}

export function AdminSidebar({ mobileOpen = false, onMobileClose, role = "manager" }: AdminSidebarProps) {
  const [location, navigate] = useLocation();
  const { i18n } = useTranslation();
  const isAr = i18n.language !== 'en';

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ['/api/notifications/unread-count'],
    refetchInterval: 30_000,
    retry: false,
  });
  const unreadCount = unreadData?.count ?? 0;

  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    reports: true,
    inventory: false,
    menu: false,
    management: false,
    marketing: false,
  });

  const toggleGroup = (key: string) =>
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  const handleNavigate = (path: string) => {
    navigate(path);
    onMobileClose?.();
  };

  const handleLogout = async () => {
    await logoutEmployeePortal('/employee/login');
  };

  const topItems = TOP_ITEMS(isAr).filter(item => !item.roles || item.roles.includes(role));
  const groups = NAV_GROUPS(isAr, unreadCount);

  useEffect(() => {
    const activeGroup = groups.find(group =>
      group.items.some(item => location === item.path || location.startsWith(item.path + '/'))
    );
    if (activeGroup) {
      setExpanded(prev => prev[activeGroup.key] ? prev : { ...prev, [activeGroup.key]: true });
    }
  }, [location]);

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white" dir="rtl">

      {/* ── Logo / Brand (Foodics-style: clean brand name at top) ── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <img
            src={blackroseLogoStaff}
            alt={brand.nameEn}
            className="w-8 h-8 object-contain rounded-lg"
          />
          <span className="text-base font-black tracking-wide text-gray-900 leading-none">
            {isAr ? brand.shortNameAr : brand.shortNameEn}
          </span>
        </div>
        <button
          onClick={onMobileClose}
          className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto py-2">

        {/* Direct top-level items (الملخص, الطلبات, العملاء) */}
        <div className="mb-2">
          {topItems.map(item => (
            <NavItemButton
              key={item.path}
              label={item.label}
              icon={item.icon}
              path={item.path}
              active={location === item.path || location.startsWith(item.path + '/')}
              onClick={() => handleNavigate(item.path)}
            />
          ))}
        </div>

        {/* Divider */}
        <div className="mx-4 my-1 border-t border-gray-100" />

        {/* Collapsible groups */}
        {groups.map(group => {
          const isGroupExpanded = expanded[group.key];
          const GroupIcon = group.icon;
          const visibleItems = group.items.filter(item => !item.roles || item.roles.includes(role));
          if (visibleItems.length === 0) return null;
          const hasActiveChild = visibleItems.some(
            item => location === item.path || location.startsWith(item.path + '/')
          );

          return (
            <div key={group.key}>
              {/* Group header */}
              <button
                onClick={() => toggleGroup(group.key)}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium transition-colors ${
                  hasActiveChild && !isGroupExpanded
                    ? 'text-primary bg-primary/5'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <GroupIcon
                    className={`w-4 h-4 shrink-0 ${
                      hasActiveChild && !isGroupExpanded ? 'text-primary' : 'text-gray-500'
                    }`}
                  />
                  <span>{group.label}</span>
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${
                    isGroupExpanded ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Sub-items */}
              {isGroupExpanded && (
                <div>
                {visibleItems.map(item => (
                    <NavItemButton
                      key={item.path}
                      label={item.label}
                      icon={item.icon}
                      path={item.path}
                      active={location === item.path}
                      onClick={() => handleNavigate(item.path)}
                      badge={item.badge}
                      indent
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}

      </nav>

      {/* ── Footer: رشح واكسب + مركز المساعدة + logout ── */}
      <div className="border-t border-gray-100">
        <button
          onClick={() => handleNavigate('/manager/loyalty')}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <Gift className="w-4 h-4 text-gray-400" />
          <span className="flex-1 text-right">{isAr ? 'رشح واكسب' : 'Refer & Earn'}</span>
        </button>
        <button
          onClick={() => handleNavigate('/help')}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <HelpCircle className="w-4 h-4 text-gray-400" />
          <span className="flex-1 text-right">{isAr ? 'مركز المساعدة' : 'Help Center'}</span>
        </button>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          data-testid="button-logout"
        >
          <LogOut className="w-4 h-4" />
          <span className="flex-1 text-right">{isAr ? 'تسجيل الخروج' : 'Logout'}</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex w-56 bg-white border-l border-gray-200 flex-col h-screen sticky top-0 shrink-0">
        <SidebarContent />
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={onMobileClose}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="absolute right-0 top-0 bottom-0 w-60 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <SidebarContent />
          </div>
        </div>
      )}
    </>
  );
}
