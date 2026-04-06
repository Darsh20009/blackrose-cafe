import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import splashBg from "@assets/blackrose-banner-1.png";
import blackroseLogo from "@assets/blackrose-logo.png";

export default function SplashScreen() {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [shouldShow, setShouldShow] = useState<boolean | null>(null);

  useEffect(() => {
    const hasSeenSplash = localStorage.getItem("hasSeenSplash");
    if (hasSeenSplash) {
      setShouldShow(false);
      setLocation("/menu");
      return;
    }

    setShouldShow(true);
    localStorage.setItem("hasSeenSplash", "true");

    const timer = setTimeout(() => {
      setLoading(false);
      setTimeout(() => setLocation("/menu"), 500);
    }, 4000);
    return () => clearTimeout(timer);
  }, [setLocation]);

  if (shouldShow === null || shouldShow === false) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" dir="rtl">

      {/* Background image */}
      <div className="absolute inset-0">
        <img
          src={splashBg}
          alt="BLACK ROSE CAFE"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/50 to-black/95" />
      </div>

      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.6 }}
            className="relative z-10 flex flex-col h-full"
          >
            {/* ── CENTER: Logo + Brand ── */}
            <div className="flex-1 flex flex-col items-center justify-center px-6">

              {/* Logo */}
              <motion.div
                initial={{ opacity: 0, scale: 0.7, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.9, delay: 0.3, type: "spring", stiffness: 120 }}
                className="mb-6"
              >
                <div className="w-28 h-28 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl flex items-center justify-center p-3">
                  <img
                    src={blackroseLogo}
                    alt="Black Rose Cafe"
                    className="w-full h-full object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
              </motion.div>

              {/* Brand name */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
                className="text-center"
              >
                <h1 className="text-3xl font-black tracking-[0.25em] text-white uppercase mb-1">
                  BLACK ROSE
                </h1>
                <p className="text-[#BE1845] text-sm font-bold tracking-[0.4em] uppercase">
                  CAFE
                </p>
                <p className="text-white/50 text-xs mt-3 font-medium tracking-wide">
                  "قهوة تُقال وورد يُهدى"
                </p>
              </motion.div>
            </div>

            {/* ── BOTTOM: Business info + loading bar ── */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.8 }}
              className="px-6 pb-12 space-y-4"
            >
              {/* Divider */}
              <div className="w-full h-px bg-gradient-to-r from-transparent via-[#BE1845] to-transparent" />

              {/* Saudi Business Certification */}
              <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl px-5 py-4">
                <p className="text-[#BE1845] text-[10px] font-bold tracking-[0.2em] uppercase text-center mb-3">
                  Saudi Business Center Certification
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <div>
                    <p className="text-white/40 text-[9px]">السجل التجاري</p>
                    <p className="text-white text-xs font-mono font-semibold">1163184110</p>
                  </div>
                  <div className="text-left">
                    <p className="text-white/40 text-[9px]">الرقم الضريبي</p>
                    <p className="text-white text-xs font-mono font-semibold">312718675800003</p>
                  </div>
                </div>
                <p className="text-white/30 text-[9px] mt-3 text-center">
                  جميع الأسعار تشمل ضريبة القيمة المضافة
                </p>
                <div className="text-center mt-1">
                  <a
                    href="https://qr.saudibusiness.gov.sa/viewcr?nCrNumber=opQsRLgqEFrL8PpAgImEew=="
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#BE1845]/70 text-[9px] underline underline-offset-2"
                  >
                    التحقق من السجل التجاري ↗
                  </a>
                </div>
              </div>

              {/* Copyright */}
              <p className="text-white/30 text-[9px] tracking-wider text-center">
                © 2026 BLACK ROSE SYSTEMS . ALL RIGHTS RESERVED
              </p>

              {/* Loading bar */}
              <div className="w-full h-0.5 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 3.5, delay: 0.5, ease: "easeInOut" }}
                  className="h-full bg-gradient-to-r from-[#BE1845] to-[#E85F83] rounded-full"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
