import crypto from "crypto";
import { Request, Response, NextFunction } from "express";
import { nanoid } from "nanoid";

const KEY_PREFIX_LIVE = "qrx_live_";
const KEY_PREFIX_TEST = "qrx_test_";

export function hashKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

export function generateApiKey(env: "live" | "test" = "live"): { plain: string; prefix: string; hash: string } {
  const random = crypto.randomBytes(24).toString("base64url");
  const plain = (env === "live" ? KEY_PREFIX_LIVE : KEY_PREFIX_TEST) + random;
  return { plain, prefix: plain.slice(0, 14), hash: hashKey(plain) };
}

export interface ApiKeyRequest extends Request {
  apiKey?: any;
  tenantId?: string;
  apiScopes?: string[];
}

// Middleware: authenticate via Authorization: Bearer qrx_xxx
export function requireApiKey(...requiredScopes: string[]) {
  return async (req: ApiKeyRequest, res: Response, next: NextFunction) => {
    try {
      const auth = req.headers.authorization || "";
      const m = auth.match(/^Bearer\s+(qrx_(?:live|test)_[A-Za-z0-9_-]+)/);
      if (!m) return res.status(401).json({ error: "Missing or invalid API key", hint: "Use Authorization: Bearer qrx_live_..." });

      const { ApiKeyModel } = await import("@shared/schema");
      const hash = hashKey(m[1]);
      const key: any = await ApiKeyModel.findOne({ keyHash: hash, isActive: true }).lean();
      if (!key) return res.status(401).json({ error: "Invalid API key" });
      if (key.expiresAt && new Date(key.expiresAt) < new Date()) return res.status(401).json({ error: "API key expired" });

      const scopes: string[] = key.scopes || [];
      if (!scopes.includes("*")) {
        for (const need of requiredScopes) {
          if (!scopes.includes(need)) return res.status(403).json({ error: `Missing scope: ${need}` });
        }
      }
      req.apiKey = key;
      req.tenantId = key.tenantId;
      req.apiScopes = scopes;

      // Update lastUsedAt async (no await)
      ApiKeyModel.updateOne({ id: key.id }, { $set: { lastUsedAt: new Date() } }).catch(() => {});
      next();
    } catch (e: any) {
      res.status(500).json({ error: "Auth error: " + e.message });
    }
  };
}

// HMAC signature for webhook bodies — receiver verifies with shared secret
export function signPayload(payload: string, secret: string): string {
  return "sha256=" + crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

// Dispatch event to all active webhooks subscribed to it
export async function publishEvent(event: string, data: any, tenantId?: string): Promise<void> {
  try {
    const { WebhookModel, WebhookDeliveryModel } = await import("@shared/schema");
    const filter: any = { isActive: true, events: event };
    if (tenantId) filter.$or = [{ tenantId }, { tenantId: { $exists: false } }];
    const hooks: any[] = await WebhookModel.find(filter).lean();
    if (!hooks.length) return;

    const payload = { event, data, tenantId, timestamp: new Date().toISOString(), id: nanoid() };
    const body = JSON.stringify(payload);

    // Fire all webhooks in parallel (no await on the outer publishEvent)
    await Promise.all(hooks.map(async (hook: any) => {
      const sig = signPayload(body, hook.secret);
      const start = Date.now();
      let statusCode: number | undefined;
      let responseBody = "";
      let success = false;
      let errorMessage: string | undefined;

      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 10000);
        const r = await fetch(hook.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-QIROX-Signature": sig,
            "X-QIROX-Event": event,
            "X-QIROX-Delivery": payload.id,
            "User-Agent": "QIROX-Webhooks/1.0",
          },
          body,
          signal: ctrl.signal,
        });
        clearTimeout(t);
        statusCode = r.status;
        responseBody = (await r.text()).slice(0, 500);
        success = r.ok;
        if (!success) errorMessage = `HTTP ${r.status}`;
      } catch (e: any) {
        errorMessage = e.message || String(e);
      }

      const durationMs = Date.now() - start;
      // Save delivery record
      WebhookDeliveryModel.create({
        id: nanoid(), webhookId: hook.id, tenantId: hook.tenantId,
        event, payload, url: hook.url, statusCode, responseBody,
        durationMs, success, attemptNumber: 1, errorMessage,
      }).catch(() => {});

      // Update hook stats
      const update: any = { $set: { lastTriggeredAt: new Date() } };
      if (success) {
        update.$set.failureCount = 0;
        update.$set.lastError = null;
      } else {
        update.$inc = { failureCount: 1 };
        update.$set.lastError = errorMessage;
      }
      const { WebhookModel: WM } = await import("@shared/schema");
      WM.updateOne({ id: hook.id }, update).catch(() => {});
    }));
  } catch (e: any) {
    console.error("[publishEvent]", e.message);
  }
}

// Catalog of supported integrations
export const INTEGRATION_CATALOG = [
  // ERP
  { type: "sap", category: "erp", nameAr: "SAP Business One", nameEn: "SAP Business One", icon: "🏢", fields: ["apiUrl", "username", "password", "companyDb"] },
  { type: "oracle_netsuite", category: "erp", nameAr: "Oracle NetSuite", nameEn: "Oracle NetSuite", icon: "🔷", fields: ["accountId", "consumerKey", "consumerSecret", "tokenId", "tokenSecret"] },
  // Accounting
  { type: "zoho", category: "accounting", nameAr: "Zoho Books", nameEn: "Zoho Books", icon: "📊", fields: ["organizationId", "clientId", "clientSecret", "refreshToken"] },
  { type: "qoyod", category: "accounting", nameAr: "قيود (Qoyod)", nameEn: "Qoyod", icon: "📒", fields: ["apiKey", "organizationId"] },
  { type: "daftra", category: "accounting", nameAr: "دفترة (Daftra)", nameEn: "Daftra", icon: "📕", fields: ["subdomain", "apiKey"] },
  // Delivery
  { type: "jahez", category: "delivery", nameAr: "جاهز", nameEn: "Jahez", icon: "🛵", fields: ["apiKey", "branchId"] },
  { type: "hungerstation", category: "delivery", nameAr: "هنقرستيشن", nameEn: "HungerStation", icon: "🍔", fields: ["partnerId", "apiKey"] },
  { type: "mrsool", category: "delivery", nameAr: "مرسول", nameEn: "Mrsool", icon: "📦", fields: ["apiKey", "merchantId"] },
  // Messaging
  { type: "whatsapp", category: "messaging", nameAr: "واتساب أعمال", nameEn: "WhatsApp Business", icon: "💬", fields: ["phoneNumberId", "accessToken", "businessAccountId", "verifyToken"] },
  // E-commerce
  { type: "shopify", category: "ecommerce", nameAr: "Shopify", nameEn: "Shopify", icon: "🛍️", fields: ["shopUrl", "accessToken", "apiVersion"] },
  { type: "tiktok_shop", category: "ecommerce", nameAr: "TikTok Shop", nameEn: "TikTok Shop", icon: "🎵", fields: ["appKey", "appSecret", "shopId", "accessToken"] },
  { type: "salla", category: "ecommerce", nameAr: "سلة", nameEn: "Salla", icon: "🛒", fields: ["accessToken", "storeId"] },
  { type: "zid", category: "ecommerce", nameAr: "زد", nameEn: "Zid", icon: "🏪", fields: ["accessToken", "storeId"] },
  // POS
  { type: "foodics", category: "pos", nameAr: "Foodics", nameEn: "Foodics", icon: "🍴", fields: ["apiToken", "branchId"] },
  // Payment devices
  { type: "payment_device", category: "payment_device", nameAr: "أجهزة الدفع", nameEn: "Payment Devices", icon: "💳", fields: ["deviceModel", "serialNumber", "merchantId", "terminalId", "ipAddress"] },
  // Generic
  { type: "generic_webhook", category: "messaging", nameAr: "Webhook مخصّص", nameEn: "Generic Webhook", icon: "🔗", fields: ["url", "secret"] },
];

export const ECOSYSTEM_EVENTS = [
  { key: "order.created", nameAr: "إنشاء طلب", nameEn: "Order Created" },
  { key: "order.updated", nameAr: "تحديث طلب", nameEn: "Order Updated" },
  { key: "order.completed", nameAr: "اكتمال طلب", nameEn: "Order Completed" },
  { key: "order.cancelled", nameAr: "إلغاء طلب", nameEn: "Order Cancelled" },
  { key: "customer.created", nameAr: "تسجيل عميل", nameEn: "Customer Created" },
  { key: "customer.updated", nameAr: "تحديث عميل", nameEn: "Customer Updated" },
  { key: "loyalty.points_added", nameAr: "إضافة نقاط ولاء", nameEn: "Loyalty Points Added" },
  { key: "loyalty.points_redeemed", nameAr: "استبدال نقاط", nameEn: "Loyalty Points Redeemed" },
  { key: "inventory.low_stock", nameAr: "تنبيه نقص المخزون", nameEn: "Low Stock Alert" },
  { key: "inventory.updated", nameAr: "تحديث المخزون", nameEn: "Inventory Updated" },
  { key: "menu.item_created", nameAr: "إضافة منتج", nameEn: "Menu Item Created" },
  { key: "menu.item_updated", nameAr: "تحديث منتج", nameEn: "Menu Item Updated" },
  { key: "payment.received", nameAr: "استلام دفعة", nameEn: "Payment Received" },
  { key: "shift.opened", nameAr: "فتح وردية", nameEn: "Shift Opened" },
  { key: "shift.closed", nameAr: "إغلاق وردية", nameEn: "Shift Closed" },
];

export const API_SCOPES = [
  { key: "menu:read", nameAr: "قراءة المنيو" },
  { key: "menu:write", nameAr: "تعديل المنيو" },
  { key: "orders:read", nameAr: "قراءة الطلبات" },
  { key: "orders:write", nameAr: "إنشاء/تعديل الطلبات" },
  { key: "customers:read", nameAr: "قراءة العملاء" },
  { key: "customers:write", nameAr: "تعديل العملاء" },
  { key: "loyalty:read", nameAr: "قراءة الولاء" },
  { key: "loyalty:write", nameAr: "إدارة الولاء" },
  { key: "inventory:read", nameAr: "قراءة المخزون" },
  { key: "inventory:write", nameAr: "تعديل المخزون" },
  { key: "webhooks:manage", nameAr: "إدارة Webhooks" },
  { key: "*", nameAr: "كل الصلاحيات" },
];
