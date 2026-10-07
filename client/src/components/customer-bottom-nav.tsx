import { Home, ClipboardList, Coffee, ShoppingCart } from "lucide-react";
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
  const [path] = useLocation();
  const { cartItems } = useCartStore();
  const { i18n } = useTranslation();
  const activeKey = activeKeyForPath(path);
  const isArabic = i18n.language.startsWith("ar");
  const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);

  return (
    <nav
      aria-label={isArabic ? "التنقل الرئيسي" : "Main navigation"}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 4px)" }}
      data-testid="customer-bottom-nav"
    >
      <div className="mx-auto flex h-[4.25rem] max-w-xl items-center justify-around px-2">
        {items.map(({ href, key, icon: Icon, ar, en }) => {
          const active = activeKey === key;
          const label = isArabic ? ar : en;
          return (
            <Link
              key={key}
              href={href}
              aria-current={active ? "page" : undefined}
              data-testid={`bottom-nav-${key}`}
              className={`relative flex min-w-[4.5rem] flex-col items-center justify-center gap-1 rounded-xl px-3 py-2 text-xs transition-colors ${
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
