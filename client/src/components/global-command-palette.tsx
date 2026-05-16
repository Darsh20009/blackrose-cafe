import { useEffect, useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  ShoppingCart, Coffee, Users, ClipboardList, Calendar, ChefHat,
  LayoutDashboard, Package, BarChart3, Settings, CreditCard,
  Receipt, Boxes, Truck, FileText, UserCog, Bell, Gift, Tag,
  ScanLine, MonitorSmartphone, Home, Wallet, TrendingUp,
} from "lucide-react";

interface QuickLink {
  label: string;
  labelEn?: string;
  path: string;
  icon: React.ReactNode;
  group: string;
  roles?: string[];
}

const QUICK_LINKS: QuickLink[] = [
  { label: "الصفحة الرئيسية للموظف", path: "/employee/home", icon: <Home className="w-4 h-4" />, group: "تنقل سريع" },
  { label: "كاشير POS", path: "/employee/pos", icon: <ShoppingCart className="w-4 h-4" />, group: "تنقل سريع" },
  { label: "شاشة المطبخ", path: "/employee/kitchen", icon: <ChefHat className="w-4 h-4" />, group: "تنقل سريع" },
  { label: "الطلبات الحية", path: "/employee/orders", icon: <ClipboardList className="w-4 h-4" />, group: "تنقل سريع" },
  { label: "حضور وانصراف", path: "/employee/attendance", icon: <Calendar className="w-4 h-4" />, group: "تنقل سريع" },
  { label: "الطاولات", path: "/employee/tables", icon: <LayoutDashboard className="w-4 h-4" />, group: "تنقل سريع" },
  { label: "حجوزات الطاولات", path: "/employee/reservations", icon: <Calendar className="w-4 h-4" />, group: "تنقل سريع" },
  { label: "حجوزات المنتجات", path: "/employee/product-reservations", icon: <Gift className="w-4 h-4" />, group: "تنقل سريع" },
  { label: "إدارة المنيو", path: "/employee/menu-management", icon: <Coffee className="w-4 h-4" />, group: "إدارة" },
  { label: "الموظفون", path: "/admin/employees", icon: <Users className="w-4 h-4" />, group: "إدارة" },
  { label: "لوحة المدير", path: "/manager/dashboard", icon: <BarChart3 className="w-4 h-4" />, group: "إدارة" },
  { label: "لوحة المالك", path: "/owner/dashboard", icon: <UserCog className="w-4 h-4" />, group: "إدارة" },
  { label: "لوحة الإدارة العليا", path: "/executive/dashboard", icon: <TrendingUp className="w-4 h-4" />, group: "إدارة" },
  { label: "المحاسبة", path: "/manager/accounting", icon: <Wallet className="w-4 h-4" />, group: "إدارة" },
  { label: "التحليلات", path: "/manager/analytics", icon: <BarChart3 className="w-4 h-4" />, group: "إدارة" },
  { label: "تقارير موحدة", path: "/manager/unified-reports", icon: <FileText className="w-4 h-4" />, group: "إدارة" },
  { label: "BI Analytics", path: "/manager/bi-analytics", icon: <TrendingUp className="w-4 h-4" />, group: "إدارة" },
  { label: "المخزون - المواد الخام", path: "/manager/inventory/raw-items", icon: <Boxes className="w-4 h-4" />, group: "مخزون" },
  { label: "المخزون - تنبيهات", path: "/manager/inventory/alerts", icon: <Bell className="w-4 h-4" />, group: "مخزون" },
  { label: "المخزون - الموردون", path: "/manager/inventory/suppliers", icon: <Truck className="w-4 h-4" />, group: "مخزون" },
  { label: "المخزون - المشتريات", path: "/manager/inventory/purchases", icon: <Package className="w-4 h-4" />, group: "مخزون" },
  { label: "الفروع", path: "/admin/branches", icon: <LayoutDashboard className="w-4 h-4" />, group: "إعدادات" },
  { label: "إعدادات النظام", path: "/admin/settings", icon: <Settings className="w-4 h-4" />, group: "إعدادات" },
  { label: "بطاقات الهدايا", path: "/manager/gift-cards", icon: <Gift className="w-4 h-4" />, group: "إعدادات" },
  { label: "العروض والخصومات", path: "/manager/promotions", icon: <Tag className="w-4 h-4" />, group: "إعدادات" },
  { label: "الولاء", path: "/manager/loyalty", icon: <CreditCard className="w-4 h-4" />, group: "إعدادات" },
  { label: "فواتير ZATCA", path: "/manager/zatca-invoices", icon: <Receipt className="w-4 h-4" />, group: "إعدادات" },
  { label: "كشك الطلب الذاتي (Kiosk)", path: "/kiosk", icon: <MonitorSmartphone className="w-4 h-4" />, group: "إعدادات" },
  { label: "شاشة العميل", path: "/customer-display", icon: <MonitorSmartphone className="w-4 h-4" />, group: "إعدادات" },
];

export function GlobalCommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [, setLocation] = useLocation();

  // Open with Ctrl+K / Cmd+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Lazy fetch only when palette is open
  const { data: orders = [] } = useQuery<any[]>({
    queryKey: ["/api/orders"],
    enabled: open,
    staleTime: 30_000,
  });
  const { data: products = [] } = useQuery<any[]>({
    queryKey: ["/api/coffee-items"],
    enabled: open,
    staleTime: 60_000,
  });
  const { data: customers = [] } = useQuery<any[]>({
    queryKey: ["/api/customers"],
    enabled: open,
    staleTime: 60_000,
  });
  const { data: employees = [] } = useQuery<any[]>({
    queryKey: ["/api/employees"],
    enabled: open,
    staleTime: 60_000,
  });

  const q = search.trim().toLowerCase();

  const filteredOrders = useMemo(() => {
    if (!q) return [];
    return (orders || []).filter((o: any) => {
      const num = String(o.orderNumber || "").toLowerCase();
      const phone = String(o.customerPhone || "").toLowerCase();
      const name = String(o.customerName || "").toLowerCase();
      return num.includes(q) || phone.includes(q) || name.includes(q);
    }).slice(0, 6);
  }, [orders, q]);

  const filteredProducts = useMemo(() => {
    if (!q) return [];
    return (products || []).filter((p: any) => {
      const ar = String(p.nameAr || p.name || "").toLowerCase();
      const en = String(p.nameEn || "").toLowerCase();
      return ar.includes(q) || en.includes(q);
    }).slice(0, 6);
  }, [products, q]);

  const filteredCustomers = useMemo(() => {
    if (!q) return [];
    return (customers || []).filter((c: any) => {
      const phone = String(c.phone || "").toLowerCase();
      const name = String(c.name || "").toLowerCase();
      return phone.includes(q) || name.includes(q);
    }).slice(0, 5);
  }, [customers, q]);

  const filteredEmployees = useMemo(() => {
    if (!q) return [];
    return (employees || []).filter((e: any) => {
      const name = String(e.name || "").toLowerCase();
      const phone = String(e.phone || "").toLowerCase();
      const role = String(e.role || "").toLowerCase();
      return name.includes(q) || phone.includes(q) || role.includes(q);
    }).slice(0, 5);
  }, [employees, q]);

  const go = (path: string) => {
    setOpen(false);
    setSearch("");
    setLocation(path);
  };

  const linkGroups = useMemo(() => {
    const groups: Record<string, QuickLink[]> = {};
    QUICK_LINKS.forEach((l) => {
      if (q && !l.label.toLowerCase().includes(q) && !(l.labelEn || "").toLowerCase().includes(q)) return;
      if (!groups[l.group]) groups[l.group] = [];
      groups[l.group].push(l);
    });
    return groups;
  }, [q]);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="ابحث عن طلب / منتج / عميل / موظف أو صفحة..."
        value={search}
        onValueChange={setSearch}
        data-testid="input-command-search"
      />
      <CommandList className="max-h-[500px]">
        <CommandEmpty>لا توجد نتائج</CommandEmpty>

        {filteredOrders.length > 0 && (
          <>
            <CommandGroup heading="الطلبات">
              {filteredOrders.map((o: any) => (
                <CommandItem
                  key={o.id || o._id}
                  onSelect={() => go(`/employee/orders?id=${o.id || o._id}`)}
                  data-testid={`cmd-order-${o.orderNumber || o.id}`}
                >
                  <Receipt className="w-4 h-4 ml-2 text-primary" />
                  <span className="font-medium">#{o.orderNumber}</span>
                  <span className="text-muted-foreground text-sm mr-2">
                    {o.customerName || o.customerPhone || "—"}
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground">{o.total} ر.س</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {filteredProducts.length > 0 && (
          <>
            <CommandGroup heading="المنتجات">
              {filteredProducts.map((p: any) => (
                <CommandItem
                  key={p.id}
                  onSelect={() => go(`/employee/menu-management?productId=${p.id}`)}
                  data-testid={`cmd-product-${p.id}`}
                >
                  <Coffee className="w-4 h-4 ml-2 text-primary" />
                  <span>{p.nameAr || p.name}</span>
                  {p.nameEn && <span className="text-muted-foreground text-xs mr-2">({p.nameEn})</span>}
                  <span className="ml-auto text-xs text-muted-foreground">{p.price} ر.س</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {filteredCustomers.length > 0 && (
          <>
            <CommandGroup heading="العملاء">
              {filteredCustomers.map((c: any) => (
                <CommandItem
                  key={c.phone}
                  onSelect={() => go(`/employee/loyalty?phone=${encodeURIComponent(c.phone)}`)}
                  data-testid={`cmd-customer-${c.phone}`}
                >
                  <Users className="w-4 h-4 ml-2 text-primary" />
                  <span>{c.name || "بدون اسم"}</span>
                  <span className="text-muted-foreground text-xs mr-2">{c.phone}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {filteredEmployees.length > 0 && (
          <>
            <CommandGroup heading="الموظفون">
              {filteredEmployees.map((e: any) => (
                <CommandItem
                  key={e.id}
                  onSelect={() => go(`/admin/employees?employeeId=${e.id}`)}
                  data-testid={`cmd-employee-${e.id}`}
                >
                  <UserCog className="w-4 h-4 ml-2 text-primary" />
                  <span>{e.name}</span>
                  <span className="text-muted-foreground text-xs mr-2">({e.role})</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {Object.entries(linkGroups).map(([heading, items]) => (
          <CommandGroup key={heading} heading={heading}>
            {items.map((l) => (
              <CommandItem
                key={l.path}
                onSelect={() => go(l.path)}
                data-testid={`cmd-link-${l.path.replace(/\//g, "-")}`}
              >
                {l.icon}
                <span className="mr-2">{l.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
      <div className="px-3 py-2 text-[10px] text-muted-foreground border-t flex items-center justify-between">
        <span>اضغط <kbd className="px-1.5 py-0.5 bg-muted rounded">Esc</kbd> للإغلاق</span>
        <span><kbd className="px-1.5 py-0.5 bg-muted rounded">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 bg-muted rounded">K</kbd> لفتح البحث</span>
      </div>
    </CommandDialog>
  );
}
