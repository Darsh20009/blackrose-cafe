import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import blackroseLogo from "@assets/blackrose-logo.png";

export default function SplashScreen() {
  const [, setLocation] = useLocation();
  const [visible, setVisible] = useState<boolean | null>(null);

  useEffect(() => {
    if (localStorage.getItem("hasSeenSplash")) {
      setVisible(false);
      setLocation("/menu");
      return;
    }
    setVisible(true);
    localStorage.setItem("hasSeenSplash", "true");
    const t = setTimeout(() => setLocation("/menu"), 2800);
    return () => clearTimeout(t);
  }, [setLocation]);

  if (visible === null || visible === false) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="splash"
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black"
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, type: "spring", stiffness: 140, damping: 14 }}
          className="mb-7"
        >
          <div className="w-32 h-32 rounded-3xl bg-white/10 backdrop-blur-md border border-white/15 shadow-2xl flex items-center justify-center p-4">
            <img
              src={blackroseLogo}
              alt="Black Rose Cafe"
              className="w-full h-full object-contain"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
        </motion.div>

        {/* Brand */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mb-8"
        >
          <h1 className="text-2xl font-black tracking-[0.3em] text-white uppercase">
            BLACK ROSE
          </h1>
          <p className="text-[#BE1845] text-xs font-bold tracking-[0.45em] uppercase mt-0.5">
            CAFE
          </p>
        </motion.div>

        {/* Bouncing dots */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="flex items-center gap-2"
        >
          {[0, 150, 300].map((delay) => (
            <div
              key={delay}
              className="w-2 h-2 rounded-full bg-[#BE1845] animate-bounce"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
