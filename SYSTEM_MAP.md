# SYSTEM MAP — QIROX / BLACK ROSE CAFE
**تاريخ التشريح:** مايو 2026  
**المفتش:** Agent  
**الحالة:** Stabilization Freeze مطلوبة فوراً

---

## الأرقام الحقيقية

| المقياس | القيمة |
|---------|--------|
| صفحات Frontend | **123 صفحة** |
| API Endpoints | **537 endpoint** |
| أسطر في routes.ts | **19,974 سطر** |
| نماذج Mongoose | **85+ نموذج** |
| مكوّنات | **77 مكوّن** |
| أسطر في schema.ts | **5,784 سطر** |

---

## تصنيف كل Module

### 🟢 STABLE — يعمل بشكل موثوق

| Module | الملفات | الحجم | ملاحظات |
|--------|---------|-------|---------|
| **POS System** | pos-system.tsx | 148KB / 2,976 سطر | WebSocket + Offline Queue + Printer |
| **Kitchen Display (KDS)** | kitchen-display.tsx | 780 سطر | Real-time WS، multi-tab guard |
| **Order Management** | employee-orders.tsx | 779 سطر | Polling 8s، يحتاج Pagination |
| **Inventory — Raw Items** | inventory-raw-items.tsx | ~610 سطر | CRUD حقيقي |
| **Inventory — Stock** | inventory-stock.tsx | ~750 سطر | Auto-refetch 30s |
| **Inventory — Purchases** | inventory-purchases.tsx | ~780 سطر | كامل |
| **Inventory — Alerts** | inventory-alerts.tsx | ~425 سطر | WebSocket real-time |
| **Inventory — Movements** | inventory-movements.tsx | ~390 سطر | Live Track mode |
| **Inventory — Recipes** | inventory-recipes.tsx | 1,262 سطر | حسابات تكلفة معقدة |
| **Inventory — Smart** | inventory-smart.tsx | ~580 سطر | Dashboard overview |
| **Inventory — Suppliers** | inventory-suppliers.tsx | ~544 سطر | CRUD |
| **Inventory — Transfers** | inventory-transfers.tsx | ~600 سطر | نقل بين فروع |
| **Attendance** | employee-attendance + manager-attendance | — | WebSocket + GPS tracking |
| **Shifts / Z-Report** | shift-management.tsx | — | تكامل كامل مع طباعة |
| **Leave Requests** | leave-request.tsx | — | CRUD حقيقي |
| **Payroll** | payroll-management.tsx | 364 سطر | Snapshots + تجميد شهري |
| **Loyalty** | loyalty-program + employee-loyalty + my-card | — | تكامل كامل مع Checkout |
| **Gift Cards** | gift-cards-management.tsx | — | إنشاء + استرداد في Checkout |
| **ZATCA E-Invoicing** | zatca-invoices.tsx | — | QR Code + تتبع حالة تقديم |
| **ERP Accounting** | erp-accounting.tsx | — | Chart of Accounts + Journal Entries |
| **Accounting Dashboard** | accounting-dashboard.tsx | — | Export Excel/PDF |
| **BI Analytics** | bi-analytics.tsx | — | Real API data |
| **Advanced Analytics** | advanced-analytics.tsx | — | Real order data |
| **Unified Reports** | unified-reports.tsx | — | Multi-branch aggregation |
| **Admin Reports** | admin-reports.tsx | — | Real data |
| **Executive Dashboard** | executive-dashboard.tsx | — | Refetch 30s |
| **Customer Menu** | menu.tsx | — | Real API |
| **Checkout** | checkout.tsx | — | Cash + Geidea + Loyalty + GiftCard |
| **Kiosk** | kiosk.tsx | — | Self-order كامل |
| **Table Reservation** | table-reservation.tsx | — | Real API |
| **Push Notifications** | admin-notifications.tsx | — | Broadcast + Smart Scheduler |
| **Email Broadcast** | admin-email.tsx | — | Real SMTP |
| **Tenant Signup** | tenant-signup.tsx | — | Multi-step onboarding |
| **Pricing Page** | pricing.tsx | — | SaaS marketing |
| **User Guide** | user-guide.tsx | — | Searchable docs |
| **Delivery (Core)** | manager-delivery + driver-portal + delivery-selection | — | Real WebSocket + auto-refresh |
| **Warehouse** | warehouse-management.tsx | 181 سطر | PlanGate محمي |
| **Tahalyli Daily** | tahalyli.tsx | — | Refetch 60s |

---

### 🟡 RECOVERABLE — يعمل لكن فيه مشاكل تحتاج إصلاح

| Module | المشكلة | الأولوية |
|--------|---------|---------|
| **Employee Cashier** | يكرّر منطق pos-system.tsx — اثنان يؤديان نفس الدور بشكل غير متسق | عالية |
| **Tables Manager** | `demo-tenant` مكتوب صريحاً في 6+ أماكن في الكود (الأسطر 124،160،190،240،270،299) | عالية |
| **Payment — PayMob** | Polling للتحقق بدل Webhook موثوق، بيانات اعتماد قد تكون غير مضبوطة | متوسطة |
| **Payment — Geidea** | Signature verification مخطوبة في مسار واحد (routes.ts:3237) | عالية |
| **Order Display** | Fetch 500 طلب كل 8 ثوانٍ بلا Pagination — سيتباطأ مع النمو | عالية |
| **Delivery Map** | FREE_DELIVERY_ZONES مكتوبة hardcoded في الكود لا في قاعدة البيانات | منخفضة |
| **Delivery Tracking** | Interface mismatch محتمل بين `_id` و `id` في DeliveryOrder | متوسطة |
| **Offline Queue** | تم تحسينه في الجلسة السابقة، لكن يحتاج UI لعرض الطلبات الفاشلة للمستخدم | منخفضة |
| **Warehouse** | Fallback "Demo Warehouse" إذا لم تُرجع API مستودعات | منخفضة |
| **Driver Portal** | يستخدم API حقيقي لكن لم يُختبر End-to-End مع توصيل فعلي | متوسطة |
| **NeoLeap Payment** | Backend جاهز، Frontend يعرضه "Coming Soon" — قرار: اكتمل أو احذف | منخفضة |
| **Apple Wallet** | مسار `/api/wallet/apple-pass` موجود، غير مختبر في إنتاج | منخفضة |

---

### 🔴 BROKEN / مكسور يحتاج إعادة بناء

| المشكلة | الموقع | التفاصيل |
|---------|--------|---------|
| **demo-tenant مُرمَّز في 15+ endpoint حيوي** | routes.ts | مسارات الدفع كلها (PayMob + Geidea + NeoLeap + Loyalty + Payment Config) تستخدم 'demo-tenant' ثابتة بدل tenantId الحقيقي. هذا يعني أن أي tenant آخر لن تعمل معه المدفوعات نهائياً. |
| **Routes مكرّرة (Duplicate Routes)** | routes.ts | `/api/webhooks/delivery/:provider` معرّف مرتين (الأسطر 2067 و18322)، `/api/recipes` مرتين، `/api/zatca/invoices` مرتين. Express يستخدم الأول فقط — الثاني ميت. |
| **routes.ts مونوليث 20,000 سطر** | server/routes.ts | ملف واحد لـ 537 endpoint — مستحيل الصيانة والاختبار والتتبع |
| **نماذج Mongoose يتيمة (Orphaned Models)** | shared/schema.ts | CashRegisterModel، CostCenterModel، TaxRateModel، FiscalPeriodModel، AccountingSnapshotModel — معرّفة ولا تُستخدم في أي مكان |
| **KDS multi-tab lock هش** | kitchen-display.tsx | اعتماد على localStorage بـ 60s lock لمنع طباعة مكررة — يفشل عبر أجهزة مختلفة |
| **Employee Orders polling** | employee-orders.tsx | Fetch 500 طلب كل 8 ثوانٍ بلا حدود — يعطي MongoDB ضغطاً متزايداً |
| **POS: اثنان يؤديان نفس الدور** | pos-system.tsx + employee-cashier.tsx | 148KB + 66KB = 214KB من كود متداخل وغير متسق |

---

### 💀 FAKE FEATURE — واجهة بدون خلفية حقيقية

| Module | الملف | التفاصيل |
|--------|-------|---------|
| **B2B Marketplace** | b2b-marketplace.tsx | MOCK_SUPPLIERS كاملة، RFQ يُظهر Toast وهمي، تم إضافة بانر تحذيري |
| **Partner Program** | partner-program.tsx | MOCK_PARTNERS كاملة، REFERRAL_CODE عشوائي، تم إضافة بانر تحذيري |
| **Support System** | support-system.tsx | mockTickets + mockFAQs + mockArticles — لا يوجد API خلفي |
| **STC Pay** | simulated-card-payment.tsx | OTP تجريبي (1234)، لا يتصل بـ STC حقاً |
| **POS Hardware Detection** | routes.ts:4168 | `/api/pos/detect-local-network` يُرجع `found: []` دائماً |
| **Hardware Status** | routes.ts:4909 | `/api/pos/hardware-status` يُرجع بيانات ثابتة مكتوبة في الكود |
| **Delivery Mock Status** | routes.ts:2572 | `/api/integrations/delivery/mock-status` بيانات ثابتة |
| **Admin Demo Stats** | routes.ts:2109 | `/api/admin/demo-stats` أرقام وهمية مكتوبة في الكود |
| **API Keys Storage** | api-management.tsx | مفاتيح API تُخزَّن في localStorage فقط — لا يوجد backend |

---

### 🗑️ REMOVE — يجب حذفه أو دمجه

| الملف/الوظيفة | السبب |
|--------------|-------|
| `/api/webhooks/delivery/:provider` المكرر (السطر 18322) | Route ميت — الأول (السطر 2067) يُستخدم |
| `/api/recipes` المكرر | نفس المشكلة |
| `/api/zatca/invoices` المكرر | نفس المشكلة |
| `CashRegisterModel` في schema.ts | غير مستخدم |
| `CostCenterModel` في schema.ts | غير مستخدم |
| `TaxRateModel` في schema.ts | غير مستخدم |
| `FiscalPeriodModel` في schema.ts | غير مستخدم |
| `employee-cashier.tsx` أو `pos-system.tsx` | أحدهما يجب أن يُدمج في الآخر أو يُحذف |
| `/api/test-email` (السطر 17234) | لا يُستدعى من Frontend |
| `/api/admin/demo-orders` DELETE | لا يُستدعى من Frontend |
| `/api/admin/demo-customers` DELETE | لا يُستدعى من Frontend |

---

## خريطة الديون التقنية (Technical Debt Map)

```
CRITICAL (يكسر Tenants حقيقيين)
├── demo-tenant hardcoded في 15+ payment route
└── Duplicate routes (آخرها ميت، قد يُرجع نتائج خاطئة)

HIGH (يكسر مع النمو)
├── routes.ts 20K سطر = مستحيل الصيانة
├── Order fetch 500 كل 8s بلا Pagination
├── POS مكرر (pos-system + employee-cashier)
└── Tables: demo-tenant في 6 أماكن بالكود

MEDIUM (يؤثر على الموثوقية)
├── KDS multi-tab lock هش عبر الأجهزة
├── Geidea signature check مخطوبة في مسار
├── PayMob polling بدل Webhook
└── 5 نماذج Mongoose يتيمة تضخّم schema.ts

LOW (تنظيف تدريجي)
├── Hardcoded delivery zones
├── NeoLeap: قرر اكتمل أو احذف
├── Apple Wallet: اختبر أو احذف
└── API Keys: localStorage فقط
```

---

## خطة Stabilization بالترتيب

### Phase 1 — الإسعاف الأولي (أسبوع 1-2)
ممنوع إضافة Features. الهدف: وقف النزيف.

1. **حذف Routes المكرّرة** — 3 duplicates تُربك Express
2. **إصلاح demo-tenant في Payment routes** — Critical للعملاء الحقيقيين
3. **حذف 5 نماذج Mongoose اليتيمة** من schema.ts
4. **Pagination لـ Order fetch** — من limit=500 إلى cursor-based
5. **حذف أو دمج employee-cashier.tsx** في pos-system.tsx

### Phase 2 — إعادة بناء routes.ts (أسبوع 3-4)
تقسيم الـ monolith:
```
server/routes/
  ├── orders.ts       (~3,000 سطر)
  ├── products.ts     (~2,000 سطر)
  ├── customers.ts    (~1,500 سطر)
  ├── payments.ts     (~2,500 سطر)
  ├── inventory.ts    (~2,000 سطر)
  ├── employees.ts    (~1,500 سطر)
  ├── analytics.ts    (~1,500 سطر)
  ├── tables.ts       (~1,000 سطر)
  └── ai.ts           (~500 سطر)
```

### Phase 3 — Reliability (أسبوع 5-6)
- WebSocket كـ source of truth بدل Polling
- Geidea signature verification كاملة
- PayMob Webhook بدل Polling
- KDS multi-device coordination حقيقي

### Phase 4 — Fake Features (أسبوع 7-8)
قرار نهائي لكل Fake Feature:
- Support System: بناء حقيقي أو حذف
- STC Pay: تكامل حقيقي أو حذف
- B2B Marketplace: حذف حتى يوجد supplier API حقيقي
- Partner Program: حذف حتى يوجد partner DB حقيقي

---

## ملاحظة المعمار النهائية

النظام يحتوي على **بنية تحتية ممتازة** (Mongoose، WebSocket، Push، ZATCA، Multi-branch).  
المشكلة ليست في التقنية — المشكلة في **الكثافة بدون حدود**.

- POS وحده 2,976 سطر (حجم نظام كامل)
- routes.ts وحده 20,000 سطر (حجم مشروع كامل)
- 85+ نموذج في ملف واحد

الهدف الحقيقي: **نفس الوظائف، بنصف الحجم، وضمان يمكن الوثوق به.**
