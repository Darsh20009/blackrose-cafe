import { Construction, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { DriverComponentProps, DriverId } from "../types";

interface StubMeta { nameAr: string; nameEn: string; color: string; docsUrl?: string; }
const STUB_META: Partial<Record<DriverId, StubMeta>> = {
  mada:       { nameAr: "مدى", nameEn: "Mada Pay", color: "#00A651", docsUrl: "https://mada.com.sa" },
  stcpay:     { nameAr: "STC Pay", nameEn: "STC Pay", color: "#7B2D8B", docsUrl: "https://www.stcpay.com.sa" },
  alahli:     { nameAr: "البنك الأهلي", nameEn: "Al Ahli Bank", color: "#006400" },
  alrajhi:    { nameAr: "الراجحي", nameEn: "Al Rajhi Bank", color: "#006B3C" },
  foodicspay: { nameAr: "Foodics Pay", nameEn: "Foodics Pay", color: "#F05A28", docsUrl: "https://foodics.com" },
  neoleap:    { nameAr: "نيوليب", nameEn: "Neoleap", color: "#1D3D72" },
  moyasar:    { nameAr: "ميسر", nameEn: "Moyasar", color: "#FF6B35", docsUrl: "https://moyasar.com" },
  hyperpay:   { nameAr: "هايبر باي", nameEn: "HyperPay", color: "#E63946" },
  tap:        { nameAr: "تاب", nameEn: "Tap Payments", color: "#00ADB5", docsUrl: "https://tap.company" },
};

export default function StubDriver({ request, callbacks, config }: DriverComponentProps) {
  const meta = STUB_META[config.driverId as DriverId];
  const nameAr = meta?.nameAr ?? config.driverId;
  const color = meta?.color ?? "#64748b";

  return (
    <div className="flex flex-col items-center gap-5 p-8 rounded-xl border-2 border-dashed border-border bg-muted/30">
      <div className="w-16 h-16 rounded-xl flex items-center justify-center" style={{ background: color }}>
        <Construction className="w-7 h-7 text-white" />
      </div>
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <p className="font-bold text-lg">{nameAr}</p>
          <Badge variant="secondary" className="text-xs">قريباً</Badge>
        </div>
        <p className="text-sm text-muted-foreground max-w-xs">
          الـ Driver جاهز ومسجّل في الطبقة. يحتاج فقط ربط API الخاص بـ {nameAr} لتفعيله.
        </p>
        <div className="bg-muted rounded-lg p-3 text-right text-xs font-mono text-muted-foreground mt-2">
          <p>// لإضافة هذا الـ Driver:</p>
          <p>// 1. أنشئ ملف drivers/{config.driverId}-driver.tsx</p>
          <p>// 2. سجّله في registry.ts</p>
          <p>// 3. أضف مفاتيح الـ API في الإعدادات</p>
        </div>
      </div>
      <div className="flex gap-3">
        <Button variant="outline" onClick={callbacks.onCancel}>استخدام طريقة دفع أخرى</Button>
        {meta?.docsUrl && (
          <Button variant="outline" size="sm" asChild>
            <a href={meta.docsUrl} target="_blank" rel="noopener noreferrer" className="gap-1">
              <ExternalLink className="w-3 h-3" /> الوثائق
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}
