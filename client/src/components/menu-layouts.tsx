import type { ReactNode } from "react";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Star, Flame, Heart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CoffeeItem {
  id: string;
  nameAr: string;
  nameEn?: string;
  imageUrl?: string;
  imageUrls?: string[];
  price: number | string;
  description?: string;
  isAvailable?: boolean;
  isBestSeller?: boolean;
  isNew?: boolean;
}

interface MenuLayoutProps {
  items: CoffeeItem[];
  onAddItem: (item: CoffeeItem) => void;
  lang: string;
  currency: ReactNode;
  favoriteIds?: Set<string>;
  onToggleFavorite?: (itemId: string) => void;
}

function getItemName(item: CoffeeItem, lang: string) {
  return lang === "ar" ? item.nameAr : (item.nameEn || item.nameAr);
}

const itemMotion = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

const DEFAULT_IMG = "/blackrose-logo.png";
function imgClass(hasImage: boolean, extra = "") {
  return hasImage
    ? `w-full h-full object-cover ${extra}`
    : `w-full h-full object-contain p-2 ${extra}`;
}
function imgWrapClass(hasImage: boolean, extra = "") {
  return hasImage ? extra : `${extra} bg-[#1a1a1a]`;
}

function getImages(item: CoffeeItem): string[] {
  const urls = item.imageUrls && item.imageUrls.length > 0
    ? item.imageUrls
    : item.imageUrl
      ? [item.imageUrl]
      : [];
  return urls;
}

interface AutoImageSliderProps {
  item: CoffeeItem;
  className?: string;
  wrapperClassName?: string;
  intervalMs?: number;
  showDots?: boolean;
}

function AutoImageSlider({ item, className = "", wrapperClassName = "", intervalMs = 2500, showDots = true }: AutoImageSliderProps) {
  const images = getImages(item);
  const [idx, setIdx] = useState(0);
  const [direction, setDirection] = useState(1);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (images.length <= 1) return;
    timerRef.current = setInterval(() => {
      setDirection(1);
      setIdx(prev => (prev + 1) % images.length);
    }, intervalMs);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [images.length, intervalMs]);

  const hasImage = images.length > 0;
  const src = images[idx] || DEFAULT_IMG;

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? "60%" : "-60%", opacity: 0, scale: 0.92 }),
    center: { x: 0, opacity: 1, scale: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? "-60%" : "60%", opacity: 0, scale: 0.92 }),
  };

  return (
    <div className={`relative overflow-hidden ${imgWrapClass(hasImage, wrapperClassName)}`}>
      {images.length > 1 ? (
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.img
            key={src + idx}
            src={src}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
            className={imgClass(hasImage, className)}
            alt={item.nameAr}
            onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_IMG; }}
            style={{ position: "absolute", inset: 0 }}
          />
        </AnimatePresence>
      ) : (
        <img
          src={src}
          className={imgClass(hasImage, className)}
          alt={item.nameAr}
          onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_IMG; }}
        />
      )}

      {showDots && images.length > 1 && (
        <div className="absolute bottom-1.5 left-0 right-0 flex justify-center gap-1 z-10 pointer-events-none">
          {images.map((_, i) => (
            <span
              key={i}
              className={`rounded-full transition-all duration-300 ${
                i === idx
                  ? "w-3 h-1.5 bg-white shadow"
                  : "w-1.5 h-1.5 bg-white/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function ClassicMenuLayout({ items, onAddItem, lang, currency, favoriteIds, onToggleFavorite }: MenuLayoutProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <AnimatePresence mode="popLayout">
        {items.map((item) => {
          const isFav = favoriteIds?.has(item.id);
          return (
            <motion.div
              key={item.id}
              layout
              {...itemMotion}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="bg-card rounded-2xl border border-border p-3 flex gap-3 items-center shadow-sm cursor-pointer group"
              onClick={() => onAddItem(item)}
              data-testid={`card-menu-${item.id}`}
            >
              <AutoImageSlider
                item={item}
                wrapperClassName="w-20 h-20 rounded-xl flex-shrink-0 bg-secondary"
                className="group-hover:scale-110 transition-transform duration-500"
                showDots={false}
              />
              <div className="flex-1 min-w-0 py-1">
                <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                  <h3 className="text-base font-semibold truncate text-foreground">{getItemName(item, lang)}</h3>
                  {item.isBestSeller && <Badge className="bg-primary text-primary-foreground text-[9px] px-1.5 h-4"><Star className="w-2.5 h-2.5 ml-0.5" />الأكثر طلباً</Badge>}
                  {item.isNew && <Badge className="bg-green-500 text-white text-[9px] px-1.5 h-4">جديد</Badge>}
                </div>
                <p className="text-xs text-muted-foreground truncate mb-2">{item.description || "مشروب مميز"}</p>
                <div className="flex items-center justify-between">
                  <span className="text-primary font-bold text-lg">{item.price} <small className="text-xs font-normal text-muted-foreground">{currency}</small></span>
                  <div className="flex items-center gap-1">
                    {onToggleFavorite && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onToggleFavorite(item.id); }}
                        className="h-8 w-8 p-0 rounded-lg flex items-center justify-center hover:bg-red-50 transition-colors"
                        data-testid={`btn-fav-${item.id}`}
                      >
                        <Heart className={`w-4 h-4 ${isFav ? 'fill-red-500 text-red-500' : 'text-slate-400'}`} />
                      </button>
                    )}
                    <Button size="sm" className="h-8 w-8 p-0 rounded-lg bg-primary hover:bg-primary/90" onClick={(e) => { e.stopPropagation(); onAddItem(item); }} data-testid={`button-add-${item.id}`}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

export function CardsMenuLayout({ items, onAddItem, lang, currency, favoriteIds, onToggleFavorite }: MenuLayoutProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      <AnimatePresence mode="popLayout">
        {items.map((item) => {
          const isFav = favoriteIds?.has(item.id);
          return (
            <motion.div
              key={item.id}
              layout
              {...itemMotion}
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.97 }}
              className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm cursor-pointer group flex flex-col"
              onClick={() => onAddItem(item)}
              data-testid={`card-menu-${item.id}`}
            >
              <div className="relative aspect-square">
                <AutoImageSlider
                  item={item}
                  wrapperClassName="absolute inset-0 bg-secondary"
                  className="group-hover:scale-110 transition-transform duration-500"
                  showDots={true}
                />
                {item.isBestSeller && (
                  <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 z-10">
                    <Flame className="w-2.5 h-2.5" />الأكثر طلباً
                  </div>
                )}
                {item.isNew && (
                  <div className="absolute top-2 left-2 bg-green-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full z-10">جديد</div>
                )}
                {onToggleFavorite && (
                  <button
                    className="absolute bottom-2 left-2 w-7 h-7 rounded-full bg-white/90 flex items-center justify-center shadow-sm z-10"
                    onClick={(e) => { e.stopPropagation(); onToggleFavorite(item.id); }}
                    data-testid={`btn-fav-${item.id}`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-red-500 text-red-500' : 'text-slate-400'}`} />
                  </button>
                )}
              </div>
              <div className="p-3 flex flex-col flex-1">
                <h3 className="text-sm font-bold text-foreground leading-tight mb-1 line-clamp-2">{getItemName(item, lang)}</h3>
                <p className="text-[10px] text-muted-foreground line-clamp-2 flex-1 mb-2">{item.description || "مشروب مميز"}</p>
                <div className="flex items-center justify-between mt-auto">
                  <span className="text-primary font-black text-sm">{item.price} <span className="text-[9px] font-normal text-muted-foreground">{currency}</span></span>
                  <button
                    className="w-7 h-7 rounded-xl bg-primary hover:bg-primary/90 text-white flex items-center justify-center transition-all active:scale-90"
                    onClick={(e) => { e.stopPropagation(); onAddItem(item); }}
                    data-testid={`button-add-${item.id}`}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

export function ListMenuLayout({ items, onAddItem, lang, currency, favoriteIds, onToggleFavorite }: MenuLayoutProps) {
  return (
    <div className="space-y-2">
      <AnimatePresence mode="popLayout">
        {items.map((item) => {
          const isFav = favoriteIds?.has(item.id);
          return (
            <motion.div
              key={item.id}
              layout
              {...itemMotion}
              whileTap={{ scale: 0.99 }}
              className="bg-card rounded-xl border border-border flex items-center gap-3 px-3 py-2 cursor-pointer group hover:border-primary/40 hover:shadow-sm transition-all"
              onClick={() => onAddItem(item)}
              data-testid={`card-menu-${item.id}`}
            >
              <AutoImageSlider
                item={item}
                wrapperClassName="w-14 h-14 rounded-xl flex-shrink-0 bg-secondary"
                className="group-hover:scale-105 transition-transform duration-300"
                showDots={false}
                intervalMs={3000}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-sm font-semibold text-foreground truncate">{getItemName(item, lang)}</span>
                  {item.isBestSeller && <Badge className="bg-amber-100 text-amber-700 border-0 text-[9px] px-1 h-3.5"><Star className="w-2 h-2 ml-0.5" />الأكثر</Badge>}
                  {item.isNew && <Badge className="bg-green-100 text-green-700 border-0 text-[9px] px-1 h-3.5">جديد</Badge>}
                </div>
                <p className="text-[10px] text-muted-foreground truncate">{item.description || "مشروب مميز"}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {onToggleFavorite && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onToggleFavorite(item.id); }}
                    className="w-7 h-7 flex items-center justify-center hover:bg-red-50 rounded-lg transition-colors"
                    data-testid={`btn-fav-${item.id}`}
                  >
                    <Heart className={`w-4 h-4 ${isFav ? 'fill-red-500 text-red-500' : 'text-slate-400'}`} />
                  </button>
                )}
                <span className="text-primary font-black text-base whitespace-nowrap">{item.price} <span className="text-[9px] font-normal text-muted-foreground">{currency}</span></span>
                <button
                  className="w-8 h-8 rounded-xl bg-primary hover:bg-primary/90 text-white flex items-center justify-center flex-shrink-0 transition-all active:scale-90"
                  onClick={(e) => { e.stopPropagation(); onAddItem(item); }}
                  data-testid={`button-add-${item.id}`}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
