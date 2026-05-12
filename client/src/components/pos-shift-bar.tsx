import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Play, Square, Clock, Banknote, CreditCard, ShoppingCart, AlertTriangle, Zap } from "lucide-react";

interface CashierShift {
  _id: string;
  shiftNumber: string;
  employeeName: string;
  openedAt: string;
  totalOrders: number;
  totalSales: number;
  totalCashSales: number;
  totalCardSales: number;
  totalDigitalSales: number;
  paymentBreakdown: Record<string, number>;
  status: string;
}

interface ProductCategory {
  categoryNameAr: string;
  items: Array<{ nameAr: string; quantity: number; totalAmount: number }>;
}

interface AutoShift {
  isAuto: true;
  windowStart: string;
  windowEnd: string;
  totalOrders: number;
  totalSales: number;
  totalCash: number;
  totalCard: number;
  totalDigital: number;
  periodLabel: string;
  productsByCategory?: ProductCategory[];
}

function fmt(n: number) { return `${(n || 0).toFixed(2)} ر.س`; }
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
}
function fmtDuration(start: string) {
  const mins = Math.floor((Date.now() - new Date(start).getTime()) / 60000);
  const h = Math.floor(mins / 60), m = mins % 60;
  return `${h}:${m.toString().padStart(2, '0')}`;
}

export function PosShiftBar() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [showOpenDialog, setShowOpenDialog] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [showAutoDialog, setShowAutoDialog] = useState(false);
  const [openingCash, setOpeningCash] = useState("");
  const [openingNotes, setOpeningNotes] = useState("");
  const [closingCash, setClosingCash] = useState("");
  const [closingNotes, setClosingNotes] = useState("");

  const { data: activeShift } = useQuery<CashierShift | null>({
    queryKey: ['/api/shifts/active'],
    refetchInterval: 30000,
  });

  const { data: autoShift } = useQuery<AutoShift | null>({
    queryKey: ['/api/shifts/auto-current'],
    refetchInterval: 60000,
    enabled: !activeShift,
  });

  const openMutation = useMutation({
    mutationFn: async (data: { openingCash: number; notes: string }) => {
      const res = await apiRequest("POST", "/api/shifts/open", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "تم فتح الوردية بنجاح", description: "يمكنك الآن استقبال الطلبات" });
      queryClient.invalidateQueries({ queryKey: ['/api/shifts/active'] });
      setShowOpenDialog(false);
      setOpeningCash(""); setOpeningNotes("");
    },
    onError: (e: any) => {
      toast({ title: "خطأ", description: e.message || "فشل في فتح الوردية", variant: "destructive" });
    },
  });

  const closeMutation = useMutation({
    mutationFn: async (data: { closingCash: number; closingNotes: string }) => {
      const res = await apiRequest("POST", "/api/shifts/close", data);
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "تم إغلاق الوردية", description: "تم إنشاء تقرير Z" });
      queryClient.invalidateQueries({ queryKey: ['/api/shifts/active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/shifts/history'] });
      queryClient.invalidateQueries({ queryKey: ['/api/shifts/auto-current'] });
      setShowCloseDialog(false);
      setClosingCash(""); setClosingNotes("");
      // Print Z-report automatically
      if (data.shift) printZReport(data.shift);
    },
    onError: (e: any) => {
      toast({ title: "خطأ", description: e.message || "فشل في إغلاق الوردية", variant: "destructive" });
    },
  });

  const handleStartShiftClick = () => {
    if (autoShift && autoShift.totalOrders > 0) {
      setShowAutoDialog(true);
    } else {
      setShowOpenDialog(true);
    }
  };

  const printZReport = (shift: CashierShift) => {
    const pb = shift.paymentBreakdown || {};
    const win = window.open('', '_blank', 'width=400,height=700');
    if (!win) return;
    win.document.write(`<html dir="rtl"><head><title>Z-Report</title>
    <style>body{font-family:Cairo,Arial,sans-serif;padding:15px;max-width:350px;margin:0 auto;font-size:13px;}
    .hd{text-align:center;border-bottom:2px solid #000;padding-bottom:8px;margin-bottom:8px;}
    .row{display:flex;justify-content:space-between;padding:2px 0;}
    .sec{border-top:1px dashed #999;margin:8px 0;padding-top:8px;}
    .sec-t{font-weight:bold;color:#2D9B6E;margin-bottom:4px;}
    .tot{font-weight:bold;border-top:2px solid #000;padding-top:4px;margin-top:4px;}
    .ft{text-align:center;margin-top:12px;border-top:1px dashed #999;padding-top:8px;font-size:11px;color:#666;}
    @media print{body{padding:5px;}}
    </style></head><body>
    <div class="hd"><h2 style="margin:0">BLACK ROSE</h2><div>تقرير Z — إغلاق الوردية</div><div>${shift.shiftNumber}</div></div>
    <div class="row"><span>الكاشير:</span><span>${shift.employeeName}</span></div>
    <div class="row"><span>فتح:</span><span>${fmtTime(shift.openedAt)}</span></div>
    <div class="sec"><div class="sec-t">ملخص المبيعات</div>
    <div class="row"><span>الطلبات:</span><span>${shift.totalOrders}</span></div>
    <div class="row tot"><span>الإجمالي:</span><span>${fmt(shift.totalSales)}</span></div></div>
    <div class="sec"><div class="sec-t">طرق الدفع</div>
    <div class="row"><span>نقدي:</span><span>${fmt(pb.cash || 0)}</span></div>
    <div class="row"><span>شبكة:</span><span>${fmt(pb.card || 0)}</span></div>
    ${(pb.loyalty || 0) > 0 ? `<div class="row"><span>بطاقة:</span><span>${fmt(pb.loyalty)}</span></div>` : ''}
    </div>
    <div class="ft">QIROX Systems — ${new Date().toLocaleString('ar-SA')}</div>
    </body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 500);
  };

  // ─── Active manual shift bar ────────────────────────────────────────────────
  if (activeShift) {
    return (
      <>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-950/20 border-b border-green-200 dark:border-green-800 text-green-800 dark:text-green-300 text-xs" dir="rtl">
          <Badge className="bg-green-500 text-white text-[10px] px-1.5 py-0 animate-pulse shrink-0">● مفتوحة</Badge>
          <span className="font-medium shrink-0">{activeShift.employeeName}</span>
          <span className="text-green-600 dark:text-green-400 shrink-0">|</span>
          <Clock className="w-3 h-3 shrink-0" />
          <span className="shrink-0">{fmtTime(activeShift.openedAt)} ({fmtDuration(activeShift.openedAt)})</span>
          <span className="text-green-600 dark:text-green-400 shrink-0">|</span>
          <ShoppingCart className="w-3 h-3 shrink-0" />
          <span className="shrink-0">{activeShift.totalOrders} طلب</span>
          <Banknote className="w-3 h-3 shrink-0" />
          <span className="shrink-0">{fmt(activeShift.totalCashSales)}</span>
          <CreditCard className="w-3 h-3 shrink-0" />
          <span className="shrink-0">{fmt((activeShift.paymentBreakdown?.card || 0) + (activeShift.totalDigitalSales || 0))}</span>
          <div className="flex-1" />
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-[10px] px-2 border-green-400 text-green-700 hover:bg-green-100 dark:hover:bg-green-900 shrink-0"
            onClick={() => setShowCloseDialog(true)}
          >
            <Square className="w-3 h-3 ml-1" />
            غلق الوردية
          </Button>
        </div>

        {/* Close Shift Dialog */}
        <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
          <DialogContent className="sm:max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Square className="w-5 h-5 text-red-500" />
                إغلاق الوردية
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                <div className="flex justify-between"><span>المبيعات الإجمالية</span><span className="font-mono font-bold text-primary">{fmt(activeShift.totalSales)}</span></div>
                <div className="flex justify-between"><span>نقدي</span><span className="font-mono">{fmt(activeShift.totalCashSales)}</span></div>
                <div className="flex justify-between"><span>شبكة</span><span className="font-mono">{fmt((activeShift.paymentBreakdown?.card || 0))}</span></div>
                <div className="flex justify-between"><span>عدد الطلبات</span><span className="font-mono">{activeShift.totalOrders}</span></div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">الرصيد الفعلي في الصندوق (ر.س)</label>
                <Input type="number" placeholder="0.00" value={closingCash} onChange={e => setClosingCash(e.target.value)} className="text-center font-mono text-lg" dir="ltr" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">ملاحظات (اختياري)</label>
                <Textarea placeholder="أي ملاحظات..." value={closingNotes} onChange={e => setClosingNotes(e.target.value)} rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCloseDialog(false)}>إلغاء</Button>
              <Button variant="destructive" disabled={closeMutation.isPending}
                onClick={() => closeMutation.mutate({ closingCash: Number(closingCash) || 0, closingNotes })}>
                {closeMutation.isPending ? "جاري الإغلاق..." : "إغلاق وطباعة التقرير"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // ─── Auto-shift bar (no manual shift open) ──────────────────────────────────
  if (autoShift && autoShift.totalOrders > 0) {
    return (
      <>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/20 border-b border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 text-xs" dir="rtl">
          <Zap className="w-3 h-3 shrink-0" />
          <Badge className="bg-blue-500 text-white text-[10px] px-1.5 py-0 shrink-0">وردية تلقائية</Badge>
          <span className="shrink-0">{fmtTime(autoShift.windowStart)} — {fmtTime(autoShift.windowEnd)}</span>
          <span className="text-blue-400 shrink-0">|</span>
          <ShoppingCart className="w-3 h-3 shrink-0" />
          <span className="shrink-0">{autoShift.totalOrders} طلب</span>
          <Banknote className="w-3 h-3 shrink-0" />
          <span className="shrink-0">{fmt(autoShift.totalCash)}</span>
          <CreditCard className="w-3 h-3 shrink-0" />
          <span className="shrink-0">{fmt(autoShift.totalCard)}</span>
          <div className="flex-1" />
          <Button
            size="sm"
            className="h-6 text-[10px] px-2 bg-blue-600 hover:bg-blue-700 text-white shrink-0"
            onClick={handleStartShiftClick}
          >
            <Play className="w-3 h-3 ml-1" />
            بدأ وردية
          </Button>
        </div>

        {/* Auto-shift dialog: resume or start new */}
        <Dialog open={showAutoDialog} onOpenChange={setShowAutoDialog}>
          <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                وردية تلقائية نشطة
              </DialogTitle>
            </DialogHeader>
            <div className="py-3 space-y-3">
              <p className="text-sm text-muted-foreground">
                الوردية التلقائية تعمل منذ الساعة <span className="font-bold text-foreground">{fmtTime(autoShift.windowStart)}</span> وبها <span className="font-bold">{autoShift.totalOrders}</span> طلبات بإجمالي <span className="font-bold text-primary">{fmt(autoShift.totalSales)}</span>.
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-green-50 dark:bg-green-950/20 rounded p-2 text-center">
                  <div className="font-bold text-green-700">{fmt(autoShift.totalCash)}</div>
                  <div className="text-muted-foreground">نقدي</div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-950/20 rounded p-2 text-center">
                  <div className="font-bold text-purple-700">{fmt(autoShift.totalCard)}</div>
                  <div className="text-muted-foreground">شبكة</div>
                </div>
              </div>
              {autoShift.productsByCategory && autoShift.productsByCategory.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                    <ShoppingCart className="w-3 h-3" />
                    المنتجات المستهلكة
                  </div>
                  {autoShift.productsByCategory.map((cat, ci) => (
                    <div key={ci} className="rounded border text-xs overflow-hidden">
                      <div className="bg-primary/5 px-2 py-1 font-semibold text-primary">{cat.categoryNameAr}</div>
                      {cat.items.map((item, ii) => (
                        <div key={ii} className="flex justify-between items-center px-2 py-1 border-t">
                          <span>{item.nameAr}</span>
                          <span className="font-mono text-muted-foreground">× {item.quantity}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 dark:text-amber-300">
                هل تريد فتح وردية يدوية جديدة، أم الاستمرار في تتبع الوردية التلقائية؟
              </div>
            </div>
            <DialogFooter className="gap-2 flex-col sm:flex-row">
              <Button variant="outline" className="flex-1" onClick={() => { setShowAutoDialog(false); }}>
                استمرار التلقائية
              </Button>
              <Button className="flex-1" onClick={() => { setShowAutoDialog(false); setShowOpenDialog(true); }}>
                <Play className="w-4 h-4 ml-1" />
                فتح وردية يدوية
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Open shift dialog */}
        <Dialog open={showOpenDialog} onOpenChange={setShowOpenDialog}>
          <DialogContent className="sm:max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Play className="w-5 h-5 text-primary" />فتح وردية جديدة</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <label className="text-sm font-medium mb-1.5 block">رصيد الافتتاح (ر.س)</label>
                <Input type="number" placeholder="0.00" value={openingCash} onChange={e => setOpeningCash(e.target.value)} className="text-center font-mono text-lg" dir="ltr" />
                <p className="text-xs text-muted-foreground mt-1">المبلغ الموجود في الصندوق عند بدء الوردية</p>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">ملاحظات (اختياري)</label>
                <Textarea placeholder="أي ملاحظات..." value={openingNotes} onChange={e => setOpeningNotes(e.target.value)} rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowOpenDialog(false)}>إلغاء</Button>
              <Button disabled={openMutation.isPending}
                onClick={() => openMutation.mutate({ openingCash: Number(openingCash) || 0, notes: openingNotes })}>
                {openMutation.isPending ? "جاري الفتح..." : "فتح الوردية"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // ─── No shift at all — minimal bar with start button ────────────────────────
  return (
    <>
      <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/40 border-b text-muted-foreground text-xs" dir="rtl">
        <Clock className="w-3 h-3 shrink-0" />
        <span className="shrink-0">لا توجد وردية مفتوحة</span>
        <div className="flex-1" />
        <Button size="sm" className="h-6 text-[10px] px-2 shrink-0" onClick={() => setShowOpenDialog(true)}>
          <Play className="w-3 h-3 ml-1" />
          بدأ وردية
        </Button>
      </div>

      <Dialog open={showOpenDialog} onOpenChange={setShowOpenDialog}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Play className="w-5 h-5 text-primary" />فتح وردية جديدة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">رصيد الافتتاح (ر.س)</label>
              <Input type="number" placeholder="0.00" value={openingCash} onChange={e => setOpeningCash(e.target.value)} className="text-center font-mono text-lg" dir="ltr" />
              <p className="text-xs text-muted-foreground mt-1">المبلغ الموجود في الصندوق عند بدء الوردية</p>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">ملاحظات (اختياري)</label>
              <Textarea placeholder="أي ملاحظات..." value={openingNotes} onChange={e => setOpeningNotes(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOpenDialog(false)}>إلغاء</Button>
            <Button disabled={openMutation.isPending}
              onClick={() => openMutation.mutate({ openingCash: Number(openingCash) || 0, notes: openingNotes })}>
              {openMutation.isPending ? "جاري الفتح..." : "فتح الوردية"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
