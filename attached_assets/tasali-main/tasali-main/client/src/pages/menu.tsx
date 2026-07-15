import { useState, useMemo, useRef, useEffect } from "react";
import { useTranslate } from "@/lib/useTranslate";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Coffee, Flame, Snowflake, Star, Cake, Utensils, Sparkles,
  Languages, Phone, MapPin, Clock, Search, X,
  User, ArrowLeft, ChevronRight, Beef,
} from "lucide-react";
import tasaliLogo from "@assets/logo.png";
import brand from "@/lib/brand";
import type { CoffeeItem, IProductAddon } from "@shared/schema";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { useTranslation } from "react-i18next";
import SarIcon from "@/components/sar-icon";

/* ────────────────────────────────────────────────
   RESTAURANT THEME — Warm Off-White
──────────────────────────────────────────────── */
const T = {
  bg:           "#FAF8F5",
  bgDeep:       "#F3EEE8",
  card:         "#FFFFFF",
  cardBorder:   "rgba(180,140,90,0.12)",
  cardShadow:   "0 2px 12px rgba(100,60,20,0.08), 0 1px 3px rgba(100,60,20,0.05)",
  cardShadowHover: "0 8px 32px rgba(100,60,20,0.14), 0 2px 8px rgba(100,60,20,0.08)",
  primary:      "#7D3D0F",
  primaryLight: "#A0521A",
  gold:         "#C17A2A",
  goldLight:    "#D4912A",
  text:         "#1C0F06",
  textMuted:    "#8B6550",
  textLight:    "#B89A80",
  cream:        "#F5EAD8",
  creamDeep:    "#EDE0CA",
  border:       "rgba(180,130,80,0.15)",
  headerBg:     "rgba(250,248,245,0.95)",
  catActive:    "#7D3D0F",
  catInactive:  "#F0E8DC",
};

const PHONE        = brand.phone;
const PHONE_HREF   = brand.phoneHref;
const MAPS_URL     = brand.mapsUrl;
const QIROX_URL    = "https://qiroxstudio.online";

interface MenuCategory {
  id: string;
  nameAr: string;
  nameEn?: string;
  icon?: string;
  department?: "drinks" | "food";
  orderIndex: number;
}

export default function MenuPage() {
  const tc = useTranslate();
  const [, setLocation] = useLocation();
  const { i18n } = useTranslation();
  const dir = i18n.language === "ar" ? "rtl" : "ltr";

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CoffeeItem | null>(null);

  /* ── Data ── */
  const { data: coffeeItems = [], isLoading } = useQuery<CoffeeItem[]>({ queryKey: ["/api/coffee-items"] });
  const { data: dynamicCategories = [] } = useQuery<MenuCategory[]>({ queryKey: ["/api/menu-categories"] });
  const { data: businessConfig } = useQuery<any>({ queryKey: ["/api/business-config"] });

  /* ── Store open ── */
  const storeOpen = useMemo(() => {
    if (!businessConfig) return true;
    if (businessConfig.isEmergencyClosed) return false;
    const storeHours = businessConfig.storeHours || {};
    const alwaysOpen = Object.values(storeHours).every(
      (h: any) => h?.isAlwaysOpen || (h?.open === "00:00" && h?.close === "23:59")
    );
    if (alwaysOpen) return true;
    const now = new Date();
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Riyadh",
      hour: "2-digit", minute: "2-digit", hour12: false, weekday: "long",
    }).formatToParts(now);
    const currentDay = parts.find(p => p.type === "weekday")?.value.toLowerCase() || "monday";
    const h = parseInt(parts.find(p => p.type === "hour")?.value || "0");
    const m = parseInt(parts.find(p => p.type === "minute")?.value || "0");
    const now_m = h * 60 + m;
    const hours = storeHours[currentDay];
    if (!hours?.isOpen) return false;
    if (hours.isAlwaysOpen) return true;
    const [oh, om] = (hours.open || "06:00").split(":").map(Number);
    const [ch, cm] = (hours.close || "03:00").split(":").map(Number);
    const o_m = oh * 60 + om, c_m = ch * 60 + cm;
    return c_m <= o_m ? now_m >= o_m || now_m <= c_m : now_m >= o_m && now_m <= c_m;
  }, [businessConfig]);

  /* ── Categories ── */
  const iconMap: Record<string, any> = { Coffee, Flame, Snowflake, Star, Cake, Utensils, Sparkles, Beef };
  const categories = useMemo(() => [
    { id: "all", nameAr: "الكل", nameEn: "All", icon: Utensils },
    ...dynamicCategories.map(c => ({
      id: c.id,
      nameAr: c.nameAr,
      nameEn: c.nameEn || c.nameAr,
      icon: iconMap[c.icon || "Utensils"] || Utensils,
    })),
  ], [dynamicCategories]);

  /* ── Items ── */
  const groupedItems = useMemo(() =>
    coffeeItems.reduce((acc: Record<string, CoffeeItem[]>, item) => {
      const key = `${item.category}::${(item as any).groupId || (item as any).id || item.nameAr}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {}),
  [coffeeItems]);

  const representativeItems = useMemo(() => Object.values(groupedItems).map(g => g[0]), [groupedItems]);

  const maxSales = useMemo(() =>
    Math.max(0, ...coffeeItems.map(i => (i as any).salesCount || 0)),
  [coffeeItems]);

  const filteredItems = useMemo(() =>
    representativeItems
      .filter(item => {
        const cat = selectedCategory === "all" || item.category === selectedCategory;
        const name = i18n.language === "ar" ? item.nameAr : (item as any).nameEn || item.nameAr;
        const match = name.toLowerCase().includes(searchQuery.toLowerCase());
        return cat && match;
      })
      .sort((a, b) => ((b as any).salesCount || 0) - ((a as any).salesCount || 0)),
  [representativeItems, selectedCategory, searchQuery, i18n.language]);

  /* ── Loading ── */
  if (isLoading) {
    return (
      <div dir={dir} className="min-h-screen flex flex-col items-center justify-center gap-4"
        style={{ background: T.bg }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
          className="w-14 h-14 rounded-2xl overflow-hidden border-2"
          style={{ borderColor: T.gold }}
        >
          <img src={tasaliLogo} alt="تسالي كرومش" className="w-full h-full object-cover" />
        </motion.div>
        <p className="text-sm font-bold tracking-widest" style={{ color: T.textMuted }}>
          تسالي كرومش
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen select-none" dir={dir}
      style={{ background: T.bg, fontFamily: "'IBM Plex Sans Arabic','Tajawal',sans-serif", color: T.text }}>

      {/* ══════════════════════════════════════════════
          HEADER — warm white sticky bar
      ══════════════════════════════════════════════ */}
      <header className="fixed top-0 inset-x-0 z-50"
        style={{
          background: T.headerBg,
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: `1px solid ${T.border}`,
          boxShadow: "0 1px 12px rgba(100,60,20,0.08)",
        }}>
        <div className="flex items-center justify-between px-4 h-14 max-w-2xl mx-auto">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl overflow-hidden border-2 flex-shrink-0"
              style={{ borderColor: `${T.gold}50` }}>
              <img src={tasaliLogo} alt="تسالي كرومش" className="w-full h-full object-cover" />
            </div>
            <div className="leading-none">
              <p className="font-black text-sm" style={{ color: T.primary }}>تسالي كرومش</p>
              <p className="text-[9px] font-bold tracking-widest uppercase" style={{ color: T.gold }}>TASALI QURUMSH</p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
              storeOpen
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${storeOpen ? "bg-emerald-500 animate-pulse" : "bg-red-400"}`} />
              {storeOpen ? tc("مفتوح", "Open") : tc("مغلق", "Closed")}
            </div>

            <button
              onClick={() => setShowSearch(v => !v)}
              className="w-9 h-9 rounded-xl flex items-center justify-center border transition-all"
              style={{
                background: showSearch ? T.primary : T.card,
                borderColor: showSearch ? T.primary : T.border,
              }}
              data-testid="button-toggle-search"
            >
              {showSearch
                ? <X className="w-4 h-4 text-white" />
                : <Search className="w-4 h-4" style={{ color: T.textMuted }} />
              }
            </button>

            <button
              onClick={() => i18n.changeLanguage(i18n.language === "ar" ? "en" : "ar")}
              className="w-9 h-9 rounded-xl flex items-center justify-center border transition-all"
              style={{ background: T.card, borderColor: T.border }}
              data-testid="button-toggle-language"
            >
              <Languages className="w-4 h-4" style={{ color: T.textMuted }} />
            </button>

            <button
              onClick={() => setLocation("/auth")}
              className="w-9 h-9 rounded-xl flex items-center justify-center border transition-all"
              style={{ background: T.card, borderColor: T.border }}
              data-testid="button-profile"
            >
              <User className="w-4 h-4" style={{ color: T.textMuted }} />
            </button>
          </div>
        </div>
      </header>

      {/* ══════════════════════════════════════════════
          SEARCH BAR
      ══════════════════════════════════════════════ */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ y: -16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -16, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed top-14 inset-x-0 z-40 px-4 py-2 border-b"
            style={{ background: T.headerBg, backdropFilter: "blur(20px)", borderColor: T.border }}
          >
            <div className="relative max-w-2xl mx-auto">
              <Search className={`absolute ${dir === "rtl" ? "right-3.5" : "left-3.5"} top-1/2 -translate-y-1/2 w-4 h-4`}
                style={{ color: T.textLight }} />
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={tc("ابحث في قائمة الطعام...", "Search the menu...")}
                className={`w-full h-10 ${dir === "rtl" ? "pr-10 pl-4" : "pl-10 pr-4"} rounded-xl text-sm outline-none border`}
                style={{
                  background: T.card,
                  borderColor: T.border,
                  color: T.text,
                }}
                data-testid="input-search"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════
          HERO — restaurant brand header
      ══════════════════════════════════════════════ */}
      <div className="pt-14 relative overflow-hidden"
        style={{ background: `linear-gradient(160deg, ${T.cream} 0%, ${T.bg} 100%)` }}>
        {/* Decorative pattern */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `radial-gradient(circle, ${T.primary} 1px, transparent 1px)`,
            backgroundSize: "24px 24px",
          }} />

        <div className="relative max-w-2xl mx-auto px-4 py-6 flex items-center gap-5">
          {/* Logo */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="w-20 h-20 rounded-2xl overflow-hidden border-2 flex-shrink-0 shadow-lg"
            style={{ borderColor: `${T.gold}60`, boxShadow: `0 8px 24px ${T.gold}20` }}
          >
            <img src={tasaliLogo} alt="تسالي كرومش" className="w-full h-full object-cover" />
          </motion.div>

          {/* Text */}
          <motion.div
            initial={{ x: dir === "rtl" ? 20 : -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="flex-1 min-w-0"
          >
            <p className="text-xs font-black tracking-[0.25em] uppercase mb-1" style={{ color: T.gold }}>
              {tc("قائمة الطعام", "Our Menu")}
            </p>
            <h1 className="text-2xl font-black leading-tight" style={{ color: T.primary }}>
              تسالي كرومش
            </h1>
            <p className="text-xs mt-0.5 font-medium" style={{ color: T.textMuted }}>
              TASALI QURUMSH
            </p>

            {/* Info row */}
            <div className="flex flex-wrap items-center gap-3 mt-2.5 text-xs" style={{ color: T.textMuted }}>
              <a href={MAPS_URL} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 hover:opacity-70 transition-opacity"
                data-testid="link-hero-maps">
                <MapPin className="w-3 h-3 flex-shrink-0" style={{ color: T.gold }} />
                <span>{tc("عرض الموقع", "View Location")}</span>
              </a>
              <a href={PHONE_HREF}
                className="flex items-center gap-1 hover:opacity-70 transition-opacity"
                data-testid="link-hero-phone">
                <Phone className="w-3 h-3 flex-shrink-0" style={{ color: T.gold }} />
                <span dir="ltr">{PHONE}</span>
              </a>
              {!storeOpen && (
                <span className="flex items-center gap-1 text-red-500 font-semibold">
                  <Clock className="w-3 h-3" />
                  {tc("مغلق الآن", "Closed Now")}
                </span>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          CATEGORY TABS
      ══════════════════════════════════════════════ */}
      <div className="sticky z-30" style={{ top: showSearch ? "88px" : "56px" }}>
        <div className="border-b" style={{ background: T.headerBg, backdropFilter: "blur(16px)", borderColor: T.border }}>
          <div className="px-3 py-2.5 max-w-2xl mx-auto">
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {categories.map(cat => {
                const Icon = cat.icon;
                const active = selectedCategory === cat.id;
                return (
                  <motion.button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    whileTap={{ scale: 0.94 }}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-bold transition-all border"
                    style={{
                      background: active ? T.catActive : T.catInactive,
                      borderColor: active ? T.catActive : "transparent",
                      color: active ? "#fff" : T.textMuted,
                      boxShadow: active ? `0 2px 10px ${T.primary}30` : "none",
                    }}
                    data-testid={`button-category-${cat.id}`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {i18n.language === "ar" ? cat.nameAr : cat.nameEn}
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          PRODUCTS GRID
      ══════════════════════════════════════════════ */}
      <div className="max-w-2xl mx-auto px-3 pt-5 pb-28">

        {/* Count row */}
        <div className="flex items-center justify-between mb-4 px-1">
          <p className="text-xs font-bold" style={{ color: T.textLight }}>
            {filteredItems.length} {tc("صنف", "items")}
          </p>
          <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: T.gold }}>
            <Star className="w-3 h-3" />
            {tc("أصنافنا المميزة", "Our Specialties")}
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="text-center py-24">
            <Utensils className="w-12 h-12 mx-auto mb-4" style={{ color: T.textLight }} />
            <p className="font-bold text-sm" style={{ color: T.textMuted }}>
              {tc("لا توجد أصناف في هذه الفئة", "No items in this category")}
            </p>
          </div>
        ) : (
          <ProductGrid
            items={filteredItems}
            maxSales={maxSales}
            dir={dir}
            onSelect={setSelectedItem}
            lang={i18n.language}
            tc={tc}
          />
        )}

        {/* Footer */}
        <div className="pt-10 pb-4">
          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px" style={{ background: T.border }} />
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: T.gold }} />
            <div className="flex-1 h-px" style={{ background: T.border }} />
          </div>

          {/* Links */}
          <div className="flex items-center justify-center gap-6 text-xs mb-4" style={{ color: T.textMuted }}>
            <a href={PHONE_HREF}
              className="flex items-center gap-1.5 hover:opacity-70 transition-opacity font-medium"
              data-testid="link-footer-call">
              <Phone className="w-3.5 h-3.5" style={{ color: T.gold }} />
              <span dir="ltr">{PHONE}</span>
            </a>
            <a href={MAPS_URL} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:opacity-70 transition-opacity font-medium"
              data-testid="link-footer-maps">
              <MapPin className="w-3.5 h-3.5" style={{ color: T.gold }} />
              {tc("موقعنا", "Location")}
            </a>
          </div>

          <p className="text-center text-[11px] mb-4" style={{ color: T.textLight }}>
            {tc("جميع الأسعار شاملة ضريبة القيمة المضافة ١٥٪", "All prices include 15% VAT")}
          </p>

          <div className="text-center">
            <a href={QIROX_URL} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[11px] font-bold hover:opacity-80 transition-opacity"
              style={{ color: T.textLight }}
              data-testid="link-qirox-studio">
              Powered by <span className="font-black tracking-wider" style={{ color: T.gold }}>QIROX STUDIO</span>
            </a>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          ITEM DETAIL MODAL
      ══════════════════════════════════════════════ */}
      <AnimatePresence>
        {selectedItem && (
          <ItemDetailModal
            item={selectedItem}
            dir={dir}
            lang={i18n.language}
            tc={tc}
            maxSales={maxSales}
            onClose={() => setSelectedItem(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   PRODUCT GRID — 2-col cards with featured hero cards
══════════════════════════════════════════════════════════ */
function ProductGrid({ items, maxSales, dir, onSelect, lang, tc }: {
  items: CoffeeItem[];
  maxSales: number;
  dir: string;
  lang: string;
  onSelect: (item: CoffeeItem) => void;
  tc: (ar: string, en: string) => string;
}) {
  // Every 5th card is a featured full-width hero
  const featuredIndexes = new Set(items.map((_, i) => i).filter(i => i % 5 === 0));

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const name    = lang === "ar" ? item.nameAr : (item as any).nameEn || item.nameAr;
        const nameAlt = lang === "ar" ? (item as any).nameEn : item.nameAr;
        const price   = typeof item.price === "number" ? item.price : parseFloat(String(item.price) || "0");
        const sales   = (item as any).salesCount || 0;
        const isBest  = sales > 0 && maxSales > 0 && sales >= maxSales * 0.6;
        const isNew   = (item as any).isNewProduct === 1;
        const avail   = item.isAvailable !== 0;
        const desc    = (item as any).description || (item as any).descriptionAr || "";

        if (featuredIndexes.has(index)) {
          // ── Featured hero card ──
          return (
            <motion.button
              key={(item as any).id || index}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: Math.min(index * 0.04, 0.5) }}
              whileHover={{ y: -2 }}
              onClick={() => onSelect(item)}
              className="w-full text-start rounded-2xl overflow-hidden group"
              style={{
                background: T.card,
                border: `1px solid ${T.cardBorder}`,
                boxShadow: T.cardShadow,
              }}
              data-testid={`card-featured-${(item as any).id}`}
            >
              {/* Image */}
              <div className="relative overflow-hidden" style={{ height: 200 }}>
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    onError={e => {
                      const img = e.target as HTMLImageElement;
                      img.style.display = "none";
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"
                    style={{ background: `linear-gradient(135deg, ${T.cream}, ${T.creamDeep})` }}>
                    <img src={tasaliLogo} alt={name} className="w-16 h-16 object-contain opacity-30" />
                  </div>
                )}
                {/* Bottom gradient */}
                <div className="absolute inset-x-0 bottom-0 h-20"
                  style={{ background: `linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 100%)` }} />

                {/* Badges top */}
                <div className={`absolute top-3 ${dir === "rtl" ? "right-3" : "left-3"} flex gap-1.5`}>
                  {isBest && (
                    <span className="text-[10px] font-black px-2.5 py-1 rounded-full shadow-sm"
                      style={{ background: T.gold, color: "#fff" }}>
                      ⭐ {tc("الأكثر طلباً", "Best Seller")}
                    </span>
                  )}
                  {isNew && (
                    <span className="text-[10px] font-black px-2.5 py-1 rounded-full shadow-sm bg-emerald-500 text-white">
                      ✨ {tc("جديد", "New")}
                    </span>
                  )}
                </div>

                {/* Price overlay */}
                <div className={`absolute bottom-3 ${dir === "rtl" ? "left-3" : "right-3"} flex items-baseline gap-1`}>
                  <span className="text-xl font-black text-white drop-shadow-sm">
                    {isNaN(price) ? "—" : price.toFixed(2)}
                  </span>
                  <span className="text-xs text-white/80 font-bold"><SarIcon /></span>
                </div>

                {/* Unavailable */}
                {!avail && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                    <span className="text-sm font-bold text-white border border-white/30 px-4 py-2 rounded-xl backdrop-blur">
                      {tc("غير متوفر", "Unavailable")}
                    </span>
                  </div>
                )}
              </div>

              {/* Text */}
              <div className="px-4 py-3 flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black tracking-widest uppercase mb-0.5" style={{ color: T.gold }}>
                    {tc("مميز", "Featured")}
                  </p>
                  <h2 className="font-black text-lg leading-snug truncate" style={{ color: T.text }}>{name}</h2>
                  {nameAlt && nameAlt !== name && (
                    <p className="text-xs mt-0.5 truncate" style={{ color: T.textLight }}>{nameAlt}</p>
                  )}
                  {desc && (
                    <p className="text-xs mt-1 line-clamp-2 leading-relaxed" style={{ color: T.textMuted }}>{desc}</p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 flex-shrink-0 mt-1 opacity-30" style={{
                  transform: dir === "rtl" ? "rotate(180deg)" : undefined,
                }} />
              </div>
            </motion.button>
          );
        }

        return null; // Regular items handled below
      })}

      {/* 2-column grid for regular items */}
      {(() => {
        const regular = items.filter((_, i) => !featuredIndexes.has(i));
        const pairs: CoffeeItem[][] = [];
        for (let i = 0; i < regular.length; i += 2) pairs.push(regular.slice(i, i + 2));
        return pairs.map((pair, pi) => (
          <div key={pi} className="grid grid-cols-2 gap-3">
            {pair.map((item, qi) => {
              const name   = lang === "ar" ? item.nameAr : (item as any).nameEn || item.nameAr;
              const price  = typeof item.price === "number" ? item.price : parseFloat(String(item.price) || "0");
              const sales  = (item as any).salesCount || 0;
              const isBest = sales > 0 && maxSales > 0 && sales >= maxSales * 0.6;
              const isNew  = (item as any).isNewProduct === 1;
              const avail  = item.isAvailable !== 0;
              return (
                <motion.button
                  key={(item as any).id || qi}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: Math.min((pi * 2 + qi) * 0.05, 0.6) }}
                  whileHover={{ y: -3, boxShadow: T.cardShadowHover }}
                  onClick={() => onSelect(item)}
                  className="text-start overflow-hidden rounded-2xl group"
                  style={{
                    background: T.card,
                    border: `1px solid ${T.cardBorder}`,
                    boxShadow: T.cardShadow,
                  }}
                  data-testid={`card-product-${(item as any).id}`}
                >
                  {/* Image */}
                  <div className="relative overflow-hidden" style={{ aspectRatio: "1/1" }}>
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-600"
                        onError={e => {
                          const img = e.target as HTMLImageElement;
                          img.style.display = "none";
                          (img.nextElementSibling as HTMLElement)?.classList.remove("hidden");
                        }}
                      />
                    ) : null}
                    <div className={`${item.imageUrl ? "hidden" : ""} w-full h-full flex items-center justify-center`}
                      style={{ background: `linear-gradient(135deg, ${T.cream}, ${T.creamDeep})` }}>
                      <img src={tasaliLogo} alt={name} className="w-10 h-10 object-contain opacity-25" />
                    </div>

                    {/* Badges */}
                    {(isBest || isNew) && (
                      <div className={`absolute top-2 ${dir === "rtl" ? "right-2" : "left-2"} flex flex-col gap-1`}>
                        {isBest && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-sm whitespace-nowrap"
                            style={{ background: T.gold, color: "#fff" }}>
                            ⭐ {tc("الأكثر", "Best")}
                          </span>
                        )}
                        {isNew && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-sm whitespace-nowrap bg-emerald-500 text-white">
                            ✨ {tc("جديد", "New")}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Unavailable */}
                    {!avail && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <span className="text-[11px] font-bold text-white border border-white/30 px-2 py-1 rounded-lg">
                          {tc("نفذ", "Sold Out")}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-2.5 space-y-0.5">
                    <h3 className="font-black text-[13px] leading-snug line-clamp-2" style={{ color: T.text }}>{name}</h3>
                    <div className="flex items-baseline gap-1 pt-0.5">
                      <span className="text-sm font-black" style={{ color: T.gold }}>
                        {isNaN(price) ? "—" : price.toFixed(2)}
                      </span>
                      <span className="text-[10px] font-bold" style={{ color: T.gold }}><SarIcon /></span>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        ));
      })()}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   ITEM DETAIL MODAL — immersive overlay
══════════════════════════════════════════════════════════ */
function ItemDetailModal({ item, dir, lang, tc, maxSales, onClose }: {
  item: CoffeeItem;
  dir: string;
  lang: string;
  tc: (ar: string, en: string) => string;
  maxSales: number;
  onClose: () => void;
}) {
  const name    = lang === "ar" ? item.nameAr : (item as any).nameEn || item.nameAr;
  const nameAlt = lang === "ar" ? (item as any).nameEn : item.nameAr;
  const price   = typeof item.price === "number" ? item.price : parseFloat(String(item.price) || "0");
  const sales   = (item as any).salesCount || 0;
  const isBest  = sales > 0 && maxSales > 0 && sales >= maxSales * 0.6;
  const isNew   = (item as any).isNewProduct === 1;
  const avail   = item.isAvailable !== 0;
  const desc    = (item as any).description || (item as any).descriptionAr || (item as any).descriptionEn || "";
  const category = (item as any).categoryNameAr || (item as any).category || "";

  // Lock scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: T.bg }}
      dir={dir}
    >
      {/* Image — top section */}
      <div className="relative flex-shrink-0 overflow-hidden bg-black" style={{ height: "55vw", maxHeight: 320, minHeight: 220 }}>
        {item.imageUrl ? (
          <motion.img
            src={item.imageUrl}
            alt={name}
            initial={{ scale: 1.06 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="w-full h-full object-cover"
            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${T.cream}, ${T.creamDeep})` }}>
            <img src={tasaliLogo} alt={name} className="w-24 h-24 object-contain opacity-30" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-20"
          style={{ background: `linear-gradient(to top, ${T.bg}, transparent)` }} />
        <div className="absolute inset-x-0 top-0 h-14"
          style={{ background: `linear-gradient(to bottom, rgba(0,0,0,0.35), transparent)` }} />

        {/* Close */}
        <motion.button
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          onClick={onClose}
          className="absolute top-4 flex items-center justify-center w-10 h-10 rounded-2xl backdrop-blur"
          style={{
            [dir === "rtl" ? "right" : "left"]: "1rem",
            background: "rgba(0,0,0,0.45)",
            border: "1px solid rgba(255,255,255,0.2)",
          }}
          data-testid="button-close-item-modal"
        >
          <ArrowLeft className={`w-5 h-5 text-white ${dir === "rtl" ? "rotate-180" : ""}`} />
        </motion.button>

        {/* Unavailable */}
        {!avail && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <span className="text-white font-bold text-lg border border-white/30 px-6 py-3 rounded-2xl backdrop-blur">
              {tc("غير متوفر حالياً", "Currently Unavailable")}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.45, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="flex-1 overflow-y-auto px-5 pt-3 pb-32 space-y-4"
        style={{ color: T.text }}
      >
        {/* Badges */}
        {(isBest || isNew) && (
          <div className="flex gap-2">
            {isBest && (
              <span className="text-[11px] font-black px-3 py-1 rounded-full"
                style={{ background: T.gold, color: "#fff" }}>
                ⭐ {tc("الأكثر طلباً", "Best Seller")}
              </span>
            )}
            {isNew && (
              <span className="text-[11px] font-black px-3 py-1 rounded-full bg-emerald-500 text-white">
                ✨ {tc("جديد", "New")}
              </span>
            )}
          </div>
        )}

        {/* Category */}
        {category && (
          <p className="text-xs font-black tracking-widest uppercase" style={{ color: T.gold }}>
            {category}
          </p>
        )}

        {/* Name */}
        <div>
          <h2 className="text-3xl font-black leading-tight" style={{ color: T.text }}>{name}</h2>
          {nameAlt && nameAlt !== name && (
            <p className="text-base mt-1 font-medium" style={{ color: T.textMuted }}>{nameAlt}</p>
          )}
        </div>

        {/* Description */}
        {desc && (
          <p className="text-sm leading-relaxed" style={{ color: T.textMuted }}>{desc}</p>
        )}

        {/* Divider */}
        <div className="h-px" style={{ background: T.border }} />

        {/* Price block */}
        <div className="flex items-center justify-between rounded-2xl p-4 border"
          style={{ background: T.cream, borderColor: T.cardBorder }}>
          <div>
            <p className="text-xs font-bold mb-1" style={{ color: T.textLight }}>
              {tc("السعر شامل الضريبة", "Price incl. VAT")}
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-4xl font-black" style={{ color: T.gold }}>
                {isNaN(price) ? "—" : price.toFixed(2)}
              </span>
              <span className="text-lg font-bold" style={{ color: T.gold }}>
                <SarIcon />
              </span>
            </div>
          </div>
          <div className={dir === "rtl" ? "text-left" : "text-right"}>
            <p className="text-[10px] font-black tracking-widest mb-1" style={{ color: T.textLight }}>
              {tc("مشمول", "INCLUDED")}
            </p>
            <p className="text-xs font-bold" style={{ color: T.textMuted }}>
              {tc("ض.ق.م ١٥٪", "VAT 15%")}
            </p>
          </div>
        </div>

        {/* Sales */}
        {sales > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5">
              {[...Array(Math.min(5, Math.ceil(sales / 10)))].map((_, i) => (
                <Star key={i} className="w-3.5 h-3.5 fill-current" style={{ color: T.gold }} />
              ))}
            </div>
            <p className="text-xs font-bold" style={{ color: T.textMuted }}>
              {tc(`طُلب ${sales} مرة`, `Ordered ${sales} times`)}
            </p>
          </div>
        )}
      </motion.div>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 inset-x-0 p-4 pointer-events-none"
        style={{ background: `linear-gradient(to top, ${T.bg} 70%, transparent)` }}>
        <motion.a
          href={PHONE_HREF}
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="flex items-center justify-center gap-2.5 w-full py-4 rounded-2xl font-black text-white text-sm pointer-events-auto"
          style={{
            background: `linear-gradient(135deg, ${T.primary}, ${T.gold})`,
            boxShadow: `0 8px 24px ${T.gold}35`,
            maxWidth: 480,
            margin: "0 auto",
          }}
          data-testid="button-call-to-order-modal"
        >
          <Phone className="w-4 h-4" />
          {tc("اتصل للطلب الآن", "Call to Order Now")} — {PHONE}
        </motion.a>
      </div>
    </motion.div>
  );
}
