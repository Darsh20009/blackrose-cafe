import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Brain, Sparkles, BookOpen, TrendingUp, Package,
  FileText, Loader2, RefreshCw, CheckCircle2, AlertTriangle,
  Calendar, DollarSign, ShoppingCart, Users, BarChart3,
  ClipboardList, Zap, Download, Copy, Bot
} from "lucide-react";

interface JournalData {
  journal: string;
  summary: {
    totalSales: number; cashSales: number; cardSales: number;
    totalCOGS: number; vatAmount: number; netSales: number;
    totalExp: number; ordersCount: number; date: string;
  };
}

interface ReportData {
  report: string;
  stats: {
    todayRev: number; yesterdayRev: number; growth: string;
    ordersCount: number; topProducts: { name: string; qty: number; rev: number }[];
    lowStockCount: number; presentCount: number; totalEmployees: number; date: string;
  };
}

function StatCard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string; sub?: string; color: string }) {
  return (
    <div className={`rounded-xl p-4 ${color} flex items-start gap-3`}>
      <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-white/70 text-xs">{label}</p>
        <p className="text-white font-bold text-lg leading-tight">{value}</p>
        {sub && <p className="text-white/60 text-xs mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button variant="ghost" size="sm" className="gap-1 text-xs"
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
      {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "تم النسخ" : "نسخ"}
    </Button>
  );
}

export default function AIControlCenter() {
  const { toast } = useToast();
  const [journalData, setJournalData] = useState<JournalData | null>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);

  const journalMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ai/auto-journal", {});
      if (!res.ok) throw new Error("فشل في توليد القيود");
      return res.json() as Promise<JournalData>;
    },
    onSuccess: (data) => {
      setJournalData(data);
      toast({ title: "✅ تم توليد القيود المحاسبية", description: "القيود اليومية جاهزة للمراجعة" });
    },
    onError: () => toast({ title: "خطأ", description: "فشل في توليد القيود المحاسبية", variant: "destructive" }),
  });

  const reportMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ai/daily-report", {});
      if (!res.ok) throw new Error("فشل في توليد التقرير");
      return res.json() as Promise<ReportData>;
    },
    onSuccess: (data) => {
      setReportData(data);
      toast({ title: "✅ تم توليد التقرير اليومي", description: "التقرير جاهز للمراجعة" });
    },
    onError: () => toast({ title: "خطأ", description: "فشل في توليد التقرير اليومي", variant: "destructive" }),
  });

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
          style={{ background: "linear-gradient(135deg, #7D3D0F, #D4912A)" }}>
          <Brain className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">مركز الذكاء الاصطناعي</h1>
          <p className="text-muted-foreground text-sm">قيود محاسبية تلقائية • تقارير يومية ذكية • تحليلات متقدمة</p>
        </div>
        <Badge className="mr-auto text-xs px-3 py-1" style={{ background: "#7D3D0F", color: "white" }}>
          <Zap className="w-3 h-3 ml-1" /> Kimi AI مدعوم بـ
        </Badge>
      </div>

      <Tabs defaultValue="journal" className="space-y-4">
        <TabsList className="grid grid-cols-2 w-full md:w-auto">
          <TabsTrigger value="journal" className="gap-2">
            <BookOpen className="w-4 h-4" /> القيود المحاسبية
          </TabsTrigger>
          <TabsTrigger value="report" className="gap-2">
            <BarChart3 className="w-4 h-4" /> التقرير اليومي
          </TabsTrigger>
        </TabsList>

        {/* ─── تاب القيود المحاسبية ─── */}
        <TabsContent value="journal" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <BookOpen className="w-5 h-5 text-blue-600" />
                توليد القيود المحاسبية اليومية تلقائياً
              </CardTitle>
              <CardDescription>
                الذكاء الاصطناعي يقرأ بيانات اليوم ويكتب القيود المحاسبية الكاملة بشكل تلقائي وفق المعايير المحاسبية السعودية
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => journalMutation.mutate()}
                disabled={journalMutation.isPending}
                className="gap-2 w-full md:w-auto"
                style={{ background: "linear-gradient(135deg, #7D3D0F, #D4912A)", color: "white" }}
                size="lg"
              >
                {journalMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> جاري توليد القيود...</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> توليد قيود اليوم تلقائياً</>
                )}
              </Button>
            </CardContent>
          </Card>

          {journalData && (
            <>
              {/* ملخص أرقام */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard icon={DollarSign} label="إجمالي المبيعات" value={`${journalData.summary.totalSales.toFixed(0)} ر`} sub="شامل VAT" color="bg-green-600" />
                <StatCard icon={ShoppingCart} label="عدد الطلبات" value={`${journalData.summary.ordersCount}`} sub={journalData.summary.date} color="bg-blue-600" />
                <StatCard icon={FileText} label="ضريبة القيمة المضافة" value={`${journalData.summary.vatAmount.toFixed(0)} ر`} sub="15%" color="bg-orange-600" />
                <StatCard icon={TrendingUp} label="صافي المبيعات" value={`${journalData.summary.netSales.toFixed(0)} ر`} sub="بدون VAT" color="bg-purple-600" />
              </div>

              {/* القيود */}
              <Card>
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    القيود المحاسبية ليوم {journalData.summary.date}
                  </CardTitle>
                  <div className="flex gap-2">
                    <CopyBtn text={journalData.journal} />
                    <Button variant="outline" size="sm" className="gap-1 text-xs"
                      onClick={() => {
                        const blob = new Blob([journalData.journal], { type: "text/plain;charset=utf-8" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a"); a.href = url;
                        a.download = `قيود-${journalData.summary.date}.txt`; a.click();
                      }}>
                      <Download className="w-3.5 h-3.5" /> تنزيل
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-80">
                    <pre className="text-sm whitespace-pre-wrap leading-7 font-mono bg-muted/50 rounded-lg p-4 text-foreground" dir="rtl">
                      {journalData.journal}
                    </pre>
                  </ScrollArea>
                </CardContent>
              </Card>
            </>
          )}

          {!journalData && !journalMutation.isPending && (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>اضغط على الزر أعلاه لتوليد القيود المحاسبية لليوم</p>
            </div>
          )}
        </TabsContent>

        {/* ─── تاب التقرير اليومي ─── */}
        <TabsContent value="report" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="w-5 h-5 text-purple-600" />
                توليد التقرير اليومي الشامل
              </CardTitle>
              <CardDescription>
                تقرير ذكي يشمل المبيعات، المخزون، الموظفين، مقارنة بالأمس، وتوصيات فورية قابلة للتنفيذ
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => reportMutation.mutate()}
                disabled={reportMutation.isPending}
                className="gap-2 w-full md:w-auto"
                style={{ background: "linear-gradient(135deg, #4C1D95, #7C3AED)", color: "white" }}
                size="lg"
              >
                {reportMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> جاري تحليل البيانات...</>
                ) : (
                  <><Brain className="w-4 h-4" /> توليد تقرير اليوم</>
                )}
              </Button>
            </CardContent>
          </Card>

          {reportData && (
            <>
              {/* ملخص إحصائيات */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard icon={DollarSign} label="مبيعات اليوم" value={`${reportData.stats.todayRev.toFixed(0)} ر`}
                  sub={`${reportData.stats.growth !== "N/A" ? (parseFloat(reportData.stats.growth) >= 0 ? "▲" : "▼") : ""} ${reportData.stats.growth}% عن أمس`}
                  color={parseFloat(reportData.stats.growth) >= 0 ? "bg-green-600" : "bg-red-600"} />
                <StatCard icon={ShoppingCart} label="عدد الطلبات" value={`${reportData.stats.ordersCount}`} sub={reportData.stats.date} color="bg-blue-600" />
                <StatCard icon={AlertTriangle} label="مخزون منخفض" value={`${reportData.stats.lowStockCount} مادة`} sub="تحتاج إعادة طلب" color={reportData.stats.lowStockCount > 0 ? "bg-orange-600" : "bg-green-600"} />
                <StatCard icon={Users} label="الموظفون" value={`${reportData.stats.presentCount}/${reportData.stats.totalEmployees}`} sub="حضور اليوم" color="bg-purple-600" />
              </div>

              {/* أفضل المنتجات */}
              {reportData.stats.topProducts.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-green-500" /> أفضل المنتجات اليوم
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {reportData.stats.topProducts.map((p, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs flex items-center justify-center font-bold flex-shrink-0">{i + 1}</span>
                          <span className="flex-1 text-sm font-medium">{p.name}</span>
                          <Badge variant="secondary" className="text-xs">{p.qty} وحدة</Badge>
                          <span className="text-sm font-bold text-green-600">{p.rev.toFixed(0)} ر</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* التقرير الكامل */}
              <Card>
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Bot className="w-5 h-5 text-purple-500" />
                    تقرير الذكاء الاصطناعي ليوم {reportData.stats.date}
                  </CardTitle>
                  <div className="flex gap-2">
                    <CopyBtn text={reportData.report} />
                    <Button variant="outline" size="sm" className="gap-1 text-xs"
                      onClick={() => {
                        const blob = new Blob([reportData.report], { type: "text/plain;charset=utf-8" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a"); a.href = url;
                        a.download = `تقرير-يومي-${reportData.stats.date}.txt`; a.click();
                      }}>
                      <Download className="w-3.5 h-3.5" /> تنزيل
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-80">
                    <div className="text-sm leading-7 whitespace-pre-wrap bg-muted/50 rounded-lg p-4 text-foreground" dir="rtl">
                      {reportData.report}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </>
          )}

          {!reportData && !reportMutation.isPending && (
            <div className="text-center py-12 text-muted-foreground">
              <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>اضغط على الزر أعلاه لتوليد التقرير اليومي الشامل</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
