import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  TrendingUp, ShoppingBag, Banknote, CreditCard, Wallet,
  BarChart3, Package, Star,
  RefreshCw, ChevronDown, ChevronUp,
  Percent, Award, Coffee, PieChart, Activity,
  ShoppingCart, Tag
} from "lucide-react";
import { ManagerLayout } from "@/components/manager-layout";

function getAuthHeaders(): Record<string, string> {
  const emp = localStorage.getItem("currentEmployee");
  if (!emp) return {};
  try {
    const e = JSON.parse(emp);
    const id = e.id || e._id || "";
    const restoreKey = localStorage.getItem("restoreKey") || e.restoreKey || "";
    if (id && restoreKey) return { "x-employee-id": id, "x-restore-key": restoreKey };
  } catch (_) {}
  return {};
}

function formatSAR(v: number | undefined) {
  if (!v && v !== 0) return "—";
  return v.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function StatCard({
  icon: Icon, label, value, sub, color, trend, up,
}: {
  icon: any; label: string; value: string; sub?: string; color: string; trend?: string; up?: boolean;
}) {
  return (
    <Card className="bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}18` }}>
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
          {trend && (
            <div className={`flex items-center gap-1 text-xs font-medium ${up ? "text-green-600" : "text-red-500"}`}>
              {up ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {trend}
            </div>
          )}
        </div>
        <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
        <div className="text-xs text-gray-500">{label}</div>
        {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-full bg-gray-100 rounded-full h-2">
      <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export default function TahalyliPage() {
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [branchId, setBranchId] = useState<string>("all");
  const [branches, setBranches] = useState<any[]>([]);

  // Fetch branches
  useEffect(() => {
    fetch("/api/branches", { credentials: "include", headers: getAuthHeaders() })
      .then(r => r.ok ? r.json() : [])
      .then(d => setBranches(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  // --- Daily Summary ---
  const { data: summary, isLoading: loadingSummary, refetch: refetchSummary } = useQuery<any>({
    queryKey: ["/api/accounting/daily-summary", date, branchId],
    queryFn: () => {
      const params = new URLSearchParams({ date });
      if (branchId && branchId !== "all") params.set("branchId", branchId);
      return fetch(`/api/accounting/daily-summary?${params}`, { credentials: "include", headers: getAuthHeaders() })
        .then(r => r.ok ? r.json() : null);
    },
    refetchInterval: 60000,
  });

  // --- Accounting Dashboard (top items + expense breakdown) ---
  const { data: dashboard, isLoading: loadingDash, refetch: refetchDash } = useQuery<any>({
    queryKey: ["/api/accounting/dashboard", branchId, "today"],
    queryFn: () => {
      const params = new URLSearchParams({ period: "today" });
      if (branchId && branchId !== "all") params.set("branchId", branchId);
      return fetch(`/api/accounting/dashboard?${params}`, { credentials: "include", headers: getAuthHeaders() })
        .then(r => r.ok ? r.json() : null);
    },
    refetchInterval: 60000,
  });

  // --- Sales report for today (order list details) ---
  const { data: salesReport } = useQuery<any>({
    queryKey: ["/api/reports/sales", date, branchId],
    queryFn: () => {
      const params = new URLSearchParams({ period: "daily", startDate: date, endDate: date });
      if (branchId && branchId !== "all") params.set("branchId", branchId);
      return fetch(`/api/reports/sales?${params}`, { credentials: "include", headers: getAuthHeaders() })
        .then(r => r.ok ? r.json() : null);
    },
  });

  const refetchAll = () => { refetchSummary(); refetchDash(); };
  const isLoading = loadingSummary || loadingDash;

  // computed values
  const totalRevenue = summary?.totalRevenue ?? 0;
  const netProfit = summary?.netProfit ?? 0;
  const grossProfit = summary?.grossProfit ?? 0;
  const totalOrders = summary?.totalOrders ?? 0;
  const cancelledOrders = summary?.cancelledOrders ?? 0;
  const totalVat = summary?.totalVatCollected ?? 0;
  const totalExpenses = summary?.totalExpenses ?? 0;
  const totalDiscounts = summary?.totalDiscounts ?? 0;
  const totalCogs = summary?.totalCogs ?? 0;
  const cashRev = summary?.cashRevenue ?? 0;
  const cardRev = summary?.cardRevenue ?? 0;
  const loyaltyRev = totalRevenue - cashRev - cardRev;
  const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100) : 0;
  const avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const topItems: any[] = dashboard?.topSellingItems ?? [];
  const expensesByCategory: any[] = dashboard?.expensesByCategory ?? [];
  const revenueByPayment: any = dashboard?.revenueByPayment ?? {};

  const today = new Date();
  const todayStr = today.toLocaleDateString("ar-SA", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const isToday = date === today.toISOString().split("T")[0];

  return (
    <ManagerLayout>
      <div className="min-h-screen bg-gray-50" dir="rtl">
        <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">

          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-amber-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">تحاليلي</h1>
                {isToday && (
                  <Badge className="bg-green-100 text-green-700 border-0 text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block mr-1 animate-pulse" />
                    مباشر
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-500 mr-13">{todayStr}</p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Branch selector */}
              {branches.length > 1 && (
                <Select value={branchId} onValueChange={setBranchId}>
                  <SelectTrigger className="w-36 h-9 text-sm bg-white border-gray-200">
                    <SelectValue placeholder="كل الفروع" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل الفروع</SelectItem>
                    {branches.map((b: any) => (
                      <SelectItem key={b.id || b._id} value={b.id || b._id}>
                        {b.nameAr || b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {/* Date picker */}
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                max={today.toISOString().split("T")[0]}
                className="h-9 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30"
                data-testid="input-date"
              />
              <Button size="sm" variant="outline" onClick={refetchAll} disabled={isLoading} className="h-9">
                <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>

          {/* ── Revenue & Profit Cards ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              icon={Banknote} label="إجمالي المبيعات" color="#2D9B6E"
              value={`${formatSAR(totalRevenue)} ر.س`}
              sub={`${totalOrders} طلب مكتمل`}
            />
            <StatCard
              icon={TrendingUp} label="صافي الربح" color="#3b82f6"
              value={`${formatSAR(netProfit)} ر.س`}
              sub={`هامش ${profitMargin.toFixed(1)}%`}
              up={netProfit >= 0}
            />
            <StatCard
              icon={ShoppingCart} label="متوسط الطلب" color="#8b5cf6"
              value={`${formatSAR(avgOrder)} ر.س`}
              sub={`${cancelledOrders} طلب ملغي`}
            />
            <StatCard
              icon={Receipt} label="ضريبة القيمة المضافة" color="#f59e0b"
              value={`${formatSAR(totalVat)} ر.س`}
              sub="15% VAT"
            />
          </div>

          {/* ── Costs Row ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCard
              icon={Package} label="تكلفة البضاعة المباعة (COGS)" color="#ef4444"
              value={`${formatSAR(totalCogs)} ر.س`}
            />
            <StatCard
              icon={Tag} label="المصروفات التشغيلية" color="#f97316"
              value={`${formatSAR(totalExpenses)} ر.س`}
            />
            <StatCard
              icon={Percent} label="إجمالي الخصومات" color="#6366f1"
              value={`${formatSAR(totalDiscounts)} ر.س`}
              sub={totalRevenue > 0 ? `${((totalDiscounts / (totalRevenue + totalDiscounts)) * 100).toFixed(1)}% من المبيعات` : undefined}
            />
          </div>

          {/* ── Payment Methods ── */}
          <Card className="bg-white border-gray-100 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-gray-800">
                <Wallet className="w-4 h-4 text-primary" />
                توزيع طرق الدفع
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "نقدي", value: cashRev, icon: Banknote, color: "#2D9B6E" },
                { label: "شبكة / بطاقة", value: cardRev, icon: CreditCard, color: "#3b82f6" },
                { label: "بطاقة ولاء", value: Math.max(loyaltyRev, 0), icon: Star, color: "#f59e0b" },
              ].map(pm => (
                <div key={pm.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <pm.icon className="w-4 h-4" style={{ color: pm.color }} />
                      <span className="text-gray-700 font-medium">{pm.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 text-xs">
                        {totalRevenue > 0 ? `${((pm.value / totalRevenue) * 100).toFixed(1)}%` : "0%"}
                      </span>
                      <span className="font-bold text-gray-900">{formatSAR(pm.value)} ر.س</span>
                    </div>
                  </div>
                  <ProgressBar value={pm.value} max={totalRevenue} color={pm.color} />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* ── Profit Breakdown ── */}
          <Card className="bg-white border-gray-100 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-gray-800">
                <PieChart className="w-4 h-4 text-primary" />
                تحليل الربحية
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { label: "إجمالي المبيعات", value: totalRevenue, color: "#2D9B6E", pct: 100 },
                  { label: "تكلفة البضاعة (COGS)", value: totalCogs, color: "#ef4444", pct: totalRevenue > 0 ? (totalCogs / totalRevenue) * 100 : 0 },
                  { label: "المصروفات التشغيلية", value: totalExpenses, color: "#f97316", pct: totalRevenue > 0 ? (totalExpenses / totalRevenue) * 100 : 0 },
                  { label: "ضريبة القيمة المضافة", value: totalVat, color: "#f59e0b", pct: totalRevenue > 0 ? (totalVat / totalRevenue) * 100 : 0 },
                  { label: "صافي الربح", value: netProfit, color: "#3b82f6", pct: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0 },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between py-1 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ background: row.color }} />
                      <span className="text-sm text-gray-700">{row.label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400">{row.pct.toFixed(1)}%</span>
                      <span className="font-bold text-sm" style={{ color: row.label === "صافي الربح" && row.value < 0 ? "#ef4444" : row.color }}>
                        {formatSAR(row.value)} ر.س
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* ── Top Selling Items ── */}
          {topItems.length > 0 && (
            <Card className="bg-white border-gray-100 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-gray-800">
                  <Award className="w-4 h-4 text-amber-500" />
                  أكثر المنتجات مبيعًا اليوم
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {topItems.slice(0, 10).map((item: any, i: number) => (
                  <div key={item.itemId || i} className="flex items-center gap-3 py-1.5 border-b border-gray-50 last:border-0">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                      style={{ background: i === 0 ? "#f59e0b" : i === 1 ? "#94a3b8" : i === 2 ? "#b45309" : "#e5e7eb", color: i > 2 ? "#6b7280" : "white" }}
                    >
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-800 truncate">{item.nameAr || item.name}</div>
                      <div className="text-xs text-gray-400">{item.totalQuantity ?? item.count ?? 0} وحدة مباعة</div>
                    </div>
                    <div className="text-sm font-bold text-primary">{formatSAR(item.totalRevenue ?? item.revenue)} ر.س</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* ── Expenses by Category ── */}
          {expensesByCategory.length > 0 && (
            <Card className="bg-white border-gray-100 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-gray-800">
                  <BarChart3 className="w-4 h-4 text-orange-500" />
                  المصروفات حسب الفئة
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {expensesByCategory.map((cat: any, i: number) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">{cat.category || cat._id || "أخرى"}</span>
                      <span className="font-bold text-gray-900">{formatSAR(cat.total ?? cat.amount)} ر.س</span>
                    </div>
                    <ProgressBar value={cat.total ?? cat.amount} max={totalExpenses} color="#f97316" />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* ── Orders Summary ── */}
          <Card className="bg-white border-gray-100 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-gray-800">
                <Activity className="w-4 h-4 text-blue-500" />
                ملخص الطلبات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-green-50 rounded-xl p-3">
                  <div className="text-2xl font-bold text-green-700">{totalOrders}</div>
                  <div className="text-xs text-green-600 mt-1">مكتمل</div>
                </div>
                <div className="bg-red-50 rounded-xl p-3">
                  <div className="text-2xl font-bold text-red-600">{cancelledOrders}</div>
                  <div className="text-xs text-red-500 mt-1">ملغي</div>
                </div>
                <div className="bg-blue-50 rounded-xl p-3">
                  <div className="text-2xl font-bold text-blue-700">{totalOrders + cancelledOrders}</div>
                  <div className="text-xs text-blue-600 mt-1">إجمالي</div>
                </div>
              </div>
              {salesReport?.orders && salesReport.orders.length > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-2">آخر {Math.min(salesReport.orders.length, 5)} طلبات</p>
                  <div className="space-y-2">
                    {salesReport.orders.slice(0, 5).map((order: any) => (
                      <div key={order.id || order._id} className="flex items-center justify-between text-sm py-1">
                        <div className="flex items-center gap-2">
                          <Coffee className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-gray-700">#{order.orderNumber || order.id?.slice(-4)}</span>
                          <span className="text-gray-400 text-xs">
                            {order.createdAt ? new Date(order.createdAt).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }) : ""}
                          </span>
                        </div>
                        <span className="font-medium text-primary">{formatSAR(order.totalPrice ?? order.total)} ر.س</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── End of Day Summary Banner ── */}
          {isToday && (
            <Card className={`border-2 ${netProfit >= 0 ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50"}`}>
              <CardContent className="p-4 text-center space-y-2">
                <div className={`text-lg font-bold ${netProfit >= 0 ? "text-green-700" : "text-red-700"}`}>
                  {netProfit >= 0 ? "🎉 يوم رائع!" : "⚠️ تنبيه الربحية"}
                </div>
                <div className={`text-sm ${netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {netProfit >= 0
                    ? `ربحت اليوم ${formatSAR(netProfit)} ر.س بهامش ربح ${profitMargin.toFixed(1)}%`
                    : `خسرت اليوم ${formatSAR(Math.abs(netProfit))} ر.س — راجع المصروفات`}
                </div>
                <div className="text-xs text-gray-500">
                  {totalOrders} طلب • متوسط {formatSAR(avgOrder)} ر.س • ضريبة {formatSAR(totalVat)} ر.س
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {!isLoading && totalOrders === 0 && totalRevenue === 0 && (
            <Card className="bg-white border-dashed border-gray-200">
              <CardContent className="p-12 text-center">
                <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">لا توجد مبيعات لهذا اليوم</p>
                <p className="text-gray-400 text-sm mt-1">اختر تاريخًا آخر أو انتظر أول طلب</p>
              </CardContent>
            </Card>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}

          <div className="h-8" />
        </div>
      </div>
    </ManagerLayout>
  );
}
