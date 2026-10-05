export const DELIVERY_RADIUS_KM = 30;
export const DELIVERY_FEE_SAR = 25;

export interface DeliveryCoordinates {
  lat: number;
  lng: number;
}

export function calculateDistanceKm(from: DeliveryCoordinates, to: DeliveryCoordinates): number {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const latitudeDelta = radians(to.lat - from.lat);
  const longitudeDelta = radians(to.lng - from.lng);
  const fromLatitude = radians(from.lat);
  const toLatitude = radians(to.lat);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function buildDeliveryMapUrl(lat: number, lng: number): string {
  return `https://maps.google.com/?q=${encodeURIComponent(`${lat},${lng}`)}`;
}

export function getDeliveryAddressLabel(address: unknown): string {
  if (typeof address === "string") return address.trim();
  if (address && typeof address === "object") {
    const fullAddress = (address as { fullAddress?: unknown }).fullAddress;
    return typeof fullAddress === "string" ? fullAddress.trim() : "";
  }
  return "";
}

export function getDeliveryCoordinates(address: unknown): DeliveryCoordinates | null {
  if (!address || typeof address !== "object") return null;
  const value = address as { lat?: unknown; lng?: unknown };
  const lat = Number(value.lat);
  const lng = Number(value.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || value.lat == null || value.lng == null) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}
