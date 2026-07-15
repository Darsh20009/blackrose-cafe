// ═══════════════════════════════════════════════════════════════════════════
//  TASALI QURUMSH — MASTER BRAND CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

export const brand = {

  // ───────────────────────────────────────────────────────────────────────
  //  SYSTEM IDENTITY
  // ───────────────────────────────────────────────────────────────────────

  nameEn: "TASALI QURUMSH",
  nameAr: "تسالي كرومش",
  shortNameEn: "TASALI",
  shortNameAr: "تسالي",
  platformNameEn: "TASALI QURUMSH SYSTEMS",
  platformNameAr: "تسالي كرومش سيستمز",
  taglineEn: "Crunchy Snacks Experience",
  taglineAr: "تجربة تسالي كرومش",
  descriptionEn: "Enjoy the finest crunchy snacks crafted with care. Order now from TASALI QURUMSH for an exceptional snack experience.",
  descriptionAr: "استمتع بأشهى تسالي كرومش المحضرة بعناية استثنائية من تسالي كرومش - اطلب الآن واستمتع بلحظات مميزة",
  keywords: "تسالي, قرمش, تسالي كرومش, TASALI QURUMSH, سناكس, وجبات خفيفة, كرومش, توصيل تسالي, طلب تسالي",


  // ───────────────────────────────────────────────────────────────────────
  //  LOGO & VISUAL ASSETS
  // ───────────────────────────────────────────────────────────────────────

  logoCustomer: "/logo.png",
  logoStaff: "/employee-logo.png",
  favicon: "/logo.png",
  appleTouchIcon: "/apple-touch-icon.png",
  logoAssetCustomer: "logo.png",
  logoAssetStaff: "employee-logo.png",
  logoEmailUrl: "https://raw.githubusercontent.com/Darsh20009/tasali-qurmash/main/client/public/logo.png",
  ogImageUrl: "/logo.png",


  // ───────────────────────────────────────────────────────────────────────
  //  COLORS — Tasali Qurumsh warm brown & golden palette
  // ───────────────────────────────────────────────────────────────────────

  colors: {
    primary: {
      h: 28,
      s: 65,
      l: 30,
      hex: "#7D3D0F",
    },
    primaryLight: {
      h: 35,
      s: 70,
      l: 45,
      hex: "#C17A2A",
    },
    background: {
      h: 30,
      s: 10,
      l: 96,
      hex: "#F5F0EA",
    },
    surface: {
      h: 30,
      s: 15,
      l: 92,
      hex: "#EDE5D8",
    },
    accent: {
      h: 38,
      s: 80,
      l: 55,
      hex: "#D4912A",
    },
  },


  // ───────────────────────────────────────────────────────────────────────
  //  PWA / MANIFEST SETTINGS
  // ───────────────────────────────────────────────────────────────────────

  themeColor: "#3D1F08",
  pwaBackgroundColor: "#F5F0EA",
  pwaDisplay: "standalone" as const,


  // ───────────────────────────────────────────────────────────────────────
  //  CONTACT & SOCIAL
  // ───────────────────────────────────────────────────────────────────────

  phone: "0537050013",
  phoneHref: "tel:0537050013",
  mapsUrl: "https://maps.app.goo.gl/AR47rGKS5QpWpRjv8",

  website: "tasaliqurmash.com.sa",
  websiteUrl: "https://www.tasaliqurmash.com.sa",
  emailNoReply: "noreply@tasaliqurmash.com.sa",
  emailSupport: "support@tasaliqurmash.com.sa",

  social: {
    instagram: "@tasaliqurmash",
    twitter: "@tasaliqurmash",
    snapchat: "@tasaliqurmash",
    tiktok: "@tasaliqurmash",
  },

  // ───────────────────────────────────────────────────────────────────────
  //  BUSINESS INFO
  // ───────────────────────────────────────────────────────────────────────

  commercialRegister: "7053737545",
  taxNumber: "",
  registrationNumber: "",
  saudiBusinessUrl: "",


  // ───────────────────────────────────────────────────────────────────────
  //  LOYALTY / POINTS PROGRAM
  // ───────────────────────────────────────────────────────────────────────

  pointsBrandEn: "TASALI Points",
  pointsBrandAr: "نقاط تسالي",

  cardBrandEn: "TASALI Card",
  cardBrandAr: "بطاقة تسالي",

  loyaltyTaglineEn: "TASALI QURUMSH Loyalty",
  loyaltyTaglineAr: "برنامج ولاء تسالي كرومش",


  // ───────────────────────────────────────────────────────────────────────
  //  AI ASSISTANT IDENTITY
  // ───────────────────────────────────────────────────────────────────────

  aiAssistantNameEn: "TASALI AI Assistant",
  aiAssistantNameAr: "مساعد تسالي الذكي",


  // ───────────────────────────────────────────────────────────────────────
  //  COPYRIGHT
  // ───────────────────────────────────────────────────────────────────────

  copyrightEn: `© ${new Date().getFullYear()} TASALI QURUMSH SYSTEMS. ALL RIGHTS RESERVED`,
  copyrightAr: `© ${new Date().getFullYear()} تسالي كرومش سيستمز - جميع الحقوق محفوظة`,

} as const;


// ═══════════════════════════════════════════════════════════════════════════
//  HELPER UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

export function hsl(color: { h: number; s: number; l: number }): string {
  return `${color.h} ${color.s}% ${color.l}%`;
}

export function hslFull(color: { h: number; s: number; l: number }): string {
  return `hsl(${color.h}, ${color.s}%, ${color.l}%)`;
}

export function applyBrandColors(): void {
  const root = document.documentElement;
  const { colors } = brand;

  root.style.setProperty("--primary", hsl(colors.primary));
  root.style.setProperty("--primary-light", hsl(colors.primaryLight));
  root.style.setProperty("--ring", hsl(colors.primary));
  root.style.setProperty("--success", hsl(colors.primary));

  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (themeColorMeta) {
    themeColorMeta.setAttribute("content", brand.themeColor);
  }
}

export function setPageTitle(pageTitle?: string): void {
  document.title = pageTitle
    ? `${pageTitle} | ${brand.nameEn}`
    : `${brand.nameEn} | ${brand.taglineEn}`;
}

export function getBrandName(lang: "ar" | "en" = "ar"): string {
  return lang === "ar" ? brand.nameAr : brand.nameEn;
}

export function getPlatformName(lang: "ar" | "en" = "ar"): string {
  return lang === "ar" ? brand.platformNameAr : brand.platformNameEn;
}

export function getTagline(lang: "ar" | "en" = "ar"): string {
  return lang === "ar" ? brand.taglineAr : brand.taglineEn;
}

export function getCopyright(lang: "ar" | "en" = "ar"): string {
  return lang === "ar" ? brand.copyrightAr : brand.copyrightEn;
}

export default brand;
