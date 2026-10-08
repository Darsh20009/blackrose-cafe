import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import SarIcon from "@/components/sar-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronRight, ArrowLeftRight, Star, Wallet } from "lucide-react";
import BlackRoseCard from "@/components/BlackRoseCard";
import { useCustomer } from "@/contexts/CustomerContext";
import { useLocation } from "wouter";
import { CustomerLayout } from "@/components/layouts/CustomerLayout";
import QRCodeLib from "qrcode";
import { useTranslate } from "@/lib/useTranslate";
import { useTranslation } from "react-i18next";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import blackroseLogo from "@assets/blackrose-logo.png";
import { isAppleMobileDevice, openLoyaltyCardInAppleWallet } from "@/lib/apple-wallet";

export default function MyCardPage() {
  const { customer } = useCustomer();
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [addingToWallet, setAddingToWallet] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferPhone, setTransferPhone] = useState("");
  const [transferPoints, setTransferPoints] = useState("");
  const [transferPin, setTransferPin] = useState("");
  const tc = useTranslate();
  const { i18n } = useTranslation();
  const dir = i18n.language.startsWith("en") ? "ltr" : "rtl";

  const { data: loyaltyCards = [], isLoading: loadingCards } = useQuery<any[]>({
    queryKey: ["/api/customer/loyalty-cards"],
    enabled: !!customer,
  });

  const { data: settings } = useQuery<any>({
    queryKey: ["/api/public/loyalty-settings"],
  });

  const card = loyaltyCards[0];
  const points = card?.points ?? 0;
  const pointsValueInSar = settings?.pointsValueInSar ?? 0.02;
  const sarValueNum = parseFloat((points * pointsValueInSar).toFixed(2));

  useEffect(() => {
    const qrData = card?.qrToken || card?.cardNumber;
    if (!qrData) return;
    QRCodeLib.toDataURL(qrData, {
      width: 260,
      margin: 2,
      color: { dark: "#111111", light: "#ffffff" },
    })
      .then(setQrCodeUrl)
      .catch(console.error);
  }, [card?.qrToken, card?.cardNumber]);

  const transferMutation = useMutation({
    mutationFn: async (data: { recipientPhone: string; points: number; pin?: string }) =>
      apiRequest("POST", "/api/customer/transfer-points", data),
    onSuccess: () => {
      toast({
        title: tc("✅ تم التحويل بنجاح", "✅ Transfer successful"),
        description: tc(`تم تحويل ${transferPoints} نقطة`, `Transferred ${transferPoints} points`),
      });
      qc.invalidateQueries({ queryKey: ["/api/customer/loyalty-cards"] });
      qc.invalidateQueries({ queryKey: ["/api/customer/loyalty-transactions"] });
      setTransferPhone("");
      setTransferPoints("");
      setTransferPin("");
      setShowTransfer(false);
    },
    onError: (err: any) => {
      const msg = err?.message || tc("فشل التحويل", "Transfer failed");
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

  const isIOS = isAppleMobileDevice();

  const handleAddToAppleWallet = async () => {
    setAddingToWallet(true);
    try {
      toast({
        title: tc("جارٍ التحضير...", "Preparing…"),
        description: tc("سيفتح Apple Wallet لإضافة بطاقة الولاء", "Apple Wallet will open to add your loyalty card"),
      });
      await openLoyaltyCardInAppleWallet();
    } catch (e: any) {
      toast({
        title: tc("خطأ", "Error"),
        description: e?.message || tc("تعذّر الوصول للخادم", "Could not reach server"),
        variant: "destructive",
      });
    } finally {
      setAddingToWallet(false);
    }
  };

  /* ── Not logged in ── */
  if (!customer) {
    return (
      <CustomerLayout>
        <div className="flex min-h-[70vh] flex-col items-center justify-center gap-5 bg-background p-6 text-center text-foreground" dir={dir}>
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-primary/20 bg-primary/5">
            <Star className="h-8 w-8 text-primary" />
          </div>
          <div className="text-center">
            <p className="mb-1 text-lg font-bold">{tc("بطاقة الولاء", "Loyalty Card")}</p>
            <p className="text-sm text-muted-foreground">{tc("سجّل دخولك للوصول إلى بطاقتك", "Log in to access your card")}</p>
          </div>
          <Button onClick={() => setLocation("/auth")} data-testid="button-login" className="h-11 px-6 font-bold">
            {tc("تسجيل الدخول", "Log In")}
          </Button>
        </div>
      </CustomerLayout>
    );
  }

  /* ── Loading ── */
  if (loadingCards) {
    return (
      <CustomerLayout>
        <div className="flex min-h-[60vh] items-center justify-center bg-background">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </CustomerLayout>
    );
  }

  /* ── Main card view ── */
  return (
    <CustomerLayout>
      <div className="min-h-screen flex flex-col bg-background pb-28 text-foreground" dir={dir}>

        {/* ── Top bar ── */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/menu")} data-testid="button-back" className="text-muted-foreground">
            <ChevronRight className="w-5 h-5" />
          </Button>
          <p className="text-sm font-semibold text-muted-foreground">
            {tc("بطاقة الولاء", "Loyalty Card")}
          </p>
          <img src={blackroseLogo} alt="Black Rose" style={{ width: 36, height: 36, borderRadius: 10, objectFit: "cover" }} />
        </div>

        {/* ── Hero: greeting + points ── */}
        <div className="px-5 pt-4 pb-6">
          {/* Customer name */}
          <p className="mb-1 text-xs font-semibold text-primary">
            {tc("مرحباً،", "Welcome,")}
          </p>
          <p className="mb-5 text-2xl font-extrabold leading-tight text-foreground" data-testid="text-customer-name">
            {customer?.name || tc("عزيزي العميل", "Valued Customer")}
          </p>

          {/* Points stat cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-primary/15 bg-primary/5 p-3">
              <p className="mb-1.5 text-[10px] font-medium text-primary/80">
                {tc("نقاطي", "My Points")}
              </p>
              <p className="text-3xl font-black leading-none text-primary" data-testid="text-hero-points">
                {points.toLocaleString()}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-3">
              <p className="mb-1.5 text-[10px] font-medium text-muted-foreground">
                {tc("القيمة", "Value")}
              </p>
              <p className="flex items-center gap-1 text-2xl font-extrabold leading-none text-foreground">
                {sarValueNum.toFixed(2)}
                <SarIcon size={12} className="opacity-70" />
              </p>
            </div>
          </div>
        </div>

        {/* ── The Card ── */}
        <div className="px-4 mb-7">
          <BlackRoseCard
            phone={customer?.phone}
            points={points}
            sarValue={sarValueNum}
            customerName={customer?.name || card?.customerName}
          />
        </div>

        {/* ── QR Code ── */}
        {qrCodeUrl ? (
          <div className="flex flex-col items-center mb-6 px-4" data-testid="barcode-section">
            <div className="inline-block rounded-2xl border bg-white p-3 shadow-sm">
              <img src={qrCodeUrl} alt="QR Code" style={{ width: 180, height: 180, display: "block" }} data-testid="img-qr-code" />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {tc("امسح لتسجيل نقاطك", "Scan to collect points")}
            </p>
          </div>
        ) : card ? (
          <div className="flex justify-center mb-6">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : null}

        {/* ── Action Buttons ── */}
        <div className="px-4 flex flex-col gap-3">

          {/* Wallet section */}
          {isIOS ? (
            /* ── Apple Wallet button (iOS only) ── */
            <button
              onClick={handleAddToAppleWallet}
              disabled={addingToWallet}
              data-testid="button-add-apple-wallet"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                width: "100%", height: 58, borderRadius: 18,
                background: addingToWallet
                  ? "rgba(255,255,255,0.04)"
                  : "linear-gradient(135deg, #000 0%, #1c1c1e 60%, #111 100%)",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.14)",
                boxShadow: addingToWallet ? "none" : "0 6px 28px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.07)",
                cursor: addingToWallet ? "wait" : "pointer",
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", sans-serif',
                transition: "all 0.2s ease",
                opacity: addingToWallet ? 0.6 : 1,
                fontSize: 16, fontWeight: 500,
                letterSpacing: "-0.01em",
              }}
            >
              {addingToWallet ? (
                <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin border-white/50" />
              ) : (
                <svg width="20" height="24" viewBox="0 0 814 1000" fill="white" style={{ flexShrink: 0 }}>
                  <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-37.6-155.5-127.4C46 790.7 0 663 0 541.8c0-207.5 135.4-317.3 268.5-317.3 71 0 130.3 46.4 174.1 46.4 42.8 0 109.7-49.2 192.7-49.2 31 0 108.2 2.6 168.1 80.6zM552.5 80.3c34.3-41.7 57.8-97.3 57.8-152.9 0-5.8-.7-11.7-1.3-17.5-55.2 2-120.2 37-158.6 83.5-33.7 39.5-63.7 94.8-63.7 151.1 0 6.4.7 12.9 1.3 14.9 3.2.7 8.4 1.3 13.6 1.3 49.8 0 109.7-33.1 150.9-80.4z" />
                </svg>
              )}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", lineHeight: 1.2 }}>
                {!addingToWallet && (
                  <span style={{ fontSize: 11, opacity: 0.55, fontWeight: 400, letterSpacing: "0.02em" }}>
                    {tc("أضف إلى", "Add to")}
                  </span>
                )}
                <span style={{ fontSize: addingToWallet ? 15 : 18, fontWeight: 600 }}>
                  {addingToWallet ? tc("جارٍ التحضير...", "Preparing…") : "Apple Wallet"}
                </span>
              </div>
            </button>
          ) : (
            /* ── Non-iOS: digital loyalty card details ── */
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-900">
                <Wallet size={20} color="#2D9B6E" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="mb-0.5 text-sm font-bold text-emerald-700 dark:text-emerald-300">
                  {tc("بطاقة الولاء الرقمية", "Digital Loyalty Card")}
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {tc(
                    "استخدم رمز QR أعلاه لتسجيل نقاطك في الفرع مباشرةً",
                    "Use the QR code above to collect points at any branch"
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Transfer Points */}
          {points > 0 && (
            <div>
              {!showTransfer ? (
                <button
                  onClick={() => setShowTransfer(true)}
                  data-testid="button-open-transfer"
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-primary/30 text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  {tc("تحويل نقاط لصديق", "Transfer points to friend")}
                </button>
              ) : (
                <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
                  <p className="text-sm font-bold text-primary">
                    {tc("تحويل النقاط", "Transfer Points")}
                  </p>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{tc("رقم جوال المستلم", "Recipient Phone")}</Label>
                    <Input placeholder="05xxxxxxxx" value={transferPhone} onChange={(e) => setTransferPhone(e.target.value)} dir="ltr"
                      className="h-11 rounded-xl bg-background text-foreground placeholder:text-muted-foreground" data-testid="input-transfer-phone" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{tc("عدد النقاط", "Points")}</Label>
                    <Input type="number" placeholder={tc("أدخل عدد النقاط", "Enter points")} value={transferPoints} onChange={(e) => setTransferPoints(e.target.value)}
                      min={1} max={points} className="h-11 rounded-xl bg-background text-foreground placeholder:text-muted-foreground" data-testid="input-transfer-points" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{tc("كلمة المرور", "Password")}</Label>
                    <Input type="password" placeholder={tc("كلمة المرور", "Password")} value={transferPin} onChange={(e) => setTransferPin(e.target.value)}
                      className="h-11 rounded-xl bg-background text-foreground placeholder:text-muted-foreground" data-testid="input-transfer-pin" />
                  </div>
                  <div className="flex gap-2">
                    <Button className="h-11 flex-1 rounded-xl font-bold"
                      onClick={handleTransfer} disabled={transferMutation.isPending || !transferPhone || !transferPoints} data-testid="button-confirm-transfer">
                      {transferMutation.isPending ? tc("جاري...", "Sending...") : tc("تأكيد التحويل", "Confirm")}
                    </Button>
                    <Button variant="outline" className="h-11 rounded-xl border-border text-muted-foreground hover:bg-muted"
                      onClick={() => setShowTransfer(false)} data-testid="button-cancel-transfer">
                      {tc("إلغاء", "Cancel")}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </CustomerLayout>
  );
}
