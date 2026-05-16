import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { apiRequest } from "@/lib/queryClient";
import {
  Sparkles, ArrowLeft, FileText, TrendingUp, Users, Package,
  Download, RefreshCw, Loader2, Calendar, BarChart3, AlertCircle,
  CheckCircle2, LightbulbIcon, Target, Clock
} from "lucide-react";

type ReportType = "sales" | "employees" | "inventory" | "customers" | "full";

interface SmartReport {
  type: ReportType;
  period: string;
  generatedAt: string;
  summary: string;
  sections: Array<{
    title: string;
    icon: string;
    content: string;
    bullets?: string[];
    highlight?: string;
  }>;
  recommendations: string[];
  risks: string[];
  kpis: Array<{ label: string; value: string; trend: "up" | "down" | "flat" }>;
}

const REPORT_TYPES: Array<{ id: ReportType; labelAr: string; labelEn: string; icon: any; color: string; desc: string }> = [
  { id: "sales",     labelAr: "تقرير المبيعات",      labelEn: "Sales Report",      icon: TrendingUp,  color: "bg-emerald-500/10 border-emerald-500/30 text-emerald-700", desc: "تحليل الإيرادات والمنتجات والأداء" },
  { id: "employees", labelAr: "تقرير الموظفين",      labelEn: "Employee Report",   icon: Users,       color: "bg-blue-500/10 border-blue-500/30 text-blue-700",    desc: "الأداء والحضور والإنتاجية" },
  { id: "inventory", labelAr: "تقرير المخزون",       labelEn: "Inventory Report",  icon: Package,     color: "bg-amber-500/10 border-amber-500/30 text-amber-700",  desc: "المستودع والنقص والهدر" },
  { id: "customers", labelAr: "تقرير العملاء",       labelEn: "Customer Report",   icon: BarChart3,   color: "bg-purple-500/10 border-purple-500/30 text-purple-700", desc: "ولاء العملاء ومعدل التكرار" },
  { id: "full",      labelAr: "تقرير شامل",          labelEn: "Full Report",       icon: FileText,    color: "bg-primary/10 border-primary/30 text-primary",         desc: "كل شيء في تقرير واحد متكامل" },
];

const PERIODS = [
  { id: "today",  labelAr: "اليوم",     labelEn: "Today" },
  { id: "week",   labelAr: "الأسبوع",   labelEn: "This Week" },
  { id: "month",  labelAr: "الشهر",     labelEn: "This Month" },
];

function formatContent(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br/>");
}

function TrendBadge({ trend }: { trend: "up" | "down" | "flat" }) {
  if (trend === "up") return <span className="text-xs text-emerald-600 font-bold">↑</span>;
  if (trend === "down") return <span className="text-xs text-red-500 font-bold">↓</span>;
  return <span className="text-xs text-muted-foreground font-bold">→</span>;
}

export default function ManagerSmartReports() {
  const [, setLocation] = useLocation();
  const [selectedType, setSelectedType] = useState<ReportType>("sales");
  const [selectedPeriod, setSelectedPeriod] = useState("week");
  const [currentReport, setCurrentReport] = useState<SmartReport | null>(null);

  const reportMutation = useMutation({
    mutationFn: async ({ type, period }: { type: ReportType; period: string }) => {
      const res = await apiRequest("POST", "/api/ai/smart-report", { type, period });
      return res.json();
    },
    onSuccess: (data) => {
      setCurrentReport(data);
    },
  });

  const generateReport = () => {
    reportMutation.mutate({ type: selectedType, period: selectedPeriod });
  };

  const downloadReport = () => {
    if (!currentReport) return;
    const lines: string[] = [
      `تقرير ${currentReport.period} — ${REPORT_TYPES.find(r => r.id === currentReport.type)?.labelAr}`,
      `تاريخ الإنشاء: ${new Date(currentReport.generatedAt).toLocaleString("ar-SA")}`,
      "=".repeat(60),
      "",
      "الملخص التنفيذي:",
      currentReport.summary,
      "",
    ];
    if (currentReport.kpis?.length) {
      lines.push("المؤشرات الرئيسية:");
      currentReport.kpis.forEach(k => lines.push(`  • ${k.label}: ${k.value}`));
      lines.push("");
    }
    currentReport.sections.forEach(s => {
      lines.push(`${s.icon} ${s.title}:`);
      lines.push(s.content.replace(/<[^>]+>/g, ""));
      if (s.bullets?.length) s.bullets.forEach(b => lines.push(`  • ${b}`));
      if (s.highlight) lines.push(`  ⭐ ${s.highlight}`);
      lines.push("");
    });
    if (currentReport.recommendations?.length) {
      lines.push("التوصيات:");
      currentReport.recommendations.forEach((r, i) => lines.push(`  ${i + 1}. ${r}`));
      lines.push("");
    }
    if (currentReport.risks?.length) {
      lines.push("المخاطر والتحذيرات:");
      currentReport.risks.forEach((r) => lines.push(`  ⚠️ ${r}`));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `smart-report-${currentReport.type}-${selectedPeriod}-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectedTypeInfo = REPORT_TYPES.find(r => r.id === selectedType)!;
  const isGenerating = reportMutation.isPending;
  const hasError = reportMutation.isError;

  return (
    <div className="min-h-screen bg-background p-4 md:p-6" dir="rtl">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/manager/dashboard")} data-testid="btn-back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold leading-none">تقارير الذكاء الاصطناعي</h1>
              <p className="text-xs text-muted-foreground mt-0.5">تقارير ذكية مولّدة بـ AI من بيانات الكافيه الحقيقية</p>
            </div>
          </div>
          {currentReport && (
            <Button variant="outline" size="sm" onClick={downloadReport} data-testid="btn-download-report">
              <Download className="w-4 h-4 ml-1" />
              تحميل
            </Button>
          )}
        </div>

        {/* Config Panel */}
        <Card>
          <CardContent className="p-5 space-y-5">
            {/* Report Type */}
            <div>
              <p className="text-sm font-semibold mb-3 text-muted-foreground">نوع التقرير</p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {REPORT_TYPES.map(type => {
                  const Icon = type.icon;
                  const isActive = selectedType === type.id;
                  return (
                    <button
                      key={type.id}
                      onClick={() => setSelectedType(type.id)}
                      data-testid={`btn-report-type-${type.id}`}
                      className={`p-3 rounded-xl border text-right transition-all ${isActive ? type.color + " ring-2 ring-offset-1 ring-primary/30" : "border-border hover:border-primary/30 hover:bg-muted/30"}`}
                    >
                      <Icon className={`w-4 h-4 mb-1.5 ${isActive ? "" : "text-muted-foreground"}`} />
                      <p className="text-xs font-semibold leading-tight">{type.labelAr}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Period */}
            <div>
              <p className="text-sm font-semibold mb-3 text-muted-foreground">الفترة الزمنية</p>
              <div className="flex gap-2">
                {PERIODS.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPeriod(p.id)}
                    data-testid={`btn-period-${p.id}`}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${selectedPeriod === p.id ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/30"}`}
                  >
                    {p.labelAr}
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={generateReport}
              disabled={isGenerating}
              className="w-full"
              data-testid="btn-generate-report"
            >
              {isGenerating ? (
                <><Loader2 className="w-4 h-4 ml-2 animate-spin" />جاري التوليد...</>
              ) : (
                <><Sparkles className="w-4 h-4 ml-2" />توليد التقرير</>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Error State */}
        {hasError && (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
              <p className="text-sm text-destructive">فشل توليد التقرير — تأكد من إعداد مفتاح Groq API أو حاول مرة أخرى.</p>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {isGenerating && (
          <Card>
            <CardContent className="p-8 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Sparkles className="w-7 h-7 text-primary animate-pulse" />
              </div>
              <p className="font-semibold">يحلل الذكاء الاصطناعي بياناتك...</p>
              <p className="text-sm text-muted-foreground">قد يستغرق ذلك 10-20 ثانية</p>
            </CardContent>
          </Card>
        )}

        {/* Report Output */}
        {currentReport && !isGenerating && (
          <div className="space-y-4">
            {/* Report Header */}
            <Card className="bg-gradient-to-br from-violet-500/5 to-purple-500/10 border-violet-200 dark:border-violet-800">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs border-violet-400 text-violet-700">
                        {REPORT_TYPES.find(r => r.id === currentReport.type)?.labelAr}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        <Calendar className="w-3 h-3 ml-1" />
                        {PERIODS.find(p => p.id === currentReport.period)?.labelAr}
                      </Badge>
                    </div>
                    <p className="text-sm leading-relaxed text-foreground">{currentReport.summary}</p>
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap shrink-0 flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3" />
                    {new Date(currentReport.generatedAt).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* KPIs */}
            {currentReport.kpis?.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {currentReport.kpis.map((kpi, i) => (
                  <Card key={i} className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">{kpi.label}</p>
                    <div className="flex items-center gap-1.5">
                      <p className="text-lg font-bold">{kpi.value}</p>
                      <TrendBadge trend={kpi.trend} />
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Sections */}
            {currentReport.sections?.map((section, i) => (
              <Card key={i}>
                <CardHeader className="pb-3 pt-4 px-5">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span>{section.icon}</span>
                    {section.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-4 space-y-3">
                  <p className="text-sm text-muted-foreground leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: formatContent(section.content) }} />
                  {section.bullets && section.bullets.length > 0 && (
                    <ul className="space-y-1.5">
                      {section.bullets.map((b, j) => (
                        <li key={j} className="flex gap-2 text-sm">
                          <span className="text-primary mt-0.5 shrink-0">•</span>
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {section.highlight && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 flex gap-2">
                      <span className="text-amber-500 shrink-0">⭐</span>
                      {section.highlight}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {/* Recommendations + Risks */}
            <div className="grid md:grid-cols-2 gap-4">
              {currentReport.recommendations?.length > 0 && (
                <Card className="border-emerald-200 bg-emerald-50/50 dark:bg-emerald-900/10">
                  <CardHeader className="pb-2 pt-4 px-5">
                    <CardTitle className="text-sm flex items-center gap-2 text-emerald-700">
                      <LightbulbIcon className="w-4 h-4" />
                      التوصيات
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-4">
                    <ol className="space-y-2">
                      {currentReport.recommendations.map((rec, i) => (
                        <li key={i} className="flex gap-2 text-sm">
                          <span className="text-emerald-600 font-bold shrink-0">{i + 1}.</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ol>
                  </CardContent>
                </Card>
              )}

              {currentReport.risks?.length > 0 && (
                <Card className="border-red-200 bg-red-50/50 dark:bg-red-900/10">
                  <CardHeader className="pb-2 pt-4 px-5">
                    <CardTitle className="text-sm flex items-center gap-2 text-red-600">
                      <AlertCircle className="w-4 h-4" />
                      مخاطر وتحذيرات
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-4">
                    <ul className="space-y-2">
                      {currentReport.risks.map((risk, i) => (
                        <li key={i} className="flex gap-2 text-sm">
                          <span className="text-red-500 shrink-0">⚠️</span>
                          <span>{risk}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Regenerate */}
            <div className="flex justify-center">
              <Button variant="outline" size="sm" onClick={generateReport} data-testid="btn-regenerate">
                <RefreshCw className="w-3.5 h-3.5 ml-1.5" />
                إعادة توليد
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
