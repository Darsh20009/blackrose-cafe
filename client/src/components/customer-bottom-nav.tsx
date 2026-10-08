import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Home, ClipboardList, Coffee, ShoppingCart } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useCartStore } from "@/lib/cart-store";
import { useTranslation } from "react-i18next";

const items = [
  { href: "/", key: "home", icon: Home, ar: "الرئيسية", en: "Home" },
  { href: "/my-orders", key: "orders", icon: ClipboardList, ar: "الطلبات", en: "Orders" },
  { href: "/menu", key: "menu", icon: Coffee, ar: "القائمة", en: "Menu" },
  { href: "/cart", key: "cart", icon: ShoppingCart, ar: "السلة", en: "Cart" },
] as const;

function activeKeyForPath(path: string) {
  if (path === "/" || path === "/welcome") return "home";
  if (path === "/my-orders" || path.startsWith("/track/") || path.startsWith("/delivery/track/")) return "orders";
  if (path === "/menu" || path === "/menu-view" || path.startsWith("/product/")) return "menu";
  if (path === "/cart" || path === "/delivery" || path === "/delivery/map" || path === "/checkout") return "cart";
  return "";
}

export function CustomerBottomNav() {
  const [path, navigate] = useLocation();
  const { cartItems } = useCartStore();
  const { i18n } = useTranslation();
  const activeKey = activeKeyForPath(path);
  const isArabic = i18n.language.startsWith("ar");
  const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);
  const [pathHistory, setPathHistory] = useState<string[]>([]);
  const currentPathRef = useRef(path);
  const skipNextHistoryRecordRef = useRef(false);

  useEffect(() => {
    if (currentPathRef.current === path) return;
    const previousPath = currentPathRef.current;
    currentPathRef.current = path;
    if (skipNextHistoryRecordRef.current) {
      skipNextHistoryRecordRef.current = false;
      return;
    }
    setPathHistory((history) => [...history, previousPath].slice(-20));
  }, [path]);

  const contextualBackPath = path.startsWith("/product/")
    ? "/menu"
    : path === "/delivery"
      ? "/cart"
      : path === "/delivery/map"
        ? "/delivery"
        : path === "/checkout"
          ? "/delivery"
          : path.startsWith("/track/") || path.startsWith("/delivery/track/")
            ? "/my-orders"
            : null;
  const previousPath = pathHistory[pathHistory.length - 1];
  const fallbackBackPath = path === "/menu"
    ? "/"
    : path === "/my-orders"
      ? "/menu"
      : path === "/cart"
        ? "/menu"
        : "/menu";
  const backPath = contextualBackPath ||
    (previousPath && previousPath !== path ? previousPath : fallbackBackPath);
  const isLandingScreen = path === "/" || path === "/welcome";
  const showBackButton = !isLandingScreen && !!backPath;

  const goBack = () => {
    if (!backPath) return;
    if (previousPath === backPath) {
      setPathHistory((history) => history.slice(0, -1));
      skipNextHistoryRecordRef.current = true;
    }
    navigate(backPath);
  };

  return (
    <nav
      aria-label={isArabic ? "التنقل الرئيسي" : "Main navigation"}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 4px)" }}
      data-testid="customer-bottom-nav"
    >
      <div className={`mx-auto flex h-[4.25rem] max-w-xl items-center px-2 ${showBackButton ? "justify-between gap-0" : "justify-around"}`}>
        {showBackButton && (
          <button
            type="button"
            onClick={goBack}
            aria-label={isArabic ? "الرجوع للصفحة السابقة" : "Go to the previous page"}
            data-testid="customer-bottom-nav-back"
            className="relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1.5 py-2 text-[11px] text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {isArabic
              ? <ArrowRight className="h-5 w-5" aria-hidden="true" />
              : <ArrowLeft className="h-5 w-5" aria-hidden="true" />}
            <span>{isArabic ? "رجوع" : "Back"}</span>
          </button>
        )}
        {items.map(({ href, key, icon: Icon, ar, en }) => {
          const active = activeKey === key;
          const label = isArabic ? ar : en;
          return (
            <Link
              key={key}
              href={href}
              aria-current={active ? "page" : undefined}
              data-testid={`bottom-nav-${key}`}
              className={`relative flex ${showBackButton ? "min-w-0 flex-1 px-1.5" : "min-w-[4.5rem] px-3"} flex-col items-center justify-center gap-1 rounded-xl py-2 text-xs transition-colors ${
                active ? "font-semibold text-primary" : "text-muted-foreground"
              }`}
            >
              <span className="relative">
                <Icon className="h-5 w-5" aria-hidden="true" />
                {key === "cart" && cartCount > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground">
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                )}
              </span>
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
