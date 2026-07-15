import { useState } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard, ShoppingCart, ClipboardList, Package, Warehouse,
  Wallet, Users, Truck, BarChart3, Settings,
  Clock, Coffee, Gift, Star, Banknote, FileText, Globe,
  Code2, Store, HelpCircle,
  TrendingUp, Receipt, ChevronDown,
  LogOut, X, BarChart2, Box, FlaskConical,
  ArrowRightLeft, Bell, BookOpen, CreditCard,
  Sparkles, MessageSquare, RefreshCw, Calculator, Megaphone,
  Shield, Monitor, Table, UserCheck
} from "lucide-react";
import { brand } from "@/lib/brand";
import { cn } from "@/lib/utils";
import blackroseLogoStaff from "@assets/blackrose-staff-logo.png";

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
  path: string;
  badge?: string | number;
  roles?: string[];
}

// Direct top-level items (like Foodics: الملخص, الطلبات, العملاء)
const TOP_ITEMS: NavItem[] = [
  { label: "الملخص", labelEn: "Overview", icon: LayoutDashboard, path: "/manager/dashboard" },
  { label: "الطلبات", labelEn: "Orders", icon: ShoppingCart, path: "/manager/orders" },
  { label: "نقطة البيع", labelEn: "POS", icon: Monitor, path: "/employee/pos" },
];

// Collapsible groups (like Foodics: التقارير, المخزون, قائمة المنتجات, إدارة, التسويق)
const NAV_GROUPS: {
  key: string; label: string; labelEn: string; icon: any; items: NavItem[];
}[] = [
  {
    key: 'reports',
    label: "التقارير", labelEn: "Reports", icon: BarChart3,
    items: [
      { label: "التقارير الموحدة", labelEn: "Unified Reports", icon: BarChart2, path: "/manager/unified-reports" },
      { label: "التحليلات المتقدمة", labelEn: "Advanced Analytics", icon: TrendingUp, path: "/manager/advanced-analytics" },
      { label: "التقارير المالية", labelEn: "Financial Reports", icon: Banknote, path: "/manager/financial-reports" },
      { label: "المحاسبة", labelEn: "Accounting", icon: Wallet, path: "/manager/accounting" },
      { label: "ZATCA فاتورة", labelEn: "ZATCA", icon: Shield, path: "/manager/zatca", roles: ["admin", "owner"] },
    ],
  },
  {
    key: 'inventory',
    label: "المخزون", labelEn: "Inventory", icon: Warehouse,
    items: [
      { label: "نظرة المخزون", labelEn: "Inventory", icon: Warehouse, path: "/manager/inventory" },
      { label: "المواد الخام", labelEn: "Raw Items", icon: Box, path: "/manager/inventory/raw-items" },
      { label: "الوصفات", labelEn: "Recipes", icon: FlaskConical, path: "/manager/inventory/recipes" },
      { label: "المشتريات", labelEn: "Purchases", icon: Receipt, path: "/manager/inventory/purchases" },
      { label: "حركات المخزون", labelEn: "Movements", icon: ArrowRightLeft, path: "/manager/inventory/movements" },
      { label: "نقل بين الفروع", labelEn: "Transfers", icon: Truck, path: "/manager/inventory/transfers" },
      { label: "الجرد الذكي", labelEn: "Smart Stocktake", icon: ClipboardList, path: "/manager/inventory/stocktake" },
      { label: "تنبيهات المخزون", labelEn: "Alerts", icon: Bell, path: "/manager/inventory/alerts" },
    ],
  },
  {
    key: 'menu',
    label: "قائمة المنتجات", labelEn: "Products", icon: Coffee,
    items: [
      { label: "إدارة القائمة", labelEn: "Menu Management", icon: Coffee, path: "/employee/menu-management" },
      { label: "الطاولات", labelEn: "Tables", icon: Table, path: "/manager/tables" },
      { label: "حجوزات الطاولات", labelEn: "Reservations", icon: BookOpen, path: "/manager/reservations" },
      { label: "حجوزات المنتجات", labelEn: "Product Reservations", icon: Star, path: "/manager/product-reservations" },
    ],
  },
  {
    key: 'management',
    label: "إدارة", labelEn: "Management", icon: Settings,
    items: [
      { label: "موظفو الفرع", labelEn: "Branch Staff", icon: Users, path: "/manager/employees/hub" },
      { label: "التحضير", labelEn: "Attendance", icon: UserCheck, path: "/employee/attendance" },
      { label: "الورديات", labelEn: "Shifts", icon: Clock, path: "/manager/shifts" },
      { label: "سجلات المراجعة", labelEn: "Audit Logs", icon: FileText, path: "/manager/audit-logs", roles: ["admin", "owner"] },
      { label: "ERP المحاسبة", labelEn: "ERP", icon: Calculator, path: "/erp/accounting", roles: ["admin", "owner"] },
    ],
  },
  {
    key: 'marketing',
    label: "التسويق", labelEn: "Marketing", icon: Megaphone,
    items: [
      { label: "برنامج النقاط", labelEn: "Loyalty", icon: Star, path: "/manager/loyalty" },
      { label: "التسويق والعروض", labelEn: "Promotions", icon: Gift, path: "/manager/marketing" },
      { label: "الإشعارات", labelEn: "Notifications", icon: Bell, path: "/manager/notifications" },
      { label: "التسويق بالإيميل", labelEn: "Email Marketing", icon: MessageSquare, path: "/manager/email-marketing" },
    ],
  },
];

// One nav item button
function NavItemButton({
  label, icon: Icon, path, active, onClick, badge, indent = false
}: {
  label: string; icon: any; path: string; active: boolean;
  onClick: () => void; badge?: string | number; indent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative w-full flex items-center gap-3 py-2 text-sm transition-all",
        indent ? "pr-10 pl-4" : "px-4",
        active
          ? "bg-gray-100 text-primary font-semibold"
          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
      )}
    >
      {active && <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-primary rounded-r-full" />}
      <Icon className={cn("w-4 h-4 shrink-0", active ? "text-primary" : "text-gray-400")} />
      <span className="flex-1 text-right">{label}</span>
      {badge !== undefined && (
        <span className="text-[10px] bg-red-500 text-white rounded-full px-1.5 py-0.5 leading-none font-bold">
          {badge}
        </span>
      )}
    </button>
  );
}

export function ManagerSidebar({ manager, onLogout, mobileOpen, onMobileClose, role }: ManagerSidebarProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    reports: false,
    inventory: true,
    menu: false,
    management: false,
    marketing: false,
  });
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const userRole = role || manager?.role || "manager";

  const [location, navigate] = useLocation();

  const toggleGroup = (key: string) =>
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  const handleNavigate = (path: string) => {
    navigate(path);
    onMobileClose?.();
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white" dir="rtl">

      {/* ── Logo (Foodics-style: brand name at top) ── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <img src={blackroseLogoStaff} alt={brand.nameEn} className="w-8 h-8 object-contain rounded-lg" />
          <span className="text-base font-black tracking-wide text-gray-900 leading-none">
            {isAr ? brand.shortNameAr : brand.shortNameEn}
          </span>
        </div>
        <button onClick={onMobileClose} className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100">
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto py-2">

        {/* Direct top-level items */}
        <div className="mb-2">
          {TOP_ITEMS.map(item => (
            <NavItemButton
              key={item.path}
              label={isAr ? item.label : item.labelEn}
              icon={item.icon}
              path={item.path}
              active={location === item.path || location.startsWith(item.path + '/')}
              onClick={() => handleNavigate(item.path)}
            />
          ))}
        </div>

        <div className="mx-4 my-1 border-t border-gray-100" />

        {/* Collapsible groups */}
        {NAV_GROUPS.map(group => {
          const isGroupExpanded = expanded[group.key];
          const GroupIcon = group.icon;
          const visibleItems = group.items.filter(
            item => !item.roles || item.roles.includes(userRole)
          );
          if (visibleItems.length === 0) return null;
          const hasActiveChild = visibleItems.some(
            item => location === item.path || location.startsWith(item.path + '/')
          );

          return (
            <div key={group.key}>
              <button
                onClick={() => toggleGroup(group.key)}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium transition-colors",
                  hasActiveChild && !isGroupExpanded
                    ? "text-primary bg-primary/5"
                    : "text-gray-700 hover:bg-gray-50"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <GroupIcon className={cn("w-4 h-4 shrink-0", hasActiveChild && !isGroupExpanded ? "text-primary" : "text-gray-500")} />
                  <span>{isAr ? group.label : group.labelEn}</span>
                </div>
                <ChevronDown className={cn("w-3.5 h-3.5 text-gray-400 transition-transform duration-200", isGroupExpanded && "rotate-180")} />
              </button>

              {isGroupExpanded && (
                <div>
                  {visibleItems.map(item => (
                    <NavItemButton
                      key={item.path}
                      label={isAr ? item.label : item.labelEn}
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

        {/* متجر التطبيقات */}
        <div className="mx-4 my-1 border-t border-gray-100" />
        <NavItemButton
          label={isAr ? "متجر التطبيقات" : "App Store"}
          icon={Store}
          path="/manager/api"
          active={location === "/manager/api"}
          onClick={() => handleNavigate("/manager/api")}
        />
      </nav>

      {/* ── Footer ── */}
      <div className="border-t border-gray-100">
        <button
          onClick={() => handleNavigate("/manager/loyalty")}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <Gift className="w-4 h-4 text-gray-400" />
          <span className="flex-1 text-right">{isAr ? "رشح واكسب" : "Refer & Earn"}</span>
        </button>
        <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
          <HelpCircle className="w-4 h-4 text-gray-400" />
          <span className="flex-1 text-right">{isAr ? "مركز المساعدة" : "Help Center"}</span>
        </button>
        <button
          onClick={() => {
            const newLang = isAr ? "en" : "ar";
            i18n.changeLanguage(newLang);
            try { localStorage.setItem("i18nextLng", newLang); } catch {}
            document.documentElement.dir = newLang === "ar" ? "rtl" : "ltr";
            document.documentElement.lang = newLang;
          }}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          data-testid="button-sidebar-language-toggle"
        >
          <Globe className="w-4 h-4 text-gray-400" />
          <span className="flex-1 text-right">{isAr ? "English" : "عربي"}</span>
        </button>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span className="flex-1 text-right">{isAr ? "تسجيل الخروج" : "Logout"}</span>
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

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={onMobileClose}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute right-0 top-0 bottom-0 w-60 shadow-2xl" onClick={e => e.stopPropagation()}>
            <SidebarContent />
          </div>
        </div>
      )}
    </>
  );
}

/* Mobile bottom navigation */
export function MobileBottomNav({ manager }: { manager: any }) {
  const [location, navigate] = useLocation();

  const items = [
    { label: "الرئيسية", icon: LayoutDashboard, path: "/manager/dashboard" },
    { label: "الطلبات", icon: ClipboardList, path: "/manager/orders" },
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
              className={cn("flex flex-col items-center gap-1 px-3 py-2 rounded-xl flex-1 transition-all", isActive && "bg-primary/10")}
            >
              <item.icon className="w-5 h-5" style={{ color: isActive ? 'hsl(var(--primary))' : '#9ca3af' }} />
              <span className="text-[10px] font-medium" style={{ color: isActive ? 'hsl(var(--primary))' : '#9ca3af' }}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
