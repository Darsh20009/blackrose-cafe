import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Coffee, Gift, QrCode, ChevronRight, TrendingUp,
  ArrowDownRight, ArrowUpRight, Clock, Star, Crown, Award, Medal,
  Wallet, Sparkles, CheckCircle2, ChevronDown, ChevronUp, Send, AlertCircle
} from "lucide-react";
import { useCustomer } from "@/contexts/CustomerContext";
import { useLocation } from "wouter";
import { CustomerLayout } from "@/components/layouts/CustomerLayout";
import SarIcon from "@/components/sar-icon";
import QRCodeLib from "qrcode";
import { useTranslate } from "@/lib/useTranslate";
import { useTranslation } from "react-i18next";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

function getTierConfig(tier: string, tc: (ar: string, en: string) => string) {
  const configs = {
    bronze:   { label: tc("برونزي","Bronze"),   color: "from-amber-600 to-amber-800",  badge: "bg-amber-600",  icon: Medal,  min: 0,    max: 499  },
    silver:   { label: tc("فضي","Silver"),      color: "from-slate-400 to-slate-600",  badge: "bg-slate-500",  icon: Star,   min: 500,  max: 1999 },
    gold:     { label: tc("ذهبي","Gold"),       color: "from-yellow-400 to-amber-600", badge: "bg-yellow-500", icon: Crown,  min: 2000, max: 4999 },
    platinum: { label: tc("بلاتيني","Platinum"), color: "from-gray-300 to-gray-500",   badge: "bg-gray-400",   icon: Award,  min: 5000, max: Infinity },
  };
  return configs[tier as keyof typeof configs] || configs.bronze;
}

function getNextTier(tier: string): string | null {
  const order = ["bronze", "silver", "gold", "platinum"];
  const idx = order.indexOf(tier);
  return idx < order.length - 1 ? order[idx + 1] : null;
}

export default function MyCardPage() {
  const { customer } = useCustomer();
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [showQr, setShowQr] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferPhone, setTransferPhone] = useState("");
  const [transferPoints, setTransferPoints] = useState("");
  const [transferPin, setTransferPin] = useState("");
  const tc = useTranslate();
  const { i18n } = useTranslation();
  const dir = i18n.language === 'en' ? 'ltr' : 'rtl';

  const { data: loyaltyCards = [], isLoading: loadingCards } = useQuery<any[]>({
    queryKey: ["/api/customer/loyalty-cards"],
    enabled: !!customer,
  });

  const { data: transactions = [], isLoading: loadingTx } = useQuery<any[]>({
    queryKey: ["/api/customer/loyalty-transactions"],
    enabled: !!customer,
  });

  const { data: settings } = useQuery<any>({
    queryKey: ["/api/public/loyalty-settings"],
  });

  const card = loyaltyCards[0];
  const points = card?.points ?? 0;
  const tier = card?.tier ?? "bronze";
  const tierCfg = getTierConfig(tier, tc);
  const TierIcon = tierCfg.icon;
  const nextTier = getNextTier(tier);
  const nextTierCfg = nextTier ? getTierConfig(nextTier, tc) : null;

  const pointsValueInSar = settings?.pointsValueInSar ?? 0.05;
  const sarValue = (points * pointsValueInSar).toFixed(2);
  const sarValueNum = parseFloat(sarValue);
  const pointsPerSar = Math.round(1 / pointsValueInSar);

  const progressToNext = nextTierCfg
    ? Math.min(100, Math.round(((points - tierCfg.min) / (nextTierCfg.min - tierCfg.min)) * 100))
    : 100;

  useEffect(() => {
    const qrData = card?.qrToken || card?.cardNumber;
    if (!qrData) return;
    QRCodeLib.toDataURL(qrData, {
      width: 240, margin: 2,
      color: { dark: "#1a1a1a", light: "#ffffff" }
    }).then(setQrCodeUrl).catch(console.error);
  }, [card?.qrToken, card?.cardNumber]);

  const transferMutation = useMutation({
    mutationFn: async (data: { recipientPhone: string; points: number; pin?: string }) =>
      apiRequest("POST", "/api/customer/transfer-points", data),
    onSuccess: () => {
      toast({ title: tc("✅ تم التحويل بنجاح", "✅ Transfer successful"), description: tc(`تم تحويل ${transferPoints} نقطة للمستلم`, `Transferred ${transferPoints} points`) });
      qc.invalidateQueries({ queryKey: ["/api/customer/loyalty-cards"] });
      qc.invalidateQueries({ queryKey: ["/api/customer/loyalty-transactions"] });
      setTransferPhone(""); setTransferPoints(""); setTransferPin("");
      setShowTransfer(false);
    },
    onError: (err: any) => {
      const msg = err?.message || tc("فشل التحويل، تحقق من البيانات", "Transfer failed, check inputs");
      toast({ title: tc("خطأ", "Error"), description: msg, variant: "destructive" });
    },
  });

  const handleTransfer = () => {
    const pts = parseInt(transferPoints);
    if (!transferPhone || !pts || pts <= 0) {
      toast({ title: tc("خطأ", "Error"), description: tc("أدخل رقم الجوال والنقاط", "Enter phone and points"), variant: "destructive" });
      return;
    }
    if (pts > points) {
      toast({ title: tc("خطأ", "Error"), description: tc("النقاط غير كافية", "Insufficient points"), variant: "destructive" });
      return;
    }
    transferMutation.mutate({ recipientPhone: transferPhone, points: pts, pin: transferPin || undefined });
  };

  if (!customer) {
    return (
      <CustomerLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8" dir={dir}>
          <Coffee className="w-16 h-16 text-primary opacity-40" />
          <p className="text-lg font-bold text-center">{tc("يجب تسجيل الدخول لعرض بطاقة الولاء","Please log in to view your loyalty card")}</p>
          <Button onClick={() => setLocation("/auth")} data-testid="button-login">{tc("تسجيل الدخول","Log In")}</Button>
        </div>
      </CustomerLayout>
    );
  }

  if (loadingCards) {
    return (
      <CustomerLayout>
        <div className="flex items-center justify-center min-h-[60vh]" dir={dir}>
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">{tc("جاري تحميل بطاقتك...","Loading your card...")}</p>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div className="container max-w-lg mx-auto px-4 py-5 pb-28 space-y-4" dir={dir}>

        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/")} data-testid="button-back">
            <ChevronRight className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-black text-primary">{tc("بطاقة مكافآتي","My Rewards Card")}</h1>
        </div>

        {/* ── Main Loyalty Card ─────────────────────────────────── */}
        <div
          className={`relative rounded-3xl bg-gradient-to-br ${tierCfg.color} text-white shadow-2xl overflow-hidden`}
          data-testid="loyalty-card"
        >
          <div className="absolute -top-12 -left-12 w-40 h-40 bg-white/10 rounded-full" />
          <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-white/10 rounded-full" />

          <div className="relative z-10 p-5 space-y-4">
            {/* Name + tier */}
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs opacity-70">{tc("أهلاً","Welcome")}</p>
                <p className="font-black text-xl">{customer?.name || tc("عميل","Customer")}</p>
              </div>
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${tierCfg.badge} bg-opacity-80`}>
                <TierIcon className="w-3.5 h-3.5" />
                <span className="text-xs font-bold">{tierCfg.label}</span>
              </div>
            </div>

            {/* Points + SAR balance */}
            <div className="text-center py-1">
              <p className="text-xs opacity-70 mb-0.5">{tc("رصيد نقاطي","My Points Balance")}</p>
              <p className="text-5xl font-black" data-testid="text-points">{points.toLocaleString()}</p>
              <p className="text-sm opacity-90 mt-1 font-bold bg-white/20 rounded-full px-3 py-0.5 inline-block">
                ≈ {sarValue} {tc("ريال","SAR")}
              </p>
            </div>

            {/* Card number + QR button */}
            <div className="flex items-center justify-between">
              <p className="font-mono text-xs opacity-70 tracking-widest" data-testid="text-card-number">
                {card?.cardNumber?.replace(/(.{4})/g,"$1 ")?.trim() || "**** **** ****"}
              </p>
              {qrCodeUrl && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="bg-white/20 hover:bg-white/30 border-none text-white gap-1.5 text-xs"
                  onClick={() => setShowQr(true)}
                  data-testid="button-show-qr"
                >
                  <QrCode className="w-4 h-4" />
                  {tc("رمز QR","QR Code")}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* ── SAR BALANCE BOX ─────────────────────────────────────── */}
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/30 rounded-2xl p-5 space-y-3" data-testid="sar-balance-card">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-primary/20 rounded-xl flex items-center justify-center">
              <Wallet className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-black text-base text-foreground">{tc("رصيدك بالريال","Balance in SAR")}</p>
              <p className="text-xs text-muted-foreground">{tc("يُخصم مباشرةً من فاتورتك","Deducted directly from your bill")}</p>
            </div>
          </div>

          <div className="bg-background rounded-xl p-4 text-center shadow-sm">
            <p className="text-xs text-muted-foreground mb-1">{tc("رصيدك الحالي يساوي","Your balance equals")}</p>
            <p className="text-5xl font-black text-primary" data-testid="text-sar-value">
              {sarValue}
              <span className="text-2xl mr-1">{tc("ريال","SAR")}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {points.toLocaleString()} {tc("نقطة","pts")} × {pointsValueInSar} = <strong>{sarValue} {tc("ريال","SAR")}</strong>
            </p>
          </div>

          {sarValueNum > 0 && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                {tc(
                  `يمكنك خصم حتى ${sarValue} ريال من طلبك القادم — أبلغ الكاشير أو أعرض QR`,
                  `You can deduct up to ${sarValue} SAR from your next order — tell the cashier or show QR`
                )}
              </p>
            </div>
          )}

          <div className="bg-muted/50 rounded-xl p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground text-sm">{tc("كيف أستخدم رصيدي؟","How to use my balance?")}</p>
            <p>• {tc("عند الدفع أخبر الكاشير باسمك أو رقم جوالك","At checkout tell the cashier your name or phone number")}</p>
            <p>• {tc("أو أعرض رمز QR ليخصم الكاشير تلقائياً","Or show QR code for automatic deduction")}</p>
            <p>• {tc(`${pointsPerSar} نقطة = 1 ريال خصم`,`${pointsPerSar} pts = 1 SAR discount`)}</p>
            <p>• {tc("إذا ساوى خصمك ثمن المشروب كاملاً فهو مجاناً","If discount covers the drink price — it's free!")}</p>
          </div>
        </div>

        {/* ── TRANSFER TO FRIEND ─────────────────────────────────── */}
        <div className="bg-card border rounded-2xl p-5 space-y-3" data-testid="transfer-section">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-blue-100 dark:bg-blue-900/40 rounded-xl flex items-center justify-center">
                <Send className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-black text-base">{tc("تحويل نقاط لصديق","Transfer Points to Friend")}</p>
                <p className="text-xs text-muted-foreground">{tc("أهدِ نقاطك لأي شخص","Gift your points to anyone")}</p>
              </div>
            </div>
            <Badge variant="secondary" className="text-xs">{points.toLocaleString()} {tc("نقطة","pts")}</Badge>
          </div>

          {!showTransfer ? (
            <Button
              variant="outline"
              className="w-full border-blue-200 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30"
              onClick={() => setShowTransfer(true)}
              disabled={points <= 0}
              data-testid="button-open-transfer"
            >
              <Send className="w-4 h-4 ml-2" />
              {tc("تحويل نقاط","Transfer Points")}
            </Button>
          ) : (
            <div className="space-y-3 border border-blue-100 dark:border-blue-900/50 rounded-xl p-4 bg-blue-50/50 dark:bg-blue-950/20">
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">{tc("رقم جوال المستلم","Recipient's Phone Number")}</Label>
                <Input
                  placeholder="05xxxxxxxx"
                  value={transferPhone}
                  onChange={e => setTransferPhone(e.target.value)}
                  dir="ltr"
                  className="bg-background"
                  data-testid="input-transfer-phone"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">{tc("عدد النقاط للتحويل","Points to Transfer")}</Label>
                <Input
                  type="number"
                  placeholder={tc("أدخل عدد النقاط","Enter number of points")}
                  value={transferPoints}
                  onChange={e => setTransferPoints(e.target.value)}
                  min={1}
                  max={points}
                  className="bg-background"
                  data-testid="input-transfer-points"
                />
                {transferPoints && parseInt(transferPoints) > 0 && (
                  <p className="text-xs text-muted-foreground">
                    ≈ {(parseInt(transferPoints) * pointsValueInSar).toFixed(2)} {tc("ريال","SAR")}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">{tc("كلمة المرور (للتأكيد)","Password (for confirmation)")}</Label>
                <Input
                  type="password"
                  placeholder={tc("كلمة المرور","Password")}
                  value={transferPin}
                  onChange={e => setTransferPin(e.target.value)}
                  className="bg-background"
                  data-testid="input-transfer-pin"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={handleTransfer}
                  disabled={transferMutation.isPending || !transferPhone || !transferPoints}
                  data-testid="button-confirm-transfer"
                >
                  {transferMutation.isPending ? tc("جاري التحويل...","Transferring...") : tc("تأكيد التحويل","Confirm Transfer")}
                </Button>
                <Button variant="outline" onClick={() => setShowTransfer(false)} data-testid="button-cancel-transfer">
                  {tc("إلغاء","Cancel")}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* ── HOW TO EARN ─────────────────────────────────────────── */}
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Gift className="w-5 h-5 text-amber-600" />
            <span className="font-bold text-amber-900 dark:text-amber-200">{tc("كيف أكسب نقاطاً؟","How to earn points?")}</span>
          </div>
          <div className="grid grid-cols-1 gap-1.5 text-sm text-amber-800 dark:text-amber-300">
            <div className="flex items-start gap-1.5">
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-600" />
              <span>{tc(`كل طلب تكسب نقاط تتراكم في رصيدك`,`Every order earns points added to your balance`)}</span>
            </div>
            <div className="flex items-start gap-1.5">
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-600" />
              <span>{pointsPerSar} {tc("نقطة = 1 ريال خصم","points = 1 SAR discount")}</span>
            </div>
            <div className="flex items-start gap-1.5">
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-600" />
              <span>{tc("إذا غطّى الخصم ثمن المشروب كاملاً — المشروب مجاناً","If discount covers drink price fully — it's free!")}</span>
            </div>
            <div className="flex items-start gap-1.5">
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-600" />
              <span>{tc("حوّل نقاطك لأصدقائك مجاناً","Transfer your points to friends for free")}</span>
            </div>
          </div>
        </div>

        {/* ── TIER PROGRESS ───────────────────────────────────────── */}
        {nextTierCfg && (
          <div className="bg-card rounded-2xl border p-4 space-y-3" data-testid="tier-progress">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <span className="font-bold">{tc(`التقدم نحو ${nextTierCfg.label}`,`Progress to ${nextTierCfg.label}`)}</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${tierCfg.color} transition-all`}
                style={{ width: `${progressToNext}%` }}
                data-testid="tier-progress-bar"
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{tierCfg.label}</span>
              <span>{progressToNext}%</span>
              <span>{nextTierCfg.label}</span>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              {tc(
                `تحتاج ${Math.max(0, nextTierCfg.min - points).toLocaleString()} نقطة للوصول إلى ${nextTierCfg.label}`,
                `You need ${Math.max(0, nextTierCfg.min - points).toLocaleString()} more points to reach ${nextTierCfg.label}`
              )}
            </p>
          </div>
        )}

        {/* ── TRANSACTION HISTORY (collapsible) ──────────────────── */}
        <div className="bg-card rounded-2xl border" data-testid="transactions-section">
          <button
            className="w-full flex items-center justify-between p-4"
            onClick={() => setShowHistory(v => !v)}
            data-testid="button-toggle-history"
          >
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="font-bold">{tc("سجل العمليات","Transaction History")}</span>
            </div>
            {showHistory ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>

          {showHistory && (
            <div className="px-4 pb-4 space-y-2">
              {loadingTx ? (
                <p className="text-center py-6 text-muted-foreground text-sm">{tc("جاري التحميل...","Loading...")}</p>
              ) : transactions.length === 0 ? (
                <div className="text-center py-6 space-y-2">
                  <Clock className="w-10 h-10 mx-auto text-muted-foreground opacity-30" />
                  <p className="text-sm text-muted-foreground">{tc("لا توجد عمليات سابقة","No transactions yet")}</p>
                </div>
              ) : (
                transactions.slice(0, 20).map((tx: any, i: number) => {
                  const isEarn = tx.type === 'earn' || tx.type === 'transfer_in' || tx.type === 'points_earned';
                  const isTransfer = tx.type === 'transfer_out' || tx.type === 'transfer_in';
                  const pts = Math.abs(tx.points || tx.pointsChange || 0);
                  const sarEq = pts > 0 ? (pts * pointsValueInSar).toFixed(2) : null;
                  return (
                    <div
                      key={tx.id || i}
                      className="flex items-center justify-between bg-muted/50 rounded-xl px-3 py-2.5"
                      data-testid={`transaction-${i}`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          isEarn ? "bg-green-100 text-green-600 dark:bg-green-900/30" : "bg-red-100 text-red-600 dark:bg-red-900/30"
                        }`}>
                          {isTransfer
                            ? <Send className="w-3.5 h-3.5" />
                            : isEarn
                              ? <ArrowDownRight className="w-4 h-4" />
                              : <ArrowUpRight className="w-4 h-4" />
                          }
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {tx.descriptionAr || tx.description || (isEarn ? tc("نقاط مكتسبة","Points Earned") : tc("استرداد خصم","Discount Redeemed"))}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString(i18n.language === 'en' ? 'en-US' : "ar-SA") : ""}
                            {sarEq && ` • ${sarEq} ${tc("ريال","SAR")}`}
                          </p>
                        </div>
                      </div>
                      {pts > 0 && (
                        <span className={`font-bold text-sm ${isEarn ? "text-green-600" : "text-red-600"}`}>
                          {isEarn ? "+" : "-"}{pts.toLocaleString()}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── QR Code Dialog ──────────────────────────────────────── */}
      <Dialog open={showQr} onOpenChange={setShowQr}>
        <DialogContent className="max-w-xs text-center" dir={dir} data-testid="dialog-qr">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-center gap-2">
              <QrCode className="w-5 h-5" />
              {tc("رمز بطاقتي","My Card QR")}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center py-4 gap-4">
            <p className="text-sm text-muted-foreground">
              {tc("اعرض هذا الرمز للكاشير لكسب النقاط أو خصم رصيدك","Show to cashier to earn points or deduct balance")}
            </p>
            {qrCodeUrl && (
              <div className="bg-white p-3 rounded-2xl shadow-lg">
                <img src={qrCodeUrl} alt="QR Code" className="w-52 h-52" data-testid="img-qr" />
              </div>
            )}
            {sarValueNum > 0 && (
              <div className="bg-primary/10 border border-primary/30 rounded-xl p-3 w-full">
                <p className="font-bold text-primary text-sm text-center">
                  {tc(`💰 رصيدك: ${points.toLocaleString()} نقطة = ${sarValue} ريال خصم`,`💰 Balance: ${points.toLocaleString()} pts = ${sarValue} SAR off`)}
                </p>
              </div>
            )}
            <p className="font-mono text-xs text-muted-foreground" data-testid="text-card-num-qr">
              {card?.cardNumber || ""}
            </p>
          </div>
          <Button variant="outline" onClick={() => setShowQr(false)} className="w-full" data-testid="button-close-qr">
            {tc("إغلاق","Close")}
          </Button>
        </DialogContent>
      </Dialog>
    </CustomerLayout>
  );
}
