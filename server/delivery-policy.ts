import { BranchModel } from "@shared/schema";
import {
  calculateDistanceKm,
  DELIVERY_FEE_SAR,
  DELIVERY_RADIUS_KM,
  type DeliveryCoordinates,
} from "@shared/delivery-policy";

type BranchLike = {
  id?: string;
  _id?: unknown;
  tenantId?: string;
  nameAr?: string;
  nameEn?: string;
  isActive?: boolean | number;
  allowOnlineOrders?: boolean;
  isOnline?: boolean;
  location?: { lat?: number; lng?: number };
};

type DeliveryAvailability = {
  canDeliver: boolean;
  branch: BranchLike | null;
  distanceKm: number | null;
  distanceMeters: number | null;
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
  const branches = await BranchModel.find({ tenantId }).lean() as unknown as BranchLike[];
  let eligibleBranches = branches.filter((branch) =>
    isAvailableOnlineBranch(branch) &&
    validCoordinate(branch.location?.lat, -90, 90) !== null &&
    validCoordinate(branch.location?.lng, -180, 180) !== null
  );

  if (requestedBranchId) {
    eligibleBranches = eligibleBranches.filter((branch) => branchMatchesId(branch, requestedBranchId));
  }

  if (eligibleBranches.length === 0) {
    return {
      canDeliver: false,
      branch: null,
      distanceKm: null,
      distanceMeters: null,
      deliveryFee: 0,
      messageAr: requestedBranchId
        ? "الفرع المختار غير متاح حاليًا للتوصيل الإلكتروني."
        : "لا يوجد فرع متاح حاليًا لاستقبال طلبات التوصيل.",
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
    };
  }).sort((a, b) => a.distanceKm - b.distanceKm);

  const nearest = distances[0];
  const canDeliver = nearest.distanceKm <= DELIVERY_RADIUS_KM;
  return {
    canDeliver,
    branch: nearest.branch,
    distanceKm: Math.round(nearest.distanceKm * 100) / 100,
    distanceMeters: Math.round(nearest.distanceKm * 1000),
    deliveryFee: canDeliver ? DELIVERY_FEE_SAR : 0,
    messageAr: canDeliver
      ? `التوصيل متاح من ${nearest.branch.nameAr || nearest.branch.nameEn || "الفرع"} برسوم ${DELIVERY_FEE_SAR} ريال.`
      : "لا نوصل لهذه المنطقة؛ نطاق التوصيل يصل إلى ٣٠ كم من فرع المروج.",
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
  orderData.deliveryFee = DELIVERY_FEE_SAR;
  if (Number.isFinite(total)) {
    orderData.totalAmount = Math.round(
      (total - (Number.isFinite(previousFee) ? previousFee : 0) + DELIVERY_FEE_SAR) * 100
    ) / 100;
  }
  orderData.deliveryAddress = {
    ...(address && typeof address === "object" ? address : {}),
    fullAddress: typeof address?.fullAddress === "string" ? address.fullAddress : "",
    lat: latitude,
    lng: longitude,
    zone: "murooj-30km",
    isInDeliveryZone: true,
  };

  return { ok: true, distanceKm: availability.distanceKm || 0 };
}
