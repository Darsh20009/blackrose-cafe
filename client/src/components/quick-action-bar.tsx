import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Zap, ShoppingCart, ChefHat, Calendar, ClipboardList, X, Search, Coffee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QuickAction {
  label: string;
  path: string;
  icon: React.ReactNode;
  color: string;
  roles?: string[];
}

const ACTIONS: QuickAction[] = [
  { label: "كاشير", path: "/employee/pos", icon: <ShoppingCart className="w-5 h-5" />, color: "bg-primary text-primary-foreground" },
  { label: "المطبخ", path: "/employee/kitchen", icon: <ChefHat className="w-5 h-5" />, color: "bg-orange-500 text-white" },
  { label: "الطلبات", path: "/employee/orders", icon: <ClipboardList className="w-5 h-5" />, color: "bg-blue-500 text-white" },
  { label: "حضور", path: "/employee/attendance", icon: <Calendar className="w-5 h-5" />, color: "bg-emerald-500 text-white" },
  { label: "الطاولات", path: "/employee/tables", icon: <Coffee className="w-5 h-5" />, color: "bg-amber-500 text-white" },
];

export function QuickActionBar() {
  const [location, setLocation] = useLocation();
  const [open, setOpen] = useState(false);

  // Show ONLY on employee/manager/admin pages (not on customer-facing)
  const staffPath =
    location.startsWith("/employee") ||
    location.startsWith("/manager") ||
    location.startsWith("/admin") ||
    location.startsWith("/owner") ||
    location.startsWith("/executive") ||
    location.startsWith("/driver");

  // Hide on login/gateway pages to avoid clutter
  const hideHere =
    location.includes("/login") ||
    location.includes("/gateway") ||
    location.includes("/activation") ||
    location === "/employee/home"; // home already has the shortcuts as cards

  // Open command palette via Ctrl+K shortcut
  const openCommand = () => {
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true })
    );
  };

  // Close FAB when route changes
  useEffect(() => {
    setOpen(false);
  }, [location]);

  if (!staffPath || hideHere) return null;

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          data-testid="quick-action-backdrop"
        />
      )}

      {/* Action buttons (radial / vertical stack) */}
      <div
        className={cn(
          "fixed bottom-24 left-4 z-50 flex flex-col-reverse gap-2 transition-all duration-300",
          open ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-4 pointer-events-none"
        )}
        dir="rtl"
      >
        <Button
          onClick={() => { setLocation("/employee/home"); setOpen(false); }}
          className="rounded-full shadow-lg gap-2 bg-foreground text-background hover:opacity-90"
          data-testid="quick-action-home"
        >
          <Coffee className="w-4 h-4" />
          الرئيسية
        </Button>
        {ACTIONS.map((a) => (
          <Button
            key={a.path}
            onClick={() => { setLocation(a.path); setOpen(false); }}
            className={cn("rounded-full shadow-lg gap-2 hover:opacity-90", a.color)}
            data-testid={`quick-action-${a.path.split("/").pop()}`}
          >
            {a.icon}
            {a.label}
          </Button>
        ))}
        <Button
          onClick={() => { openCommand(); setOpen(false); }}
          variant="outline"
          className="rounded-full shadow-lg gap-2 bg-background"
          data-testid="quick-action-search"
        >
          <Search className="w-4 h-4" />
          بحث (Ctrl+K)
        </Button>
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "fixed bottom-6 left-4 z-50 w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 hover:scale-110",
          open ? "bg-destructive text-destructive-foreground rotate-90" : "bg-primary text-primary-foreground"
        )}
        data-testid="quick-action-fab"
        aria-label="إجراءات سريعة"
      >
        {open ? <X className="w-6 h-6" /> : <Zap className="w-6 h-6" />}
      </button>
    </>
  );
}
