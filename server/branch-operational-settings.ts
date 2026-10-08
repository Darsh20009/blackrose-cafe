import { BranchModel, BusinessConfigModel } from "@shared/schema";
import { DELIVERY_FEE_SAR, DELIVERY_RADIUS_KM } from "@shared/delivery-policy";

const WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export type EffectiveBranchOperationalSettings = {
  isEmergencyClosed: boolean;
  storeHours: Record<string, any>;
  orderMethodsConfig: {
    enableDineIn: boolean;
    enableCarPickup: boolean;
    enableDelivery: boolean;
    enableScheduledPickup: boolean;
    enableTakeaway: boolean;
  };
  deliveryPolicy: { radiusKm: number; feeSar: number };
  enabledPaymentMethodIds: string[] | null;
  vatPercentage: number;
  serviceFeeEnabled: boolean;
  serviceFeeAmount: number;
  serviceFeeLowOrderThreshold: number;
  serviceFeeLowOrderAmount: number;
};

function toPlainObject(value: any): Record<string, any> {
  if (value instanceof Map) return Object.fromEntries(value);
  if (value && typeof value.toObject === "function") return value.toObject();
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function numberOr(value: unknown, fallback: number, min: number, max: number): number {
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : fallback;
}

export function isPrimaryDeliveryBranch(branch: any, businessConfig: any): boolean {
  const configuredId = String(businessConfig?.deliveryPolicy?.branchId || "").trim();
  const branchId = String(branch?.id || branch?._id || "").trim();
  if (configuredId) return configuredId === branchId;
  return /المروج/.test(`${branch?.nameAr || ""} ${branch?.nameEn || ""}`) ||
    /mur(?:u|oo?)j/i.test(String(branch?.nameEn || ""));
}

function defaultHours(): Record<string, any> {
  return Object.fromEntries(WEEKDAYS.map((day) => [
    day,
    { open: "00:00", close: "23:59", isOpen: true, isAlwaysOpen: true },
  ]));
}

export function resolveBranchOperationalSettings(
  businessConfig: any,
  branch?: any,
): EffectiveBranchOperationalSettings {
  const overrides = toPlainObject(branch?.operationalSettings);
  const globalOrderMethods = toPlainObject(businessConfig?.orderMethodsConfig);
  const branchOrderMethods = toPlainObject(overrides.orderMethodsConfig);
  const globalDeliveryPolicy = toPlainObject(businessConfig?.deliveryPolicy);
  const branchDeliveryPolicy = toPlainObject(overrides.deliveryPolicy);
  const isPrimaryDelivery = branch ? isPrimaryDeliveryBranch(branch, businessConfig) : false;
  const globalRadius = numberOr(globalDeliveryPolicy.radiusKm, DELIVERY_RADIUS_KM, 1, 200);
  const globalFee = numberOr(globalDeliveryPolicy.feeSar, DELIVERY_FEE_SAR, 0, 1000);
  const enabledPaymentMethodIds = Array.isArray(overrides.enabledPaymentMethodIds)
    ? [...new Set(overrides.enabledPaymentMethodIds.filter((id: unknown) => typeof id === "string"))]
    : null;

  return {
    isEmergencyClosed: overrides.isEmergencyClosed ?? Boolean(businessConfig?.isEmergencyClosed),
    storeHours: toPlainObject(overrides.storeHours ?? businessConfig?.storeHours).monday
      ? toPlainObject(overrides.storeHours ?? businessConfig?.storeHours)
      : defaultHours(),
    orderMethodsConfig: {
      enableDineIn: branchOrderMethods.enableDineIn ?? globalOrderMethods.enableDineIn ?? true,
      enableCarPickup: branchOrderMethods.enableCarPickup ?? globalOrderMethods.enableCarPickup ?? true,
      enableDelivery: branchOrderMethods.enableDelivery ?? globalOrderMethods.enableDelivery ?? true,
      enableScheduledPickup: branchOrderMethods.enableScheduledPickup ?? globalOrderMethods.enableScheduledPickup ?? true,
      enableTakeaway: branchOrderMethods.enableTakeaway ?? globalOrderMethods.enableTakeaway ?? true,
    },
    deliveryPolicy: {
      radiusKm: numberOr(branchDeliveryPolicy.radiusKm, isPrimaryDelivery ? DELIVERY_RADIUS_KM : globalRadius, 1, 200),
      feeSar: numberOr(branchDeliveryPolicy.feeSar, isPrimaryDelivery ? DELIVERY_FEE_SAR : globalFee, 0, 1000),
    },
    enabledPaymentMethodIds,
    vatPercentage: numberOr(overrides.vatPercentage, numberOr(businessConfig?.vatPercentage, 15, 0, 100), 0, 100),
    serviceFeeEnabled: overrides.serviceFeeEnabled ?? businessConfig?.serviceFeeEnabled ?? true,
    serviceFeeAmount: numberOr(overrides.serviceFeeAmount, numberOr(businessConfig?.serviceFeeAmount, 0.7, 0, 1000), 0, 1000),
    serviceFeeLowOrderThreshold: numberOr(overrides.serviceFeeLowOrderThreshold, numberOr(businessConfig?.serviceFeeLowOrderThreshold, 5, 0, 10000), 0, 10000),
    serviceFeeLowOrderAmount: numberOr(overrides.serviceFeeLowOrderAmount, numberOr(businessConfig?.serviceFeeLowOrderAmount, 0.35, 0, 1000), 0, 1000),
  };
}

export function isBranchOpenNow(
  settings: Pick<EffectiveBranchOperationalSettings, "isEmergencyClosed" | "storeHours">,
  timezone = "Asia/Riyadh",
  now = new Date(),
): boolean {
  if (settings.isEmergencyClosed) return false;
  const hours = toPlainObject(settings.storeHours);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const day = (parts.find((part) => part.type === "weekday")?.value || "Monday").toLowerCase();
  const hour = Number(parts.find((part) => part.type === "hour")?.value || 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value || 0);
  const currentMinutes = hour * 60 + minute;
  const dayIndex = WEEKDAYS.indexOf(day);

  const parseMinutes = (value: unknown, fallback: number) => {
    const match = /^(\d{1,2}):(\d{2})$/.exec(String(value || ""));
    if (!match) return fallback;
    const h = Number(match[1]);
    const m = Number(match[2]);
    return h <= 23 && m <= 59 ? h * 60 + m : fallback;
  };
  const isOpenDuringDay = (schedule: any, time: number, allowOvernightRemainder: boolean) => {
    if (!schedule?.isOpen) return false;
    if (schedule.isAlwaysOpen) return true;
    const opens = parseMinutes(schedule.open, 0);
    const closes = parseMinutes(schedule.close, 1439);
    if (opens === closes) return true;
    if (closes > opens) return time >= opens && time < closes;
    return allowOvernightRemainder ? time < closes : time >= opens || time < closes;
  };

  const today = hours[day];
  if (isOpenDuringDay(today, currentMinutes, false)) return true;
  if (dayIndex >= 0) {
    const previousDay = WEEKDAYS[(dayIndex + WEEKDAYS.length - 1) % WEEKDAYS.length];
    const previousSchedule = hours[previousDay];
    if (previousSchedule?.isOpen && !previousSchedule?.isAlwaysOpen) {
      const opens = parseMinutes(previousSchedule.open, 0);
      const closes = parseMinutes(previousSchedule.close, 1439);
      if (closes < opens && currentMinutes < closes) return true;
    }
  }
  return false;
}

export function validateBranchOrderOperations(
  branch: any,
  settings: EffectiveBranchOperationalSettings,
  orderData: Record<string, any>,
  timezone = "Asia/Riyadh",
  mappedPaymentMethod?: string,
): string | null {
  if (!branch || branch.isActive === false || branch.isActive === 0 || branch.isOnline === false || branch.allowOnlineOrders === false) {
    return "الفرع المختار غير متاح لاستقبال الطلبات الإلكترونية.";
  }
  if (settings.isEmergencyClosed) return "الفرع مغلق مؤقتًا ولا يستقبل الطلبات حاليًا.";

  const deliveryType = String(orderData.deliveryType || orderData.deliveryMode || "").toLowerCase();
  const orderType = String(orderData.orderType || "").toLowerCase();
  let requiredMethod: keyof EffectiveBranchOperationalSettings["orderMethodsConfig"];
  if (deliveryType === "delivery" || orderType === "delivery") {
    requiredMethod = "enableDelivery";
  } else if (orderData.productReservationDate || orderData.scheduledPickupTime || orderData.scheduledAt) {
    requiredMethod = "enableScheduledPickup";
  } else if (
    orderData.carPickup === true ||
    ["car-pickup", "curbside", "car_pickup"].includes(deliveryType) ||
    ["car-pickup", "curbside", "car_pickup"].includes(orderType)
  ) {
    requiredMethod = "enableCarPickup";
  } else if (
    orderData.dineIn === true ||
    ["dine-in", "dine_in", "table"].includes(deliveryType) ||
    ["dine-in", "dine_in", "table"].includes(orderType)
  ) {
    requiredMethod = "enableDineIn";
  } else {
    requiredMethod = "enableTakeaway";
  }

  if (!settings.orderMethodsConfig[requiredMethod]) {
    const labels = {
      enableDineIn: "الطلب داخل المطعم",
      enableCarPickup: "الاستلام من السيارة",
      enableDelivery: "التوصيل",
      enableScheduledPickup: "الاستلام المجدول",
      enableTakeaway: "الاستلام من الفرع",
    };
    return `${labels[requiredMethod]} غير متاح في هذا الفرع حاليًا.`;
  }

  const isScheduled = Boolean(orderData.productReservationDate || orderData.scheduledPickupTime || orderData.scheduledAt);
  if (!isScheduled && !isBranchOpenNow(settings, timezone)) {
    return "الفرع مغلق حاليًا حسب ساعات العمل المحددة.";
  }

  if (settings.enabledPaymentMethodIds) {
    const acceptedPaymentMethods = new Set([orderData.paymentMethod, mappedPaymentMethod].filter(Boolean).map(String));
    if (![...acceptedPaymentMethods].some((method) => settings.enabledPaymentMethodIds!.includes(method))) {
      return "طريقة الدفع المختارة غير متاحة لهذا الفرع.";
    }
  }
  return null;
}

export async function getBranchOperationalSettings(tenantId: string, branchId: string) {
  const selectors: any[] = [{ id: branchId }];
  if (/^[a-fA-F0-9]{24}$/.test(branchId)) selectors.push({ _id: branchId });
  const [branch, businessConfig] = await Promise.all([
    BranchModel.findOne({ tenantId, $or: selectors }).lean(),
    BusinessConfigModel.findOne({ tenantId }).lean(),
  ]);
  if (!branch) return null;

  return {
    branch,
    overrides: toPlainObject((branch as any).operationalSettings),
    defaults: resolveBranchOperationalSettings(businessConfig),
    effective: resolveBranchOperationalSettings(businessConfig, branch),
    timezone: (businessConfig as any)?.timezone || "Asia/Riyadh",
    globalDeliveryBranchId: String((businessConfig as any)?.deliveryPolicy?.branchId || "").trim(),
  };
}
