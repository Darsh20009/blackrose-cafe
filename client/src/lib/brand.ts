// ═══════════════════════════════════════════════════════════════════════════
//  ██████╗ ██╗      █████╗  ██████╗██╗  ██╗    ██████╗  ██████╗ ███████╗███████╗
//  ██╔══██╗██║     ██╔══██╗██╔════╝██║ ██╔╝    ██╔══██╗██╔═══██╗██╔════╝██╔════╝
//  ██████╔╝██║     ███████║██║     █████╔╝     ██████╔╝██║   ██║███████╗█████╗
//  ██╔══██╗██║     ██╔══██║██║     ██╔═██╗     ██╔══██╗██║   ██║╚════██║██╔══╝
//  ██████╔╝███████╗██║  ██║╚██████╗██║  ██╗    ██║  ██║╚██████╔╝███████║███████╗
//  ╚═════╝ ╚══════╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝   ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚══════╝
//
// Client-side default brand values for components that import this module.
// This is not yet the only brand source: tenant settings, directly imported
// assets, public files, and server email templates also contain brand values.
// Updating this module alone does not complete a tenant-wide rebrand.
// ═══════════════════════════════════════════════════════════════════════════

export const brand = {

  // ───────────────────────────────────────────────────────────────────────
  //  SYSTEM IDENTITY
  // ───────────────────────────────────────────────────────────────────────

  /** Full system name in English — shown in headers, titles, receipts, emails */
  nameEn: "BLACK ROSE CAFE",

  /** Full system name in Arabic — shown in Arabic UI, receipts, notifications */
  nameAr: "بلاك روز كافيه",

  /** Short display name used in tight spaces (PWA label, browser tab) */
  shortNameEn: "BLACK ROSE",

  /** Short display name in Arabic */
  shortNameAr: "بلاك روز",

  /** Internal system/platform brand — shown in the admin/staff panel header */
  platformNameEn: "BLACK ROSE SYSTEMS",

  /** Internal platform name in Arabic */
  platformNameAr: "بلاك روز سيستمز",

  /** Tagline shown under the logo in customer-facing screens */
  taglineEn: "Luxury Coffee Experience",

  /** Tagline in Arabic */
  taglineAr: "تجربة قهوة فاخرة",

  /** One-line marketing description (used in meta tags, manifests) */
  descriptionEn: "Enjoy the finest luxury coffee crafted with care. Order now from BLACK ROSE CAFE for an exceptional coffee experience.",

  /** Arabic marketing description */
  descriptionAr: "استمتع بأرقى تجربة قهوة فاخرة محضرة بعناية استثنائية من بلاك روز كافيه - اطلب الآن واستمتع بلحظات استثنائية",

  /** Keywords for SEO meta tag */
  keywords: "قهوة فاخرة, BLACK ROSE CAFE, بلاك روز, coffee, cafe, كافيه, اسبريسو, لاتيه, كابتشينو, موكا, قهوة سعودية, طلب قهوة, توصيل قهوة, كافيه فاخر",


  // ───────────────────────────────────────────────────────────────────────
  //  LOGO & VISUAL ASSETS
  //  Paths are relative to /public in the web app
  //  Use @assets/... for imported assets in components
  // ───────────────────────────────────────────────────────────────────────

  /** Main customer-facing logo (used in customer app, receipts, loyalty card, QR cards) */
  logoCustomer: "/logo.png",

  /** Staff/employee portal logo (used in sidebars, login screens, employee app) */
  logoStaff: "/blackrose-staff-logo.png",

  /** Favicon (browser tab icon) */
  favicon: "/logo.png",

  /** Apple touch icon (iOS home screen) */
  appleTouchIcon: "/apple-touch-icon.png",

  /** Logo URL for imported asset (Vite @assets path) — used in TSX files with import */
  logoAssetCustomer: "blackrose-logo.png",

  /** Staff logo asset path */
  logoAssetStaff: "blackrose-staff-logo.png",

  /** Logo URL for email templates (must be absolute/public URL) */
  logoEmailUrl: "https://raw.githubusercontent.com/Darsh20009/blackrose-cafe/main/client/public/logo.png",

  /** Open Graph / social share image */
  ogImageUrl: "/logo.png",


  // ───────────────────────────────────────────────────────────────────────
  //  COLORS  — HSL format (H S% L%) for Tailwind CSS variable injection
  //  BLACK ROSE — deep black with crimson rose accent
  // ───────────────────────────────────────────────────────────────────────

  colors: {
    /** Primary brand color — deep crimson */
    primary: {
      h: 343,
      s: 80,
      l: 35,
      hex: "#9f1239",
    },

    /** Lighter primary variant (hover states) */
    primaryLight: {
      h: 347,
      s: 77,
      l: 50,
      hex: "#e11d48",
    },

    /** App background — pure white */
    background: {
      h: 0,
      s: 0,
      l: 100,
      hex: "#ffffff",
    },

    /** Card/surface color */
    surface: {
      h: 0,
      s: 0,
      l: 7,
      hex: "#111111",
    },

    /** Text accent (headings, active items) */
    accent: {
      h: 345,
      s: 75,
      l: 65,
      hex: "#E85F83",
    },
  },


  // ───────────────────────────────────────────────────────────────────────
  //  PWA / MANIFEST SETTINGS
  // ───────────────────────────────────────────────────────────────────────

  /** Theme color used by browser chrome */
  themeColor: "#9f1239",

  /** Background color shown while PWA is loading */
  pwaBackgroundColor: "#0a0a0a",

  /** App display mode */
  pwaDisplay: "standalone" as const,


  // ───────────────────────────────────────────────────────────────────────
  //  CONTACT & SOCIAL
  // ───────────────────────────────────────────────────────────────────────

  website: "blackrose.com.sa",
  websiteUrl: "https://www.blackrose.com.sa",

  emailNoReply: "noreply@blackrose.com.sa",
  emailSupport: "support@blackrose.com.sa",

  social: {
    instagram: "@blackrosecafe",
    twitter: "@blackrosecafe",
    snapchat: "@blackrosecafe",
    tiktok: "@blackrosecafe",
  },

  // ───────────────────────────────────────────────────────────────────────
  //  BUSINESS INFO
  // ───────────────────────────────────────────────────────────────────────

  commercialRegister: "1163184110",
  taxNumber: "312718675800003",
  registrationNumber: "1163184110",
  saudiBusinessUrl: "https://qr.saudibusiness.gov.sa/viewcr?nCrNumber=opQsRLgqEFrL8PpAgImEew==",


  // ───────────────────────────────────────────────────────────────────────
  //  LOYALTY / POINTS PROGRAM
  // ───────────────────────────────────────────────────────────────────────

  pointsBrandEn: "BLACK ROSE Points",
  pointsBrandAr: "نقاط بلاك روز",

  cardBrandEn: "BLACK ROSE Card",
  cardBrandAr: "بطاقة بلاك روز",

  loyaltyTaglineEn: "BLACK ROSE CAFE Loyalty",
  loyaltyTaglineAr: "برنامج ولاء بلاك روز",


  // ───────────────────────────────────────────────────────────────────────
  //  AI ASSISTANT IDENTITY
  // ───────────────────────────────────────────────────────────────────────

  aiAssistantNameEn: "BLACK ROSE AI Assistant",
  aiAssistantNameAr: "مساعد بلاك روز الذكي",


  // ───────────────────────────────────────────────────────────────────────
  //  COPYRIGHT
  // ───────────────────────────────────────────────────────────────────────

  copyrightEn: `© ${new Date().getFullYear()} BLACK ROSE SYSTEMS. ALL RIGHTS RESERVED`,
  copyrightAr: `© ${new Date().getFullYear()} بلاك روز سيستمز - جميع الحقوق محفوظة`,

} as const;


// ═══════════════════════════════════════════════════════════════════════════
//  HELPER UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

/** Returns a color as a CSS HSL string, e.g. "345 70% 42%" */
export function hsl(color: { h: number; s: number; l: number }): string {
  return `${color.h} ${color.s}% ${color.l}%`;
}

/** Returns full hsl() call, e.g. "hsl(345, 70%, 42%)" */
export function hslFull(color: { h: number; s: number; l: number }): string {
  return `hsl(${color.h}, ${color.s}%, ${color.l}%)`;
}

/**
 * Applies brand colors to CSS custom properties at runtime.
 * Call this once in your app entry point (main.tsx or App.tsx).
 */
export function applyBrandColors(): void {
  const root = document.documentElement;
  const { colors } = brand;

  root.style.setProperty("--primary", hsl(colors.primary));
  root.style.setProperty("--primary-light", hsl(colors.primaryLight));
  root.style.setProperty("--ring", hsl(colors.primary));
  root.style.setProperty("--accent", hsl(colors.accent));
  root.style.setProperty("--accent-foreground", "0 0% 100%");

  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (themeColorMeta) {
    themeColorMeta.setAttribute("content", brand.themeColor);
  }
}

/** Applies a persisted six-digit hex brand color to the app theme. */
export function applyPrimaryColor(hex: string): boolean {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return false;

  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const lightness = (max + min) / 2;
  let hue = 0;
  let saturation = 0;

  if (delta > 0) {
    saturation = lightness > 0.5
      ? delta / (2 - max - min)
      : delta / (max + min);
    switch (max) {
      case r: hue = ((g - b) / delta + (g < b ? 6 : 0)) / 6; break;
      case g: hue = ((b - r) / delta + 2) / 6; break;
      default: hue = ((r - g) / delta + 4) / 6; break;
    }
  }

  const h = Math.round(hue * 360);
  const s = Math.round(saturation * 100);
  const l = Math.round(lightness * 100);
  const primaryHsl = `${h} ${s}% ${l}%`;
  const lighterHsl = `${h} ${s}% ${Math.min(90, l + 15)}%`;
  const root = document.documentElement;
  root.style.setProperty("--primary", primaryHsl);
  root.style.setProperty("--primary-light", lighterHsl);
  root.style.setProperty("--ring", primaryHsl);

  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (themeColorMeta) themeColorMeta.setAttribute("content", hex);
  return true;
}

/**
 * Updates the browser tab title with the brand name.
 */
export function setPageTitle(pageTitle?: string): void {
  document.title = pageTitle
    ? `${pageTitle} | ${brand.nameEn}`
    : `${brand.nameEn} | ${brand.taglineEn}`;
}

/** Returns the full display name based on language preference */
export function getBrandName(lang: "ar" | "en" = "ar"): string {
  return lang === "ar" ? brand.nameAr : brand.nameEn;
}

/** Returns the platform name (used in staff/admin portals) */
export function getPlatformName(lang: "ar" | "en" = "ar"): string {
  return lang === "ar" ? brand.platformNameAr : brand.platformNameEn;
}

/** Returns the tagline */
export function getTagline(lang: "ar" | "en" = "ar"): string {
  return lang === "ar" ? brand.taglineAr : brand.taglineEn;
}

/** Returns copyright text */
export function getCopyright(lang: "ar" | "en" = "ar"): string {
  return lang === "ar" ? brand.copyrightAr : brand.copyrightEn;
}

export default brand;
