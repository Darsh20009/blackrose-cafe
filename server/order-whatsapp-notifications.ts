import { sendQiroxWhatsAppMessage } from "./qirox-project-integrations";
import { buildDeliveryMapUrl, getDeliveryCoordinates } from "@shared/delivery-policy";

type OrderLike = Record<string, any>;

const WORK_WHATSAPP_PHONE = process.env.QIROX_ORDER_ALERT_PHONE || "0566507666";

function normalizeWhatsAppPhone(value: unknown): string | null {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("00")) return `+${digits.slice(2)}`;
  if (digits.startsWith("966")) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 10) return `+966${digits.slice(1)}`;
  if (digits.startsWith("5") && digits.length === 9) return `+966${digits}`;
  if (digits.length >= 10 && digits.length <= 15) return `+${digits}`;
  return null;
}

function money(value: unknown): string {
  const amount = Number(value);
  return `${Number.isFinite(amount) ? amount.toFixed(2) : "0.00"} ر.س`;
}

function orderItems(order: OrderLike): any[] {
  let items = order.items;
  if (typeof items === "string") {
    try { items = JSON.parse(items); } catch { items = []; }
  }
  return Array.isArray(items) ? items : [];
}

function itemDescription(item: any): string {
  const name = item.nameAr || item.name || item.coffeeItem?.nameAr || item.nameEn || "منتج";
  const quantity = Math.max(1, Number(item.quantity) || 1);
  const unitPrice = Number(item.price ?? item.unitPrice);
  const line = Number.isFinite(unitPrice) ? ` — ${money(unitPrice * quantity)}` : "";
  const options = [
    item.selectedSize || item.size,
    ...(Array.isArray(item.extras) ? item.extras : []),
    item.sugarLevel ? `سكر ${item.sugarLevel}` : "",
    item.notes,
    ...(Array.isArray(item.customization?.selectedItemAddons)
      ? item.customization.selectedItemAddons.map((addon: any) => addon.nameAr || addon.name || addon)
      : []),
  ].filter((value) => typeof value === "string" && value.trim());
  const optionsText = options.length ? ` (${options.join("، ")})` : "";
  return `• ${quantity} × ${name}${optionsText}${line}`;
}

function orderTypeLabel(order: OrderLike): string {
  const type = String(order.deliveryType || order.orderType || "").toLowerCase();
  if (type === "delivery") return "توصيل";
  if (type === "dine-in" || type === "dine_in" || type === "table") {
    return order.tableNumber ? `طاولة ${order.tableNumber}` : "داخل المطعم";
  }
  if (type === "car-pickup" || type === "car_pickup" || type === "curbside") return "استلام بالسيارة";
  return "استلام من الفرع";
}

function paymentStatusLabel(order: OrderLike): string {
  if (order.status === "awaiting_payment") return "بانتظار الدفع";
  if (order.paymentStatus === "paid" || order.status === "payment_confirmed") return "مدفوع / مؤكد";
  if (order.paymentStatus === "failed") return "فشل الدفع";
  if (order.paymentStatus === "refunded" || order.status === "refunded") return "مسترد";
  return "بانتظار التحصيل";
}

function orderLocation(order: OrderLike, branchName: string): string {
  const customerAddress = typeof order.customerAddress === "string"
    ? order.customerAddress
    : order.customerAddress?.fullAddress || order.customerAddress?.address || "";
  const deliveryAddress = typeof order.deliveryAddress === "string"
    ? order.deliveryAddress
    : order.deliveryAddress?.fullAddress || customerAddress;
  const coordinates = getDeliveryCoordinates(order.deliveryAddress);
  if (deliveryAddress || coordinates) {
    const lines = [
      deliveryAddress ? `عنوان التوصيل: ${deliveryAddress}` : "",
      coordinates ? `موقع العميل على الخريطة: ${buildDeliveryMapUrl(coordinates.lat, coordinates.lng)}` : "",
      `الفرع: ${branchName}`,
    ].filter(Boolean);
    return lines.join("\n");
  }
  if (order.tableNumber) return `الطاولة: ${order.tableNumber} — الفرع: ${branchName}`;
  if (order.carInfo?.plateNumber || order.plateNumber) {
    return `السيارة: ${order.carInfo?.plateNumber || order.plateNumber} — الفرع: ${branchName}`;
  }
  return `الفرع: ${branchName}`;
}

function buildInvoiceLines(order: OrderLike): string[] {
  const items = orderItems(order);
  const total = Number(order.totalAmount) || 0;
  const subtotal = Number(order.subtotal);
  const tax = Number(order.tax);
  const lines = items.map(itemDescription);
  if (Number.isFinite(subtotal) && subtotal > 0) lines.push(`المجموع قبل الضريبة: ${money(subtotal)}`);
  if (Number.isFinite(tax) && tax > 0) lines.push(`الضريبة: ${money(tax)}`);
  if (Number(order.deliveryFee) > 0) lines.push(`رسوم التوصيل: ${money(order.deliveryFee)}`);
  lines.push(`الإجمالي: ${money(total)}`);
  return lines;
}

export async function sendOrderWhatsAppNotifications(
  order: OrderLike,
  publicBaseUrl: string,
  branchNameValue?: string,
): Promise<void> {
  const orderNumber = String(order.orderNumber || order.id || "غير معروف");
  const branchName = branchNameValue || order.branchNameAr || order.branchId || "غير محدد";
  const baseUrl = publicBaseUrl.replace(/\/+$/, "");
  const trackingUrl = `${baseUrl}/track/${encodeURIComponent(orderNumber)}`;
  const customerName = order.customerName || order.customerInfo?.customerName || order.customerInfo?.name || "عميل";
  const customerPhone = normalizeWhatsAppPhone(
    order.customerPhone || order.customerInfo?.customerPhone || order.customerInfo?.phoneNumber || order.customerInfo?.phone,
  );
  const source = ["online", "web", "app", "whatsapp"].includes(String(order.channel).toLowerCase())
    ? "أونلاين"
    : "نقاط البيع";
  const invoiceLines = buildInvoiceLines(order);
  const location = orderLocation(order, branchName);
  const payment = `${paymentStatusLabel(order)}${order.paymentMethod ? ` — ${order.paymentMethod}` : ""}`;
  const workMessage = [
    `طلب جديد من ${source}`,
    `رقم الطلب: #${orderNumber}`,
    `العميل: ${customerName}`,
    `الهاتف: ${order.customerPhone || order.customerInfo?.customerPhone || "غير متوفر"}`,
    `النوع: ${orderTypeLabel(order)}`,
    location,
    `الدفع: ${payment}`,
    "تفاصيل الطلب:",
    ...invoiceLines,
    `متابعة الطلب: ${trackingUrl}`,
  ].join("\n");

  const customerMessage = [
    `شكرًا لطلبك يا ${customerName}.`,
    `فاتورة الطلب #${orderNumber}`,
    `الفرع: ${branchName}`,
    `النوع: ${orderTypeLabel(order)}`,
    ...invoiceLines,
    `حالة الدفع: ${payment}`,
    `تابع حالة طلبك: ${trackingUrl}`,
  ].join("\n");

  const sends: Promise<void>[] = [];
  const businessPhone = normalizeWhatsAppPhone(WORK_WHATSAPP_PHONE);
  if (businessPhone) {
    sends.push(sendQiroxWhatsAppMessage(
      { phone: businessPhone, name: "إدارة بلاك روز" },
      workMessage,
    ));
  } else {
    console.error("[ORDER-WHATSAPP] Business recipient number is invalid");
  }

  if (customerPhone) {
    sends.push(sendQiroxWhatsAppMessage(
      { phone: customerPhone, name: customerName },
      customerMessage,
    ));
  } else if (order.customerPhone || order.customerInfo?.customerPhone || order.customerInfo?.phoneNumber) {
    console.warn(`[ORDER-WHATSAPP] Skipping invalid customer phone for order ${orderNumber}`);
  }

  const results = await Promise.allSettled(sends);
  results.forEach((result, index) => {
    if (result.status === "rejected") {
      console.error(`[ORDER-WHATSAPP] Message ${index + 1} failed for order ${orderNumber}:`, result.reason);
    }
  });
}
