import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Phone, Navigation, CheckCircle2, Coffee, Star } from "lucide-react";
import { useBranch } from "@/contexts/BranchContext";
import { useTranslation } from "react-i18next";
import { brand } from "@/lib/brand";
import logoSrc from "@assets/qirox-logo-customer.png";
import AppleMap from "@/components/apple-map";

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function BranchSelectorModal() {
  const { branches, showBranchSelector, selectBranch, selectedBranchId } = useBranch();
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";

  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  const stripRef = useRef<HTMLDivElement>(null);
  const dragStartX = useRef<number | null>(null);
  const isDragging = useRef(false);

  useEffect(() => {
    if (!showBranchSelector) return;
    setGeoLoading(true);
    navigator.geolocation?.getCurrentPosition(
      pos => {
        setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoLoading(false);
      },
      () => setGeoLoading(false),
      { timeout: 5000 }
    );
  }, [showBranchSelector]);

  const branchesWithDist = branches
    .filter(b => (b.isActive !== 0 && b.isActive !== false) || b.isActive === undefined)
    .map(b => ({
      ...b,
      dist:
        userCoords && b.location?.lat && b.location?.lng
          ? haversineKm(userCoords.lat, userCoords.lng, b.location.lat, b.location.lng)
          : null,
    }))
    .sort((a, b) => {
      if (a.dist !== null && b.dist !== null) return a.dist - b.dist;
      if (a.dist !== null) return -1;
      if (b.dist !== null) return 1;
      return 0;
    });

  // Auto-focus the currently selected branch
  useEffect(() => {
    if (!showBranchSelector || branchesWithDist.length === 0) return;
    const selIdx = branchesWithDist.findIndex(b => b.id === selectedBranchId);
    setActiveIdx(selIdx >= 0 ? selIdx : 0);
  }, [showBranchSelector, branchesWithDist.length]);

  const activeBranch = branchesWithDist[activeIdx];
  const focusedLat = activeBranch?.location?.lat;
  const focusedLng = activeBranch?.location?.lng;

  const goTo = (idx: number) => {
    const clamped = Math.max(0, Math.min(branchesWithDist.length - 1, idx));
    setActiveIdx(clamped);
    // Scroll the card strip
    if (stripRef.current) {
      const cardWidth = stripRef.current.offsetWidth * 0.78 + 12;
      stripRef.current.scrollTo({ left: clamped * cardWidth, behavior: "smooth" });
    }
  };

  const handleSelect = (branchId: string) => {
    setSelecting(branchId);
    setTimeout(() => {
      selectBranch(branchId);
      setSelecting(null);
    }, 500);
  };

  // Touch/mouse drag handlers on the strip
  const onPointerDown = (e: React.PointerEvent) => {
    dragStartX.current = e.clientX;
    isDragging.current = false;
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (dragStartX.current === null) return;
    const diff = e.clientX - dragStartX.current;
    if (Math.abs(diff) > 40) {
      isDragging.current = true;
      // RTL: swipe left = next, swipe right = prev (reversed for LTR)
      if (diff < 0) goTo(activeIdx + (isAr ? -1 : 1));
      else goTo(activeIdx + (isAr ? 1 : -1));
    }
    dragStartX.current = null;
  };

  if (!showBranchSelector) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex flex-col"
        style={{
          fontFamily: "'IBM Plex Sans Arabic','Tajawal',sans-serif",
          background: "#0d0d0d",
        }}
        dir={isAr ? "rtl" : "ltr"}
      >

        {/* ── COMPACT HEADER ─────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="absolute top-0 inset-x-0 z-10 flex items-center gap-3 px-4 pt-10 pb-3"
          style={{
            background: "linear-gradient(to bottom, rgba(13,13,13,0.97) 60%, transparent 100%)",
          }}
        >
          <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center flex-shrink-0">
            <img src={logoSrc} alt={brand.nameAr} className="w-6 h-6 object-contain" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-white text-sm font-black leading-tight">
              {isAr ? "اختر فرعك" : "Choose Your Branch"}
            </h1>
            <p className="text-white/40 text-[11px] leading-tight">
              {isAr ? "اسحب يمين أو يسار للتنقل بين الفروع" : "Swipe to browse branches"}
            </p>
          </div>
          {geoLoading && (
            <div className="flex items-center gap-1 text-primary/70 text-[11px] flex-shrink-0">
              <Navigation className="w-3 h-3 animate-pulse" />
              <span>{isAr ? "تحديد الموقع..." : "Locating..."}</span>
            </div>
          )}
        </motion.div>

        {/* ── MAP — fills entire screen ──────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="absolute inset-0"
        >
          {focusedLat && focusedLng ? (
            <AppleMap
              key={activeBranch?.id}
              mode="view"
              center={{
                lat: focusedLat,
                lng: focusedLng,
                label: isAr ? activeBranch?.nameAr : (activeBranch?.nameEn || activeBranch?.nameAr),
              }}
              height="100%"
              showZoomControls={false}
              interactive={false}
              className="w-full h-full rounded-none"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[#0d0d0d] text-white/20 text-sm gap-2">
              <MapPin className="w-5 h-5" />
              <span>{isAr ? "الخريطة غير متاحة" : "Map unavailable"}</span>
            </div>
          )}

          {/* Dark gradient at bottom for strip readability */}
          <div
            className="absolute bottom-0 inset-x-0 pointer-events-none"
            style={{
              height: "55%",
              background: "linear-gradient(to top, rgba(13,13,13,1) 40%, rgba(13,13,13,0.7) 70%, transparent 100%)",
            }}
          />
        </motion.div>

        {/* ── BOTTOM STRIP ──────────────────────────────────────── */}
        <div className="absolute bottom-0 inset-x-0 flex flex-col gap-3 pb-8">

          {/* Dot indicators */}
          {branchesWithDist.length > 1 && (
            <div className="flex items-center justify-center gap-1.5">
              {branchesWithDist.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className="transition-all duration-300"
                  style={{
                    width: i === activeIdx ? 20 : 6,
                    height: 6,
                    borderRadius: 9999,
                    background: i === activeIdx ? "hsl(155 60% 38%)" : "rgba(255,255,255,0.25)",
                  }}
                />
              ))}
            </div>
          )}

          {/* Swipeable cards strip */}
          {branchesWithDist.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-white/30 gap-3">
              <Coffee className="w-8 h-8 opacity-30" />
              <span className="text-sm">{isAr ? "لا توجد فروع متاحة" : "No branches available"}</span>
            </div>
          ) : (
            <div
              ref={stripRef}
              className="flex gap-3 px-6 overflow-x-auto scrollbar-none snap-x snap-mandatory select-none"
              style={{ scrollbarWidth: "none" }}
              onPointerDown={onPointerDown}
              onPointerUp={onPointerUp}
            >
              {branchesWithDist.map((branch, idx) => {
                const name = isAr ? branch.nameAr : (branch.nameEn || branch.nameAr);
                const isSelecting = selecting === branch.id;
                const isCurrent = selectedBranchId === branch.id;
                const isActive = idx === activeIdx;
                const nearest = idx === 0 && branch.dist !== null;

                return (
                  <motion.div
                    key={branch.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + idx * 0.06 }}
                    className="flex-shrink-0 snap-center"
                    style={{ width: "78vw", maxWidth: 340 }}
                    onClick={() => {
                      if (!isDragging.current) {
                        goTo(idx);
                        handleSelect(branch.id);
                      }
                      isDragging.current = false;
                    }}
                  >
                    <div
                      className="rounded-2xl p-4 flex flex-col gap-3 transition-all duration-300 cursor-pointer active:scale-[0.98]"
                      style={{
                        background: isActive
                          ? "rgba(30,30,30,0.97)"
                          : "rgba(20,20,20,0.85)",
                        border: isActive
                          ? "1.5px solid hsl(155 60% 38% / 0.5)"
                          : "1.5px solid rgba(255,255,255,0.08)",
                        boxShadow: isActive
                          ? "0 4px 24px rgba(45,155,110,0.18)"
                          : "none",
                      }}
                    >
                      {/* Card top row */}
                      <div className="flex items-start gap-3">
                        <div
                          className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{
                            background: isSelecting || isCurrent
                              ? "hsl(155 60% 38% / 0.2)"
                              : "rgba(255,255,255,0.06)",
                            border: isActive
                              ? "1.5px solid hsl(155 60% 38% / 0.5)"
                              : "1.5px solid rgba(255,255,255,0.1)",
                          }}
                        >
                          {isSelecting ? (
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                              <CheckCircle2 className="w-5 h-5 text-primary" />
                            </motion.div>
                          ) : isCurrent ? (
                            <CheckCircle2 className="w-5 h-5 text-primary/80" />
                          ) : (
                            <Coffee className="w-4 h-4 text-white/40" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className="font-bold text-[15px] leading-tight"
                              style={{ color: isActive ? "hsl(155 60% 52%)" : "rgba(255,255,255,0.88)" }}
                            >
                              {name}
                            </span>
                            {nearest && (
                              <span className="flex items-center gap-0.5 text-[10px] bg-primary/20 border border-primary/30 text-primary rounded-full px-1.5 py-0.5 font-bold">
                                <Navigation className="w-2.5 h-2.5" />
                                {isAr ? "الأقرب" : "Nearest"}
                              </span>
                            )}
                            {isCurrent && !isSelecting && (
                              <span className="text-[10px] bg-white/10 text-white/50 rounded-full px-2 py-0.5 font-semibold">
                                {isAr ? "الحالي" : "Current"}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            {branch.address && (
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-white/30 flex-shrink-0" />
                                <span className="text-white/45 text-xs truncate max-w-[180px]">{branch.address}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Card bottom row */}
                      <div className="flex items-center justify-between pt-1"
                        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
                      >
                        <div className="flex items-center gap-3">
                          {branch.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-white/25 flex-shrink-0" />
                              <span className="text-white/35 text-xs" dir="ltr">{branch.phone}</span>
                            </div>
                          )}
                          {branch.dist !== null && (
                            <div className="flex items-center gap-1">
                              <Navigation className="w-3 h-3 text-primary/60" />
                              <span className="text-primary/70 text-xs font-semibold">
                                {branch.dist! < 1
                                  ? `${Math.round(branch.dist! * 1000)} م`
                                  : `${branch.dist!.toFixed(1)} كم`}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Select button */}
                        <motion.button
                          whileTap={{ scale: 0.93 }}
                          className="text-[12px] font-bold px-3 py-1.5 rounded-xl transition-all"
                          style={{
                            background: isSelecting
                              ? "hsl(155 60% 38% / 0.3)"
                              : isCurrent
                              ? "rgba(255,255,255,0.08)"
                              : "hsl(155 60% 38%)",
                            color: isCurrent && !isSelecting ? "rgba(255,255,255,0.4)" : "#fff",
                          }}
                          data-testid={`button-branch-${branch.id}`}
                        >
                          {isSelecting
                            ? (isAr ? "جاري..." : "...")
                            : isCurrent
                            ? (isAr ? "محدد" : "Selected")
                            : (isAr ? "اختر" : "Select")}
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {/* trailing spacer */}
              <div className="flex-shrink-0 w-6" />
            </div>
          )}

          {/* Footer hint */}
          <div className="flex items-center justify-center gap-1.5 text-white/20 text-[11px]">
            <Star className="w-3 h-3" />
            <span>{isAr ? "يمكنك تغيير الفرع في أي وقت من المنيو" : "Change branch anytime from the menu"}</span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
