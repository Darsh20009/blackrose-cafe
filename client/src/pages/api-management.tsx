import { useState } from "react";
import { PlanGate } from "@/components/plan-gate";
import { useTranslate } from "@/lib/useTranslate";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Key, Copy, Plus, Trash2, Eye, EyeOff, Search, ShieldCheck, Loader2,
  Star, Download, Check, ExternalLink, Zap, Globe, MessageSquare,
  CreditCard, Truck, BarChart3, Bell, Printer, QrCode, Gift, Shield,
  Webhook, Bot, Package, ChevronRight, Sparkles, ArrowRight,
  Store, Code2, Filter
} from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

/* ─── App definitions ─── */
interface AppDefinition {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  category: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  rating: number;
  installs: string;
  status: "installed" | "available" | "coming_soon" | "configure";
  featured?: boolean;
  badge?: string;
}

const APPS: AppDefinition[] = [
  {
    id: "zatca", name: "ZATCA Compliance", nameAr: "فاتورة زاتكا",
    description: "E-invoicing compliance with Saudi ZATCA regulations. Generate QR codes and submit invoices automatically.",
    descriptionAr: "الامتثال للفاتورة الإلكترونية وفقاً للوائح هيئة الزكاة. توليد QR وإرسال الفواتير تلقائياً.",
    category: "compliance", icon: Shield, iconBg: "bg-green-50", iconColor: "text-green-600",
    rating: 4.9, installs: "2.4k", status: "installed", featured: true, badge: "مطلوب",
  },
  {
    id: "whatsapp", name: "WhatsApp Notifications", nameAr: "إشعارات واتساب",
    description: "Send order updates, promotions, and loyalty rewards directly via WhatsApp.",
    descriptionAr: "إرسال تحديثات الطلبات والعروض ومكافآت الولاء مباشرة عبر واتساب.",
    category: "marketing", icon: MessageSquare, iconBg: "bg-emerald-50", iconColor: "text-emerald-600",
    rating: 4.8, installs: "5.1k", status: "available", featured: true,
  },
  {
    id: "apple-wallet", name: "Apple Wallet Pass", nameAr: "بطاقة Apple Wallet",
    description: "Issue digital loyalty cards that customers add to their Apple Wallet. Auto-updates on points change.",
    descriptionAr: "إصدار بطاقات ولاء رقمية يضيفها العملاء لـ Apple Wallet. تتحدث تلقائياً مع تغيير النقاط.",
    category: "loyalty", icon: CreditCard, iconBg: "bg-slate-50", iconColor: "text-slate-700",
    rating: 4.7, installs: "3.2k", status: "configure", badge: "يحتاج إعداد",
  },
  {
    id: "delivery", name: "Delivery Tracking", nameAr: "تتبع التوصيل",
    description: "Real-time GPS delivery tracking with Apple Maps integration for both customers and drivers.",
    descriptionAr: "تتبع GPS فوري مع خرائط Apple للعملاء والسائقين.",
    category: "operations", icon: Truck, iconBg: "bg-blue-50", iconColor: "text-blue-600",
    rating: 4.6, installs: "1.8k", status: "installed",
  },
  {
    id: "push", name: "Push Notifications", nameAr: "الإشعارات الفورية",
    description: "Send targeted push notifications to customers' phones for promotions and order updates.",
    descriptionAr: "إرسال إشعارات مخصصة لهواتف العملاء للعروض وتحديثات الطلبات.",
    category: "marketing", icon: Bell, iconBg: "bg-orange-50", iconColor: "text-orange-600",
    rating: 4.5, installs: "4.3k", status: "installed",
  },
  {
    id: "analytics", name: "Advanced Analytics", nameAr: "التحليلات المتقدمة",
    description: "Deep business intelligence with revenue trends, customer behavior, and AI-powered insights.",
    descriptionAr: "ذكاء اصطناعي تجاري متقدم مع اتجاهات الإيرادات وسلوك العملاء.",
    category: "analytics", icon: BarChart3, iconBg: "bg-purple-50", iconColor: "text-purple-600",
    rating: 4.9, installs: "2.9k", status: "installed", featured: true,
  },
  {
    id: "loyalty", name: "Loyalty Program", nameAr: "برنامج الولاء",
    description: "Points-based loyalty system with tiers, rewards, and referral tracking.",
    descriptionAr: "نظام نقاط مع مستويات ومكافآت وتتبع الإحالات.",
    category: "loyalty", icon: Gift, iconBg: "bg-pink-50", iconColor: "text-pink-600",
    rating: 4.8, installs: "6.7k", status: "installed",
  },
  {
    id: "qr-menu", name: "QR Digital Menu", nameAr: "القائمة الرقمية QR",
    description: "Contactless digital menu via QR codes. Customers scan to order from their phones.",
    descriptionAr: "قائمة رقمية بدون لمس عبر رموز QR. العملاء يمسحون ويطلبون من هواتفهم.",
    category: "operations", icon: QrCode, iconBg: "bg-indigo-50", iconColor: "text-indigo-600",
    rating: 4.7, installs: "4.1k", status: "installed",
  },
  {
    id: "printing", name: "Smart Printing", nameAr: "الطباعة الذكية",
    description: "Network receipt printing with custom templates for kitchen, bar, and cashier stations.",
    descriptionAr: "طباعة إيصالات شبكية مع قوالب مخصصة للمطبخ والبار والكاشير.",
    category: "operations", icon: Printer, iconBg: "bg-gray-50", iconColor: "text-gray-600",
    rating: 4.6, installs: "3.4k", status: "installed",
  },
  {
    id: "ai-assistant", name: "AI Assistant", nameAr: "المساعد الذكي",
    description: "AI-powered business insights, demand forecasting, and automated staff scheduling.",
    descriptionAr: "رؤى الأعمال المدعومة بالذكاء الاصطناعي وتوقع الطلب وجدولة الموظفين.",
    category: "analytics", icon: Bot, iconBg: "bg-violet-50", iconColor: "text-violet-600",
    rating: 4.8, installs: "1.2k", status: "available", badge: "جديد", featured: true,
  },
  {
    id: "webhook", name: "Webhooks & Automations", nameAr: "الأتمتة والـ Webhooks",
    description: "Connect to any third-party service with real-time webhooks and event triggers.",
    descriptionAr: "الاتصال بأي خدمة خارجية عبر webhooks فورية ومشغلات الأحداث.",
    category: "developer", icon: Webhook, iconBg: "bg-teal-50", iconColor: "text-teal-600",
    rating: 4.5, installs: "987", status: "available",
  },
  {
    id: "inventory-auto", name: "Auto Inventory", nameAr: "المخزون التلقائي",
    description: "Automatic stock deduction on orders with low-stock alerts and supplier integration.",
    descriptionAr: "خصم المخزون تلقائياً عند الطلبات مع تنبيهات النفاد وتكامل الموردين.",
    category: "operations", icon: Package, iconBg: "bg-amber-50", iconColor: "text-amber-600",
    rating: 4.7, installs: "2.1k", status: "installed",
  },
];

const CATEGORIES = [
  { id: "all", label: "الكل", labelEn: "All" },
  { id: "installed", label: "المثبتة", labelEn: "Installed" },
  { id: "operations", label: "العمليات", labelEn: "Operations" },
  { id: "marketing", label: "التسويق", labelEn: "Marketing" },
  { id: "analytics", label: "التحليلات", labelEn: "Analytics" },
  { id: "loyalty", label: "الولاء", labelEn: "Loyalty" },
  { id: "compliance", label: "الامتثال", labelEn: "Compliance" },
  { id: "developer", label: "المطورون", labelEn: "Developer" },
];

interface ApiKey {
  _id: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsed?: string;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(s => (
        <Star key={s} className={cn("w-3 h-3", s <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-gray-200")} />
      ))}
    </div>
  );
}

export default function ApiManagementPage() {
  const tc = useTranslate();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [showApiKeys, setShowApiKeys] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const { data: apiKeys = [], isLoading: keysLoading } = useQuery<ApiKey[]>({
    queryKey: ["/api/api-keys"],
    retry: false,
  });

  const createKeyMutation = useMutation({
    mutationFn: async (name: string) => apiRequest("POST", "/api/api-keys", { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] });
      setIsCreateOpen(false);
      setNewKeyName("");
      toast({ title: tc("✅ تم إنشاء مفتاح API", "✅ API key created") });
    },
    onError: () => toast({ title: tc("فشل إنشاء المفتاح", "Failed to create key"), variant: "destructive" }),
  });

  const deleteKeyMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/api-keys/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] });
      toast({ title: tc("تم حذف المفتاح", "Key deleted") });
    },
    onError: () => toast({ title: tc("فشل الحذف", "Delete failed"), variant: "destructive" }),
  });

  const handleCopy = (key: string, id: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
    toast({ title: tc("✅ تم النسخ", "✅ Copied") });
  };

  /* Filter apps */
  const filtered = APPS.filter(app => {
    const matchSearch = search === "" ||
      app.name.toLowerCase().includes(search.toLowerCase()) ||
      app.nameAr.includes(search) ||
      app.descriptionAr.includes(search);
    const matchCat = category === "all"
      ? true
      : category === "installed"
      ? app.status === "installed"
      : app.category === category;
    return matchSearch && matchCat;
  });

  const featured = APPS.filter(a => a.featured && category === "all" && search === "");

  const statusConfig = {
    installed: { label: tc("مثبّت", "Installed"), className: "bg-green-100 text-green-700 border-green-200" },
    available: { label: tc("متاح", "Available"), className: "bg-blue-50 text-blue-700 border-blue-200" },
    coming_soon: { label: tc("قريباً", "Coming Soon"), className: "bg-gray-100 text-gray-500 border-gray-200" },
    configure: { label: tc("يحتاج إعداد", "Setup Required"), className: "bg-amber-50 text-amber-700 border-amber-200" },
  };

  return (
    <PlanGate feature="apiAccess">
    <div className="min-h-full bg-[#f8f9fa]" dir="rtl">

      {/* ── Store Hero Header ── */}
      <div className="relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0a0a14 0%, #130d2e 60%, #0d0d1a 100%)" }}>
        <div className="absolute inset-0 opacity-[0.05]"
          style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "32px 32px" }} />
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full opacity-20 blur-3xl"
          style={{ background: "hsl(262 83% 58%)", transform: "translate(30%,-30%)" }} />

        <div className="relative px-6 py-10 max-w-6xl mx-auto">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: "hsl(262 83% 58%)" }}>
                  <Store className="w-4 h-4 text-white" />
                </div>
                <span className="text-purple-300 text-sm font-medium">QIROX App Store</span>
              </div>
              <h1 className="text-3xl font-black text-white mb-2">
                {tc("متجر التطبيقات", "App Marketplace")}
              </h1>
              <p className="text-white/50 text-sm max-w-lg">
                {tc("وسّع قدرات نظامك بالتطبيقات والتكاملات. فعّلها بضغطة واحدة.", "Extend your system with apps and integrations. Activate with one click.")}
              </p>

              <div className="flex items-center gap-3 mt-5">
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2 w-72">
                  <Search className="w-4 h-4 text-white/40" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder={tc("ابحث عن تطبيق...", "Search apps...")}
                    className="flex-1 bg-transparent text-white text-sm placeholder:text-white/30 outline-none"
                  />
                </div>
                <Button onClick={() => setShowApiKeys(!showApiKeys)}
                  variant="outline"
                  className="border-white/20 text-white bg-white/5 hover:bg-white/10 text-sm">
                  <Key className="w-4 h-4 ml-2" />
                  {tc("مفاتيح API", "API Keys")}
                </Button>
              </div>
            </div>

            <div className="hidden md:flex flex-col items-end gap-2 text-right">
              <div className="text-white/70 text-sm">{tc("التطبيقات المثبتة", "Installed Apps")}</div>
              <div className="text-4xl font-black text-white">
                {APPS.filter(a => a.status === "installed").length}
                <span className="text-white/30 text-xl">/{APPS.length}</span>
              </div>
              <div className="flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-purple-300 text-xs">{tc("نظام متكامل", "Fully integrated")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">

        {/* ── API Keys Panel ── */}
        {showApiKeys && (
          <Card className="mb-6 border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <Key className="w-4 h-4 text-purple-600" />
                    {tc("مفاتيح API", "API Keys")}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">{tc("استخدمها للوصول لـ API النظام من تطبيقاتك الخارجية", "Use to access system API from external apps")}</p>
                </div>
                <Button onClick={() => setIsCreateOpen(true)} size="sm"
                  className="text-xs" style={{ background: "hsl(262 83% 58%)" }}>
                  <Plus className="w-3.5 h-3.5 ml-1.5" />
                  {tc("مفتاح جديد", "New Key")}
                </Button>
              </div>
              {keysLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                </div>
              ) : apiKeys.length === 0 ? (
                <div className="text-center py-6 bg-gray-50 rounded-xl">
                  <Key className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm text-gray-500">{tc("لا توجد مفاتيح API بعد", "No API keys yet")}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {(apiKeys as ApiKey[]).map(key => (
                    <div key={key._id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <ShieldCheck className="w-4 h-4 text-green-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{key.name}</p>
                        <code className="text-xs text-gray-400 font-mono">
                          {visibleKeys.has(key._id) ? key.key : "sk_••••••••••••••••••••••••"}
                        </code>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => {
                          const next = new Set(visibleKeys);
                          visibleKeys.has(key._id) ? next.delete(key._id) : next.add(key._id);
                          setVisibleKeys(next);
                        }} className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 transition-colors">
                          {visibleKeys.has(key._id) ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={() => handleCopy(key.key, key._id)}
                          className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 transition-colors">
                          {copiedKey === key._id ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={() => deleteKeyMutation.mutate(key._id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Category Filter ── */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1 no-scrollbar">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={cn(
                "shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all border",
                category === cat.id
                  ? "border-purple-600 text-purple-700 bg-purple-50"
                  : "border-gray-200 text-gray-600 hover:border-gray-300 bg-white"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* ── Featured Row ── */}
        {featured.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <h2 className="font-bold text-gray-900">{tc("مميزة", "Featured")}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {featured.map(app => {
                const Icon = app.icon;
                const st = statusConfig[app.status];
                return (
                  <div key={app.id}
                    className="relative rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all overflow-hidden cursor-pointer group">
                    <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
                      style={{ background: "linear-gradient(90deg, hsl(262 83% 58%), hsl(262 83% 75%))" }} />
                    <div className="p-5 flex gap-4">
                      <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shrink-0", app.iconBg)}>
                        <Icon className={cn("w-7 h-7", app.iconColor)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-gray-900 text-sm">{app.nameAr}</h3>
                              {app.badge && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">{app.badge}</span>
                              )}
                            </div>
                            <p className="text-[11px] text-gray-400 mt-0.5">{app.name}</p>
                          </div>
                          <Badge variant="outline" className={cn("text-[10px] shrink-0", st.className)}>
                            {app.status === "installed" && <Check className="w-3 h-3 ml-1" />}
                            {st.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 mt-2 line-clamp-2">{app.descriptionAr}</p>
                        <div className="flex items-center gap-3 mt-3">
                          <StarRating rating={app.rating} />
                          <span className="text-[11px] text-gray-400">{app.rating}</span>
                          <span className="text-[11px] text-gray-400">•</span>
                          <span className="text-[11px] text-gray-400">{app.installs} {tc("تثبيت", "installs")}</span>
                        </div>
                      </div>
                    </div>
                    <div className="px-5 pb-4 flex gap-2">
                      {app.status === "installed" && (
                        <Button size="sm" variant="outline" className="flex-1 h-8 text-xs rounded-lg border-gray-200">
                          <Zap className="w-3.5 h-3.5 ml-1.5 text-green-500" />
                          {tc("مفعّل", "Active")}
                        </Button>
                      )}
                      {app.status === "available" && (
                        <Button size="sm" className="flex-1 h-8 text-xs rounded-lg"
                          style={{ background: "hsl(262 83% 58%)" }}>
                          <Download className="w-3.5 h-3.5 ml-1.5" />
                          {tc("تثبيت", "Install")}
                        </Button>
                      )}
                      {app.status === "configure" && (
                        <Button size="sm" className="flex-1 h-8 text-xs rounded-lg bg-amber-500 hover:bg-amber-600 text-white">
                          {tc("إعداد الآن", "Configure Now")}
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="h-8 text-xs rounded-lg text-gray-400">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── All Apps Grid ── */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold text-gray-900">
            {category === "all" ? tc("كل التطبيقات", "All Apps") : CATEGORIES.find(c => c.id === category)?.label}
            <span className="text-gray-400 font-normal text-sm mr-2">({filtered.length})</span>
          </h2>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <Store className="w-12 h-12 mx-auto mb-3 text-gray-200" />
            <p className="text-gray-500 text-sm">{tc("لا توجد تطبيقات مطابقة", "No matching apps")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(app => {
              const Icon = app.icon;
              const st = statusConfig[app.status];
              return (
                <Card key={app.id} className="border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden group cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0", app.iconBg)}>
                        <Icon className={cn("w-5 h-5", app.iconColor)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-bold text-gray-900 text-sm">{app.nameAr}</h3>
                          {app.badge && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">{app.badge}</span>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-400">{app.name}</p>
                      </div>
                      <Badge variant="outline" className={cn("text-[10px] shrink-0", st.className)}>
                        {app.status === "installed" && <Check className="w-2.5 h-2.5 ml-1" />}
                        {st.label}
                      </Badge>
                    </div>

                    <p className="text-xs text-gray-500 mb-3 line-clamp-2">{app.descriptionAr}</p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <StarRating rating={app.rating} />
                        <span className="text-[11px] text-gray-400">{app.rating} · {app.installs}</span>
                      </div>
                      {app.status === "installed" && (
                        <button className="text-[10px] text-green-600 flex items-center gap-1 font-medium">
                          <Check className="w-3 h-3" />{tc("مفعّل", "Active")}
                        </button>
                      )}
                      {app.status === "available" && (
                        <button className="text-[10px] text-purple-600 flex items-center gap-1 font-medium hover:underline">
                          {tc("تثبيت", "Install")} <ChevronRight className="w-3 h-3" />
                        </button>
                      )}
                      {app.status === "configure" && (
                        <button className="text-[10px] text-amber-600 flex items-center gap-1 font-medium hover:underline">
                          {tc("إعداد", "Setup")} <ChevronRight className="w-3 h-3" />
                        </button>
                      )}
                      {app.status === "coming_soon" && (
                        <span className="text-[10px] text-gray-400">{tc("قريباً", "Soon")}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* ── API Docs Banner ── */}
        <div className="mt-8 rounded-2xl overflow-hidden relative"
          style={{ background: "linear-gradient(135deg, #0a0a14, #130d2e)" }}>
          <div className="absolute inset-0 opacity-[0.05]"
            style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "24px 24px" }} />
          <div className="relative p-6 flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Code2 className="w-4 h-4 text-purple-400" />
                <span className="text-purple-300 text-sm font-medium">QIROX Developer API</span>
              </div>
              <h3 className="text-white font-bold text-lg">{tc("وثائق API للمطورين", "Developer API Documentation")}</h3>
              <p className="text-white/50 text-xs mt-1">{tc("أنشئ تطبيقات مخصصة باستخدام REST API الخاص بنظام QIROX", "Build custom apps with the QIROX REST API")}</p>
            </div>
            <Button variant="outline"
              className="border-white/20 text-white bg-white/5 hover:bg-white/10 shrink-0">
              <Globe className="w-4 h-4 ml-2" />
              {tc("استكشف الوثائق", "Explore Docs")}
              <ArrowRight className="w-4 h-4 mr-2" />
            </Button>
          </div>
        </div>

      </div>

      {/* ── Create Key Dialog ── */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-4 h-4 text-purple-600" />
              {tc("إنشاء مفتاح API جديد", "Create New API Key")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              value={newKeyName}
              onChange={e => setNewKeyName(e.target.value)}
              placeholder={tc("اسم التطبيق أو الاستخدام", "App name or usage")}
              className="h-10"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} className="flex-1">
              {tc("إلغاء", "Cancel")}
            </Button>
            <Button onClick={() => createKeyMutation.mutate(newKeyName)}
              disabled={!newKeyName.trim() || createKeyMutation.isPending}
              className="flex-1" style={{ background: "hsl(262 83% 58%)" }}>
              {createKeyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : tc("إنشاء", "Create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </PlanGate>
  );
}
