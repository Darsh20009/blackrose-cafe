import { BranchModel, BusinessConfigModel } from "@shared/schema";
import {
  calculateDistanceKm,
  DELIVERY_FEE_SAR,
  DELIVERY_RADIUS_KM,
  type DeliveryCoordinates,
} from "@shared/delivery-policy";
import {
  isBranchOpenNow,
  isPrimaryDeliveryBranch,
  resolveBranchOperationalSettings,
} from "./branch-operational-settings";

type BranchLike = {
  id?: string;
  _id?: unknown;
  tenantId?: string;
  nameAr?: string;
  nameEn?: string;
  isActive?: boolean | number;
  allowOnlineOrders?: boolean;
  isOnline?: boolean;
  operationalSettings?: any;
  location?: { lat?: number; lng?: number };
};

type DeliveryAvailability = {
  canDeliver: boolean;
  branch: BranchLike | null;
  distanceKm: number | null;
  distanceMeters: number | null;
  radiusKm: number;
  deliveryFee: number;
  messageAr: string;
};

function validCoordinate(value: unknown, min: number, max: number): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : null;
}

function isAvailableOnlineBranch(branch: BranchLike): boolean {
  return branch.isActive !== false &&
    branch.isActive !== 0 &&
    branch.allowOnlineOrders !== false &&
    branch.isOnline !== false;
}

function branchMatchesId(branch: BranchLike, id: string): boolean {
  return String(branch.id || "") === id || String(branch._id || "") === id;
}

export async function checkDeliveryLocation(
  tenantId: string,
  customerLocation: DeliveryCoordinates,
  requestedBranchId?: string,
): Promise<DeliveryAvailability> {
  const [branches, config] = await Promise.all([
    BranchModel.find({ tenantId }).lean() as unknown as Promise<BranchLike[]>,
    BusinessConfigModel.findOne({ tenantId }).lean(),
  ]);

  const primaryDeliveryBranch = branches.find((branch) => isPrimaryDeliveryBranch(branch, config));
  const defaults = resolveBranchOperationalSettings(config, primaryDeliveryBranch);
  const radiusKm = defaults.deliveryPolicy.radiusKm || DELIVERY_RADIUS_KM;
  const deliveryFee = defaults.deliveryPolicy.feeSar ?? DELIVERY_FEE_SAR;
  let eligibleBranches = branches.flatMap((branch) => {
    const operational = resolveBranchOperationalSettings(config, branch);
    const id = String(branch.id || branch._id || "");
    const isConfiguredBranch = isPrimaryDeliveryBranch(branch, config);
    const explicitlyEnabled = branch.operationalSettings?.orderMethodsConfig?.enableDelivery === true;
    const isDeliveryBranch = isConfiguredBranch || explicitlyEnabled;
    if (
      !isDeliveryBranch ||
      !isAvailableOnlineBranch(branch) ||
      !operational.orderMethodsConfig.enableDelivery ||
      validCoordinate(branch.location?.lat, -90, 90) === null ||
      validCoordinate(branch.location?.lng, -180, 180) === null
    ) return [];
    return [{
      ...branch,
      id: branch.id || id,
      _effectiveDeliveryRadiusKm: operational.deliveryPolicy.radiusKm,
      _effectiveDeliveryFee: operational.deliveryPolicy.feeSar,
    }];
  });

  if (requestedBranchId) {
    eligibleBranches = eligibleBranches.filter((branch) => branchMatchesId(branch, requestedBranchId));
  }

  if (eligibleBranches.length === 0) {
    return {
      canDeliver: false,
      branch: null,
      distanceKm: null,
      distanceMeters: null,
      radiusKm,
      deliveryFee: 0,
      messageAr: requestedBranchId
        ? "فرع التوصيل المحدد غير متاح حاليًا أو لا يطابق الفرع المختار."
        : "فرع التوصيل المحدد غير متاح حاليًا لاستقبال الطلبات.",
    };
  }

  const distances = eligibleBranches.map((branch) => {
    const branchPoint = {
      lat: Number(branch.location!.lat),
      lng: Number(branch.location!.lng),
    };
    return {
      branch,
      distanceKm: calculateDistanceKm(customerLocation, branchPoint),
      radiusKm: Number((branch as any)._effectiveDeliveryRadiusKm) || radiusKm,
      deliveryFee: Number((branch as any)._effectiveDeliveryFee) ?? deliveryFee,
    };
  }).sort((a, b) => a.distanceKm - b.distanceKm);

  const nearest = distances.find((candidate) => candidate.distanceKm <= candidate.radiusKm) || distances[0];
  const canDeliver = nearest.distanceKm <= nearest.radiusKm;
  const selectedRadius = nearest.radiusKm;
  const selectedDeliveryFee = nearest.deliveryFee;
  return {
    canDeliver,
    branch: nearest.branch,
    distanceKm: Math.round(nearest.distanceKm * 100) / 100,
    distanceMeters: Math.round(nearest.distanceKm * 1000),
    radiusKm: selectedRadius,
    deliveryFee: canDeliver ? selectedDeliveryFee : 0,
    messageAr: canDeliver
      ? `التوصيل متاح من ${nearest.branch.nameAr || nearest.branch.nameEn || "الفرع"} برسوم ${selectedDeliveryFee} ريال.`
      : `لا نوصل لهذه المنطقة؛ الحد الأقصى ${selectedRadius} كم من الفرع المختار.`,
  };
}

export async function applyDeliveryPolicyToOrderData(
  orderData: Record<string, any>,
  tenantId: string,
): Promise<{ ok: true; distanceKm: number } | { ok: false; code: string; error: string }> {
  const orderType = String(orderData.deliveryType || orderData.orderType || orderData.deliveryMode || "").toLowerCase();
  if (orderType !== "delivery") return { ok: true, distanceKm: 0 };

  const address = orderData.deliveryAddress;
  const latitude = validCoordinate(address?.lat ?? orderData.deliveryLocation?.lat, -90, 90);
  const longitude = validCoordinate(address?.lng ?? orderData.deliveryLocation?.lng, -180, 180);
  if (latitude === null || longitude === null) {
    return {
      ok: false,
      code: "DELIVERY_LOCATION_REQUIRED",
      error: "حدد موقع التوصيل على الخريطة قبل تأكيد الطلب.",
    };
  }

  const availability = await checkDeliveryLocation(
    tenantId,
    { lat: latitude, lng: longitude },
    String(orderData.branchId || "").trim() || undefined,
  );
  if (!availability.branch) {
    return {
      ok: false,
      code: "DELIVERY_BRANCH_UNAVAILABLE",
      error: availability.messageAr,
    };
  }
  if (!availability.canDeliver) {
    return {
      ok: false,
      code: "DELIVERY_OUT_OF_RANGE",
      error: availability.messageAr,
    };
  }

  const previousFee = Number(orderData.deliveryFee);
  const total = Number(orderData.totalAmount);
  orderData.deliveryFee = availability.deliveryFee;
  if (Number.isFinite(total)) {
    orderData.totalAmount = Math.round(
      (total - (Number.isFinite(previousFee) ? previousFee : 0) + availability.deliveryFee) * 100
    ) / 100;
  }
  orderData.deliveryAddress = {
    ...(address && typeof address === "object" ? address : {}),
    fullAddress: typeof address?.fullAddress === "string" ? address.fullAddress : "",
    lat: latitude,
    lng: longitude,
    zone: "configured-branch-radius",
    distanceKm: availability.distanceKm,
    deliveryRadiusKm: availability.radiusKm,
    isInDeliveryZone: true,
  };
  orderData.branchId = String(availability.branch.id || availability.branch._id || orderData.branchId || "");

  return { ok: true, distanceKm: availability.distanceKm || 0 };
}
