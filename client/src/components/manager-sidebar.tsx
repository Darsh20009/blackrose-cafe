import { useState } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard, ShoppingCart, ClipboardList, Package, Warehouse,
  Wallet, Users, Truck, BarChart3, Building2, Brain, Tag, Settings,
  ChefHat, Clock, Coffee, Gift, Star, Banknote, FileText, Globe,
  HardDrive, Code2, Store, Handshake, Shield,
  TrendingUp, MapPin, Receipt, ChevronDown,
  LogOut, Menu, X, BarChart2, Zap, Box, FlaskConical,
  ArrowRightLeft, Bell, Table, BookOpen, UserCheck, CreditCard, Monitor,
  Sparkles, MessageSquare, ShieldCheck, RefreshCw, Calculator
} from "lucide-react";
import { brand } from "@/lib/brand";
import { cn } from "@/lib/utils";
import blackroseLogoStaff from "@assets/blackrose-staff-logo.png";
import qiroxLogo from "@assets/qirox-logo.png";

interface ManagerSidebarProps {
  manager: any;
  onLogout: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  role?: string;
}

interface NavItem {
  label: string;
  labelEn: string;
  icon: any;
  path?: string;
  children?: NavItem[];
  color?: string;
  badge?: string;
  roles?: string[];
}

const NAV_GROUPS: { key: string; label: string; labelEn: string; icon: any; items: NavItem[] }[] = [
  {
    key: 'home',
    label: "الرئيسية", labelEn: "Home", icon: LayoutDashboard,
    items: [
      { label: "لوحة التحكم", labelEn: "Dashboard", icon: LayoutDashboard, path: "/manager/dashboard" },
      { label: "نقطة البيع", labelEn: "POS", icon: ShoppingCart, path: "/employee/pos" },
      { label: "الكيوسك", labelEn: "Kiosk", icon: Monitor, path: "/kiosk" },
    ]
  },
  {
    key: 'operations',
    label: "العمليات", labelEn: "Operations", icon: ClipboardList,
    items: [
      { label: "إدارة الطلبات", labelEn: "Orders", icon: ClipboardList, path: "/manager/orders" },
      { label: "الطاولات", labelEn: "Tables", icon: Table, path: "/manager/tables" },
      { label: "إدارة القائمة", labelEn: "Menu", icon: Coffee, path: "/employee/menu-management" },
      { label: "حجوزات الطاولات", labelEn: "Table Reservations", icon: BookOpen, path: "/manager/reservations" },
      { label: "حجوزات المنتجات", labelEn: "Product Reservations", icon: Star, path: "/manager/product-reservations" },
      { label: "الورديات", labelEn: "Shifts", icon: Clock, path: "/manager/shifts" },
    ]
  },
  {
    key: 'inventory',
    label: "المخزون", labelEn: "Inventory", icon: Warehouse,
    items: [
      { label: "دورة المخزون الذكي", labelEn: "Inventory Cycle", icon: RefreshCw, path: "/manager/inventory/cycle" },
      { label: "الجرد الذكي", labelEn: "Smart Stocktake", icon: ClipboardList, path: "/manager/inventory/stocktake" },
      { label: "ذكاء المخزون AI", labelEn: "Inventory AI", icon: Sparkles, path: "/manager/inventory/ai" },
      { label: "نظرة المخزون", labelEn: "Inventory", icon: Warehouse, path: "/manager/inventory" },
      { label: "المواد الخام", labelEn: "Raw Items", icon: Box, path: "/manager/inventory/raw-items" },
      { label: "الوصفات", labelEn: "Recipes", icon: FlaskConical, path: "/manager/inventory/recipes" },
      { label: "المشتريات", labelEn: "Purchases", icon: Receipt, path: "/manager/inventory/purchases" },
      { label: "حركات المخزون", labelEn: "Movements", icon: ArrowRightLeft, path: "/manager/inventory/movements" },
      { label: "نقل بين الفروع", labelEn: "Transfers", icon: Truck, path: "/manager/inventory/transfers" },
      { label: "تنبيهات المخزون", labelEn: "Alerts", icon: Bell, path: "/manager/inventory/alerts", badge: "!" },
    ]
  },
  {
    key: 'finance',
    label: "المالية", labelEn: "Finance", icon: Wallet,
    items: [
      { label: "المحاسبة", labelEn: "Accounting", icon: Wallet, path: "/manager/accounting" },
      { label: "ZATCA فاتورة", labelEn: "ZATCA", icon: Shield, path: "/manager/zatca", roles: ["admin", "owner"] },
      { label: "ERP المحاسبة", labelEn: "ERP Accounting", icon: BookOpen, path: "/erp/accounting", roles: ["admin", "owner"] },
    ]
  },
  {
    key: 'team',
    label: "الفريق", labelEn: "Team", icon: Users,
    items: [
      { label: "موظفو الفرع", labelEn: "Branch Staff", icon: Users, path: "/manager/employees/hub" },
      { label: "الأداء والمصداقية", labelEn: "Reliability", icon: ShieldCheck, path: "/manager/reliability" },
      { label: "التحضير", labelEn: "Attendance", icon: UserCheck, path: "/employee/attendance" },
      { label: "إجراءات الموظفين", labelEn: "Employee Actions", icon: Users, path: "/manager/employees" },
    ]
  },
  {
    key: 'reports',
    label: "التقارير", labelEn: "Reports", icon: BarChart3,
    items: [
      { label: "التقارير الموحدة", labelEn: "Unified Reports", icon: BarChart2, path: "/manager/unified-reports" },
      { label: "التحليلات المتقدمة", labelEn: "Advanced Analytics", icon: TrendingUp, path: "/manager/advanced-analytics" },
      { label: "التقارير المالية", labelEn: "Financial Reports", icon: Banknote, path: "/manager/financial-reports" },
    ]
  },
  {
    key: 'management',
    label: "الإدارة", labelEn: "Management", icon: Settings,
    items: [
      { label: "الفروع", labelEn: "Branches", icon: Building2, path: "/manager/branches" },
      { label: "الإشعارات", labelEn: "Notifications", icon: Bell, path: "/manager/notifications", badge: "🔔" },
      { label: "التسويق بالإيميل", labelEn: "Email Marketing", icon: MessageSquare, path: "/manager/email-marketing" },
      { label: "التسويق والعروض", labelEn: "Marketing", icon: Gift, path: "/manager/marketing" },
      { label: "برنامج النقاط", labelEn: "Loyalty", icon: Star, path: "/manager/loyalty" },
      { label: "الأتمتة بالذكاء", labelEn: "AI Automation", icon: Zap, path: "/manager/ai-automation" },
      { label: "سجلات المراجعة", labelEn: "Audit Logs", icon: FileText, path: "/manager/audit-logs", roles: ["admin", "owner"] },
    ]
  },
];

function SidebarNavItem({ item, isAr }: { item: NavItem; isAr: boolean }) {
  const [location, navigate] = useLocation();
  const isActive = location === item.path;
  const Icon = item.icon;

  return (
    <button
      onClick={() => item.path && navigate(item.path)}
      className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-all relative ${
        isActive
          ? 'bg-gray-100 text-primary font-semibold'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      {isActive && <span className="absolute right-0 top-1 bottom-1 w-[3px] bg-primary rounded-l-full" />}
      <span className="w-6 flex justify-center shrink-0">
        <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-gray-400'}`} />
      </span>
      <span className="flex-1 text-right">{isAr ? item.label : item.labelEn}</span>
      {item.badge && (
        <span className="text-[10px] bg-red-500 text-white rounded-full px-1.5 py-0.5 leading-none">!</span>
      )}
    </button>
  );
}

export function ManagerSidebar({ manager, onLogout, mobileOpen, onMobileClose, role }: ManagerSidebarProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(["home", "operations"])
  );
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const userRole = role || manager?.role || "manager";

  const filterItemsByRole = (items: NavItem[]) =>
    items.filter(item => !item.roles || item.roles.includes(userRole));

  const visibleGroups = NAV_GROUPS.map(group => ({
    ...group,
    items: filterItemsByRole(group.items),
  })).filter(group => group.items.length > 0);

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const [location] = useLocation();

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <img src={blackroseLogoStaff} alt={brand.nameEn} className="w-9 h-9 object-contain rounded-lg" />
          <div className="leading-tight">
            <p className="text-sm font-bold text-gray-900 leading-none">{isAr ? brand.nameAr : brand.nameEn}</p>
            <p className="text-[10px] text-gray-400 mt-0.5 truncate max-w-[100px]">{manager?.fullName || (isAr ? 'مدير' : 'Manager')}</p>
          </div>
        </div>
        <button onClick={onMobileClose} className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100">
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3">
        {visibleGroups.map((group) => {
          const isGroupExpanded = expandedGroups.has(group.key);
          const GroupIcon = group.icon;
          const hasActiveChild = group.items.some(item => location === item.path);

          return (
            <div key={group.key} className="mb-1">
              <button
                onClick={() => toggleGroup(group.key)}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium transition-colors ${
                  hasActiveChild && !isGroupExpanded ? 'text-primary bg-primary/5' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <GroupIcon className={`w-4 h-4 shrink-0 ${hasActiveChild && !isGroupExpanded ? 'text-primary' : 'text-gray-500'}`} />
                  <span>{isAr ? group.label : group.labelEn}</span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${isGroupExpanded ? 'rotate-180' : ''}`} />
              </button>

              {isGroupExpanded && (
                <div className="mt-0.5">
                  {group.items.map((item) => (
                    <SidebarNavItem key={item.path || item.label} item={item} isAr={isAr} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-100 p-4 space-y-3">
        <button
          onClick={() => {
            const newLang = isAr ? "en" : "ar";
            i18n.changeLanguage(newLang);
            try { localStorage.setItem("i18nextLng", newLang); } catch {}
            document.documentElement.dir = newLang === "ar" ? "rtl" : "ltr";
            document.documentElement.lang = newLang;
          }}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          data-testid="button-sidebar-language-toggle"
        >
          <Globe className="w-4 h-4" />
          <span>{isAr ? "English" : "عربي"}</span>
        </button>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>{isAr ? "تسجيل الخروج" : "Logout"}</span>
        </button>

        {/* QIROX STUDIO */}
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
      {/* Desktop sidebar */}
      <div className="hidden lg:flex w-60 bg-white border-l border-gray-200 flex-col h-screen sticky top-0 shrink-0 shadow-sm">
        <SidebarContent />
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={onMobileClose}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute right-0 top-0 bottom-0 w-64 shadow-2xl" onClick={e => e.stopPropagation()}>
            <SidebarContent />
          </div>
        </div>
      )}
    </>
  );
}

/* Mobile bottom navigation bar */
export function MobileBottomNav({ manager }: { manager: any }) {
  const [location, navigate] = useLocation();

  const items = [
    { label: "الرئيسية", icon: LayoutDashboard, path: "/manager/dashboard" },
    { label: "الطلبات", icon: ClipboardList, path: "/employee/orders" },
    { label: "المخزون", icon: Warehouse, path: "/manager/inventory" },
    { label: "التقارير", icon: BarChart2, path: "/manager/unified-reports" },
    { label: "المحاسبة", icon: Wallet, path: "/manager/accounting" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 lg:hidden bg-white border-t border-gray-100 shadow-md">
      <div className="flex items-center justify-around px-1 py-1 safe-area-pb">
        {items.map(item => {
          const isActive = location === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn("flex flex-col items-center gap-1 px-3 py-2 rounded-xl flex-1 transition-all", isActive ? "bg-primary/10" : "")}
            >
              <item.icon className="w-5 h-5 transition-transform" style={{ color: isActive ? 'hsl(var(--primary))' : '#9ca3af' }} />
              <span className="text-[10px] font-medium" style={{ color: isActive ? 'hsl(var(--primary))' : '#9ca3af' }}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
