import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ShoppingCart, Plus, Minus, Trash2, CheckCircle, Coffee, ChevronRight, X, Loader2 } from "lucide-react";
import blackroseLogo from "@assets/blackrose-logo.png";
import { useTranslate } from "@/lib/useTranslate";
import { useTranslation } from "react-i18next";
import { printTaxInvoice } from "@/lib/print-utils";

interface SizeOption {
  nameAr: string;
  nameEn?: string;
  price: number;
}

interface MenuItem {
  _id: string;
  id: string;
  nameAr: string;
  nameEn: string;
  price: number;
  imageUrl?: string;
  category?: string;
  isAvailable?: boolean;
  availableSizes?: SizeOption[];
}

interface MenuCategory {
  id: string;
  nameAr: string;
  nameEn?: string;
}

interface CartItem {
  item: MenuItem;
  quantity: number;
  selectedSize?: string;
  effectivePrice: number;
}

function SarIcon() {
  return <span className="font-arabic text-sm font-bold">ر.س</span>;
}

function cartKey(item: MenuItem, size?: string): string {
  return `${item._id || item.id}::${size || '__no_size__'}`;
}

const ALL_CATEGORY = "__all__";

export default function KioskPage() {
  const { toast } = useToast();
  const tc = useTranslate();
  const { i18n } = useTranslation();
  const isEn = i18n.language === 'en';
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>(ALL_CATEGORY);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [customerName, setCustomerName] = useState("");

  // Size selection dialog
  const [sizeDialogItem, setSizeDialogItem] = useState<MenuItem | null>(null);

  // Data queries
  const { data: menuItems = [], isLoading: menuLoading } = useQuery<MenuItem[]>({
    queryKey: ["/api/coffee-items"],
  });
  const { data: menuCategories = [] } = useQuery<MenuCategory[]>({
    queryKey: ["/api/menu-categories"],
  });
  const { data: branches = [] } = useQuery<any[]>({
    queryKey: ["/api/branches"],
  });

  // Category ID → name mapping
  const categoryNameMap = Object.fromEntries(
    (menuCategories as MenuCategory[]).map(c => [c.id, isEn ? (c.nameEn || c.nameAr) : c.nameAr])
  );

  const availableItems = (menuItems as MenuItem[]).filter(i =>
    i.isAvailable !== false && (i as any).availabilityStatus !== 'out_of_stock'
  );

  // Build unique category IDs that exist in available items
  const categoryIds = Array.from(new Set(availableItems.map(i => i.category).filter(Boolean))) as string[];

  const cartCount = cart.reduce((s, c) => s + c.quantity, 0);
  const cartTotal = cart.reduce((s, c) => s + c.effectivePrice * c.quantity, 0);

  // ── Idle reset ──────────────────────────────────────────────────────────────
  const resetIdle = () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      if (!showSuccess) {
        setCart([]);
        setShowCart(false);
        setShowCheckout(false);
        setSizeDialogItem(null);
        setCustomerName("");
        setSelectedCategory(ALL_CATEGORY);
      }
    }, 120000);
  };

  useEffect(() => {
    resetIdle();
    return () => { if (idleTimerRef.current) clearTimeout(idleTimerRef.current); };
  }, []);

  // ── Cart helpers ────────────────────────────────────────────────────────────
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
    toast({
      title: tc("✅ تمت الإضافة", "✅ Added"),
      description: `${isEn ? item.nameEn : item.nameAr}${size ? ` — ${size}` : ''}`,
    });
  };

  const decreaseCart = (key: string) => {
    resetIdle();
    setCart(prev => {
      const existing = prev.find(c => cartKey(c.item, c.selectedSize) === key);
      if (!existing || existing.quantity <= 1) return prev.filter(c => cartKey(c.item, c.selectedSize) !== key);
      return prev.map(c => cartKey(c.item, c.selectedSize) === key ? { ...c, quantity: c.quantity - 1 } : c);
    });
  };

  const increaseCart = (key: string) => {
    resetIdle();
    setCart(prev => prev.map(c => cartKey(c.item, c.selectedSize) === key ? { ...c, quantity: c.quantity + 1 } : c));
  };

  // ── Item click: show size dialog if product has sizes, else add directly ───
  const handleItemClick = (item: MenuItem) => {
    resetIdle();
    if (item.availableSizes && item.availableSizes.length > 0) {
      setSizeDialogItem(item);
    } else {
      addToCart(item);
    }
  };

  // ── Order placement ─────────────────────────────────────────────────────────
  const placeOrderMutation = useMutation({
    mutationFn: async () => {
      const branchId = (branches as any[])[0]?.id || (branches as any[])[0]?._id || 'default';
      const res = await apiRequest("POST", "/api/orders", {
        customerName: customerName || tc("زبون الكشك", "Kiosk Customer"),
        items: cart.map(c => ({
          coffeeItemId: c.item._id || c.item.id,
          quantity: c.quantity,
          price: c.effectivePrice,
          nameAr: c.item.nameAr,
          nameEn: c.item.nameEn,
          selectedSize: c.selectedSize,
        })),
        totalAmount: cartTotal,
        paymentMethod: "cash",
        status: "pending",
        channel: "kiosk",
        orderType: "dine-in",
        branchId,
      });
      if (!res.ok) throw new Error(tc("فشل إرسال الطلب", "Failed to place order"));
      return res.json();
    },
    onSuccess: async (data) => {
      const num = data.dailyNumber || data.orderNumber || data._id?.slice(-4) || "0000";
      setOrderNumber(String(num));
      setShowCheckout(false);
      setShowCart(false);

      // Print using the same system as POS
      try {
        const branchId = (branches as any[])[0]?.id || 'default';
        await printTaxInvoice({
          orderNumber: String(data.dailyNumber || data.orderNumber || ''),
          customerName: customerName || tc("زبون الكشك", "Kiosk Customer"),
          customerPhone: '',
          items: cart.map(c => ({
            coffeeItem: {
              nameAr: c.item.nameAr,
              nameEn: c.item.nameEn,
              price: String(c.effectivePrice),
            },
            quantity: c.quantity,
            selectedSize: c.selectedSize,
          })),
          subtotal: (cartTotal / 1.15).toFixed(2),
          total: cartTotal.toFixed(2),
          paymentMethod: tc("دفع عند الاستلام", "Pay at counter"),
          employeeName: tc("الكشك", "Kiosk"),
          date: new Date().toISOString(),
        }, { autoPrint: true });
      } catch (e) {
        // Printing failure should not block the success screen
        console.warn('[Kiosk] Print failed:', e);
      }

      setCart([]);
      setCustomerName("");
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setSelectedCategory(ALL_CATEGORY);
      }, 8000);
    },
    onError: () => toast({
      variant: "destructive",
      title: tc("خطأ", "Error"),
      description: tc("تعذّر إرسال الطلب. حاول مجدداً.", "Failed to place order. Please try again."),
    }),
  });

  // ── Success screen ──────────────────────────────────────────────────────────
  if (showSuccess) {
    return (
      <div className="h-screen bg-primary flex flex-col items-center justify-center text-white text-center p-8" data-testid="kiosk-success">
        <CheckCircle className="w-32 h-32 mb-6 animate-bounce" />
        <h1 className="text-5xl font-black mb-4">{tc("شكراً لطلبك!", "Thank you for your order!")}</h1>
        <p className="text-3xl font-bold mb-2">{tc("رقم الطلب", "Order Number")}</p>
        <div className="text-8xl font-black bg-white text-primary rounded-3xl px-10 py-6 mb-6">#{orderNumber}</div>
        <p className="text-2xl text-white/80">{tc("سنُخبرك عند جاهزية طلبك", "We'll notify you when your order is ready")}</p>
        <div className="mt-8 text-lg text-white/60">{tc("سيعود الشاشة تلقائياً خلال ثوانٍ...", "Screen will reset in a few seconds...")}</div>
      </div>
    );
  }

  return (
    <div
      className="h-screen bg-background flex flex-col overflow-hidden"
      onClick={resetIdle}
      data-testid="kiosk-page"
      dir={isEn ? "ltr" : "rtl"}
    >
      {/* Header */}
      <div className="bg-primary text-white px-6 py-3 flex items-center justify-between shrink-0 shadow-lg">
        <img src={blackroseLogo} alt="BLACK ROSE" className="h-10 object-contain brightness-0 invert" />
        <div className="text-center">
          <p className="text-lg font-bold">{tc("نظام الطلب الذاتي", "Self-Order Kiosk")}</p>
          <p className="text-xs text-white/70">{tc("Self-Order Kiosk", "اطلب بنفسك")}</p>
        </div>
        <button
          onClick={() => setShowCart(true)}
          className="relative bg-white text-primary rounded-2xl px-5 py-2 font-bold flex items-center gap-2 text-lg hover:bg-white/90 transition-colors"
          data-testid="button-kiosk-cart"
        >
          <ShoppingCart className="w-6 h-6" />
          <span>{cartTotal.toFixed(2)} <SarIcon /></span>
          {cartCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 text-xs flex items-center justify-center font-black">
              {cartCount}
            </span>
          )}
        </button>
      </div>

      {/* Category Bar */}
      <div className="bg-card border-b px-4 py-3 flex gap-3 overflow-x-auto scrollbar-none shrink-0">
        <button
          key={ALL_CATEGORY}
          onClick={() => setSelectedCategory(ALL_CATEGORY)}
          data-testid="button-category-all"
          className={`shrink-0 px-6 py-2 rounded-full text-base font-bold transition-all ${
            selectedCategory === ALL_CATEGORY ? "bg-primary text-white shadow-md" : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          {tc("الكل", "All")}
        </button>
        {categoryIds.map(catId => (
          <button
            key={catId}
            onClick={() => setSelectedCategory(catId)}
            data-testid={`button-category-${catId}`}
            className={`shrink-0 px-6 py-2 rounded-full text-base font-bold transition-all ${
              selectedCategory === catId ? "bg-primary text-white shadow-md" : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {categoryNameMap[catId] || catId}
          </button>
        ))}
      </div>

      {/* Menu Grid */}
      <ScrollArea className="flex-1 p-4">
        {menuLoading && (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="text-muted-foreground font-medium">{tc("جاري تحميل القائمة...", "Loading menu...")}</p>
          </div>
        )}
        {!menuLoading && availableItems.filter(i => selectedCategory === ALL_CATEGORY || i.category === selectedCategory).length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <Coffee className="w-16 h-16 text-primary/30" />
            <p className="text-muted-foreground font-medium text-lg">{tc("لا توجد منتجات متاحة", "No items available")}</p>
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-4">
          {availableItems
            .filter(i => selectedCategory === ALL_CATEGORY || i.category === selectedCategory)
            .map(item => {
              const key = item._id || item.id;
              const cartQty = cart.filter(c => (c.item._id || c.item.id) === key).reduce((s, c) => s + c.quantity, 0);
              const minPrice = item.availableSizes?.length
                ? Math.min(...item.availableSizes.map(s => s.price))
                : item.price;
              return (
                <Card
                  key={key}
                  className="overflow-hidden cursor-pointer hover:shadow-xl transition-all active:scale-95 select-none"
                  onClick={() => handleItemClick(item)}
                  data-testid={`card-kiosk-item-${key}`}
                >
                  <div className="aspect-square bg-muted relative overflow-hidden">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={isEn ? item.nameEn : item.nameAr}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary/10">
                        <Coffee className="w-16 h-16 text-primary/40" />
                      </div>
                    )}
                    {cartQty > 0 && (
                      <div className="absolute top-2 right-2 bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center font-black text-sm">
                        {cartQty}
                      </div>
                    )}
                    {item.availableSizes && item.availableSizes.length > 0 && (
                      <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                        {item.availableSizes.length} {tc("أحجام", "sizes")}
                      </div>
                    )}
                  </div>
                  <div className="p-3 text-center">
                    <p className="font-bold text-base leading-tight mb-1">{isEn ? item.nameEn : item.nameAr}</p>
                    <p className="text-xs text-muted-foreground mb-2">{isEn ? item.nameAr : item.nameEn}</p>
                    <Badge className="bg-primary/10 text-primary border-0 font-black text-sm">
                      {item.availableSizes?.length ? `${tc("من", "from")} ` : ''}{minPrice.toFixed(2)} <SarIcon />
                    </Badge>
                  </div>
                </Card>
              );
            })}
        </div>
      </ScrollArea>

      {/* Size Selection Dialog */}
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
                  <span>{sz.nameAr}{sz.nameEn ? ` — ${sz.nameEn}` : ''}</span>
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

      {/* Cart Sidebar */}
      <Dialog open={showCart} onOpenChange={setShowCart}>
        <DialogContent className="max-w-md h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <ShoppingCart className="w-6 h-6 text-primary" />
              {tc(`طلبك (${cartCount})`, `Your Order (${cartCount})`)}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1">
            {cart.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg">{tc("طلبك فارغ", "Your cart is empty")}</p>
              </div>
            ) : (
              <div className="space-y-3 p-1">
                {cart.map(c => {
                  const key = cartKey(c.item, c.selectedSize);
                  return (
                    <div key={key} className="flex items-center gap-3 bg-muted/40 rounded-xl p-3" data-testid={`kiosk-cart-item-${key}`}>
                      <div className="flex-1">
                        <p className="font-bold">{isEn ? c.item.nameEn : c.item.nameAr}</p>
                        {c.selectedSize && (
                          <p className="text-xs text-blue-600 font-medium">{tc("الحجم:", "Size:")} {c.selectedSize}</p>
                        )}
                        <p className="text-sm text-muted-foreground">{(c.effectivePrice * c.quantity).toFixed(2)} <SarIcon /></p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => decreaseCart(key)} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-red-100">
                          {c.quantity === 1 ? <Trash2 className="w-4 h-4 text-red-500" /> : <Minus className="w-4 h-4" />}
                        </button>
                        <span className="w-6 text-center font-bold">{c.quantity}</span>
                        <button onClick={() => increaseCart(key)} className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20">
                          <Plus className="w-4 h-4 text-primary" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
          {cart.length > 0 && (
            <div className="space-y-3 pt-4 border-t">
              <div className="flex justify-between font-black text-xl">
                <span>{tc("الإجمالي:", "Total:")}</span>
                <span className="text-primary">{cartTotal.toFixed(2)} <SarIcon /></span>
              </div>
              <Button size="lg" className="w-full text-lg py-6" onClick={() => { setShowCart(false); setShowCheckout(true); }} data-testid="button-kiosk-checkout">
                {tc("متابعة الطلب", "Continue")} <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Checkout Modal */}
      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">{tc("تأكيد الطلب", "Confirm Order")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-muted-foreground block mb-1">{tc("اسمك (اختياري)", "Your name (optional)")}</label>
              <Input
                placeholder={tc("اكتب اسمك لمناداتك عند الجاهزية", "Enter your name so we can call you")}
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                className="text-lg py-5"
                data-testid="input-kiosk-name"
              />
            </div>
            <div className="bg-muted/50 rounded-xl p-4 space-y-2">
              {cart.map(c => {
                const key = cartKey(c.item, c.selectedSize);
                return (
                  <div key={key} className="flex justify-between text-sm">
                    <span>
                      {isEn ? c.item.nameEn : c.item.nameAr}
                      {c.selectedSize && <span className="text-blue-600 text-xs mr-1">({c.selectedSize})</span>}
                      {' '}× {c.quantity}
                    </span>
                    <span className="font-bold">{(c.effectivePrice * c.quantity).toFixed(2)}</span>
                  </div>
                );
              })}
              <div className="border-t pt-2 flex justify-between font-black text-lg">
                <span>{tc("الإجمالي", "Total")}</span>
                <span className="text-primary">{cartTotal.toFixed(2)} <SarIcon /></span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground text-center">{tc("الدفع عند الاستلام نقداً أو بطاقة", "Pay at counter — cash or card")}</p>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" size="lg" onClick={() => { setShowCheckout(false); setShowCart(true); }} data-testid="button-kiosk-back">
                <X className="w-4 h-4 mr-2" /> {tc("تعديل", "Edit")}
              </Button>
              <Button size="lg" onClick={() => placeOrderMutation.mutate()} disabled={placeOrderMutation.isPending} data-testid="button-kiosk-confirm">
                {placeOrderMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                {tc("تأكيد", "Confirm")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
