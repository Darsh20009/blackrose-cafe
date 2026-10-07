import { useState } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import {
  BarChart3,
  ClipboardList,
  CreditCard,
  Gift,
  LayoutDashboard,
  LayoutGrid,
  Package,
  Settings,
  Truck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type StaffShortcutScope = "admin" | "manager";
type StaffShortcut = {
  label: string;
  labelEn: string;
  path: string;
  icon: LucideIcon;
  roles?: string[];
};

const shortcuts: Record<StaffShortcutScope, StaffShortcut[]> = {
  admin: [
    { label: "لوحة الإدارة", labelEn: "Admin dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
    { label: "الطلبات", labelEn: "Orders", path: "/manager/orders", icon: ClipboardList },
    { label: "الموظفون", labelEn: "Employees", path: "/admin/employees", icon: Users },
    { label: "إعدادات المتجر", labelEn: "Store settings", path: "/admin/settings", icon: Settings, roles: ["admin", "owner"] },
    { label: "الفروع", labelEn: "Branches", path: "/admin/branches", icon: Package },
    { label: "أكواد الخصم", labelEn: "Discount codes", path: "/admin/coupons", icon: Gift },
    { label: "التقارير", labelEn: "Reports", path: "/admin/reports", icon: BarChart3 },
    { label: "العروض والخصومات", labelEn: "Promotions", path: "/manager/promotions", icon: Gift },
    { label: "التوصيل", labelEn: "Delivery", path: "/manager/delivery", icon: Truck },
  ],
  manager: [
    { label: "لوحة المدير", labelEn: "Manager dashboard", path: "/manager/dashboard", icon: LayoutDashboard },
    { label: "الطلبات", labelEn: "Orders", path: "/manager/orders", icon: ClipboardList },
    { label: "الموظفون", labelEn: "Branch staff", path: "/manager/employees/hub", icon: Users },
    { label: "المخزون", labelEn: "Inventory", path: "/manager/inventory", icon: Package },
    { label: "التقارير", labelEn: "Reports", path: "/manager/unified-reports", icon: BarChart3 },
    { label: "المحاسبة", labelEn: "Accounting", path: "/manager/accounting", icon: CreditCard },
    { label: "أكواد الخصم", labelEn: "Discount codes", path: "/manager/coupons", icon: Gift },
    { label: "برنامج الولاء", labelEn: "Loyalty program", path: "/manager/loyalty", icon: Settings },
    { label: "التوصيل", labelEn: "Delivery", path: "/manager/delivery", icon: Truck },
  ],
};

export function StaffShortcuts({ scope, role = "manager" }: { scope: StaffShortcutScope; role?: string }) {
  const [open, setOpen] = useState(false);
  const [, navigate] = useLocation();
  const { i18n } = useTranslation();
  const isAr = i18n.language !== "en";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={isAr ? "الاختصارات" : "Shortcuts"}
          title={isAr ? "الاختصارات" : "Shortcuts"}
          data-testid="button-staff-shortcuts"
        >
          <LayoutGrid className="w-5 h-5 text-gray-500" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" dir={isAr ? "rtl" : "ltr"} className="w-80 p-3">
        <p className="mb-3 px-1 text-sm font-semibold">
          {isAr ? "اختصارات مهمة" : "Quick links"}
        </p>
        <div className="grid grid-cols-2 gap-2">
          {shortcuts[scope].filter(item => !item.roles || item.roles.includes(role)).map(({ label, labelEn, path, icon: Icon }) => (
            <Button
              key={path}
              type="button"
              variant="outline"
              className="h-auto min-h-12 justify-start gap-2 whitespace-normal px-3 py-2 text-start"
              onClick={() => {
                setOpen(false);
                navigate(path);
              }}
            >
              <Icon className="h-4 w-4 shrink-0 text-primary" />
              <span className="text-xs leading-5">{isAr ? label : labelEn}</span>
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
