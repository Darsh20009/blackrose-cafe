import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight, Bug, Trash2, RefreshCw, Loader2, Monitor,
  Smartphone, Tablet, Chrome, Globe, Clock, AlertCircle,
  XCircle, Image, ChevronDown, ChevronUp, Search
} from "lucide-react";

interface ErrorLog {
  id: string;
  type: string;
  message: string;
  stack?: string;
  page: string;
  lastButton?: string;
  lastApiCall?: string;
  lastApiStatus?: number;
  username?: string;
  userId?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
  screenSize?: string;
  screenshot?: string;
  extra?: Record<string, any>;
  createdAt: string;
}

const typeColors: Record<string, string> = {
  js_error: "bg-red-100 text-red-700",
  promise_rejection: "bg-orange-100 text-orange-700",
  api_error: "bg-yellow-100 text-yellow-700",
  manual: "bg-blue-100 text-blue-700",
  performance: "bg-purple-100 text-purple-700",
};

const typeLabels: Record<string, string> = {
  js_error: "خطأ JS",
  promise_rejection: "Promise Rejection",
  api_error: "خطأ API",
  manual: "يدوي",
  performance: "أداء",
};

function DeviceIcon({ type }: { type?: string }) {
  if (type === "mobile") return <Smartphone size={14} />;
  if (type === "tablet") return <Tablet size={14} />;
  return <Monitor size={14} />;
}

function ErrorCard({ log }: { log: ErrorLog }) {
  const [expanded, setExpanded] = useState(false);
  const [showScreenshot, setShowScreenshot] = useState(false);

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            <XCircle size={18} className="text-red-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColors[log.type] || "bg-gray-100 text-gray-700"}`}>
                {typeLabels[log.type] || log.type}
              </span>
              {log.username && (
                <span className="text-xs text-gray-500">👤 {log.username}</span>
              )}
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Clock size={11} />
                {new Date(log.createdAt).toLocaleString("ar-SA")}
              </span>
            </div>
            <p className="text-sm font-medium text-gray-800 break-all">{log.message}</p>
            <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Globe size={11} /> {log.page}
              </span>
              {log.lastButton && (
                <span className="flex items-center gap-1">
                  🖱️ آخر زر: <span className="text-gray-700 font-medium">{log.lastButton}</span>
                </span>
              )}
              {log.lastApiCall && (
                <span className="flex items-center gap-1">
                  📡 آخر API: <span className="font-mono text-gray-700">{log.lastApiCall}</span>
                  {log.lastApiStatus && <Badge variant="outline" className="text-xs">{log.lastApiStatus}</Badge>}
                </span>
              )}
              <span className="flex items-center gap-1">
                <DeviceIcon type={log.deviceType} />
                {log.browser} / {log.os} / {log.screenSize}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {log.screenshot && (
              <button
                onClick={() => setShowScreenshot(!showScreenshot)}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600"
                title="عرض لقطة الشاشة"
              >
                <Image size={15} />
              </button>
            )}
            {log.stack && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600"
              >
                {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </button>
            )}
          </div>
        </div>

        {showScreenshot && log.screenshot && (
          <div className="mt-3 border border-gray-200 rounded-lg overflow-hidden">
            <img src={log.screenshot} alt="Screenshot" className="w-full max-h-64 object-contain bg-gray-50" />
          </div>
        )}

        {expanded && log.stack && (
          <pre className="mt-3 bg-gray-900 text-gray-100 text-xs p-3 rounded-lg overflow-x-auto leading-relaxed whitespace-pre-wrap">
            {log.stack}
          </pre>
        )}
      </div>
    </div>
  );
}

export default function ErrorLogsPage() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const { data, isLoading, refetch } = useQuery<{ logs: ErrorLog[]; total: number }>({
    queryKey: ["/api/error-logs", typeFilter],
    queryFn: () =>
      fetch(`/api/error-logs?limit=100${typeFilter !== "all" ? `&type=${typeFilter}` : ""}`)
        .then(r => r.json()),
  });

  const clearMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", "/api/error-logs"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/error-logs"] }),
  });

  const logs = data?.logs || [];
  const filtered = search
    ? logs.filter(l =>
        l.message.toLowerCase().includes(search.toLowerCase()) ||
        l.page.includes(search) ||
        l.username?.toLowerCase().includes(search.toLowerCase())
      )
    : logs;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900" dir="rtl">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => setLocation("/owner/dashboard")} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowRight size={18} />
          </button>
          <Bug size={22} className="text-red-500" />
          <div>
            <h1 className="font-bold text-lg leading-none">سجل الأخطاء</h1>
            <p className="text-xs text-gray-500">جميع الأخطاء المُسجَّلة تلقائياً</p>
          </div>
          <div className="mr-auto flex items-center gap-2">
            <button
              onClick={() => refetch()}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
            >
              <RefreshCw size={16} />
            </button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => { if (confirm("هل أنت متأكد من مسح جميع الأخطاء؟")) clearMutation.mutate(); }}
              disabled={clearMutation.isPending}
              className="flex items-center gap-1.5"
            >
              <Trash2 size={14} />
              مسح الكل
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-5 space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ابحث في الأخطاء..."
              className="w-full pr-9 pl-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          {["all", "js_error", "promise_rejection", "api_error", "manual"].map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${typeFilter === t ? "bg-primary text-white border-primary" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"}`}
            >
              {t === "all" ? "الكل" : typeLabels[t] || t}
            </button>
          ))}
        </div>

        {/* Stats row */}
        {data && (
          <div className="flex gap-3 text-sm text-gray-500">
            <span>إجمالي: <strong className="text-gray-800">{data.total}</strong></span>
            <span>•</span>
            <span>معروض: <strong className="text-gray-800">{filtered.length}</strong></span>
          </div>
        )}

        {/* Logs */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <Loader2 size={32} className="animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <AlertCircle size={64} className="mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium">لا توجد أخطاء</p>
            <p className="text-sm mt-1">سيتم تسجيل الأخطاء هنا تلقائياً</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(log => <ErrorCard key={log.id} log={log} />)}
          </div>
        )}
      </div>
    </div>
  );
}
