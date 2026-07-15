import { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard, Users, FileText, Settings, LogOut, Bell, Code2,
  GitBranch, Mail, Coffee, BookOpen, Star, ClipboardList, CreditCard,
  ChevronDown, ChevronLeft, X, Package, BarChart3, ShoppingCart,
  UserCheck, Palette, Printer, Zap, Shield
} from 'lucide-react';
import { brand } from "@/lib/brand";
import qiroxLogo from "@assets/qirox-logo.png";
import blackroseLogoStaff from "@assets/blackrose-staff-logo.png";

interface AdminSidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

interface NavItem {
  label: string;
  icon: any;
  path: string;
  isNotifications?: boolean;
  badge?: number;
}

interface NavGroup {
  label: string;
  icon: any;
  items?: NavItem[];
  path?: string;
  isNotifications?: boolean;
}

export function AdminSidebar({ mobileOpen = false, onMobileClose }: AdminSidebarProps) {
  const [location, navigate] = useLocation();
  const { i18n } = useTranslation();
  const isAr = i18n.language !== 'en';

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ['/api/notifications/unread-count'],
    refetchInterval: 30_000,
    retry: false,
  });
  const unreadCount = unreadData?.count ?? 0;

  // Track which groups are expanded
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    reports: true,
    operations: true,
    management: true,
    settings: false,
  });

  const toggleGroup = (key: string) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const groups: { key: string; label: string; icon: any; items: NavItem[] }[] = [
    {
      key: 'main',
      label: isAr ? 'الرئيسية' : 'Main',
      icon: LayoutDashboard,
      items: [
        { label: isAr ? 'لوحة التحكم' : 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard' },
        { label: isAr ? 'العملاء' : 'Customers', icon: UserCheck, path: '/admin/customers' },
      ],
    },
    {
      key: 'operations',
      label: isAr ? 'العمليات' : 'Operations',
      icon: ShoppingCart,
      items: [
        { label: isAr ? 'إدارة القائمة' : 'Menu', icon: Coffee, path: '/employee/menu-management' },
        { label: isAr ? 'الطلبات' : 'Orders', icon: ClipboardList, path: '/manager/orders' },
        { label: isAr ? 'حجوزات الطاولات' : 'Table Reservations', icon: BookOpen, path: '/manager/reservations' },
        { label: isAr ? 'حجوزات المنتجات' : 'Product Reservations', icon: Star, path: '/manager/product-reservations' },
      ],
    },
    {
      key: 'reports',
      label: isAr ? 'التقارير' : 'Reports',
      icon: BarChart3,
      items: [
        { label: isAr ? 'التقارير' : 'Reports', icon: FileText, path: '/admin/reports' },
        { label: isAr ? 'سجل الدفعات' : 'Payment Logs', icon: CreditCard, path: '/admin/payment-logs' },
      ],
    },
    {
      key: 'management',
      label: isAr ? 'الإدارة' : 'Management',
      icon: Shield,
      items: [
        { label: isAr ? 'الموظفون' : 'Employees', icon: Users, path: '/admin/employees' },
        { label: isAr ? 'الفروع' : 'Branches', icon: GitBranch, path: '/admin/branches' },
        { label: isAr ? 'الإشعارات' : 'Notifications', icon: Bell, path: '/admin/notifications', isNotifications: true },
        { label: isAr ? 'التسويق البريدي' : 'Email Marketing', icon: Mail, path: '/admin/email' },
      ],
    },
    {
      key: 'settings',
      label: isAr ? 'الإعدادات' : 'Settings',
      icon: Settings,
      items: [
        { label: isAr ? 'الإعدادات' : 'Settings', icon: Settings, path: '/admin/settings' },
        { label: isAr ? 'البراندة' : 'Branding', icon: Palette, path: '/admin/branding' },
        { label: isAr ? 'الطباعة' : 'Printing', icon: Printer, path: '/admin/printing' },
        { label: isAr ? 'إدارة API' : 'API', icon: Code2, path: '/admin/api' },
      ],
    },
  ];

  const handleNavigate = (path: string) => {
    navigate(path);
    onMobileClose?.();
  };

  const handleLogout = async () => {
    await fetch('/api/employees/logout', { method: 'POST' });
    localStorage.removeItem("qirox-restore-key");
    navigate('/employee/login');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white" dir="rtl">
      {/* ── Logo / Header ── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <img
            src={blackroseLogoStaff}
            alt={brand.nameEn}
            className="w-9 h-9 object-contain rounded-lg"
          />
          <div className="leading-tight">
            <p className="text-sm font-bold text-gray-900 leading-none">{isAr ? brand.platformNameAr : brand.platformNameEn}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{isAr ? 'لوحة التحكم' : 'Admin Panel'}</p>
          </div>
        </div>
        <button
          onClick={onMobileClose}
          className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto py-3">
        {groups.map((group) => {
          const isGroupExpanded = expanded[group.key] !== false;
          const GroupIcon = group.icon;
          const hasActiveChild = group.items.some(item => location === item.path || location.startsWith(item.path + '/'));

          return (
            <div key={group.key} className="mb-1">
              {/* Section header */}
              <button
                onClick={() => toggleGroup(group.key)}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium transition-colors group ${
                  hasActiveChild && !isGroupExpanded
                    ? 'text-primary bg-primary/5'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <GroupIcon className={`w-4 h-4 shrink-0 ${hasActiveChild && !isGroupExpanded ? 'text-primary' : 'text-gray-500'}`} />
                  <span>{group.label}</span>
                  {group.key === 'management' && unreadCount > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${isGroupExpanded ? 'rotate-180' : ''}`}
                />
              </button>

              {/* Sub-items */}
              {isGroupExpanded && (
                <div className="mt-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = location === item.path;
                    const showBadge = item.isNotifications && unreadCount > 0;

                    return (
                      <button
                        key={item.path}
                        onClick={() => handleNavigate(item.path)}
                        className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-all relative ${
                          isActive
                            ? 'bg-gray-100 text-primary font-semibold'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                        data-testid={`sidebar-link-${item.path.split('/').pop()}`}
                      >
                        {/* Active indicator — right border for RTL */}
                        {isActive && (
                          <span className="absolute right-0 top-1 bottom-1 w-[3px] bg-primary rounded-l-full" />
                        )}
                        <span className="w-6 flex justify-center shrink-0">
                          <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-gray-400'}`} />
                        </span>
                        <span className="flex-1 text-right">{item.label}</span>
                        {showBadge && (
                          <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* ── Footer ── */}
      <div className="border-t border-gray-100 p-4 space-y-3">
        {/* Logout button */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
          data-testid="button-logout"
        >
          <LogOut className="w-4 h-4" />
          <span>{isAr ? 'تسجيل الخروج' : 'Logout'}</span>
        </button>

        {/* QIROX STUDIO branding */}
        <div className="flex items-center gap-2 px-1 pt-1">
          <img src={qiroxLogo} alt="QIROX STUDIO" className="w-6 h-6 object-contain" />
          <div className="leading-tight">
            <p className="text-[10px] text-gray-400">Powered by</p>
            <p className="text-[11px] font-bold text-gray-600 tracking-wide">QIROX STUDIO</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <div className="hidden lg:flex w-60 bg-white border-l border-gray-200 flex-col h-screen sticky top-0 shrink-0 shadow-sm">
        <SidebarContent />
      </div>

      {/* ── Mobile overlay ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          onClick={onMobileClose}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="absolute right-0 top-0 bottom-0 w-64 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <SidebarContent />
          </div>
        </div>
      )}
    </>
  );
}
