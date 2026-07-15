# SYSTEM AUDIT — QIROX Cafe / Black Rose Cafe
> تاريخ المراجعة: مايو 2026 | النسخة: 2.0 Enterprise Audit

---

## ملخص النظام

| البند | القيمة |
|-------|--------|
| إجمالي الصفحات | 260 صفحة |
| إجمالي المكونات | 276 مكون |
| مكتبات مساعدة | 58 ملف |
| حجم routes.ts | 21,959 سطر |
| قواعد البيانات | MongoDB Atlas |
| المصادقة | Express Session + bcrypt (محلي) |
| الوقت الفعلي | WebSocket (ws) + RealtimeEngine |
| الطباعة | ESC/POS + Iframe Queue + Relay Agent |
| الوضع Offline | IndexedDB + Service Worker + SyncEngine |

---

## رمز الحالة

| الرمز | المعنى |
|-------|--------|
| ✅ | يعمل ممتاز |
| ⚠️ | يعمل جزئياً أو يحتاج تحسين |
| ❌ | لا يعمل أو به خطأ حرج |
| 🔄 | يحتاج تبسيط |
| 🔀 | يحتاج دمج |
| 🚨 | يسبب مشاكل خطيرة |

---

## المرحلة 1 — Audit الصفحات الكاملة

### قسم 1: تجربة العميل (Customer Experience)

| الصفحة | الملف | الوظيفة | تُستخدم؟ | بها Bugs؟ | خطوات كثيرة؟ | تسبب بطء؟ | API غير مستقرة؟ | الحالة | ملاحظات |
|---------|-------|---------|----------|----------|--------------|----------|----------------|--------|---------|
| الصفحة الرئيسية | welcome.tsx | Landing + menu intro | ✅ | ⚠️ | لا | لا | لا | ✅ | WebSocket يفتح بدون حاجة |
| المنيو | menu.tsx | تصفح المنتجات | ✅ | ⚠️ | لا | ⚠️ | لا | ⚠️ | refetchInterval غير ضروري |
| تفاصيل المنتج | product-details.tsx | عرض المنتج | ✅ | لا | لا | لا | لا | ✅ | - |
| سلة التسوق | cart-page.tsx | عرض السلة | ✅ | لا | لا | لا | لا | ✅ | - |
| الدفع | checkout.tsx | إتمام الطلب + دفع | ✅ | ⚠️ | نعم | ⚠️ | لا | ⚠️ | تعقيد Guest vs Auth، خطوات كثيرة |
| تتبع الطلب | tracking.tsx | تتبع الطلب | ✅ | لا | لا | لا | لا | ✅ | - |
| تتبع بدون تسجيل | public-order-track.tsx | تتبع بالرقم | ✅ | لا | لا | لا | لا | ✅ | - |
| طلباتي | my-orders.tsx | سجل الطلبات | ✅ | لا | لا | لا | لا | ✅ | - |
| كارت الولاء | my-card.tsx | عرض البطاقة | ✅ | لا | لا | لا | لا | ✅ | - |
| برنامج الولاء | loyalty-program.tsx | إدارة النقاط | ✅ | لا | ⚠️ | لا | لا | ⚠️ | 🔀 يمكن دمجه مع my-card |
| المنتجات المفضلة | my-offers.tsx | العروض الشخصية | ✅ | لا | لا | لا | لا | ✅ | - |
| الإشعارات | notifications.tsx | صندوق الإشعارات | ✅ | لا | لا | لا | لا | ✅ | - |
| تسجيل/دخول العميل | CustomerAuth.tsx | مصادقة | ✅ | لا | لا | لا | لا | ✅ | - |
| نسيت كلمة السر | ForgotPassword.tsx | استعادة الحساب | ✅ | لا | ⚠️ | لا | لا | ⚠️ | خطوات متعددة |
| إعادة تعيين | ResetPassword.tsx | تعيين كلمة جديدة | ✅ | لا | لا | لا | لا | ✅ | - |
| البرومو | promo.tsx | عرض كوبون | ✅ | لا | لا | لا | لا | ✅ | - |
| الإحالة | referral-program.tsx | دعوة أصدقاء | ✅ | لا | لا | لا | لا | ✅ | - |
| الخصوصية | privacy-policy.tsx | قانوني | ✅ | لا | لا | لا | لا | ✅ | - |
| الأسعار | pricing.tsx | عرض الخطط | ✅ | لا | لا | لا | لا | ✅ | - |
| نسخ البطاقة | CopyCard.tsx | نقل البطاقة | ⚠️ | لا | لا | لا | لا | 🔄 | نادر الاستخدام |
| تخصيص البطاقة | card-customization.tsx | تصميم البطاقة | ⚠️ | لا | لا | لا | لا | 🔄 | استخدام نادر |
| عودة الدفع | payment-return.tsx | Paymob callback | ✅ | لا | لا | لا | لا | ✅ | - |

---

### قسم 2: نظام POS والكاشير

| الصفحة | الملف | الوظيفة | تُستخدم؟ | بها Bugs؟ | خطوات كثيرة؟ | تسبب بطء؟ | API غير مستقرة؟ | الحالة | ملاحظات |
|---------|-------|---------|----------|----------|--------------|----------|----------------|--------|---------|
| نقطة البيع | pos-system.tsx | POS الرئيسي | ✅ | ⚠️ | نعم | 🚨 | لا | 🚨 | **60+ useState، re-renders كثيرة، polling + WebSocket معاً، 3600 سطر في مكون واحد** |
| الكاشير | employee-cashier.tsx | POS مبسط | ✅ | ⚠️ | لا | ⚠️ | لا | ⚠️ | 🔀 يمكن دمجه مع POS |
| عرض الطلبات | employee-orders.tsx | إدارة الطلبات | ✅ | لا | لا | لا | لا | ✅ | - |
| شاشة الطلبات | employee-orders-display.tsx | قراءة فقط | ✅ | لا | لا | لا | لا | ✅ | - |
| سجل المناوبات | shift-management.tsx | Shifts + Z-Report | ✅ | ⚠️ | لا | لا | لا | ⚠️ | تحديث shift في setImmediate — بيانات قد تضيع |
| إيصال الطلب | order-receipt.tsx | طباعة إيصال | ✅ | ⚠️ | لا | لا | لا | ⚠️ | يستخدم window.print مباشرة |
| المطبخ | kitchen-display.tsx | KDS | ✅ | لا | لا | لا | لا | ✅ | يستخدم WebSocket القديم |
| طلبات الموظف | employee-home.tsx | لوحة الموظف | ✅ | لا | لا | لا | لا | ✅ | - |

---

### قسم 3: الخدمة الميدانية (Tables/Delivery)

| الصفحة | الملف | الوظيفة | تُستخدم؟ | بها Bugs؟ | خطوات كثيرة؟ | تسبب بطء؟ | الحالة | ملاحظات |
|---------|-------|---------|----------|----------|--------------|----------|--------|---------|
| منيو الطاولة | table-menu.tsx | QR Order | ✅ | لا | لا | لا | ✅ | - |
| دفع الطاولة | table-checkout.tsx | دفع بالطاولة | ✅ | لا | لا | لا | ✅ | - |
| تتبع طلب الطاولة | table-order-tracking.tsx | تتبع | ✅ | لا | لا | لا | ✅ | - |
| حجز الطاولة | table-reservation.tsx | حجز | ✅ | لا | ⚠️ | لا | ⚠️ | خطوات متعددة |
| طاولات الكاشير | cashier-tables.tsx | خريطة الطاولات | ✅ | لا | لا | لا | ✅ | - |
| طلبات الطاولة | cashier-table-orders.tsx | إدخال الطلبات | ✅ | لا | لا | لا | ✅ | - |
| الحجوزات | cashier-reservations.tsx | إدارة الحجوزات | ✅ | لا | لا | لا | ✅ | - |
| شاشة الطلبات TV | order-status-display.tsx | عرض للعملاء | ✅ | لا | لا | لا | ✅ | - |
| كشك الخدمة | customer-display.tsx | شاشة ثانوية | ✅ | لا | لا | لا | ✅ | - |
| كيوسك | kiosk.tsx | Self-service | ✅ | لا | لا | لا | ✅ | - |
| Drive-Through | drive-through.tsx | نافذة القيادة | ✅ | لا | لا | لا | ✅ | - |
| حجوزات العميل | customer-reservations.tsx | حجوزاتي | ✅ | لا | لا | لا | ✅ | - |

---

### قسم 4: إدارة الموظفين

| الصفحة | الملف | الوظيفة | تُستخدم؟ | بها Bugs؟ | الحالة | ملاحظات |
|---------|-------|---------|----------|----------|--------|---------|
| بوابة الموظف | employee-gateway.tsx | Entry point | ✅ | لا | ✅ | - |
| دخول الموظف | employee-login.tsx | مصادقة | ✅ | لا | ✅ | - |
| لوحة الموظف | employee-dashboard.tsx | Dashboard | ✅ | لا | ✅ | - |
| تفعيل الموظف | employee-activation.tsx | Setup | ✅ | لا | ✅ | - |
| الحضور | employee-attendance.tsx | Check-in/out | ✅ | لا | ✅ | - |
| طلب إجازة | leave-request.tsx | Leave | ✅ | لا | ✅ | - |
| توفر العمل | employee-availability.tsx | جداول العمل | ✅ | لا | ✅ | - |
| ولاء الموظف | employee-loyalty.tsx | Scanner | ✅ | لا | ✅ | - |
| إدارة المنيو | employee-menu-management.tsx | Toggle توفر | ✅ | لا | ✅ | - |
| إدارة المكونات | employee-ingredients-management.tsx | مخزون | ✅ | لا | ✅ | - |
| حجوزات المنتجات | employee-product-reservations.tsx | Product bookings | ✅ | لا | ✅ | - |

---

### قسم 5: لوحة الإدارة (Manager)

| الصفحة | الملف | الوظيفة | تُستخدم؟ | بها Bugs؟ | تسبب بطء؟ | الحالة | ملاحظات |
|---------|-------|---------|----------|----------|----------|--------|---------|
| لوحة المدير | manager-dashboard.tsx | KPIs | ✅ | لا | لا | ✅ | - |
| الموظفون | manager-employees.tsx | HR | ✅ | لا | لا | ✅ | - |
| الحضور | manager-attendance.tsx | Attendance | ✅ | لا | لا | ✅ | - |
| الطاولات | manager-tables.tsx | Layout | ✅ | لا | لا | ✅ | - |
| التقييمات | manager-reviews.tsx | Feedback | ✅ | لا | لا | ✅ | - |
| التوصيل | manager-delivery.tsx | Delivery mgmt | ✅ | لا | لا | ✅ | - |
| السائقون | manager-drivers.tsx | Drivers | ✅ | لا | لا | ✅ | - |
| الذكاء الاصطناعي | manager-ai.tsx | AI insights | ✅ | لا | لا | ✅ | - |
| سجلات التدقيق | manager-audit-logs.tsx | Audit | ✅ | لا | ⚠️ | ⚠️ | بيانات كبيرة — لا pagination |
| التقارير الذكية | manager-smart-reports.tsx | Reports | ✅ | لا | لا | ✅ | - |
| المحاسبة | accounting-dashboard.tsx | Finance | ✅ | ⚠️ | لا | ⚠️ | يستخدم window.print مباشرة |
| فواتير ZATCA | zatca-invoices.tsx | E-invoicing | ✅ | لا | لا | ✅ | - |
| ERP | erp-accounting.tsx | ERP | ⚠️ | لا | لا | 🔄 | استخدام محدود |
| الرواتب | payroll-management.tsx | Payroll | ✅ | لا | لا | ✅ | - |
| التحليلات المتقدمة | advanced-analytics.tsx | Analytics | ✅ | لا | ⚠️ | ⚠️ | بيانات كثيرة مرة واحدة |
| BI Analytics | bi-analytics.tsx | BI | ✅ | لا | ⚠️ | ⚠️ | - |
| التقارير الموحدة | unified-reports.tsx | Multi-branch | ✅ | لا | لا | ✅ | - |
| الترقيات | promotions-management.tsx | Promos | ✅ | لا | لا | ✅ | - |
| بطاقات الهدية | gift-cards-management.tsx | Gift Cards | ✅ | لا | لا | ✅ | - |
| لوحة الأداء | performance-dashboard.tsx | Performance | ⚠️ | لا | لا | 🔄 | استخدام محدود |
| جودة الكود | code-quality-dashboard.tsx | Technical | ⚠️ | لا | لا | 🔄 | للمطورين فقط |

---

### قسم 6: المخزون والمستودع

| الصفحة | الملف | الوظيفة | تُستخدم؟ | بها Bugs؟ | الحالة | ملاحظات |
|---------|-------|---------|----------|----------|--------|---------|
| مركز المخزون | inventory-hub.tsx | Dashboard | ✅ | لا | ✅ | - |
| مخزون ذكي | inventory-smart.tsx | AI Stock | ✅ | لا | ✅ | - |
| المواد الخام | inventory-raw-items.tsx | Raw items | ✅ | لا | ✅ | - |
| الموردون | inventory-suppliers.tsx | Suppliers | ✅ | لا | ✅ | - |
| المشتريات | inventory-purchases.tsx | POs | ✅ | لا | ✅ | - |
| الوصفات | inventory-recipes.tsx | Recipes | ✅ | ⚠️ | ⚠️ | بدون وصفة → لا خصم مخزون + fallback صامت |
| المخزون الحالي | inventory-stock.tsx | Stock levels | ✅ | لا | ✅ | - |
| تنبيهات المخزون | inventory-alerts.tsx | Low stock | ✅ | لا | ✅ | - |
| حركات المخزون | inventory-movements.tsx | Movements | ✅ | لا | ✅ | - |
| تحويلات المخزون | inventory-transfers.tsx | Transfers | ✅ | لا | ✅ | - |
| المستودع | warehouse-management.tsx | Warehouse | ⚠️ | لا | 🔄 | استخدام Infinity فقط |
| إدارة الموردين | supplier-management.tsx | Vendors | ✅ | لا | ✅ | 🔀 مع inventory-suppliers |

---

### قسم 7: الإدارة العليا (Admin/Owner)

| الصفحة | الملف | الوظيفة | الحالة | ملاحظات |
|---------|-------|---------|--------|---------|
| لوحة المالك | owner-dashboard.tsx | Business metrics | ✅ | - |
| لوحة المدير التنفيذي | executive-dashboard.tsx | Executive | ✅ | - |
| لوحة الأدمن | admin-dashboard.tsx | System admin | ✅ | - |
| موظفو الأدمن | admin-employees.tsx | Global HR | ✅ | - |
| الفروع | admin-branches.tsx | Branch setup | ✅ | - |
| الإعدادات | admin-settings.tsx | Config | ✅ | - |
| تقارير الأدمن | admin-reports.tsx | Reports | ✅ | - |
| الإشعارات | admin-notifications.tsx | Broadcasts | ✅ | - |
| البريد | admin-email.tsx | Email | ✅ | - |
| إدارة API | api-management.tsx | API keys | ⚠️ | localStorage فقط |
| التكاملات | external-integrations.tsx | 3rd party | ✅ | - |
| الأجهزة | hardware-management.tsx | Printers | ✅ | - |
| Super Admin | qirox-dashboard.tsx | Platform | ✅ | - |
| التسجيل | tenant-signup.tsx | Onboarding | ✅ | - |

---

## المرحلة 2 — تقرير أخطر المشاكل التقنية

### 🚨 مشاكل حرجة (Critical)

#### 1. POS — 60+ useState في مكون واحد (pos-system.tsx)
```
الخطورة: عالية جداً
الملف: client/src/pages/pos-system.tsx
السطر: 99–250
المشكلة: مكون واحد بحجم 3,600 سطر يدير 60+ حالة محلية
النتيجة: re-render كامل عند أي تغيير، lag واضح
الإصلاح: تقسيم إلى sub-components + تحويل state إلى Zustand store
```

#### 2. Loyalty Points — Race Condition 🚨
```
الخطورة: عالية (يؤثر على المال)
الملف: server/routes.ts
السطر: 946–970
المشكلة: فحص الرصيد ثم الخصم بدون قفل atomic
النتيجة: يمكن للعميل صرف نقاط مزدوجة بطلبين متزامنين
الإصلاح: استخدام findOneAndUpdate مع $gte شرط atomic
```

#### 3. Inventory Silent Failure 🚨
```
الخطورة: عالية (يؤثر على الأرباح)
الملف: server/storage.ts السطر 1904 + server/routes.ts السطر 458
المشكلة: بدون وصفة → fallback صامت على costOfGoods → لا خصم مخزون فعلي
النتيجة: مخزون مبالغ فيه، خسائر غير مرصودة
الإصلاح: تحذير واضح + إلزامية الوصفة أو رفض الخصم
```

#### 4. Cashier Shift في setImmediate 🚨
```
الخطورة: متوسطة-عالية (تقارير مالية خاطئة)
الملف: server/routes.ts السطر 1095
المشكلة: تحديث مناوبة الكاشير خارج try/catch الرئيسي
النتيجة: تعطل الخادم يجعل X-Report خاطئة
الإصلاح: نقل التحديث داخل transaction الأصلية
```

#### 5. Duplicate Order Route — 7,000 سطر غير مستخدمة 🚨
```
الخطورة: متوسطة (صيانة + confusion)
الملف: server/routes.ts السطر 7923
المشكلة: كود order creation مكرر كاملاً داخل _unusedDuplicateOrderPost
النتيجة: أي تعديل يحتاج تحديث مكانين
الإصلاح: حذف الكود المكرر نهائياً
```

---

### ⚠️ مشاكل متوسطة (Medium)

#### 6. POS — Polling + WebSocket في نفس الوقت
```
الملف: client/src/pages/pos-system.tsx السطر 502
المشكلة: refetchInterval: 20000 رغم وجود WebSocket
النتيجة: 3 requests/دقيقة إضافية بدون فائدة
الإصلاح: إزالة refetchInterval من الـ queries التي تُحدَّث عبر WebSocket
```

#### 7. نظامان WebSocket (قديم + حديث)
```
الملف: client/src/lib/websocket.ts + client/src/lib/realtime-engine.ts
المشكلة: نظامان مختلفان، POS يستخدم القديم
النتيجة: لا ACK، لا sequence tracking في POS
الإصلاح: تحويل pos-system.tsx و kitchen-display.tsx للـ RealtimeEngine
```

#### 8. window.print مباشرة في صفحات غير مخصصة للطباعة
```
المواضع:
- client/src/pages/accounting-dashboard.tsx:1201
- client/src/pages/pos-system.tsx:420
الإصلاح: توجيه لـ print queue أو استخدام printUnifiedReceipt
```

#### 9. Duplicate Price Logic
```
الملفات: pos-engine.ts + cart-store.tsx
المشكلة: خوارزميتان مختلفتان لحساب الإجمالي
النتيجة: احتمال فروق سعرية بين POS والـ checkout
الإصلاح: دمج في useCartCalculations hook موحد
```

#### 10. API calls مباشرة في components (checkout.tsx)
```
الملف: client/src/pages/checkout.tsx + pos-system.tsx
المشكلة: fetch() مباشر داخل components
النتيجة: صعوبة الاختبار والصيانة
الإصلاح: تحويل لـ custom hooks أو service layer
```

---

### 🔄 مشاكل التبسيط (Simplification)

#### 11. صفحات مكررة الوظيفة
```
- inventory-suppliers.tsx + supplier-management.tsx → دمج
- employee-cashier.tsx جزئي مع pos-system.tsx → توحيد الـ engine
- loyalty-program.tsx مع my-card.tsx → دمج في تجربة واحدة
- analytics متعددة: advanced-analytics + bi-analytics + tahalyli → tabs في صفحة واحدة
```

#### 12. localStorage لـ API Keys
```
الملف: client/src/pages/api-management.tsx
المشكلة: API keys مخزنة في localStorage (browser only، مؤقتة)
الإصلاح: حفظ في DB مع تشفير
```

---

## المرحلة 3 — Architecture المقترح

### الهيكلة الحالية (مشكلة)
```
server/routes.ts → 21,959 سطر (كل شيء في ملف واحد)
client/src/pages/ → 260 صفحة بدون تنظيم module
client/src/lib/ → منطق عشوائي غير منظم
```

### الهيكلة المقترحة (Modular)
```
server/
  modules/
    orders/     → routes + service + types
    inventory/  → routes + service + engine
    employees/  → routes + service + permissions
    payments/   → routes + service + providers
    loyalty/    → routes + service + atomic-ops
    kitchen/    → routes + service + realtime
    reports/    → routes + service + aggregations

client/src/
  modules/
    pos/        → components + hooks + store + engine
    kitchen/    → KDS components + hooks
    inventory/  → inventory pages + hooks
    employees/  → HR pages + hooks
    orders/     → order management + hooks
    customers/  → customer-facing + hooks
    analytics/  → reports + charts
  shared/       → shared components + hooks + utils
  core/         → router, auth, http client, error boundary
  infrastructure/ → WebSocket, offline queue, print engine
```

---

## المرحلة 6 — تقييم نظام الطباعة

| النظام | الحالة | ملاحظات |
|--------|--------|---------|
| Network TCP (QZ Tray) | ✅ | يعمل على الأجهزة المكتبية |
| WebUSB | ⚠️ | Chrome فقط، مشكلة Windows drivers |
| Web Bluetooth | ⚠️ | Chrome/Android فقط |
| Local Relay Agent | ✅ | الأفضل للـ Android POS |
| Cloud Queue | ✅ | يعمل مع وجود إنترنت |
| Iframe Queue | ✅ | fallback موثوق |
| window.print مباشر | 🚨 | يُستخدم في 4 أماكن خارج السياق |

### مشاكل الطباعة
1. Fixed setTimeout (300ms, 800ms) هش تحت الضغط
2. Mixed queue state صعوبة تتبع الأخطاء
3. Arabic encoding يحتاج canvas bitmap (بطيء ويستهلك ذاكرة)
4. لا Retry تلقائي لـ Network failures

---

## المرحلة 7 — تقييم Offline System

| الوظيفة | تعمل Offline؟ | الملاحظة |
|---------|--------------|---------|
| واجهة POS | ✅ | محملة من Service Worker |
| تصفح المنيو | ✅ | IndexedDB cache |
| إنشاء الطلب | ✅ | offline-queue.ts |
| طباعة الإيصال | ✅ | رقم مؤقت يُنتج محلياً |
| الاسترداد التلقائي | ✅ | SyncEngine + exponential backoff |
| إشعارات الوقت الفعلي | ❌ | WebSocket يقطع |
| بحث العملاء | ❌ | يحتاج API |
| الدفع بالبطاقة | ❌ | يحتاج cloud |
| حالة الطاولات (من terminals أخرى) | ❌ | يحتاج WebSocket |

### آلية حل التعارض (Conflict Resolution)
- **الاستراتيجية**: Last-Write-Wins بناءً على `updatedAt`
- **الطلبات**: POST إضافي بدون تعارض
- **التعارضات الأخرى**: Remote يفوز عند تساوي الوقت

---

## المرحلة 8 — تقييم WebSocket

| الجانب | النظام القديم (websocket.ts) | النظام الحديث (realtime-engine.ts) |
|--------|------------------------------|-------------------------------------|
| Reconnect | Fixed delay (3s/5s) | Exponential backoff مع jitter |
| ACK | ❌ | ✅ |
| Sequence Numbers | ❌ | ✅ |
| Event Replay | ❌ | ✅ (replay_from) |
| Memory Leaks | ⚠️ | ✅ cleanup موجود |
| Heartbeat | ⚠️ | ✅ 30s ping |
| استخدامه في | pos-system, kitchen, welcome | لا يُستخدم بعد في POS |

**الحالة**: هجرة مكتملة — جميع الصفحات الست تستخدم الآن RealtimeEngine.

---

## خطة الإصلاح — الأولويات

### أولاً — فوري (Critical Fixes)
- [x] إنشاء SYSTEM_AUDIT.md
- [x] إصلاح Loyalty Points race condition — تحويل لـ atomic findOneAndUpdate مع $gte (routes.ts ~946)
- [x] إزالة الكود المكرر _unusedDuplicateOrderPost — حُذف 563 سطر (routes.ts السابق 7921-8484)
- [x] إصلاح Inventory Silent Failure — تحذير واضح في اللوج + حقل inventoryWarning في الطلب (storage.ts ~1919)
- [x] إزالة refetchInterval الزائدة من POS — liveOrders: لا polling، tables: 60s، kitchen: 60s
- [x] إصلاح window.print في pos-system.tsx — تحويل لـ CustomEvent بدل window.print المباشر
- [x] إصلاح window.print في accounting-dashboard.tsx — فتح نافذة طباعة منفصلة بدل window.print
- [x] إضافة /api/public/settings endpoint المفقود — كان يسبب 404 في كل صفحة checkout

### ثانياً — هذا الأسبوع (High Priority)
- [x] تحويل POS لاستخدام RealtimeEngine — استبدال useOrderWebSocket بـ useRealtimeEvent + useRealtimeStatus + useRealtimeSend (pos-system.tsx سطر 198)
- [x] إصلاح Cashier Shift setImmediate — نُقلت عملية حفظ الشيفت إلى قبل إرسال الـ response لضمان سلامة البيانات المالية (routes.ts ~1104)
- [x] إصلاح Mongoose Duplicate Index Warnings — حُذفت index: true من createdAt في ApiMetricSchema + WebhookDeliverySchema حيث توجد TTL indexes تغني عنها (schema.ts ~6081, ~6179)
- [x] إضافة DB Connection Warming — 5 مجموعات مفيدة تُجلب بعد اتصال MongoDB لتسريع أول الطلبات (index.ts ~69)
- [x] إضافة Startup Grace Period — تمديد من 15 ثانية إلى 30 ثانية لتغطية Atlas init الكاملة (api-metrics.ts سطر 9)
- [x] إصلاح React Anti-Pattern في employee-login.tsx — تحويل useState(initializer) التي تستدعي setLocation إلى useEffect صحيح (employee-login.tsx سطر 17-35)
- [x] هجرة WebSocket الكاملة — جميع الصفحات الست تستخدم الآن RealtimeEngine (pos, kitchen, employee-dashboard, order-status-display, customer-display, welcome)
- [x] إصلاح AI endpoints — تحويل 500 عند غياب GROQ_API_KEY إلى 200 مع graceful degradation (ai/chat, ai/insights, ai/smart-report, ai/menu-assist)
- [x] إضافة /api/shifts/auto-periods و /api/notifications/unread-count لقائمة SKIP_PATHS في المقاييس
- [ ] تقسيم pos-system.tsx لـ sub-components
- [ ] توحيد منطق حساب السعر (Price Calculation)
- [ ] استبدال window.print بـ queue system

### ثالثاً — هذا الشهر (Medium Priority)  
- [ ] تقسيم routes.ts لـ modules
- [ ] نقل API calls من components لـ hooks
- [ ] دمج الصفحات المكررة
- [ ] تحسين Print Retry System

### رابعاً — مستقبلاً (Architecture)
- [ ] تحويل للـ Modular Architecture الكامل
- [ ] إضافة Monitoring System
- [ ] JWT rotation + Refresh Tokens
- [ ] توثيق docs/ الكامل

---

## ملاحظات ختامية

**النظام في حالة جيدة بشكل عام** — المميزات تعمل، والـ Architecture الأساسي سليم. لكن هناك:
- **مشكلة حرجة واحدة** تؤثر على المال: Loyalty Points race condition
- **مشكلة أداء رئيسية**: POS كمكون ضخم واحد
- **مشكلة صيانة**: routes.ts بـ 22,000 سطر

أولوية الإصلاح: **الاستقرار أولاً** ← الأداء ← التبسيط ← المعمارية

---
*آخر تحديث: مايو 2026 | المراجع: QIROX Engineering Audit*
