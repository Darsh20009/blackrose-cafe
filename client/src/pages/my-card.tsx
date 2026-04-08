import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronRight, Coffee, Wallet } from "lucide-react";
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
  const dir = i18n.language === "en" ? "ltr" : "rtl";

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
      width: 280,
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
        description: tc(
          `تم تحويل ${transferPoints} نقطة للمستلم`,
          `Transferred ${transferPoints} points`
        ),
      });
      qc.invalidateQueries({ queryKey: ["/api/customer/loyalty-cards"] });
      qc.invalidateQueries({ queryKey: ["/api/customer/loyalty-transactions"] });
      setTransferPhone("");
      setTransferPoints("");
      setTransferPin("");
      setShowTransfer(false);
    },
    onError: (err: any) => {
      const msg =
        err?.message || tc("فشل التحويل، تحقق من البيانات", "Transfer failed, check inputs");
      toast({ title: tc("خطأ", "Error"), description: msg, variant: "destructive" });
    },
  });

  const handleTransfer = () => {
    const pts = parseInt(transferPoints);
    if (!transferPhone || !pts || pts <= 0) {
      toast({
        title: tc("خطأ", "Error"),
        description: tc("أدخل رقم الجوال والنقاط", "Enter phone and points"),
        variant: "destructive",
      });
      return;
    }
    if (pts > points) {
      toast({
        title: tc("خطأ", "Error"),
        description: tc("النقاط غير كافية", "Insufficient points"),
        variant: "destructive",
      });
      return;
    }
    transferMutation.mutate({
      recipientPhone: transferPhone,
      points: pts,
      pin: transferPin || undefined,
    });
  };

  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  const handleAddToAppleWallet = async () => {
    setAddingToWallet(true);
    try {
      if (isIOS) {
        toast({
          title: tc("⏳ جارٍ التحضير...", "⏳ Preparing pass..."),
          description: tc("سيفتح Apple Wallet خلال ثوانٍ", "Apple Wallet will open in a few seconds"),
        });
        await new Promise((r) => setTimeout(r, 400));
        window.location.href = "/api/wallet/apple-pass";
        return;
      }
      const resp = await fetch("/api/wallet/apple-pass", {
        method: "GET",
        credentials: "include",
      });
      const contentType = resp.headers.get("content-type") || "";
      if (!resp.ok || !contentType.includes("pkpass")) {
        let errMsg = tc("فشل إنشاء البطاقة", "Failed to generate pass");
        try {
          const err = await resp.json();
          errMsg = err?.error || errMsg;
        } catch (_) {}
        toast({ title: tc("خطأ", "Error"), description: errMsg, variant: "destructive" });
        return;
      }
      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(
        new Blob([blob], { type: "application/vnd.apple.pkpass" })
      );
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = "blackrose-loyalty.pkpass";
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 8000);
      toast({
        title: tc("✅ تم تحميل البطاقة", "✅ Pass Downloaded"),
        description: tc(
          "افتح ملف .pkpass لإضافته إلى Apple Wallet",
          "Open the .pkpass file to add it to Apple Wallet"
        ),
      });
    } catch (e: any) {
      toast({
        title: tc("خطأ في الاتصال", "Connection Error"),
        description: e?.message || tc("تعذّر الوصول للخادم", "Could not reach server"),
        variant: "destructive",
      });
    } finally {
      setAddingToWallet(false);
    }
  };

  /* ── Not logged in ───────────────────────────────────────────── */
  if (!customer) {
    return (
      <CustomerLayout>
        <div
          className="flex flex-col items-center justify-center min-h-screen gap-4 p-8"
          style={{ background: "#0d0d0d" }}
          dir={dir}
        >
          <Coffee className="w-16 h-16 opacity-30" style={{ color: "#C8A53A" }} />
          <p className="text-lg font-bold text-center text-white/70">
            {tc("يجب تسجيل الدخول لعرض بطاقة الولاء", "Please log in to view your loyalty card")}
          </p>
          <Button
            onClick={() => setLocation("/auth")}
            data-testid="button-login"
            style={{ background: "#C8A53A", color: "#111" }}
          >
            {tc("تسجيل الدخول", "Log In")}
          </Button>
        </div>
      </CustomerLayout>
    );
  }

  /* ── Loading ─────────────────────────────────────────────────── */
  if (loadingCards) {
    return (
      <CustomerLayout>
        <div
          className="flex items-center justify-center min-h-screen"
          style={{ background: "#0d0d0d" }}
        >
          <div
            className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: "#C8A53A", borderTopColor: "transparent" }}
          />
        </div>
      </CustomerLayout>
    );
  }

  /* ── Main card view ──────────────────────────────────────────── */
  return (
    <CustomerLayout>
      <div
        className="min-h-screen flex flex-col items-center pb-28"
        style={{ background: "#0d0d0d" }}
        dir={dir}
      >
        {/* Back button */}
        <div className="w-full max-w-md px-4 pt-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/")}
            data-testid="button-back"
            className="text-white/50 hover:text-white hover:bg-white/10"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        {/* ── Header: name (left) + logo (right) ───────────────── */}
        <div className="w-full max-w-md px-5 mt-2 mb-5 flex items-center justify-between">
          {/* Left: label + customer name */}
          <div dir="rtl">
            <p
              style={{
                color: "#C8A53A",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.12em",
                margin: 0,
                opacity: 0.75,
              }}
            >
              {tc("وفلاء", "LOYAL")}
            </p>
            <p
              style={{
                color: "#ffffff",
                fontSize: 20,
                fontWeight: 800,
                margin: 0,
                lineHeight: 1.2,
              }}
              data-testid="text-customer-name"
            >
              {customer?.name || tc("عزيزي العميل", "Valued Customer")}
            </p>
          </div>

          {/* Right: Black Rose logo */}
          <img
            src={blackroseLogo}
            alt="Black Rose Cafe"
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              objectFit: "cover",
              boxShadow: "0 4px 20px rgba(0,0,0,0.6)",
            }}
          />
        </div>

        {/* ── The Card (unchanged) ──────────────────────────────── */}
        <div className="w-full max-w-md px-4">
          <BlackRoseCard
            phone={customer?.phone}
            points={points}
            sarValue={sarValueNum}
            customerName={customer?.name || card?.customerName}
          />
        </div>

        {/* ── Barcode only ──────────────────────────────────────── */}
        {qrCodeUrl ? (
          <div className="mt-8 flex flex-col items-center gap-2" data-testid="barcode-section">
            <div
              style={{
                background: "#ffffff",
                borderRadius: 20,
                padding: 14,
                boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
              }}
            >
              <img
                src={qrCodeUrl}
                alt="QR Code"
                style={{ width: 200, height: 200, display: "block" }}
                data-testid="img-qr-code"
              />
            </div>
          </div>
        ) : card ? (
          /* QR generating spinner */
          <div className="mt-10 flex items-center gap-3 opacity-40">
            <div
              className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: "#C8A53A", borderTopColor: "transparent" }}
            />
          </div>
        ) : null}

        {/* ── Apple Wallet button (subtle, below barcode) ───────── */}
        <div className="mt-6 px-4 w-full max-w-md flex flex-col gap-3">
          <button
            onClick={handleAddToAppleWallet}
            disabled={addingToWallet}
            data-testid="button-add-apple-wallet"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              width: "100%",
              height: 48,
              borderRadius: 12,
              background: addingToWallet ? "#222" : "#1a1a1a",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.12)",
              cursor: addingToWallet ? "wait" : "pointer",
              fontFamily:
                '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif',
              transition: "opacity 0.15s",
              opacity: addingToWallet ? 0.6 : 1,
            }}
          >
            {addingToWallet ? (
              <svg
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                style={{ animation: "spin 1s linear infinite", flexShrink: 0 }}
              >
                <circle cx="9" cy="9" r="7" stroke="white" strokeWidth="2" strokeOpacity="0.3" />
                <path d="M9 2a7 7 0 0 1 7 7" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : (
              <svg
                width="16"
                height="19"
                viewBox="0 0 814 1000"
                fill="white"
                xmlns="http://www.w3.org/2000/svg"
                style={{ flexShrink: 0 }}
              >
                <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-37.6-155.5-127.4C46 790.7 0 663 0 541.8c0-207.5 135.4-317.3 268.5-317.3 71 0 130.3 46.4 174.1 46.4 42.8 0 109.7-49.2 192.7-49.2 31 0 108.2 2.6 168.1 80.6zM552.5 80.3c34.3-41.7 57.8-97.3 57.8-152.9 0-5.8-.7-11.7-1.3-17.5-55.2 2-120.2 37-158.6 83.5-33.7 39.5-63.7 94.8-63.7 151.1 0 6.4.7 12.9 1.3 14.9 3.2.7 8.4 1.3 13.6 1.3 49.8 0 109.7-33.1 150.9-80.4z" />
              </svg>
            )}
            <div
              style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", lineHeight: 1.1 }}
            >
              {!addingToWallet && (
                <span style={{ fontSize: 9, fontWeight: 400, opacity: 0.7 }}>
                  {tc("أضف إلى", "Add to")}
                </span>
              )}
              <span style={{ fontSize: addingToWallet ? 13 : 16, fontWeight: 600, letterSpacing: "-0.3px" }}>
                {addingToWallet ? tc("جارٍ التحضير...", "Preparing...") : "Apple Wallet"}
              </span>
            </div>
          </button>

          {/* Transfer Points — compact link */}
          {points > 0 && (
            <div>
              {!showTransfer ? (
                <button
                  onClick={() => setShowTransfer(true)}
                  data-testid="button-open-transfer"
                  style={{
                    background: "none",
                    border: "none",
                    color: "rgba(200,165,58,0.6)",
                    fontSize: 13,
                    cursor: "pointer",
                    width: "100%",
                    textAlign: "center",
                    padding: "6px 0",
                  }}
                >
                  {tc("تحويل نقاط لصديق", "Transfer points to a friend")}
                </button>
              ) : (
                <div
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 14,
                    padding: 16,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <div className="space-y-1">
                    <Label className="text-white/70 text-sm">
                      {tc("رقم جوال المستلم", "Recipient's Phone")}
                    </Label>
                    <Input
                      placeholder="05xxxxxxxx"
                      value={transferPhone}
                      onChange={(e) => setTransferPhone(e.target.value)}
                      dir="ltr"
                      className="bg-white/10 border-white/10 text-white placeholder:text-white/30"
                      data-testid="input-transfer-phone"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-white/70 text-sm">
                      {tc("عدد النقاط", "Points")}
                    </Label>
                    <Input
                      type="number"
                      placeholder={tc("أدخل عدد النقاط", "Enter points")}
                      value={transferPoints}
                      onChange={(e) => setTransferPoints(e.target.value)}
                      min={1}
                      max={points}
                      className="bg-white/10 border-white/10 text-white placeholder:text-white/30"
                      data-testid="input-transfer-points"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-white/70 text-sm">
                      {tc("كلمة المرور للتأكيد", "Password")}
                    </Label>
                    <Input
                      type="password"
                      placeholder={tc("كلمة المرور", "Password")}
                      value={transferPin}
                      onChange={(e) => setTransferPin(e.target.value)}
                      className="bg-white/10 border-white/10 text-white placeholder:text-white/30"
                      data-testid="input-transfer-pin"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      style={{ background: "#C8A53A", color: "#111" }}
                      onClick={handleTransfer}
                      disabled={transferMutation.isPending || !transferPhone || !transferPoints}
                      data-testid="button-confirm-transfer"
                    >
                      {transferMutation.isPending
                        ? tc("جاري التحويل...", "Transferring...")
                        : tc("تأكيد التحويل", "Confirm")}
                    </Button>
                    <Button
                      variant="outline"
                      className="border-white/10 text-white/60 hover:bg-white/10"
                      onClick={() => setShowTransfer(false)}
                      data-testid="button-cancel-transfer"
                    >
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
