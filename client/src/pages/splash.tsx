import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import splashBg from "@assets/blackrose-banner-1.png";

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
      setTimeout(() => setLocation("/menu"), 400);
    }, 4000);
    return () => clearTimeout(timer);
  }, [setLocation]);

  if (shouldShow === false) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" dir="rtl">
      {/* Full-screen background image */}
      <div className="absolute inset-0">
        <img
          src={splashBg}
          alt="BLACK ROSE CAFE"
          className="w-full h-full object-cover"
        />
        {/* Dark gradient overlay — top and bottom */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/20 to-black/90" />
      </div>

      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, filter: "blur(8px)" }}
            transition={{ duration: 0.7 }}
            className="relative z-10 flex flex-col justify-between h-full px-6 py-12"
          >
            {/* Top — empty space to let the image breathe */}
            <div />

            {/* Bottom panel — business info */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.5 }}
              className="space-y-4"
            >
              {/* Divider */}
              <div className="w-full h-px bg-gradient-to-r from-transparent via-[#BE1845] to-transparent mb-4" />

              {/* Saudi Business Certification */}
              <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl px-5 py-4">
                <p className="text-[#BE1845] text-[10px] font-bold tracking-[0.2em] uppercase text-center mb-3">
                  Saudi Business Center Certification
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <div>
                    <p className="text-white/40 text-[9px]">السجل التجاري</p>
                    <p className="text-white text-xs font-mono font-semibold">4700114396</p>
                  </div>
                  <div className="text-left">
                    <p className="text-white/40 text-[9px]">الرقم الضريبي</p>
                    <p className="text-white text-xs font-mono font-semibold">312718675800003</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-white/40 text-[9px]">رقم التسجيل</p>
                    <p className="text-white text-xs font-mono font-semibold">311099187300003</p>
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
