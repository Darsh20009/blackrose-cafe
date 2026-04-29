import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { motion } from "framer-motion";
import { Ticket, LogIn, ShoppingBag, BadgePercent } from "lucide-react";
import blackroseLogo from "@assets/blackrose-logo.png";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface PromoData {
  code: string;
  discountPercentage: number;
  isActive?: number | boolean;
  reason?: string;
}

export default function PromoPage() {
  const [, params] = useRoute("/promo/:code");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const code = (params?.code || "").toUpperCase();

  const [promo, setPromo] = useState<PromoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) {
      setError("رمز الكوبون غير صحيح");
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/discount-codes/by-code/${encodeURIComponent(code)}`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data?.error || "هذا الكوبون غير متاح");
        } else if (!data?.isActive) {
          setError("هذا الكوبون غير مفعّل حالياً");
        } else {
          setPromo(data);
        }
      } catch (_) {
        if (!cancelled) setError("تعذّر التحقق من الكوبون");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  const persistAndGo = (target: string) => {
    if (promo) {
      try {
        localStorage.setItem(
          "pendingCoupon",
          JSON.stringify({ code: promo.code, percentage: promo.discountPercentage, savedAt: Date.now() }),
        );
      } catch (_) {}
      toast({
        title: "تم حفظ الكوبون",
        description: `سيُطبَّق ${promo.discountPercentage}% تلقائياً عند الدفع`,
      });
    }
    setLocation(target);
  };

  return (
    <div
      dir="rtl"
      className="min-h-[100dvh] w-full flex flex-col items-center justify-center px-5 py-10 font-ibm-arabic"
      style={{
        background:
          "radial-gradient(circle at 20% 0%, #6b3a1a 0%, #4a2410 40%, #2a140a 100%)",
      }}
      data-testid="page-promo"
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="flex justify-center mb-6">
          <img
            src={blackroseLogo}
            alt="Black Rose Cafe"
            className="h-20 w-20 rounded-full bg-white/10 p-2 ring-1 ring-white/20"
            data-testid="img-promo-logo"
          />
        </div>

        <div
          className="relative bg-[#fdf6ee] rounded-3xl shadow-2xl overflow-hidden"
          data-testid="card-coupon"
        >
          {/* Decorative ticket notches */}
          <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#2a140a]" />
          <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#2a140a]" />

          <div className="p-6">
            <div className="flex items-center justify-between mb-5">
              <img src={blackroseLogo} alt="logo" className="h-12 w-12" />
              <div className="text-right">
                <p className="text-[11px] text-[#6b3a1a] font-semibold tracking-wide">
                  BLACK ROSE CAFE
                </p>
                <p className="text-[11px] text-neutral-500">كوبون خصم مقدم لك</p>
              </div>
            </div>

            <div className="text-center mb-5">
              <p className="text-base text-neutral-700 mb-1">كوبون خصم خاص</p>
              <h1 className="text-2xl font-bold text-[#3a1f10]">
                خصم فوري على طلبك
              </h1>
            </div>

            {/* Coupon code box */}
            <div className="border-2 border-dashed border-[#b07a3a] rounded-2xl p-4 bg-white/60 mb-5">
              {loading ? (
                <div className="text-center py-6 text-neutral-500" data-testid="text-promo-loading">
                  جارٍ التحقق من الكوبون...
                </div>
              ) : error ? (
                <div className="text-center py-4 text-red-600 font-medium" data-testid="text-promo-error">
                  {error}
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="text-center flex-1">
                    <p className="text-[11px] text-neutral-500 mb-1">رمز الكوبون</p>
                    <p
                      className="text-2xl font-extrabold tracking-widest text-[#3a1f10]"
                      data-testid="text-coupon-code"
                    >
                      {promo!.code}
                    </p>
                  </div>
                  <div className="h-12 w-px bg-[#b07a3a]/40 mx-2" />
                  <div className="text-center flex-1">
                    <p className="text-[11px] text-neutral-500 mb-1">قيمة الخصم</p>
                    <p
                      className="text-3xl font-extrabold text-[#b07a3a]"
                      data-testid="text-coupon-percentage"
                    >
                      {promo!.discountPercentage}%
                    </p>
                  </div>
                </div>
              )}
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed text-center mb-5">
              يُطبَّق الخصم تلقائياً عند الانتقال إلى صفحة الدفع. صالح للاستخدام
              مرة واحدة لكل عميل.
            </p>

            <div className="space-y-2">
              <Button
                size="lg"
                disabled={!promo}
                className="w-full bg-[#3a1f10] hover:bg-[#4a2410] text-white text-base font-semibold rounded-xl h-12"
                onClick={() => persistAndGo("/menu")}
                data-testid="button-use-coupon"
              >
                <ShoppingBag className="ml-2 h-5 w-5" />
                استخدام الكوبون
              </Button>
              <Button
                variant="outline"
                size="lg"
                disabled={!promo}
                className="w-full border-[#3a1f10] text-[#3a1f10] hover:bg-[#3a1f10] hover:text-white text-base font-semibold rounded-xl h-12"
                onClick={() => persistAndGo("/auth")}
                data-testid="button-login-with-coupon"
              >
                <LogIn className="ml-2 h-5 w-5" />
                تسجيل الدخول
              </Button>
            </div>
          </div>

          <div className="bg-[#3a1f10] text-white text-[11px] text-center py-2 flex items-center justify-center gap-1">
            <BadgePercent className="h-3.5 w-3.5" />
            عرض حصري - بلاك روز كافيه
          </div>
        </div>
      </motion.div>
    </div>
  );
}
