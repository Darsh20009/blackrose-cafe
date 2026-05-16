import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Zap, ShoppingCart, ChefHat, Calendar, ClipboardList, X, Search, Coffee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslate } from "@/lib/useTranslate";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface QuickAction {
  labelAr: string;
  labelEn: string;
  path: string;
  icon: React.ReactNode;
  color: string;
}

const ACTIONS: QuickAction[] = [
  { labelAr: "كاشير", labelEn: "Cashier", path: "/employee/pos", icon: <ShoppingCart className="w-5 h-5" />, color: "bg-primary text-primary-foreground" },
  { labelAr: "المطبخ", labelEn: "Kitchen", path: "/employee/kitchen", icon: <ChefHat className="w-5 h-5" />, color: "bg-orange-500 text-white" },
  { labelAr: "الطلبات", labelEn: "Orders", path: "/employee/orders", icon: <ClipboardList className="w-5 h-5" />, color: "bg-blue-500 text-white" },
  { labelAr: "حضور", labelEn: "Attendance", path: "/employee/attendance", icon: <Calendar className="w-5 h-5" />, color: "bg-emerald-500 text-white" },
  { labelAr: "الطاولات", labelEn: "Tables", path: "/employee/tables", icon: <Coffee className="w-5 h-5" />, color: "bg-amber-500 text-white" },
];

export function QuickActionBar() {
  const [location, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const tc = useTranslate();
  const { i18n } = useTranslation();
  const isRtl = i18n.language === "ar";

  const staffPath =
    location.startsWith("/employee") ||
    location.startsWith("/manager") ||
    location.startsWith("/admin") ||
    location.startsWith("/owner") ||
    location.startsWith("/executive") ||
    location.startsWith("/driver");

  const hideHere =
    location.includes("/login") ||
    location.includes("/gateway") ||
    location.includes("/activation") ||
    location === "/employee/home";

  const openCommand = () => {
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true })
    );
  };

  useEffect(() => {
    setOpen(false);
  }, [location]);

  if (!staffPath || hideHere) return null;

  // Position FAB on the leading side: left in RTL, right in LTR
  const sideClass = isRtl ? "left-4" : "right-4";

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          data-testid="quick-action-backdrop"
        />
      )}

      <div
        className={cn(
          "fixed bottom-24 z-50 flex flex-col-reverse gap-2 transition-all duration-300",
          sideClass,
          open ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-4 pointer-events-none"
        )}
        dir={isRtl ? "rtl" : "ltr"}
      >
        <Button
          onClick={() => { setLocation("/employee/home"); setOpen(false); }}
          className="rounded-full shadow-lg gap-2 bg-foreground text-background hover:opacity-90"
          data-testid="quick-action-home"
        >
          <Coffee className="w-4 h-4" />
          {tc("الرئيسية", "Home")}
        </Button>
        {ACTIONS.map((a) => (
          <Button
            key={a.path}
            onClick={() => { setLocation(a.path); setOpen(false); }}
            className={cn("rounded-full shadow-lg gap-2 hover:opacity-90", a.color)}
            data-testid={`quick-action-${a.path.split("/").pop()}`}
          >
            {a.icon}
            {tc(a.labelAr, a.labelEn)}
          </Button>
        ))}
        <Button
          onClick={() => { openCommand(); setOpen(false); }}
          variant="outline"
          className="rounded-full shadow-lg gap-2 bg-background"
          data-testid="quick-action-search"
        >
          <Search className="w-4 h-4" />
          {tc("بحث (Ctrl+K)", "Search (Ctrl+K)")}
        </Button>
      </div>

      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "fixed bottom-6 z-50 w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 hover:scale-110",
          sideClass,
          open ? "bg-destructive text-destructive-foreground rotate-90" : "bg-primary text-primary-foreground"
        )}
        data-testid="quick-action-fab"
        aria-label={tc("إجراءات سريعة", "Quick actions")}
      >
        {open ? <X className="w-6 h-6" /> : <Zap className="w-6 h-6" />}
      </button>
    </>
  );
}
