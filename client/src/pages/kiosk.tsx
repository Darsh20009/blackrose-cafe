import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  ShoppingCart, Plus, Minus, Trash2, CheckCircle, Coffee, ChevronRight, X,
  Loader2, CreditCard, Banknote, Wallet, Sparkles, ArrowLeft, ArrowRight, Globe, Clock,
} from "lucide-react";
import { useTranslate } from "@/lib/useTranslate";
import { useTranslation } from "react-i18next";
import { printTaxInvoice } from "@/lib/print-utils";
import { brand } from "@/lib/brand";

interface SizeOption { nameAr: string; nameEn?: string; price: number; }
interface MenuItem {
  _id: string; id: string; nameAr: string; nameEn: string; price: number;
  imageUrl?: string; category?: string; isAvailable?: boolean;
  availableSizes?: SizeOption[]; descriptionAr?: string; descriptionEn?: string;
}
interface MenuCategory { id: string; nameAr: string; nameEn?: string; imageUrl?: string; }
interface CartItem {
  item: MenuItem; quantity: number; selectedSize?: string; effectivePrice: number;
}
type PaymentChoice = "counter" | "online" | "external_pos";
type Step = "menu" | "cart" | "info" | "payment" | "processing" | "success";

function SarIcon({ className = "" }: { className?: string }) {
  return <span className={`font-arabic font-bold ${className}`}>ر.س</span>;
}
function cartKey(item: MenuItem, size?: string): string {
  return `${item._id || item.id}::${size || "__no_size__"}`;
}
const ALL_CATEGORY = "__all__";
const IDLE_MS = 180000; // 3 min

export default function KioskPage() {
  const { toast } = useToast();
  const tc = useTranslate();
  const { i18n } = useTranslation();
  const isEn = i18n.language === "en";
  const isRtl = !isEn;
  const params = useParams<{ branchId?: string }>();
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ── State ────────────────────────────────────────────────────────────────────
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>(ALL_CATEGORY);
  const [step, setStep] = useState<Step>("menu");
  const [orderNumber, setOrderNumber] = useState("");
  const [orderId, setOrderId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [orderType, setOrderType] = useState<"dine-in" | "takeaway">("dine-in");
  const [paymentChoice, setPaymentChoice] = useState<PaymentChoice>("counter");
  const [sizeDialogItem, setSizeDialogItem] = useState<MenuItem | null>(null);
  const [showWelcome, setShowWelcome] = useState(true);

  // ── Data ─────────────────────────────────────────────────────────────────────
  const { data: menuItems = [], isLoading: menuLoading } = useQuery<MenuItem[]>({
    queryKey: ["/api/coffee-items"],
  });
  const { data: menuCategories = [] } = useQuery<MenuCategory[]>({
    queryKey: ["/api/menu-categories"],
  });
  const { data: branches = [] } = useQuery<any[]>({ queryKey: ["/api/branches"] });
  const { data: paymentMethods = [] } = useQuery<any[]>({ queryKey: ["/api/payment-methods"] });

  const selectedBranch = useMemo(() => {
    const list = branches as any[];
    if (params.branchId) {
      const m = list.find(b => (b.id === params.branchId) || (b._id === params.branchId));
      if (m) return m;
    }
    return list[0];
  }, [branches, params.branchId]);

  const categoryNameMap = Object.fromEntries(
    (menuCategories as MenuCategory[]).map(c => [c.id, isEn ? (c.nameEn || c.nameAr) : c.nameAr])
  );
  const availableItems = (menuItems as MenuItem[]).filter(
    i => i.isAvailable !== false && (i as any).availabilityStatus !== "out_of_stock"
  );
  const categoryIds = Array.from(new Set(availableItems.map(i => i.category).filter(Boolean))) as string[];

  const cartCount = cart.reduce((s, c) => s + c.quantity, 0);
  const cartTotal = cart.reduce((s, c) => s + c.effectivePrice * c.quantity, 0);
  const vat = cartTotal - cartTotal / 1.15;

  // Detect available gateways for "online" option
  const hasOnlineGateway = (paymentMethods as any[]).some(
    m => m.gateway === "geidea" || m.gateway === "paymob" || m.id === "stc_pay"
  );

  // ── Idle reset ───────────────────────────────────────────────────────────────
  const resetIdle = () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      if (step !== "success" && step !== "processing") fullReset();
    }, IDLE_MS);
  };
  useEffect(() => {
    resetIdle();
    return () => { if (idleTimerRef.current) clearTimeout(idleTimerRef.current); };
  }, [step]);

  const fullReset = () => {
    setCart([]); setStep("menu"); setSizeDialogItem(null);
    setCustomerName(""); setCustomerPhone(""); setOrderType("dine-in");
    setPaymentChoice("counter"); setSelectedCategory(ALL_CATEGORY);
    setShowWelcome(true);
  };

  // ── Cart helpers ─────────────────────────────────────────────────────────────
  const addToCart = (item: MenuItem, size?: string) => {
    resetIdle();
    const price = size
      ? (item.availableSizes?.find(s => s.nameAr === size)?.price ?? item.price)
      : item.price;
    const key = cartKey(item, size);
    setCart(prev => {
      const existing = prev.find(c => cartKey(c.item, c.selectedSize) === key);
      if (existing) return prev.map(c => cartKey(c.item, c.selectedSize) === key ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { item, quantity: 1, selectedSize: size, effectivePrice: price }];
    });
    setSizeDialogItem(null);
  };
  const decreaseCart = (key: string) => {
    resetIdle();
    setCart(prev => {
      const existing = prev.find(c => cartKey(c.item, c.selectedSize) === key);
      if (!existing || existing.quantity <= 1) return prev.filter(c => cartKey(c.item, c.selectedSize) !== key);
      return prev.map(c => cartKey(c.item, c.selectedSize) === key ? { ...c, quantity: c.quantity - 1 } : c);
    });
  };
  const increaseCart = (key: string) =>
    setCart(prev => prev.map(c => cartKey(c.item, c.selectedSize) === key ? { ...c, quantity: c.quantity + 1 } : c));

  const handleItemClick = (item: MenuItem) => {
    resetIdle();
    if (item.availableSizes && item.availableSizes.length > 0) setSizeDialogItem(item);
    else addToCart(item);
  };

  // ── Place order ──────────────────────────────────────────────────────────────
  const placeOrder = async (paymentMethod: string, paymentStatus: "pending" | "paid" | "awaiting_external" = "pending") => {
    const branchId = selectedBranch?.id || selectedBranch?._id || "default";
    const res = await apiRequest("POST", "/api/orders", {
      customerName: customerName || tc("زبون الكشك", "Kiosk Customer"),
      customerPhone: customerPhone || undefined,
      items: cart.map(c => ({
        coffeeItemId: c.item._id || c.item.id,
        quantity: c.quantity,
        price: c.effectivePrice,
        nameAr: c.item.nameAr,
        nameEn: c.item.nameEn,
        selectedSize: c.selectedSize,
      })),
      totalAmount: cartTotal,
      paymentMethod,
      paymentStatus,
      status: paymentStatus === "awaiting_external" ? "pending_payment" : "pending",
      channel: "kiosk",
      orderType,
      branchId,
    });
    if (!res.ok) throw new Error("order_failed");
    return res.json();
  };

  const placeOrderMutation = useMutation({
    mutationFn: async () => {
      setStep("processing");
      // 1) Cash / pay at counter — direct order
      if (paymentChoice === "counter") {
        return await placeOrder("cash", "pending");
      }
      // 2) External POS terminal — order held until cashier confirms
      if (paymentChoice === "external_pos") {
        return await placeOrder("external_pos", "awaiting_external");
      }
      // 3) Online gateway (Geidea/PayMob) — initialize payment
      const order = await placeOrder("online", "pending");
      const payRes = await apiRequest("POST", "/api/payments/init", {
        amount: cartTotal,
        orderId: order.id || order._id,
        customerName: customerName || undefined,
        customerPhone: customerPhone || undefined,
        returnUrl: `${window.location.origin}/kiosk?paid=${order.id || order._id}`,
      });
      const payData = await payRes.json();
      if (payData.redirectUrl) {
        window.location.href = payData.redirectUrl;
        return order;
      }
      if (!payRes.ok) throw new Error(payData.error || "payment_init_failed");
      return order;
    },
    onSuccess: async (data) => {
      const num = data.dailyNumber || data.orderNumber || data._id?.slice(-4) || "0000";
      const id = data.id || data._id || "";
      setOrderNumber(String(num));
      setOrderId(String(id));

      try {
        await printTaxInvoice({
          orderNumber: String(num),
          customerName: customerName || tc("زبون الكشك", "Kiosk Customer"),
          customerPhone: customerPhone || "",
          items: cart.map(c => ({
            coffeeItem: { nameAr: c.item.nameAr, nameEn: c.item.nameEn, price: String(c.effectivePrice) },
            quantity: c.quantity,
            selectedSize: c.selectedSize,
          })),
          subtotal: (cartTotal / 1.15).toFixed(2),
          total: cartTotal.toFixed(2),
          paymentMethod:
            paymentChoice === "counter" ? tc("الدفع عند الاستلام", "Pay at counter") :
            paymentChoice === "external_pos" ? tc("نقطة بيع — بطاقة", "External POS — Card") :
            tc("دفع إلكتروني", "Online"),
          employeeName: tc("الكشك", "Kiosk"),
          date: new Date().toISOString(),
        }, { autoPrint: true });
      } catch (e) { console.warn("[Kiosk] Print failed:", e); }

      setStep("success");
      setTimeout(() => fullReset(), 12000);
    },
    onError: (err: any) => {
      toast({
        variant: "destructive",
        title: tc("خطأ", "Error"),
        description: err?.message === "payment_init_failed"
          ? tc("تعذّر بدء الدفع الإلكتروني. حاول مجدداً أو اختر طريقة أخرى.", "Online payment failed. Try again or choose another method.")
          : tc("تعذّر إرسال الطلب. حاول مجدداً.", "Failed to place order. Please try again."),
      });
      setStep("payment");
    },
  });

  // ── Welcome screen ───────────────────────────────────────────────────────────
  if (showWelcome) {
    return (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="h-screen w-screen bg-gradient-to-br from-primary via-primary/90 to-emerald-700 flex flex-col items-center justify-center text-white p-8 cursor-pointer overflow-hidden relative"
        onClick={() => { setShowWelcome(false); resetIdle(); }}
        dir={isRtl ? "rtl" : "ltr"}
        data-testid="kiosk-welcome"
      >
        <div className="absolute inset-0 opacity-10">
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full bg-white"
              style={{ width: 40 + (i % 4) * 30, height: 40 + (i % 4) * 30, left: `${(i * 53) % 100}%`, top: `${(i * 37) % 100}%` }}
              animate={{ y: [0, -20, 0], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 4 + (i % 3), repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
          className="relative z-10 flex flex-col items-center"
        >
          <div className="w-32 h-32 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center mb-8 border-4 border-white/30">
            <Coffee className="w-16 h-16 text-white" />
          </div>
          <h1 className="text-6xl md:text-7xl font-black mb-4 text-center" data-testid="text-kiosk-welcome-title">
            {tc(brand.nameAr, brand.nameEn)}
          </h1>
          <p className="text-2xl md:text-3xl font-bold mb-2 text-white/90">
            {tc("اطلب بنفسك", "Order Yourself")}
          </p>
          <p className="text-lg text-white/70 mb-12 text-center max-w-md">
            {tc("تجربة طلب سريعة، سهلة، وبدون انتظار", "Fast, easy, and contactless ordering experience")}
          </p>
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="bg-white text-primary rounded-full px-10 py-5 text-2xl font-black flex items-center gap-3 shadow-2xl"
          >
            <Sparkles className="w-6 h-6" />
            {tc("اضغط للبدء", "Tap to Start")}
            {isRtl ? <ArrowLeft className="w-6 h-6" /> : <ArrowRight className="w-6 h-6" />}
          </motion.div>
          {selectedBranch && (
            <p className="text-sm text-white/60 mt-8" data-testid="text-kiosk-branch">
              📍 {isEn ? (selectedBranch.nameEn || selectedBranch.nameAr) : selectedBranch.nameAr}
            </p>
          )}
        </motion.div>
      </motion.div>
    );
  }

  // ── Success screen ───────────────────────────────────────────────────────────
  if (step === "success") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        className="h-screen bg-gradient-to-br from-emerald-500 via-primary to-emerald-700 flex flex-col items-center justify-center text-white text-center p-8 overflow-hidden relative"
        dir={isRtl ? "rtl" : "ltr"}
        data-testid="kiosk-success"
      >
        <motion.div
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.1 }}
          className="w-40 h-40 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center mb-8 border-4 border-white"
        >
          <CheckCircle className="w-24 h-24 text-white" />
        </motion.div>
        <h1 className="text-5xl md:text-6xl font-black mb-4">{tc("شكراً لطلبك!", "Thank you!")}</h1>
        <p className="text-2xl mb-2 text-white/90">{tc("رقم طلبك", "Your order number")}</p>
        <motion.div
          initial={{ scale: 0.5 }} animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: "spring" }}
          className="text-8xl md:text-9xl font-black bg-white text-primary rounded-3xl px-12 py-6 mb-8 shadow-2xl"
          data-testid="text-kiosk-order-number"
        >
          #{orderNumber}
        </motion.div>
        {paymentChoice === "external_pos" && (
          <p className="text-xl text-white/90 mb-3 bg-amber-500/30 px-6 py-3 rounded-2xl border border-white/30">
            💳 {tc("توجّه للكاشير لإتمام الدفع بالبطاقة", "Please go to cashier to complete card payment")}
          </p>
        )}
        {paymentChoice === "counter" && (
          <p className="text-xl text-white/90 mb-3">
            💵 {tc("الدفع عند الاستلام", "Pay at the counter when ready")}
          </p>
        )}
        {paymentChoice === "online" && (
          <p className="text-xl text-white/90 mb-3">
            ✅ {tc("تم استلام دفعتك", "Your payment was received")}
          </p>
        )}
        <p className="text-lg text-white/70 mt-4">{tc("ستظهر الشاشة الرئيسية خلال ثوانٍ...", "Returning to home in a few seconds...")}</p>
      </motion.div>
    );
  }

  // ── Processing screen ────────────────────────────────────────────────────────
  if (step === "processing") {
    return (
      <div className="h-screen bg-background flex flex-col items-center justify-center text-foreground p-8" dir={isRtl ? "rtl" : "ltr"} data-testid="kiosk-processing">
        <Loader2 className="w-20 h-20 text-primary animate-spin mb-6" />
        <h2 className="text-3xl font-black mb-2">{tc("جارٍ معالجة طلبك...", "Processing your order...")}</h2>
        <p className="text-muted-foreground text-lg">{tc("لحظات قليلة من فضلك", "Just a moment, please")}</p>
      </div>
    );
  }

  // ── Main shell ───────────────────────────────────────────────────────────────
  const filteredItems = availableItems.filter(
    i => selectedCategory === ALL_CATEGORY || i.category === selectedCategory
  );

  return (
    <div
      className="h-screen bg-gradient-to-b from-muted/30 to-background flex flex-col overflow-hidden"
      onClick={resetIdle}
      data-testid="kiosk-page"
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* === Premium Hero Header === */}
      <div className="bg-gradient-to-r from-primary via-primary/95 to-emerald-700 text-white shrink-0 shadow-xl">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/30">
              <Coffee className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black leading-tight">{tc(brand.nameAr, brand.nameEn)}</h1>
              <p className="text-xs text-white/80">{tc("نظام الطلب الذاتي", "Self-Order Kiosk")}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => i18n.changeLanguage(isEn ? "ar" : "en")}
              className="flex items-center gap-1 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full px-3 py-1.5 text-sm font-bold transition-all"
              data-testid="button-kiosk-lang"
            >
              <Globe className="w-4 h-4" />
              {isEn ? "عربي" : "EN"}
            </button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => cartCount > 0 && setStep("cart")}
              className="relative bg-white text-primary rounded-2xl px-5 py-2.5 font-black flex items-center gap-2 shadow-lg hover:shadow-2xl transition-all disabled:opacity-50"
              disabled={cartCount === 0}
              data-testid="button-kiosk-cart"
            >
              <ShoppingCart className="w-5 h-5" />
              <span className="hidden sm:inline">{cartTotal.toFixed(2)} </span><SarIcon />
              {cartCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-7 h-7 text-xs flex items-center justify-center font-black border-2 border-white"
                >
                  {cartCount}
                </motion.span>
              )}
            </motion.button>
          </div>
        </div>
      </div>

      {/* === Category pills === */}
      <div className="bg-white border-b px-4 py-3 flex gap-2 overflow-x-auto scrollbar-none shrink-0 shadow-sm">
        <button
          onClick={() => setSelectedCategory(ALL_CATEGORY)}
          data-testid="button-category-all"
          className={`shrink-0 px-5 py-2 rounded-full text-sm font-bold transition-all ${
            selectedCategory === ALL_CATEGORY
              ? "bg-primary text-white shadow-md scale-105"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          ✨ {tc("الكل", "All")}
        </button>
        {categoryIds.map(catId => (
          <button
            key={catId}
            onClick={() => setSelectedCategory(catId)}
            data-testid={`button-category-${catId}`}
            className={`shrink-0 px-5 py-2 rounded-full text-sm font-bold transition-all ${
              selectedCategory === catId
                ? "bg-primary text-white shadow-md scale-105"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {categoryNameMap[catId] || catId}
          </button>
        ))}
      </div>

      {/* === Menu Grid === */}
      <ScrollArea className="flex-1 px-4 py-5">
        {menuLoading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="text-muted-foreground font-medium">{tc("جاري تحميل القائمة...", "Loading menu...")}</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <Coffee className="w-16 h-16 text-primary/30" />
            <p className="text-muted-foreground font-medium text-lg">{tc("لا توجد منتجات متاحة", "No items available")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredItems.map(item => {
              const key = item._id || item.id;
              const cartQty = cart.filter(c => (c.item._id || c.item.id) === key).reduce((s, c) => s + c.quantity, 0);
              const minPrice = item.availableSizes?.length
                ? Math.min(...item.availableSizes.map(s => s.price))
                : item.price;
              return (
                <motion.div
                  key={key}
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.96 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Card
                    className="overflow-hidden cursor-pointer hover:shadow-2xl transition-shadow select-none border-2 hover:border-primary/50 bg-white"
                    onClick={() => handleItemClick(item)}
                    data-testid={`card-kiosk-item-${key}`}
                  >
                    <div className="aspect-square bg-muted relative overflow-hidden">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={isEn ? item.nameEn : item.nameAr}
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                          <Coffee className="w-16 h-16 text-primary/40" />
                        </div>
                      )}
                      {cartQty > 0 && (
                        <motion.div
                          initial={{ scale: 0 }} animate={{ scale: 1 }}
                          className="absolute top-2 end-2 bg-primary text-white rounded-full min-w-8 h-8 px-2 flex items-center justify-center font-black text-sm shadow-lg border-2 border-white"
                        >
                          ×{cartQty}
                        </motion.div>
                      )}
                      {item.availableSizes && item.availableSizes.length > 0 && (
                        <div className="absolute bottom-2 start-2 bg-black/60 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                          {item.availableSizes.length} {tc("أحجام", "sizes")}
                        </div>
                      )}
                    </div>
                    <div className="p-3 text-center">
                      <p className="font-bold text-sm leading-tight mb-1 line-clamp-1">{isEn ? item.nameEn : item.nameAr}</p>
                      <p className="text-[11px] text-muted-foreground mb-2 line-clamp-1">{isEn ? item.nameAr : item.nameEn}</p>
                      <Badge className="bg-primary/10 text-primary border-0 font-black text-sm hover:bg-primary/20">
                        {item.availableSizes?.length ? `${tc("من", "from")} ` : ""}{minPrice.toFixed(2)} <SarIcon />
                      </Badge>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* === Footer status bar === */}
      <div className="bg-white border-t px-6 py-2 flex items-center justify-between text-xs text-muted-foreground shrink-0">
        <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {tc("النظام يتجدد كل 3 دقائق", "Auto-resets every 3 min")}</span>
        <span className="font-semibold">{tc("اضغط أي عنصر لإضافته", "Tap any item to add")}</span>
      </div>

      {/* === Size dialog === */}
      <Dialog open={!!sizeDialogItem} onOpenChange={() => setSizeDialogItem(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">
              {sizeDialogItem ? (isEn ? sizeDialogItem.nameEn : sizeDialogItem.nameAr) : ""}
            </DialogTitle>
          </DialogHeader>
          {sizeDialogItem && (
            <div className="space-y-3">
              <p className="text-center text-muted-foreground text-sm">{tc("اختر الحجم", "Choose size")}</p>
              {(sizeDialogItem.availableSizes || []).map(sz => (
                <button
                  key={sz.nameAr}
                  onClick={() => addToCart(sizeDialogItem, sz.nameAr)}
                  className="w-full flex justify-between items-center p-4 rounded-xl border-2 border-primary/20 hover:border-primary hover:bg-primary/5 transition-all font-bold text-lg"
                  data-testid={`button-kiosk-size-${sz.nameAr}`}
                >
                  <span>{sz.nameAr}{sz.nameEn ? ` — ${sz.nameEn}` : ""}</span>
                  <span className="text-primary">{Number(sz.price).toFixed(2)} <SarIcon /></span>
                </button>
              ))}
              <Button variant="outline" className="w-full" onClick={() => setSizeDialogItem(null)}>
                {tc("إلغاء", "Cancel")}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* === Cart sheet === */}
      <Dialog open={step === "cart"} onOpenChange={(o) => !o && setStep("menu")}>
        <DialogContent className="max-w-md h-[85vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-5 bg-gradient-to-br from-primary/10 to-transparent border-b">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <ShoppingCart className="w-6 h-6 text-primary" />
              {tc(`طلبك (${cartCount})`, `Your Order (${cartCount})`)}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 px-4">
            {cart.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg">{tc("طلبك فارغ", "Your cart is empty")}</p>
              </div>
            ) : (
              <div className="space-y-3 py-3">
                {cart.map(c => {
                  const key = cartKey(c.item, c.selectedSize);
                  return (
                    <div key={key} className="flex items-center gap-3 bg-muted/40 rounded-2xl p-3" data-testid={`kiosk-cart-item-${key}`}>
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-muted shrink-0">
                        {c.item.imageUrl ? (
                          <img src={c.item.imageUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><Coffee className="w-6 h-6 text-primary/40" /></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{isEn ? c.item.nameEn : c.item.nameAr}</p>
                        {c.selectedSize && <p className="text-xs text-blue-600 font-medium">{c.selectedSize}</p>}
                        <p className="text-sm text-primary font-black">{(c.effectivePrice * c.quantity).toFixed(2)} <SarIcon /></p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button onClick={() => decreaseCart(key)} className="w-9 h-9 rounded-full bg-white border flex items-center justify-center hover:bg-red-50 hover:border-red-300 transition" data-testid={`button-kiosk-decrease-${key}`}>
                          {c.quantity === 1 ? <Trash2 className="w-4 h-4 text-red-500" /> : <Minus className="w-4 h-4" />}
                        </button>
                        <span className="w-7 text-center font-black">{c.quantity}</span>
                        <button onClick={() => increaseCart(key)} className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition" data-testid={`button-kiosk-increase-${key}`}>
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
          {cart.length > 0 && (
            <div className="space-y-3 p-4 border-t bg-white">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{tc("ضريبة 15%", "VAT 15%")}</span>
                <span>{vat.toFixed(2)} <SarIcon /></span>
              </div>
              <div className="flex justify-between font-black text-xl">
                <span>{tc("الإجمالي:", "Total:")}</span>
                <span className="text-primary">{cartTotal.toFixed(2)} <SarIcon /></span>
              </div>
              <Button size="lg" className="w-full text-lg py-6 bg-primary hover:bg-primary/90" onClick={() => setStep("info")} data-testid="button-kiosk-checkout">
                {tc("متابعة", "Continue")}
                {isRtl ? <ArrowLeft className="w-5 h-5 ms-2" /> : <ArrowRight className="w-5 h-5 ms-2" />}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* === Step: Info (name + order type) === */}
      <Dialog open={step === "info"} onOpenChange={(o) => !o && setStep("cart")}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">{tc("بيانات الطلب", "Order Details")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setOrderType("dine-in")}
                className={`p-4 rounded-2xl border-2 font-bold transition-all ${
                  orderType === "dine-in" ? "border-primary bg-primary/10 text-primary" : "border-muted text-muted-foreground"
                }`}
                data-testid="button-kiosk-dinein"
              >
                ☕ {tc("داخل المقهى", "Dine-in")}
              </button>
              <button
                onClick={() => setOrderType("takeaway")}
                className={`p-4 rounded-2xl border-2 font-bold transition-all ${
                  orderType === "takeaway" ? "border-primary bg-primary/10 text-primary" : "border-muted text-muted-foreground"
                }`}
                data-testid="button-kiosk-takeaway"
              >
                🥤 {tc("سفري", "Takeaway")}
              </button>
            </div>
            <div>
              <label className="text-sm font-semibold block mb-1">{tc("اسمك (اختياري)", "Your name (optional)")}</label>
              <Input
                placeholder={tc("لمناداتك عند الجاهزية", "So we can call you when ready")}
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                className="text-lg py-5"
                data-testid="input-kiosk-name"
              />
            </div>
            <div>
              <label className="text-sm font-semibold block mb-1">{tc("جوالك (اختياري)", "Phone (optional)")}</label>
              <Input
                placeholder="05xxxxxxxx"
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
                className="text-lg py-5"
                inputMode="tel"
                data-testid="input-kiosk-phone"
              />
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button variant="outline" size="lg" onClick={() => setStep("cart")} data-testid="button-kiosk-back-info">
                {tc("رجوع", "Back")}
              </Button>
              <Button size="lg" onClick={() => setStep("payment")} data-testid="button-kiosk-next-payment">
                {tc("اختيار الدفع", "Choose Payment")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* === Step: Payment selection === */}
      <Dialog open={step === "payment"} onOpenChange={(o) => !o && setStep("info")}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">{tc("اختر طريقة الدفع", "Choose Payment Method")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {/* Cash at counter */}
            <button
              onClick={() => setPaymentChoice("counter")}
              className={`w-full p-4 rounded-2xl border-2 transition-all text-start flex items-center gap-3 ${
                paymentChoice === "counter" ? "border-primary bg-primary/10" : "border-muted hover:border-primary/30"
              }`}
              data-testid="button-pay-counter"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
                <Banknote className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <p className="font-bold">{tc("الدفع عند الاستلام", "Pay at Counter")}</p>
                <p className="text-xs text-muted-foreground">{tc("ادفع نقداً عند تسلّم الطلب", "Pay cash when you receive your order")}</p>
              </div>
              {paymentChoice === "counter" && <CheckCircle className="w-5 h-5 text-primary" />}
            </button>

            {/* External POS — card terminal at counter */}
            <button
              onClick={() => setPaymentChoice("external_pos")}
              className={`w-full p-4 rounded-2xl border-2 transition-all text-start flex items-center gap-3 ${
                paymentChoice === "external_pos" ? "border-primary bg-primary/10" : "border-muted hover:border-primary/30"
              }`}
              data-testid="button-pay-external"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-500 text-white flex items-center justify-center shrink-0">
                <Wallet className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <p className="font-bold">{tc("بطاقة عند الكاشير", "Card at Cashier")}</p>
                <p className="text-xs text-muted-foreground">{tc("ادفع بالبطاقة على جهاز نقطة البيع", "Pay by card on the external POS terminal")}</p>
              </div>
              {paymentChoice === "external_pos" && <CheckCircle className="w-5 h-5 text-primary" />}
            </button>

            {/* Online gateway */}
            <button
              onClick={() => hasOnlineGateway && setPaymentChoice("online")}
              disabled={!hasOnlineGateway}
              className={`w-full p-4 rounded-2xl border-2 transition-all text-start flex items-center gap-3 ${
                paymentChoice === "online" ? "border-primary bg-primary/10" : "border-muted hover:border-primary/30"
              } ${!hasOnlineGateway ? "opacity-50 cursor-not-allowed" : ""}`}
              data-testid="button-pay-online"
            >
              <div className="w-12 h-12 rounded-xl bg-purple-500 text-white flex items-center justify-center shrink-0">
                <CreditCard className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <p className="font-bold">
                  {tc("دفع إلكتروني", "Online Payment")}
                  {!hasOnlineGateway && <span className="text-[10px] text-muted-foreground ms-2">({tc("غير مفعّل", "not enabled")})</span>}
                </p>
                <p className="text-xs text-muted-foreground">{tc("مدى، فيزا، Apple Pay عبر الإنترنت", "Mada, Visa, Apple Pay online")}</p>
              </div>
              {paymentChoice === "online" && <CheckCircle className="w-5 h-5 text-primary" />}
            </button>

            <div className="bg-muted/50 rounded-2xl p-3 flex justify-between items-center mt-2">
              <span className="text-sm font-semibold">{tc("المبلغ الإجمالي", "Total Amount")}</span>
              <span className="text-2xl font-black text-primary">{cartTotal.toFixed(2)} <SarIcon /></span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" size="lg" onClick={() => setStep("info")} data-testid="button-kiosk-back-payment">
                {tc("رجوع", "Back")}
              </Button>
              <Button
                size="lg"
                onClick={() => placeOrderMutation.mutate()}
                disabled={placeOrderMutation.isPending}
                className="bg-primary hover:bg-primary/90"
                data-testid="button-kiosk-confirm-pay"
              >
                {placeOrderMutation.isPending
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <>{tc("تأكيد الطلب", "Confirm Order")} <CheckCircle className="w-4 h-4 ms-2" /></>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
