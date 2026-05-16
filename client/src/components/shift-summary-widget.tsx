import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, ShoppingBag, Clock, ChevronUp, ChevronDown, Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ShiftStats {
  totalSales: number;
  totalOrders: number;
  avgOrder: number;
  cashSales?: number;
  cardSales?: number;
  startedAt?: string;
}

/**
 * Compact, always-visible widget showing the current cashier's live shift stats.
 * Auto-refreshes every 30s. Collapsible to a single bar.
 */
export function ShiftSummaryWidget() {
  const [collapsed, setCollapsed] = useState(false);

  const { data: shift } = useQuery<any>({
    queryKey: ["/api/shifts/active"],
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  if (!shift || !shift.id) return null;

  const stats: ShiftStats = {
    totalSales: shift.totalSales || shift.salesTotal || 0,
    totalOrders: shift.ordersCount || shift.totalOrders || 0,
    avgOrder:
      (shift.totalSales || 0) / Math.max(1, shift.ordersCount || shift.totalOrders || 1),
    cashSales: shift.cashSales || 0,
    cardSales: shift.cardSales || 0,
    startedAt: shift.startedAt || shift.startTime,
  };

  const startedTime = stats.startedAt
    ? new Date(stats.startedAt).toLocaleTimeString("ar-SA", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  return (
    <Card
      className="sticky top-0 z-30 mx-auto mb-3 max-w-5xl border-primary/20 bg-gradient-to-l from-primary/5 to-background shadow-sm"
      data-testid="shift-summary-widget"
    >
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-medium text-muted-foreground">
            وردية نشطة
          </span>
          <span className="text-[10px] text-muted-foreground">
            (بدأت {startedTime})
          </span>
        </div>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="p-1 hover:bg-muted rounded transition"
          data-testid="shift-widget-toggle"
        >
          {collapsed ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronUp className="w-4 h-4" />
          )}
        </button>
      </div>

      {!collapsed && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 px-3 pb-3">
          <Stat
            icon={<TrendingUp className="w-4 h-4" />}
            label="مبيعاتي"
            value={`${stats.totalSales.toFixed(2)} ر.س`}
            color="text-primary"
          />
          <Stat
            icon={<ShoppingBag className="w-4 h-4" />}
            label="طلباتي"
            value={String(stats.totalOrders)}
            color="text-blue-600"
          />
          <Stat
            icon={<Clock className="w-4 h-4" />}
            label="متوسط الطلب"
            value={`${stats.avgOrder.toFixed(1)} ر.س`}
            color="text-amber-600"
          />
          <Stat
            icon={<Wallet className="w-4 h-4" />}
            label="نقدي / شبكة"
            value={`${(stats.cashSales || 0).toFixed(0)} / ${(stats.cardSales || 0).toFixed(0)}`}
            color="text-emerald-600"
          />
        </div>
      )}
    </Card>
  );
}

function Stat({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2 bg-background/60 rounded-lg p-2 border border-border/50">
      <div className={cn("p-1.5 rounded bg-muted", color)}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground truncate">{label}</p>
        <p className={cn("text-sm font-bold truncate", color)}>{value}</p>
      </div>
    </div>
  );
}
