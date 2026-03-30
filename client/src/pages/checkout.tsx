import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useCartStore } from "@/lib/cart-store";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import PaymentMethods from "@/components/payment-methods";
import GeideaCheckoutWidget from "@/components/geidea-checkout";
import SimulatedCardPayment from "@/components/simulated-card-payment";
import PaymobCheckoutWidget from "@/components/paymob-checkout";
import { customerStorage } from "@/lib/customer-storage";
import { useCustomer } from "@/contexts/CustomerContext";
import { useLoyaltyCard } from "@/hooks/useLoyaltyCard";
import { ErrorBoundary } from "@/components/error-boundary";
import { useTranslate, tc } from "@/lib/useTranslate";
import { User, Gift, CheckCircle, Sparkles, Loader2, Ticket, Tag, Wrench, Coffee, Award, CreditCard, Star, Coins, X, ChevronLeft, Upload, Camera } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { PaymentMethodInfo, PaymentMethod } from "@shared/schema";
import SarIcon from "@/components/sar-icon";

const TIER_STYLES: Record<string, { gradient: string; badge: string; name: string; icon: string; nextTier?: string; threshold: number }> = {
  bronze:   { gradient: 'from-amber-600 via-amber-700 to-amber-800',   badge: 'bg-amber-600',  name: tc('برونزي', 'Bronze'),  icon: '🥉', nextTier: 'silver',   threshold: 500 },
  silver:   { gradient: 'from-slate-400 via-slate-500 to-slate-600',   badge: 'bg-slate-500',  name: tc('فضي', 'Silver'),     icon: '🥈', nextTier: 'gold',     threshold: 1500 },
  gold:     { gradient: 'from-yellow-500 via-amber-500 to-yellow-600', badge: 'bg-yellow-500', name: tc('ذهبي', 'Gold'),    icon: '🥇', nextTier: 'platinum', threshold: 3000 },
  platinum: { gradient: 'from-violet-500 via-purple-600 to-indigo-700',badge: 'bg-violet-500', name: tc('بلاتيني', 'Platinum'), icon: '💎', threshold: 3000 },
};

function LoyaltyCheckoutCard({
  loyaltyCard,
  loyaltyPoints,
  pointsPerSar,
  minPointsForRedemption,
  pointsToRedeem,
  onApplyPoints,
  onCancelPoints,
  baseTotal,
}: {
  loyaltyCard: any;
  loyaltyPoints: number;
  pointsPerSar: number;
  minPointsForRedemption: number;
  pointsToRedeem: number;
  onApplyPoints: (pts: number) => void;
  onCancelPoints: () => void;
  baseTotal: number;
}) {
  const tier = loyaltyCard?.tier || 'bronze';
  const tierStyle = TIER_STYLES[tier] || TIER_STYLES.bronze;
  const isApplied = pointsToRedeem > 0;
  const totalPointsValue = parseFloat((loyaltyPoints / pointsPerSar).toFixed(2));
  const appliedDiscount = parseFloat((pointsToRedeem / pointsPerSar).toFixed(2));

  const canRedeem = loyaltyPoints >= minPointsForRedemption;
  const [inputVal, setInputVal] = useState(() =>
    canRedeem ? minPointsForRedemption : 0
  );

  const nextTierStyle = tierStyle.nextTier ? TIER_STYLES[tierStyle.nextTier] : null;
  const tierProgress = nextTierStyle
    ? Math.min(100, Math.round((loyaltyPoints / nextTierStyle.threshold) * 100))
    : 100;

  return (
    <div className="space-y-3" data-testid="loyalty-checkout-section">
      {/* Main card */}
      <div className={`relative rounded-2xl overflow-hidden bg-gradient-to-br ${tierStyle.gradient} text-white shadow-xl`}>
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 0%, transparent 50%)' }} />
        <div className="absolute top-3 left-3 text-white/20 text-7xl font-black select-none pointer-events-none leading-none">◈</div>
        <div className="p-5 relative z-10">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-base tracking-wide">{tc("بطاقة كوبي", "COPY Card")}</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/20 flex items-center gap-1">
                  {tierStyle.icon} {tierStyle.name}
                </span>
              </div>
              <p className="text-sm opacity-80 truncate">{loyaltyCard?.customerName}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-4xl font-black leading-none" data-testid="text-loyalty-points">{loyaltyPoints.toLocaleString()}</p>
              <p className="text-[11px] opacity-70 mt-0.5">{tc("نقطة", "pts")}</p>
            </div>
          </div>

          {/* Points value */}
          <div className="mt-3 pt-3 border-t border-white/20 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs opacity-80">
              <Coins className="w-3.5 h-3.5" />
              <span>{tc("قيمة نقاطك", "Your Points Value")}</span>
            </div>
            <span className="text-lg font-black">{totalPointsValue.toFixed(2)} ريال</span>
          </div>

          {/* Tier progress */}
          {nextTierStyle && (
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-[10px] opacity-60">
                <span>{tierStyle.name}</span>
                <span>{nextTierStyle.name} ({nextTierStyle.threshold.toLocaleString()} نقطة)</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-1.5 overflow-hidden">
                <div className="h-full rounded-full bg-white/70 transition-all" style={{ width: `${tierProgress}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Applied state */}
      {isApplied && (
        <div className="flex items-center justify-between gap-3 bg-green-50 dark:bg-green-950/30 border border-green-300 dark:border-green-700 rounded-xl p-3" data-testid="points-applied-banner">
          <div className="flex items-center gap-2 text-green-700 dark:text-green-400 flex-1 min-w-0">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-bold">{tc("تم تطبيق خصم النقاط ✓", "Points Discount Applied ✓")}</p>
              <p className="text-xs opacity-80">
                {pointsToRedeem.toLocaleString()} نقطة = <span className="font-black">{appliedDiscount.toFixed(2)} ريال</span> خصم
                {appliedDiscount >= baseTotal && <span className="text-green-600 font-bold mr-1">· يغطي المبلغ كاملاً!</span>}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-500 hover:text-red-700 h-7 px-2 text-xs flex-shrink-0 gap-1"
            onClick={onCancelPoints}
            data-testid="button-cancel-points"
          >
            <X className="w-3 h-3" />
            إلغاء
          </Button>
        </div>
      )}

      {/* Redemption UI */}
      {!isApplied && canRedeem && (
        <div className="border-2 border-dashed border-amber-300 dark:border-amber-700 rounded-xl p-4 space-y-3 bg-amber-50/50 dark:bg-amber-900/10" data-testid="points-redeem-section">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-500" />
            <p className="text-sm font-bold text-amber-800 dark:text-amber-300">{tc("استخدم نقاطك كخصم", "Use Your Points as Discount")}</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={minPointsForRedemption}
                max={loyaltyPoints}
                step={Math.max(1, Math.floor(loyaltyPoints / 100))}
                value={inputVal}
                onChange={e => setInputVal(Number(e.target.value))}
                className="flex-1 accent-amber-500"
                data-testid="slider-points"
              />
              <div className="text-right min-w-[80px]">
                <p className="text-sm font-black text-amber-700 dark:text-amber-400">{inputVal.toLocaleString()}</p>
                <p className="text-[10px] text-amber-600/70">{tc("نقطة", "pts")}</p>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs px-1">
              <span className="text-muted-foreground">{minPointsForRedemption} (الحد الأدنى)</span>
              <span className="font-bold text-amber-700 dark:text-amber-400">
                = {parseFloat((inputVal / pointsPerSar).toFixed(2)).toFixed(2)} ريال خصم
              </span>
            </div>
          </div>

          <Button
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-10 gap-2"
            onClick={() => onApplyPoints(inputVal)}
            data-testid="button-apply-points"
          >
            <Coins className="w-4 h-4" />
            طبّق خصم {parseFloat((inputVal / pointsPerSar).toFixed(2)).toFixed(2)} ريال
          </Button>
        </div>
      )}

      {!isApplied && !canRedeem && loyaltyPoints > 0 && (
        <div className="text-center px-3 py-2 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-700/50">
          <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
            تحتاج {(minPointsForRedemption - loyaltyPoints).toLocaleString()} نقطة إضافية للاستبدال
          </p>
          <p className="text-[10px] text-amber-600/70 mt-0.5">الحد الأدنى: {minPointsForRedemption} نقطة</p>
        </div>
      )}

      {!isApplied && loyaltyPoints === 0 && (
        <div className="text-center px-3 py-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-dashed border-amber-300 dark:border-amber-700/50">
          <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">🎯 اكسب نقاطك عند إتمام طلبك!</p>
          <p className="text-[11px] text-amber-600/70 mt-1">
            ابدأ باكتساب {minPointsForRedemption} نقطة للحصول على أول خصم بقيمة {(minPointsForRedemption / pointsPerSar).toFixed(2)} ريال
          </p>
        </div>
      )}
    </div>
  );
}

export default function CheckoutPage() {
  const tc = useTranslate();
  const { t, i18n } = useTranslation();
  const [, setLocation] = useLocation();
  const { cartItems, clearCart, getFinalTotal, deliveryInfo } = useCartStore();
  const { toast } = useToast();
  const isAr = i18n.language === 'ar';

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const receiptInputRef = useRef<HTMLInputElement>(null);
  const [cashDistanceError, setCashDistanceError] = useState<string | null>(null);
  const [cashDistanceChecking, setCashDistanceChecking] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showInlineGeidea, setShowInlineGeidea] = useState(false);
  const [showSimulatedCard, setShowSimulatedCard] = useState(false);
  const [showPaymobCheckout, setShowPaymobCheckout] = useState(false);
  const [paymobCheckoutUrl, setPaymobCheckoutUrl] = useState("");
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [showSuccessPage, setShowSuccessPage] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPassword, setCustomerPassword] = useState("");
  const [wantToRegister, setWantToRegister] = useState(false);
  const [customerNotes, setCustomerNotes] = useState("");
  const [discountCode, setDiscountCode] = useState("");
  const [isValidatingDiscount, setIsValidatingDiscount] = useState(false);
  const [appliedDiscount, setAppliedDiscount] = useState<{code: string, percentage: number, isOffer?: boolean} | null>(null);
  const [giftCardCode, setGiftCardCode] = useState("");
  const [appliedGiftCard, setAppliedGiftCard] = useState<{ code: string; balance: number; applied: number } | null>(null);
  const [isCheckingGiftCard, setIsCheckingGiftCard] = useState(false);
  const [showCouponSuggestions, setShowCouponSuggestions] = useState(false);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const { card: loyaltyCard, refetch: refetchLoyaltyCard } = useLoyaltyCard();

  const { data: loyaltySettings } = useQuery<any>({
    queryKey: ["/api/public/loyalty-settings"],
    staleTime: 60000,
  });

  const pointsPerSar: number = loyaltySettings?.pointsPerSar ?? 20;
  const minPointsForRedemption: number = loyaltySettings?.minPointsForRedemption ?? 100;
  const loyaltyPoints: number = loyaltyCard?.points || 0;

  const getBaseTotal = () => {
    let total = getFinalTotal();
    if (appliedDiscount) {
      total = total * (1 - appliedDiscount.percentage / 100);
    }
    return total;
  };

  const usePointsAsDiscount = pointsToRedeem > 0;
  const pointsDiscountSAR = pointsToRedeem > 0
    ? parseFloat((pointsToRedeem / pointsPerSar).toFixed(2))
    : 0;

  const getFinalTotalWithPoints = () => {
    const base = getBaseTotal();
    if (usePointsAsDiscount && pointsDiscountSAR > 0) {
      return Math.max(0, base - pointsDiscountSAR);
    }
    return base;
  };

  const giftCardDiscount = appliedGiftCard ? Math.min(appliedGiftCard.applied, getFinalTotalWithPoints()) : 0;
  const getFinalAmount = () => Math.max(0, getFinalTotalWithPoints() - giftCardDiscount);

  const handleCheckGiftCard = async (code?: string) => {
    const codeToUse = code || giftCardCode.trim();
    if (!codeToUse) return;
    setIsCheckingGiftCard(true);
    try {
      const res = await fetch(`/api/gift-cards/check/${codeToUse.toUpperCase()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || tc("بطاقة غير صالحة", "Invalid gift card"));
      const currentTotal = getFinalTotalWithPoints();
      const applied = Math.min(Number(data.balance), currentTotal);
      setAppliedGiftCard({ code: data.code, balance: Number(data.balance), applied });
      toast({ title: tc("✅ بطاقة هدية مقبولة", "✅ Gift Card Accepted"), description: `سيتم خصم ${applied.toFixed(2)} ريال (الرصيد الكامل: ${data.balance} ريال)` });
    } catch (err: any) {
      toast({ variant: "destructive", title: tc("❌ خطأ", "❌ Error"), description: err.message });
    } finally {
      setIsCheckingGiftCard(false);
    }
  };
  const [isRegistering, setIsRegistering] = useState(false);
  const { customer, setCustomer } = useCustomer();
  const isGuestMode = !customer && customerStorage.isGuestMode();

  useEffect(() => {
    if (customer) {
      setCustomerName(customer.name);
      setCustomerPhone(customer.phone);
      if (customer.email) setCustomerEmail(customer.email);
    } else {
      const guestInfo = customerStorage.getGuestInfo();
      if (guestInfo) {
        setCustomerName(guestInfo.name);
        setCustomerPhone(guestInfo.phone);
      }
    }
  }, [customer]);

  // Reset payment method if invalid selection
  useEffect(() => {
    if (selectedPaymentMethod === 'qahwa-card') {
      setSelectedPaymentMethod(null);
    }
    setReceiptFile(null);
    setReceiptPreview(null);
  }, [selectedPaymentMethod]);

  const handleReceiptFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReceiptFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setReceiptPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const uploadReceiptToServer = async (file: File): Promise<string | null> => {
    try {
      setIsUploadingReceipt(true);
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload-receipt', { method: 'POST', body: formData });
      if (res.ok) {
        const data = await res.json();
        return data.url || null;
      }
      return null;
    } catch {
      return null;
    } finally {
      setIsUploadingReceipt(false);
    }
  };

  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const pendingGeideaOrderData = useRef<any>(null);
  const geideaOrderNum = useRef<string>("");

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isPaymentCallback = urlParams.get('payment') === 'callback';

    // Also detect Geidea's own callback params (they redirect directly with these params)
    const geideaResponseCode = urlParams.get('responseCode') || urlParams.get('Response') || urlParams.get('response_code');
    const geideaOrderId = urlParams.get('orderId') || urlParams.get('order_id');
    const geideaStatus = urlParams.get('status') || urlParams.get('Status');
    const geideaSignature = urlParams.get('signature') || urlParams.get('Signature');
    const geideaAmount = urlParams.get('amount') || urlParams.get('Amount') || urlParams.get('orderAmount');
    const geideaCurrency = urlParams.get('currency') || urlParams.get('Currency');
    const geideaMerchantRefId = urlParams.get('merchantReferenceId') || urlParams.get('MerchantReferenceId');

    const hasGeideaParams = !!(geideaResponseCode || geideaOrderId || geideaStatus);

    // Detect Paymob callback params
    const paymobProvider = urlParams.get('provider');
    const paymobSuccess = urlParams.get('success');
    const paymobTransactionId = urlParams.get('id');
    const paymobPending = urlParams.get('pending');
    const hasPaymobParams = paymobProvider === 'paymob' && paymobSuccess !== null;

    if (isPaymentCallback || hasGeideaParams || hasPaymobParams) {
      const storedOrderData = sessionStorage.getItem('pendingOrderData');
      const storedSessionId = sessionStorage.getItem('paymentSessionId');
      const storedProvider = sessionStorage.getItem('paymentProvider');

      if (storedOrderData && (storedSessionId || hasGeideaParams || hasPaymobParams)) {
        setIsVerifyingPayment(true);
        (async () => {
          try {
            const verifyPayload: Record<string, any> = {
              sessionId: storedSessionId,
              provider: storedProvider || paymobProvider,
            };

            // Pass Geidea's callback parameters for faster/more accurate verification
            if (hasGeideaParams) {
              if (geideaResponseCode) verifyPayload.geideaResponseCode = geideaResponseCode;
              if (geideaOrderId) verifyPayload.geideaOrderId = geideaOrderId;
              if (geideaStatus) verifyPayload.geideaStatus = geideaStatus;
              if (geideaSignature) verifyPayload.geideaSignature = geideaSignature;
              if (geideaAmount) verifyPayload.geideaAmount = geideaAmount;
              if (geideaCurrency) verifyPayload.geideaCurrency = geideaCurrency;
              if (geideaMerchantRefId) verifyPayload.geideaMerchantRefId = geideaMerchantRefId;
            }

            // Pass Paymob callback parameters
            if (hasPaymobParams) {
              verifyPayload.paymobSuccess = paymobSuccess;
              verifyPayload.paymobTransactionId = paymobTransactionId;
              verifyPayload.paymobPending = paymobPending;
            }

            const verifyRes = await apiRequest("POST", "/api/payments/verify", verifyPayload);
            const verifyData = await verifyRes.json();

            sessionStorage.removeItem('pendingOrderData');
            sessionStorage.removeItem('paymentSessionId');
            sessionStorage.removeItem('paymentProvider');

            if (verifyData.verified) {
              const orderData = JSON.parse(storedOrderData);
              orderData.paymentStatus = 'paid';
              orderData.transactionId = verifyData.transactionId || geideaOrderId || paymobTransactionId;
              createOrderMutation.mutate(orderData);
            } else {
              toast({
                variant: "destructive",
                title: t("checkout.payment_failed"),
                description: verifyData.error || t("checkout.payment_verification_failed"),
              });
            }
          } catch {
            sessionStorage.removeItem('pendingOrderData');
            sessionStorage.removeItem('paymentSessionId');
            sessionStorage.removeItem('paymentProvider');
            toast({ variant: "destructive", title: t("checkout.error"), description: t("checkout.payment_status_check_failed") });
          } finally {
            setIsVerifyingPayment(false);
          }
        })();
      }
      window.history.replaceState({}, '', '/checkout');
    }
  }, []);

  useEffect(() => {
    const activeOffer = customerStorage.getActiveOffer();
    if (activeOffer && activeOffer.discount > 0 && !appliedDiscount) {
      const discountPercentage = activeOffer.type === 'loyalty' 
        ? 0 
        : activeOffer.discount;
      
      if (discountPercentage > 0) {
        setAppliedDiscount({
          code: activeOffer.title,
          percentage: discountPercentage,
          isOffer: true
        });
        toast({
          title: t("points.offer_applied"),
          description: `${activeOffer.title} - ${t("points.discount")} ${discountPercentage}%`,
        });
      }
    }
  }, []);

  const { data: paymentMethods = [] } = useQuery<PaymentMethodInfo[]>({
    queryKey: ["/api/payment-methods"],
    queryFn: async () => {
      const res = await fetch(`/api/payment-methods`);
      return res.json();
    }
  });

  const cashMethod = paymentMethods.find(m => m.id === 'cash');

  const haversineDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371000;
    const toRad = (v: number) => (v * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  useEffect(() => {
    if (selectedPaymentMethod !== 'cash') {
      setCashDistanceError(null);
      return;
    }
    const maxDist = cashMethod?.cashMaxDistance || 0;
    const storeLoc = cashMethod?.storeLocation;
    if (!maxDist || maxDist <= 0 || !storeLoc?.lat || !storeLoc?.lng) {
      setCashDistanceError(null);
      return;
    }
    if (!navigator.geolocation) {
      setCashDistanceError(tc('متصفحك لا يدعم تحديد الموقع، لا يمكن التحقق من المسافة للدفع نقداً', 'Your browser does not support location detection. Cash payment distance check unavailable.'));
      return;
    }
    setCashDistanceChecking(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const dist = haversineDistance(pos.coords.latitude, pos.coords.longitude, storeLoc.lat!, storeLoc.lng!);
        setCashDistanceChecking(false);
        if (dist > maxDist) {
          setCashDistanceError(`أنت بعيد عن المتجر (${Math.round(dist)} متر). الدفع نقداً متاح فقط ضمن ${maxDist} متر من المتجر.`);
        } else {
          setCashDistanceError(null);
        }
      },
      () => {
        setCashDistanceChecking(false);
        setCashDistanceError(tc('تعذّر تحديد موقعك. الرجاء السماح بالوصول للموقع للدفع نقداً.', 'Could not determine your location. Please allow location access for cash payment.'));
      },
      { timeout: 8000, maximumAge: 60000 }
    );
  }, [selectedPaymentMethod, cashMethod]);

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const response = await apiRequest("POST", "/api/orders", orderData);
      if (!response.ok) {
        const error = await response.json();
        const msg = error.details ? `${error.error}: ${error.details}` : (error.error || "فشل إنشاء الطلب");
        throw new Error(msg);
      }
      return response.json();
    },
    onSuccess: async (data) => {
      if (usePointsAsDiscount) {
        try { await refetchLoyaltyCard(); } catch {}
      }
      // Gift card is now redeemed atomically inside POST /api/orders — no separate call needed
      setOrderDetails(data);
      clearCart();
      customerStorage.clearActiveOffer();
      setShowSuccessPage(true);
      setPointsToRedeem(0);
      setAppliedGiftCard(null);
      setGiftCardCode("");
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/loyalty/cards/phone"] });
      refetchLoyaltyCard();
      const displayNum = data.orderNumber;
      toast({ title: t("checkout.order_success"), description: `${t("tracking.order_number")}: ${displayNum}` });
    },
    onError: (error) => toast({ variant: "destructive", title: t("checkout.order_error"), description: error.message }),
  });

  const { data: coupons = [] } = useQuery<any[]>({
    queryKey: ["/api/discount-codes"],
  });

  const safeCoupons = Array.isArray(coupons) ? coupons.filter(c => c && c.code && typeof c.code === 'string') : [];

  const handleValidateDiscount = async (codeOverride?: string) => {
    const codeToUse = codeOverride || discountCode.trim();
    if (!codeToUse) return;
    
    setIsValidatingDiscount(true);
    try {
      const response = await fetch('/api/discount-codes/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          code: codeToUse, 
          customerId: customer?.id,
          amount: getFinalTotal()
        }),
      });
      const data = await response.json();
      if (response.ok && data.valid) {
        setAppliedDiscount({ code: data.code, percentage: data.discountPercentage });
        setDiscountCode(data.code);
        setShowCouponSuggestions(false);
        toast({
          title: t("checkout.coupon_applied"),
          description: `${t("checkout.discount")}: ${data.discountPercentage}%`,
        });
      } else {
        setAppliedDiscount(null);
        toast({ 
          variant: "destructive", 
          title: t("checkout.invalid_discount"),
          description: data.error || data.message
        });
      }
    } catch (error) {
      toast({ variant: "destructive", title: t("checkout.error") });
    } finally { setIsValidatingDiscount(false); }
  };

  const handleProceedPayment = () => {
    const isFreeOrder = getFinalAmount() <= 0;

    if (isFreeOrder) {
      if (!selectedPaymentMethod) {
        setSelectedPaymentMethod('cash');
      }
      if (!customerName.trim()) {
        toast({ variant: "destructive", title: t("checkout.enter_customer_name") });
        return;
      }
      setShowConfirmation(true);
      return;
    }

    if (!selectedPaymentMethod) {
      toast({ variant: "destructive", title: t("checkout.select_payment") });
      return;
    }
    if (selectedPaymentMethod === 'cash' && cashDistanceError) {
      toast({ variant: "destructive", title: 'الدفع نقداً غير متاح', description: cashDistanceError });
      return;
    }
    if (selectedPaymentMethod === 'cash' && cashDistanceChecking) {
      toast({ variant: "destructive", title: 'جاري التحقق من موقعك...', description: 'الرجاء الانتظار' });
      return;
    }
    const selectedMethodInfo = paymentMethods.find(m => m.id === selectedPaymentMethod);
    if (selectedMethodInfo?.requiresReceipt && !receiptFile) {
      toast({ variant: "destructive", title: tc("يرجى رفع إيصال التحويل", "Please upload the payment receipt") });
      return;
    }
    if (!customerName.trim()) {
      toast({ variant: "destructive", title: t("checkout.enter_customer_name") });
      return;
    }
    if (isCardPaymentMethod(selectedPaymentMethod) || isOnlinePaymentMethod(selectedPaymentMethod)) {
      confirmAndCreateOrder();
      return;
    }
    setShowConfirmation(true);
  };

  const isCardPaymentMethod = (method: string | null) => {
    if (!method) return false;
    // paymob-card is handled separately with real PayMob flow
    const cardMethods = ['geidea', 'bank_card', 'credit_card', 'card', 'stc-pay', 'apple_pay', 'neoleap-apple-pay'];
    return cardMethods.includes(method);
  };

  const isPaymobMethod = (method: string | null) => {
    if (!method) return false;
    return ['paymob-card', 'paymob-wallet', 'paymob-apple-pay', 'neoleap'].includes(method);
  };

  const isOnlinePaymentMethod = (_method: string | null) => false;

  const confirmAndCreateOrder = async () => {
    let finalTotal = getFinalAmount();

    if (selectedPaymentMethod === ('wallet' as any) && (customer?.walletBalance || 0) < finalTotal) {
      toast({ variant: "destructive", title: t("points.insufficient_wallet") });
      return;
    }

    let activeCustomerId = customer?.id;
    if (!activeCustomerId && wantToRegister) {
      setIsRegistering(true);
      const regRes = await fetch("/api/customers/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: customerName, phone: customerPhone, email: customerEmail, password: customerPassword })
      });
      if (regRes.ok) {
        const newC = await regRes.json();
        activeCustomerId = newC.id;
        setCustomer(newC);
      }
      setIsRegistering(false);
    }

    const orderData = {
      customerId: activeCustomerId,
      customerName: customerName,
      customerPhone: customerPhone,
      customerEmail: customerEmail,
      items: cartItems.map(i => {
        const inlineAddons = (i as any).selectedItemAddons || [];
        const addonsExtra = inlineAddons.reduce((s: number, a: any) => s + (Number(a.price) || 0), 0);
        return {
          coffeeItemId: i.coffeeItemId,
          quantity: i.quantity,
          price: (i.coffeeItem?.price || 0) + addonsExtra,
          nameAr: i.coffeeItem?.nameAr || "",
          nameEn: i.coffeeItem?.nameEn || "",
          customization: inlineAddons.length > 0 ? { selectedItemAddons: inlineAddons } : undefined,
        };
      }),
      totalAmount: finalTotal,
      paymentMethod: selectedPaymentMethod as PaymentMethod,
      status: "pending",
      branchId: deliveryInfo?.branchId || "default",
      orderType: deliveryInfo?.type === 'car-pickup' ? 'car_pickup' : deliveryInfo?.type === 'scheduled-pickup' ? 'pickup' : (deliveryInfo?.type === 'pickup' && deliveryInfo?.dineIn ? 'dine-in' : 'regular'),
      deliveryType: deliveryInfo?.type === 'car-pickup' ? 'car_pickup' : deliveryInfo?.type === 'scheduled-pickup' ? 'pickup' : deliveryInfo?.type || 'pickup',
      customerNotes: customerNotes,
      discountCode: appliedDiscount?.code,
      pointsRedeemed: usePointsAsDiscount ? pointsToRedeem : 0,
      pointsValue: usePointsAsDiscount ? Math.min(pointsDiscountSAR, getBaseTotal()) : 0,
      bypassPointsVerification: true,
      // Gift card — server will validate + deduct atomically
      ...(appliedGiftCard && giftCardDiscount > 0 ? {
        giftCardCode: appliedGiftCard.code,
        giftCardAmount: giftCardDiscount,
      } : {}),
      ...(deliveryInfo?.type === 'car-pickup' && deliveryInfo?.carInfo ? {
        carType: deliveryInfo.carInfo.carType,
        carColor: deliveryInfo.carInfo.carColor,
        plateNumber: deliveryInfo.carInfo.plateNumber,
      } : {}),
      ...(deliveryInfo?.scheduledPickupTime ? {
        scheduledPickupTime: deliveryInfo.scheduledPickupTime,
        arrivalTime: deliveryInfo.scheduledPickupTime,
      } : {}),
      channel: "online",
    };

    if (receiptFile) {
      const uploadedUrl = await uploadReceiptToServer(receiptFile);
      if (uploadedUrl) {
        (orderData as any).paymentReceiptUrl = uploadedUrl;
      } else {
        (orderData as any).paymentReceiptUrl = receiptPreview || undefined;
      }
    }

    if (isPaymobMethod(selectedPaymentMethod)) {
      // Real PayMob Saudi Arabia payment flow
      pendingGeideaOrderData.current = orderData;
      setShowConfirmation(false);
      try {
        // First create the order
        const res = await apiRequest("POST", "/api/orders", orderData);
        const createdOrder = await res.json();
        if (createdOrder?.error) throw new Error(createdOrder.error);
        setOrderDetails(createdOrder);
        // Then initiate PayMob payment
        const payRes = await apiRequest("POST", "/api/payments/init", {
          orderId: createdOrder.orderNumber || createdOrder._id,
          amount: orderData.totalAmount,
          currency: "SAR",
          paymentMethod: selectedPaymentMethod,
          customerName: customerName,
          customerPhone: customerPhone,
          customerEmail: customerEmail,
        });
        const payData = await payRes.json();
        if (payData.success && payData.redirectUrl) {
          setPaymobCheckoutUrl(payData.redirectUrl);
          setShowPaymobCheckout(true);
        } else {
          toast({ variant: "destructive", title: "خطأ في بوابة الدفع", description: payData.error || payData.details || "فشل تهيئة PayMob" });
        }
      } catch (err: any) {
        toast({ variant: "destructive", title: "خطأ", description: err.message || "حدث خطأ أثناء إنشاء الطلب" });
      }
      return;
    }

    if (isCardPaymentMethod(selectedPaymentMethod)) {
      pendingGeideaOrderData.current = orderData;
      geideaOrderNum.current = `CLN-${Date.now()}`;
      setShowConfirmation(false);
      setShowSimulatedCard(true);
      return;
    }

    if (isOnlinePaymentMethod(selectedPaymentMethod)) {
      pendingGeideaOrderData.current = orderData;
      geideaOrderNum.current = `CLN-${Date.now()}`;
      setShowConfirmation(false);
      setShowInlineGeidea(true);
      return;
    }

    createOrderMutation.mutate(orderData);
  };

  if (isVerifyingPayment) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-gray-950" dir={isAr ? 'rtl' : 'ltr'}>
        <div className="max-w-sm w-full bg-white rounded-3xl p-10 shadow-2xl text-center space-y-6">
          <Loader2 className="w-16 h-16 text-primary mx-auto animate-spin" />
          <h2 className="text-2xl font-bold">{t("checkout.verifying_payment")}</h2>
          <p className="text-muted-foreground text-sm">{t("checkout.verifying_payment_desc")}</p>
        </div>
      </div>
    );
  }

  if (showSuccessPage) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-background" dir={isAr ? 'rtl' : 'ltr'}>
        <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-2xl text-center space-y-6">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto" />
          <h2 className="text-3xl font-bold text-accent">{t("nav.thank_you")}</h2>
          <p>{t("checkout.order_desc")} <span className="font-bold text-primary">{orderDetails?.orderNumber}</span></p>

          {isGuestMode && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-right space-y-3">
              <p className="font-bold text-amber-900">⭐ هل تريد تتبع طلباتك؟</p>
              <p className="text-sm text-amber-800">
                سجّل الآن بنفس رقم جوالك وسيتم ربط طلباتك تلقائياً. ستحصل على بطاقة ولاء ونقاط مكافآت مع كل طلب.
              </p>
              <Button
                onClick={() => setLocation("/auth")}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
                data-testid="button-register-after-order"
              >
                سجّل الآن — مجاناً
              </Button>
            </div>
          )}

          <Button onClick={() => setLocation("/menu")} className="w-full h-12 bg-primary" data-testid="button-back-to-menu">{t("cart.continue_shopping")}</Button>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen py-12 bg-gray-950" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-white text-center mb-8">{t("nav.checkout")}</h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader><CardTitle>{t("checkout.order_summary")}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {cartItems.map((item, index) => (
                  <div key={index} className="flex justify-between items-center gap-2 text-sm" data-testid={`cart-item-${index}`}>
                    <span>{isAr ? item.coffeeItem?.nameAr : item.coffeeItem?.nameEn} × {item.quantity}</span>
                    <span className="font-bold">{((item.coffeeItem?.price || 0) * item.quantity).toFixed(2)} <SarIcon /></span>
                  </div>
                ))}
                {appliedDiscount && (
                  <div className="flex justify-between items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-950/30 p-2 rounded">
                    <span>{t("points.discount")} ({appliedDiscount.percentage}%)</span>
                    <span>-{(getFinalTotal() * appliedDiscount.percentage / 100).toFixed(2)} <SarIcon /></span>
                  </div>
                )}
                {usePointsAsDiscount && pointsDiscountSAR > 0 && (
                  <div className="flex justify-between items-center gap-2 text-sm text-amber-700 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-2 rounded">
                    <span className="flex items-center gap-1.5">⭐ خصم النقاط ({pointsToRedeem.toLocaleString()} نقطة)</span>
                    <span className="font-bold">-{Math.min(pointsDiscountSAR, getBaseTotal()).toFixed(2)} <SarIcon /></span>
                  </div>
                )}
                {appliedGiftCard && giftCardDiscount > 0 && (
                  <div className="flex justify-between items-center gap-2 text-sm text-primary bg-primary/5 border border-primary/20 p-2 rounded">
                    <span className="flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5" />
                      بطاقة هدية ({appliedGiftCard.code})
                    </span>
                    <span className="font-bold">-{giftCardDiscount.toFixed(2)} <SarIcon /></span>
                  </div>
                )}
                <div className="pt-4 border-t font-bold text-xl flex justify-between gap-2">
                  <span>{t("cart.total")}:</span>
                  <span className={getFinalAmount() === 0 ? 'text-green-600' : 'text-primary'}>
                    {getFinalAmount().toFixed(2)} <SarIcon />
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="pt-6 space-y-4">
                {customer ? (
                  <div className="bg-muted/30 p-4 rounded-lg flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5 text-accent" />
                      <div>
                        <p className="font-semibold">{customer.name}</p>
                        <p className="text-sm text-muted-foreground">{customer.phone}</p>
                      </div>
                    </div>
                  </div>
                ) : isGuestMode ? (
                  <div className="space-y-3">
                    <div className="bg-muted/30 p-4 rounded-lg flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-3">
                        <User className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="font-semibold">{customerName}</p>
                          <p className="text-sm text-muted-foreground">{customerPhone}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setLocation("/customer-login")}
                        className="text-xs text-accent hover:underline"
                        data-testid="link-change-guest"
                      >
                        تغيير
                      </button>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <p className="text-xs text-amber-800 dark:text-amber-300">{tc("سجّل الآن واحصل على نقاط ولاء وتتبع طلباتك", "Register now to earn loyalty points and track your orders")}</p>
                      <button
                        type="button"
                        onClick={() => setLocation("/auth")}
                        className="text-xs font-bold text-accent hover:underline whitespace-nowrap mr-2"
                        data-testid="link-register-now"
                      >
                        تسجيل ←
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder={t("checkout.full_name")} data-testid="input-customer-name" />
                    <Input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder={t("checkout.phone")} data-testid="input-customer-phone" />
                    <div className="flex items-center gap-2">
                      <Checkbox id="register" checked={wantToRegister} onCheckedChange={checked => setWantToRegister(!!checked)} data-testid="checkbox-register" />
                      <Label htmlFor="register">{t("checkout.want_to_register")}</Label>
                    </div>
                  </div>
                )}

                <PaymentMethods
                  paymentMethods={paymentMethods.filter(m => m.id !== 'qahwa-card')}
                  selectedMethod={selectedPaymentMethod}
                  onSelectMethod={setSelectedPaymentMethod}
                  comingSoon={false}
                />

                {/* Receipt Upload for bank transfer methods */}
                {selectedPaymentMethod && paymentMethods.find(m => m.id === selectedPaymentMethod)?.requiresReceipt && (
                  <div className="border border-border rounded-xl p-4 bg-amber-50 dark:bg-amber-950/20 space-y-3" data-testid="section-receipt-upload">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                        <Upload className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-amber-900 dark:text-amber-300">{tc("ارفع إيصال التحويل", "Upload Transfer Receipt")}</p>
                        <p className="text-xs text-amber-700 dark:text-amber-400">{tc("مطلوب لتأكيد الدفع", "Required to confirm payment")}</p>
                      </div>
                    </div>
                    <input
                      ref={receiptInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleReceiptFileChange}
                      data-testid="input-receipt-file"
                    />
                    {receiptPreview ? (
                      <div className="space-y-2">
                        <img src={receiptPreview} alt="إيصال التحويل" className="w-full max-h-48 object-contain rounded-lg border border-border bg-white" />
                        <button
                          type="button"
                          onClick={() => { setReceiptFile(null); setReceiptPreview(null); if (receiptInputRef.current) receiptInputRef.current.value = ''; }}
                          className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                          data-testid="button-remove-receipt"
                        >
                          <X className="w-3 h-3" />
                          {tc("إزالة الإيصال", "Remove receipt")}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => receiptInputRef.current?.click()}
                        className="w-full flex flex-col items-center justify-center gap-2 py-5 border-2 border-dashed border-amber-300 dark:border-amber-700 rounded-xl bg-white dark:bg-amber-950/10 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                        data-testid="button-upload-receipt"
                      >
                        <Camera className="w-8 h-8 text-amber-400" />
                        <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">{tc("انقر لرفع صورة الإيصال", "Tap to upload receipt image")}</span>
                        <span className="text-xs text-amber-600 dark:text-amber-500">{tc("JPG, PNG مقبولة", "JPG, PNG accepted")}</span>
                      </button>
                    )}
                  </div>
                )}

                {selectedPaymentMethod === 'cash' && cashDistanceChecking && (
                  <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg text-blue-700 dark:text-blue-300 text-sm" data-testid="status-cash-distance-checking">
                    <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                    <span>{tc("جاري التحقق من موقعك للدفع نقداً...", "Checking your location for cash payment...")}</span>
                  </div>
                )}

                {selectedPaymentMethod === 'cash' && !cashDistanceChecking && cashDistanceError && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm" data-testid="status-cash-distance-error">
                    <span className="text-base flex-shrink-0">⚠️</span>
                    <span>{cashDistanceError}</span>
                  </div>
                )}

                {appliedDiscount?.isOffer && (
                  <div className="border rounded-lg p-4 bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-green-600" />
                        <div>
                          <p className="font-semibold text-green-800 dark:text-green-300">{appliedDiscount.code}</p>
                          <p className="text-sm text-green-600">{t("points.discount")} {appliedDiscount.percentage}% {t("points.applied")}</p>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setAppliedDiscount(null);
                          customerStorage.clearActiveOffer();
                        }}
                        className="text-red-500"
                        data-testid="button-remove-offer"
                      >
                        {t("points.remove")}
                      </Button>
                    </div>
                  </div>
                )}

                <ErrorBoundary fallback={
                  <div className="border rounded-lg p-4 bg-orange-50 dark:bg-orange-950/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Gift className="w-5 h-5 text-orange-400" />
                      <Label className="font-semibold text-muted-foreground">{t("checkout.have_discount")}</Label>
                    </div>
                    <Badge variant="outline" className="gap-1 text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 dark:text-amber-400 text-[10px] font-bold px-2 py-0.5">
                      <Wrench className="w-3 h-3" />
                      قيد التطوير
                    </Badge>
                  </div>
                }>
                <div className="border rounded-lg p-4 bg-orange-50 dark:bg-orange-950/30 space-y-4">
                  <div className="flex items-center gap-2">
                    <Gift className="w-5 h-5 text-orange-600" />
                    <Label className="font-semibold">{t("checkout.have_discount")}</Label>
                  </div>

                  {/* Available coupon codes */}
                  {safeCoupons.length > 0 && !appliedDiscount && !usePointsAsDiscount && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                        <Ticket className="w-3.5 h-3.5" />
                        {t("checkout.available_coupons")}
                      </p>
                      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                        {safeCoupons.map((coupon) => (
                          <button
                            key={coupon.id || coupon._id || coupon.code}
                            onClick={() => {
                              setDiscountCode(coupon.code);
                              handleValidateDiscount(coupon.code);
                            }}
                            data-testid={`button-coupon-${coupon.code}`}
                            className="flex-shrink-0 flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/60 transition-all group min-w-[100px]"
                          >
                            <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center group-hover:scale-110 transition-transform">
                              <Tag className="w-4 h-4 text-primary" />
                            </div>
                            <span className="font-mono font-black text-xs tracking-wider text-foreground">{coupon.code}</span>
                            <Badge className="bg-primary text-white border-0 font-black text-[10px] px-1.5 py-0">
                              -{coupon.discountPercentage}%
                            </Badge>
                            {coupon.reason && (
                              <span className="text-[9px] text-muted-foreground text-center line-clamp-1 max-w-[90px]">{coupon.reason}</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Coupon code input — disabled when using points */}
                  {!usePointsAsDiscount && (
                    <>
                      <div className="flex gap-2">
                        <Input
                          value={discountCode}
                          onChange={e => setDiscountCode(e.target.value)}
                          placeholder={t("checkout.enter_discount")}
                          disabled={!!appliedDiscount}
                          className="bg-white dark:bg-background"
                          data-testid="input-discount-code"
                        />
                        <Button
                          onClick={() => handleValidateDiscount()}
                          disabled={!!appliedDiscount || isValidatingDiscount}
                          data-testid="button-apply-discount"
                        >
                          {isValidatingDiscount ? <Loader2 className="w-4 h-4 animate-spin" /> : t("checkout.apply")}
                        </Button>
                      </div>
                      {appliedDiscount && !appliedDiscount.isOffer && (
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-green-600">{t("points.applied")}: {appliedDiscount.code} ({appliedDiscount.percentage}%)</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-red-500 hover:text-red-700 p-0"
                            onClick={() => { setAppliedDiscount(null); setDiscountCode(""); }}
                          >
                            {t("common.remove") || "إزالة"}
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
                </ErrorBoundary>

                {/* Gift Card Section */}
                <div className="border rounded-lg p-4 bg-card space-y-3">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-primary" />
                    <Label className="font-semibold">{tc("بطاقة الهدية", "Gift Card")}</Label>
                  </div>
                  {appliedGiftCard ? (
                    <div className="flex items-center justify-between bg-primary/5 rounded-lg px-3 py-2">
                      <div>
                        <p className="text-sm font-bold text-primary">{appliedGiftCard.code}</p>
                        <p className="text-xs text-muted-foreground">خصم {appliedGiftCard.applied.toFixed(2)} ريال من رصيد {appliedGiftCard.balance.toFixed(2)} ريال</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-red-500 hover:text-red-700 p-0"
                        onClick={() => { setAppliedGiftCard(null); setGiftCardCode(""); }}
                        data-testid="button-remove-gift-card"
                      >
                        إزالة
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        placeholder={tc("أدخل رمز بطاقة الهدية", "Enter gift card code")}
                        value={giftCardCode}
                        onChange={e => setGiftCardCode(e.target.value.toUpperCase())}
                        onKeyDown={e => e.key === "Enter" && handleCheckGiftCard()}
                        className="font-mono uppercase tracking-widest"
                        data-testid="input-gift-card-code"
                      />
                      <Button
                        onClick={() => handleCheckGiftCard()}
                        disabled={!giftCardCode.trim() || isCheckingGiftCard}
                        data-testid="button-apply-gift-card"
                        className="shrink-0"
                      >
                        {isCheckingGiftCard ? tc("جاري التحقق...", "Checking...") : tc("تطبيق", "Apply")}
                      </Button>
                    </div>
                  )}
                </div>

                {customer && loyaltyCard && (
                  <LoyaltyCheckoutCard
                    loyaltyCard={loyaltyCard}
                    loyaltyPoints={loyaltyPoints}
                    pointsPerSar={pointsPerSar}
                    minPointsForRedemption={minPointsForRedemption}
                    pointsToRedeem={pointsToRedeem}
                    onApplyPoints={(pts) => {
                      setPointsToRedeem(pts);
                      setAppliedDiscount(null);
                      setDiscountCode("");
                    }}
                    onCancelPoints={() => setPointsToRedeem(0)}
                    baseTotal={getBaseTotal()}
                  />
                )}

                {/* Real PayMob checkout bottom sheet */}
                {showPaymobCheckout && paymobCheckoutUrl && (
                  <PaymobCheckoutWidget
                    orderNumber={orderDetails?.orderNumber || orderDetails?.dailyNumber || "—"}
                    amount={pendingGeideaOrderData.current?.totalAmount || getFinalTotalWithPoints()}
                    checkoutUrl={paymobCheckoutUrl}
                    onSuccess={() => {
                      setShowPaymobCheckout(false);
                      clearCart();
                      setShowSuccessPage(true);
                      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
                    }}
                    onError={(msg) => {
                      toast({ variant: "destructive", title: "فشلت عملية الدفع", description: msg });
                      setShowPaymobCheckout(false);
                    }}
                    onCancel={() => {
                      setShowPaymobCheckout(false);
                      toast({ title: "تم إغلاق نافذة الدفع", description: "إذا تم سحب المال، سيظهر طلبك في 'طلباتي' خلال لحظات." });
                    }}
                  />
                )}

                {/* Simulated card payment widget (for non-PayMob legacy methods only) */}
                {showSimulatedCard && (
                  <div className="rounded-2xl border border-border bg-card p-5 shadow-md" data-testid="section-simulated-card">
                    <SimulatedCardPayment
                      amount={pendingGeideaOrderData.current?.totalAmount || getFinalTotalWithPoints()}
                      paymentMethod={selectedPaymentMethod || "card"}
                      onSuccess={() => {
                        const od = pendingGeideaOrderData.current;
                        if (od) {
                          const confirmedOrder = { ...od, status: 'payment_confirmed', paymentReference: `CARD-SIM-${Date.now()}` };
                          createOrderMutation.mutate(confirmedOrder);
                        } else {
                          confirmAndCreateOrder();
                        }
                        setShowSimulatedCard(false);
                      }}
                      onCancel={() => setShowSimulatedCard(false)}
                    />
                  </div>
                )}

                {/* Inline Geidea payment widget — same page, no separate screen */}
                {!showSimulatedCard && showInlineGeidea ? (
                  <div className="space-y-3" data-testid="section-geidea-inline">
                    <div className="bg-primary rounded-xl px-4 py-3 text-white text-center">
                      <p className="text-xs opacity-75">{tc("إجمالي الطلب", "Order Total")}</p>
                      <p className="text-2xl font-black" data-testid="text-geidea-amount">
                        {pendingGeideaOrderData.current?.totalAmount?.toFixed(2)} ريال
                      </p>
                      <p className="text-[10px] opacity-60 mt-0.5">🔒 دفع آمن مشفّر بواسطة Geidea</p>
                    </div>
                    <GeideaCheckoutWidget
                      orderNumber={geideaOrderNum.current}
                      amount={pendingGeideaOrderData.current?.totalAmount || 0}
                      customerPhone={pendingGeideaOrderData.current?.customerPhone}
                      customerEmail={pendingGeideaOrderData.current?.customerEmail}
                      onSuccess={() => {
                        const od = pendingGeideaOrderData.current;
                        const confirmedOrder = { ...od, status: 'payment_confirmed', paymentReference: geideaOrderNum.current };
                        createOrderMutation.mutate(confirmedOrder);
                        setShowInlineGeidea(false);
                      }}
                      onError={(msg) => {
                        toast({ variant: "destructive", title: t("checkout.payment_error"), description: msg });
                      }}
                      onCancel={() => {
                        setShowInlineGeidea(false);
                        toast({ title: "تم إلغاء الدفع", description: "يمكنك المحاولة مرة أخرى" });
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-muted-foreground text-xs"
                      onClick={() => setShowInlineGeidea(false)}
                      data-testid="button-cancel-geidea"
                    >
                      ← العودة للطلب
                    </Button>
                  </div>
                ) : !showSimulatedCard && !showPaymobCheckout ? (
                  <Button
                    onClick={handleProceedPayment}
                    className="w-full h-14 text-lg"
                    data-testid="button-proceed-payment"
                    disabled={
                      (selectedPaymentMethod === 'cash' && !!cashDistanceError) ||
                      (selectedPaymentMethod === 'cash' && cashDistanceChecking)
                    }
                  >
                    {selectedPaymentMethod === 'cash' && cashDistanceChecking ? (
                      <><Loader2 className="w-5 h-5 animate-spin ml-2" />جاري التحقق من الموقع...</>
                    ) : (isCardPaymentMethod(selectedPaymentMethod) || isOnlinePaymentMethod(selectedPaymentMethod) || isPaymobMethod(selectedPaymentMethod)) ? (
                      <><CreditCard className="w-5 h-5 ml-2" />ادفع الآن عبر PayMob</>
                    ) : t("checkout.confirm_order")}
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent dir={isAr ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle>{t("checkout.confirm_title")}</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-center space-y-2">
            <p className="text-lg">{t("checkout.confirm_question")}</p>
            {(usePointsAsDiscount && pointsDiscountSAR > 0) || (appliedGiftCard && giftCardDiscount > 0) ? (
              <>
                <p className="text-sm text-muted-foreground">قبل الخصم: {getBaseTotal().toFixed(2)} <SarIcon /></p>
                {usePointsAsDiscount && pointsDiscountSAR > 0 && (
                  <p className="text-sm text-amber-600 font-semibold">⭐ خصم النقاط: -{Math.min(pointsDiscountSAR, getBaseTotal()).toFixed(2)} <SarIcon /></p>
                )}
                {appliedGiftCard && giftCardDiscount > 0 && (
                  <p className="text-sm text-primary font-semibold">🎁 بطاقة هدية: -{giftCardDiscount.toFixed(2)} <SarIcon /></p>
                )}
                <p className="text-3xl font-black text-primary">{getFinalAmount().toFixed(2)} <SarIcon /></p>
                {getFinalAmount() === 0 && <p className="text-sm text-green-600 font-bold">🎉 تغطية كاملة!</p>}
              </>
            ) : (
              <p className="text-2xl font-bold text-primary">{getFinalAmount().toFixed(2)} <SarIcon /></p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowConfirmation(false)} className="flex-1" data-testid="button-cancel-order">{t("points.cancel")}</Button>
            <Button onClick={confirmAndCreateOrder} className="flex-1 bg-green-600" data-testid="button-confirm-order">{t("checkout.confirm_pay")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
