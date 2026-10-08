import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { CreditCard, Gift, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import BlackRoseCard from "@/components/BlackRoseCard";
import { useCustomer } from "@/contexts/CustomerContext";
import { useAuthModal } from "@/contexts/AuthModalContext";
import { useToast } from "@/hooks/use-toast";
import { useTranslate } from "@/lib/useTranslate";
import { isAppleMobileDevice, openLoyaltyCardInAppleWallet } from "@/lib/apple-wallet";

export function CustomerLoyaltyShortcut() {
  const { customer, isAuthenticated } = useCustomer();
  const { openAuthModal } = useAuthModal();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const tc = useTranslate();
  const [addingToWallet, setAddingToWallet] = useState(false);
  const isAppleMobile = isAppleMobileDevice();

  const { data: loyaltyCards = [], isLoading, isError } = useQuery<any[]>({
    queryKey: ["/api/customer/loyalty-cards"],
    enabled: isAuthenticated && !!customer,
    retry: false,
  });

  const card = loyaltyCards[0];
  const points = Number(card?.points) || 0;

  const openCard = () => {
    if (!isAuthenticated) {
      openAuthModal({
        initialMode: "whatsapp",
        purpose: "account",
        onSuccess: () => setLocation("/my-card"),
      });
      return;
    }
    setLocation("/my-card");
  };

  const addToAppleWallet = async () => {
    setAddingToWallet(true);
    try {
      toast({
        title: tc("جارٍ تجهيز بطاقة الولاء", "Preparing your loyalty card"),
        description: tc("سيتم فتح Apple Wallet لإضافة البطاقة", "Apple Wallet will open to add your card"),
      });
      await openLoyaltyCardInAppleWallet();
    } catch (error: any) {
      toast({
        title: tc("تعذر فتح Apple Wallet", "Could not open Apple Wallet"),
        description: error?.message || tc("حاول مرة أخرى من صفحة بطاقتي", "Try again from your card page"),
        variant: "destructive",
      });
    } finally {
      setAddingToWallet(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <button
        type="button"
        onClick={openCard}
        className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-start transition-colors hover:bg-muted/50"
        aria-label={tc("سجّل الدخول لعرض بطاقة الولاء", "Sign in to view your loyalty card")}
        data-testid="customer-loyalty-sign-in"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <CreditCard className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-foreground">{tc("بطاقة الولاء", "Loyalty card")}</span>
          <span className="block text-xs text-muted-foreground">
            {tc("سجّل الدخول لعرض بطاقتك ونقاطك", "Sign in to view your card and points")}
          </span>
        </span>
        <span className="shrink-0 text-xs font-semibold text-primary">
          {tc("تسجيل الدخول", "Sign in")}
        </span>
      </button>
    );
  }

  return (
    <section
      className="rounded-xl border border-border bg-card p-3"
      aria-label={tc("اختصار بطاقة الولاء", "Loyalty card shortcut")}
      data-testid="customer-loyalty-shortcut"
    >
      <button
        type="button"
        onClick={openCard}
        className="flex w-full min-w-0 items-center gap-3 text-start"
        aria-label={tc("عرض بطاقة الولاء", "View loyalty card")}
      >
        <div className="w-[120px] shrink-0 min-[360px]:w-[136px] sm:w-[150px]">
          {card ? (
            <BlackRoseCard
              compact
              phone={card.phoneNumber || customer?.phone}
              points={points}
              customerName={card.customerName || customer?.name}
            />
          ) : (
            <div className="flex aspect-[85.6/53.98] items-center justify-center rounded-xl border border-border bg-muted">
              {isLoading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              ) : (
                <Gift className="h-6 w-6 text-primary" aria-hidden="true" />
              )}
            </div>
          )}
        </div>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-foreground">{tc("بطاقتك", "Your card")}</span>
          <span className="mt-1 block text-sm text-muted-foreground">
            {isLoading
              ? tc("جارٍ تحميل البطاقة...", "Loading card...")
              : isError
                ? tc("تعذر تحميل النقاط", "Could not load points")
                : tc(`${points.toLocaleString("ar-SA")} نقطة`, `${points.toLocaleString("en-US")} points`)}
          </span>
          <span className="mt-2 block text-xs font-semibold text-primary">
            {tc("عرض البطاقة", "View card")}
          </span>
        </span>
      </button>

      {isAppleMobile && (
        <Button
          type="button"
          variant="outline"
          className="mt-3 h-10 w-full gap-2"
          onClick={addToAppleWallet}
          disabled={addingToWallet}
          data-testid="button-add-loyalty-card-to-wallet"
        >
          <Wallet className="h-4 w-4" aria-hidden="true" />
          {addingToWallet
            ? tc("جارٍ التحضير...", "Preparing...")
            : tc("إضافة إلى Apple Wallet", "Add to Apple Wallet")}
        </Button>
      )}
    </section>
  );
}
