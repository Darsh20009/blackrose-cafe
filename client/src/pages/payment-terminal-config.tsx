import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowRight, CheckCircle2, Circle, Zap, Construction, Globe, ChevronDown, ChevronUp, Code2, Plug } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PAYMENT_DRIVERS } from "@/lib/payment-terminal/registry";
import type { PaymentDriverDefinition, DriverStatus } from "@/lib/payment-terminal/types";
import PaymentTerminalWidget from "@/components/payment-terminal-widget";

const STATUS_META: Record<DriverStatus, { label: string; color: string; icon: any }> = {
  live:         { label: "مفعّل",    color: "bg-green-100 text-green-800 border-green-200",  icon: CheckCircle2 },
  beta:         { label: "تجريبي",   color: "bg-blue-100 text-blue-800 border-blue-200",     icon: Zap },
  coming_soon:  { label: "قريباً",   color: "bg-slate-100 text-slate-600 border-slate-200",  icon: Construction },
};

const REGION_LABEL: Record<string, string> = { ksa: "🇸🇦 السعودية", gcc: "🌍 الخليج", global: "🌐 عالمي" };

function DriverCard({ driver }: { driver: PaymentDriverDefinition }) {
  const [expanded, setExpanded] = useState(false);
  const meta = STATUS_META[driver.status];
  const StatusIcon = meta.icon;

  return (
    <Card className={`transition-all ${driver.status === "live" ? "border-primary/30 shadow-sm" : "opacity-80"}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm" style={{ background: driver.color }}>
            <span className="text-white font-bold text-xs">{driver.nameEn.slice(0, 3).toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold">{driver.nameAr}</span>
              <span className="text-muted-foreground text-xs">/ {driver.nameEn}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{driver.descriptionAr}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-muted-foreground">{REGION_LABEL[driver.region]}</span>
            <Badge className={`text-xs border ${meta.color} flex items-center gap-1`}>
              <StatusIcon className="w-3 h-3" />{meta.label}
            </Badge>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpanded(e => !e)}>
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {expanded && (
          <div className="mt-4 pt-4 border-t space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">الـ ID:</span> <code className="bg-muted px-1 rounded text-xs">{driver.id}</code></div>
              <div><span className="text-muted-foreground">الحالة:</span> <span className="font-medium">{meta.label}</span></div>
              {driver.configKeys?.length ? (
                <div className="col-span-2">
                  <span className="text-muted-foreground">مفاتيح الإعداد:</span>{" "}
                  {driver.configKeys.map(k => <code key={k} className="bg-muted px-1 rounded text-xs ml-1">{k}</code>)}
                </div>
              ) : null}
            </div>
            <div className="bg-muted/60 rounded-lg p-3 font-mono text-xs text-muted-foreground">
              <p className="text-foreground font-semibold mb-1 font-sans text-xs">كيفية الاستخدام:</p>
              <p>{"<PaymentTerminalWidget"}</p>
              <p className="pl-4">{`driverId="${driver.id}"`}</p>
              <p className="pl-4">{"request={{ amount: 150, currency: 'SAR', referenceId: 'ORD-001' }}"}</p>
              <p className="pl-4">{"callbacks={{ onSuccess, onError, onCancel }}"}</p>
              <p>{"  />"}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DemoPanel() {
  const [driverId, setDriverId] = useState<string>("sim");
  const [result, setResult] = useState<string | null>(null);

  const liveDrivers = PAYMENT_DRIVERS.filter(d => d.status === "live");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          تجربة الطبقة مباشرة — pay(150 SAR)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          {liveDrivers.map(d => (
            <button
              key={d.id}
              onClick={() => { setDriverId(d.id); setResult(null); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${driverId === d.id ? "text-white border-transparent shadow-sm" : "border-border bg-background hover:bg-muted"}`}
              style={driverId === d.id ? { background: d.color } : {}}
              data-testid={`button-select-driver-${d.id}`}
            >
              {d.nameAr}
            </button>
          ))}
        </div>
        {result && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800 font-mono">
            {result}
          </div>
        )}
        <PaymentTerminalWidget
          driverId={driverId as any}
          request={{ amount: 150, currency: "SAR", referenceId: "DEMO-001" }}
          callbacks={{
            onSuccess: r => setResult(`✅ نجح: ${JSON.stringify(r)}`),
            onError: e => setResult(`❌ خطأ: ${e}`),
            onCancel: () => setResult("🚫 ألغى المستخدم"),
          }}
          isTestMode
        />
      </CardContent>
    </Card>
  );
}

export default function PaymentTerminalConfigPage() {
  const [, navigate] = useLocation();

  const liveCount = PAYMENT_DRIVERS.filter(d => d.status === "live").length;
  const soonCount = PAYMENT_DRIVERS.filter(d => d.status === "coming_soon").length;

  return (
    <div className="min-h-screen bg-white text-gray-900" dir="rtl">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/settings")} className="h-9 w-9">
            <ArrowRight className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Plug className="w-6 h-6 text-primary" />
              طبقة تكامل أجهزة الدفع
            </h1>
            <p className="text-muted-foreground text-sm">Payment Terminal Integration Layer — Driver Architecture</p>
          </div>
        </div>

        {/* Architecture summary */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Code2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="space-y-2 text-sm">
                <p className="font-semibold text-foreground">كيف تعمل الطبقة؟</p>
                <p className="text-muted-foreground">
                  بدلاً من برمجة كل جهاز دفع بشكل منفصل، النظام يستدعي <code className="bg-white px-1 rounded border">pay(amount)</code> واحدة
                  فقط، والـ Driver الخاص بكل شركة هو الذي يتعامل مع جهازها. لإضافة شركة جديدة تُنشئ Driver واحد وتسجّله.
                </p>
                <div className="flex gap-4 pt-1">
                  <div className="text-center"><p className="text-2xl font-bold text-primary">{liveCount}</p><p className="text-xs text-muted-foreground">مفعّل الآن</p></div>
                  <Separator orientation="vertical" className="h-10" />
                  <div className="text-center"><p className="text-2xl font-bold text-muted-foreground">{soonCount}</p><p className="text-xs text-muted-foreground">Driver جاهز للربط</p></div>
                  <Separator orientation="vertical" className="h-10" />
                  <div className="text-center"><p className="text-2xl font-bold text-muted-foreground">∞</p><p className="text-xs text-muted-foreground">قابل للتوسع</p></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Live demo */}
        <DemoPanel />

        {/* Drivers list */}
        <div>
          <h2 className="font-bold text-lg mb-3 flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            جميع الـ Drivers المسجّلة ({PAYMENT_DRIVERS.length})
          </h2>
          <div className="space-y-2">
            {PAYMENT_DRIVERS.map(d => <DriverCard key={d.id} driver={d} />)}
          </div>
        </div>

        {/* How to add a new driver */}
        <Card className="border-dashed">
          <CardContent className="p-4 space-y-2">
            <p className="font-semibold text-sm flex items-center gap-2"><Code2 className="w-4 h-4" />كيف تضيف Driver جديد؟</p>
            <div className="bg-muted rounded-lg p-3 font-mono text-xs space-y-1 text-muted-foreground">
              <p><span className="text-green-600">// 1. أنشئ الملف</span></p>
              <p>client/src/lib/payment-terminal/drivers/stcpay-driver.tsx</p>
              <p className="mt-2"><span className="text-green-600">// 2. نفّذ DriverComponentProps</span></p>
              <p>export default function StcPayDriver {"({ request, callbacks, config }: DriverComponentProps) {"}</p>
              <p className="pl-4">{"// استدعِ API الخاص بـ STC Pay هنا"}</p>
              <p className="pl-4">{"// ثم اتصل بـ callbacks.onSuccess() أو callbacks.onError()"}</p>
              <p>{"}"}</p>
              <p className="mt-2"><span className="text-green-600">// 3. سجّله في registry.ts</span></p>
              <p>{"{ id: 'stcpay', nameAr: 'STC Pay', Component: StcPayDriver, status: 'live', ... }"}</p>
              <p className="mt-2"><span className="text-green-600">// 4. استخدمه في أي مكان</span></p>
              <p>{"<PaymentTerminalWidget driverId=\"stcpay\" request={{ amount, ... }} />"}</p>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
