import { lazy, createElement } from "react";
import StubDriver from "./drivers/stub-driver";
import type { PaymentDriverDefinition, DriverId } from "./types";

const GeideaDriver = lazy(() => import("./drivers/geidea-driver"));
const CashDriver   = lazy(() => import("./drivers/cash-driver"));
const SimDriver    = lazy(() => import("./drivers/sim-driver"));

const stub = (
  id: DriverId,
  nameAr: string,
  nameEn: string,
  color: string,
  descriptionAr: string,
  region: "ksa" | "gcc" | "global" = "ksa",
): PaymentDriverDefinition => ({
  id, nameAr, nameEn, color,
  description: nameEn,
  descriptionAr,
  status: "coming_soon",
  region,
  Component: (props) => createElement(StubDriver, { ...props, config: { ...props.config, driverId: id } }),
});

export const PAYMENT_DRIVERS: PaymentDriverDefinition[] = [
  {
    id: "geidea",
    nameEn: "Geidea",
    nameAr: "جيدية",
    color: "#1B4FBB",
    textColor: "#ffffff",
    description: "Saudi payment terminal & online gateway — Mada, Visa, Mastercard, Apple Pay",
    descriptionAr: "بوابة Geidea السعودية — مدى، فيزا، ماستركارد، Apple Pay",
    status: "live",
    region: "ksa",
    configKeys: ["geideaMerchantPublicKey", "geideaMerchantKey"],
    Component: GeideaDriver,
  },
  {
    id: "cash",
    nameEn: "Cash",
    nameAr: "نقداً",
    color: "#16a34a",
    textColor: "#ffffff",
    description: "Accept cash payments at the counter",
    descriptionAr: "استلام المدفوعات النقدية عند الكاونتر",
    status: "live",
    region: "global",
    Component: CashDriver,
  },
  {
    id: "sim",
    nameEn: "Simulator",
    nameAr: "محاكاة الدفع",
    color: "#d97706",
    textColor: "#ffffff",
    description: "Simulated payment for testing — no real charges",
    descriptionAr: "محاكاة الدفع للاختبار — لا يُخصم مبلغ حقيقي",
    status: "live",
    region: "global",
    Component: SimDriver,
  },
  stub("mada",       "مدى",           "Mada Pay",       "#00A651", "الشبكة الوطنية السعودية للدفع بالبطاقات"),
  stub("stcpay",     "STC Pay",       "STC Pay",        "#7B2D8B", "محفظة STC الرقمية — مدفوعات بالجوال"),
  stub("alahli",     "البنك الأهلي",  "Al Ahli Bank",   "#006400", "جهاز POS البنك الأهلي التجاري"),
  stub("alrajhi",    "الراجحي",       "Al Rajhi Bank",  "#1a6b3c", "جهاز POS مصرف الراجحي"),
  stub("foodicspay", "Foodics Pay",   "Foodics Pay",    "#F05A28", "بوابة دفع فودكس المتكاملة مع الكاشير"),
  stub("neoleap",    "نيوليب",        "Neoleap",        "#1D3D72", "بوابة الدفع الرقمية من نيوليب"),
  stub("moyasar",    "ميسر",          "Moyasar",        "#FF6B35", "بوابة ميسر للدفع الإلكتروني السعودية"),
  stub("hyperpay",   "هايبر باي",     "HyperPay",       "#E63946", "بوابة دفع منطقة MENA", "gcc"),
  stub("tap",        "تاب",           "Tap Payments",   "#00ADB5", "بوابة الدفع الخليجية من تاب", "gcc"),
];

const driverMap = new Map<DriverId, PaymentDriverDefinition>(
  PAYMENT_DRIVERS.map(d => [d.id, d])
);

export function getDriver(id: DriverId): PaymentDriverDefinition | undefined {
  return driverMap.get(id);
}

export function getLiveDrivers(): PaymentDriverDefinition[] {
  return PAYMENT_DRIVERS.filter(d => d.status === "live");
}
