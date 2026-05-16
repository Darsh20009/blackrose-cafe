# تقرير صحة النظام الشامل — BLACK ROSE CAFE / QIROX
**تاريخ التقرير:** مايو 2026  
**المحلل:** QIROX Agent  
**الهدف:** تشريح النظام الكامل — ما يعمل، ما لا يعمل، ما يجب حذفه

---

## الملخص التنفيذي

| الإحصائية | القيمة |
|---|---|
| إجمالي الصفحات (Pages) | 103 صفحة |
| إجمالي مسارات API | ~350 endpoint |
| حجم routes.ts | **19,727 سطر** — خطر معماري |
| حجم schema.ts | 5,738 سطر |
| وحدات Stable | 14 |
| وحدات Recoverable | 9 |
| وحدات Fake Feature | 5 |
| وحدات Broken/Incomplete | 4 |
| وحدات للحذف | 2 |

---

## تصنيف كل وحدة (Module Classification)

### ✅ STABLE — يعمل بشكل جيد

| الوحدة | الصفحات | الملاحظات |
|---|---|---|
| **POS System** | `/employee/pos` | 2,976 سطر، keyboard shortcuts، cart، modifiers — الأكثر اكتمالاً |
| **Menu & Catalog** | `/menu`, `/product/:id`, `/table-menu/:qrToken` | قائمة كاملة، بحث، فلترة، صور، sizes/addons |
| **Order Flow** | `/cart`, `/checkout`, `/tracking` | تدفق متكامل من السلة حتى التتبع |
| **Kitchen Display** | `/employee/kitchen` | 787 سطر، تحديث حالات، real-time WebSocket |
| **Customer Auth** | `/customer-login`, `/auth`, `/forgot-password` | تسجيل، دخول، OTP، استعادة كلمة المرور |
| **Employee Auth** | `/employee/login`, `/employee/gateway` | QR login، session-based، permissions check |
| **Loyalty Cards** | `/my-card`, `/employee/loyalty` | نقاط، أختام، مستويات، استبدال |
| **Table Management** | `/employee/tables`, `/cashier-tables` | QR، احتلال، تحرير، طلبات الطاولة |
| **Attendance** | `/employee/attendance`, `/manager/attendance` | GPS check-in/out، تقارير يومية وشهرية |
| **Employee Management** | `/manager/employees`, `/admin/employees` | صلاحيات، أدوار، 42+ permission granular |
| **Shift Management** | `/employee/shifts`, `/manager/shifts` | Z-Report، فتح/إغلاق الكاشير، حركة الصندوق |
| **Notifications** | WebSocket + Push | WebSocket محلي، VAPID Push، smart scheduler |
| **ZATCA Invoices** | `/manager/zatca` | فواتير ضريبية متوافقة، QR code، XML |
| **Admin Settings** | `/admin/settings` | إعدادات شاملة، بوابات دفع، SMTP، branding |

---

### 🔧 RECOVERABLE — يعمل لكن يحتاج تحسين

| الوحدة | الصفحات | المشاكل المعروفة |
|---|---|---|
| **Inventory System** | `/manager/inventory/*` (8 صفحات) | UI كامل، لكن الخصم التلقائي من الوصفات (recipe deduction) غير مُتحقق من دقته في الإنتاج |
| **Recipes (Wصفات)** | `/manager/inventory/recipes` | الربط بالمنتجات موجود، لكن حساب COGS الفعلي يحتاج اختباراً حقيقياً |
| **Accounting Dashboard** | `/manager/accounting` | لوحة متكاملة، لكن بعض الفلاتر الزمنية (period filter) كانت لا تعمل (تم إصلاح جزئي) |
| **ERP Accounting** | `/erp/accounting` | 1,978 سطر، دفتر يومية كامل، لكن التكامل مع الطلبات الفعلية يحتاج تحققاً |
| **Delivery System** | `/manager/delivery`, `/manager/drivers`, `/driver-portal` | البنية موجودة، الـ webhook للمنصات الخارجية معقد، auto-assign يحتاج اختباراً |
| **Kiosk** | `/kiosk` | 511 سطر، يعمل أساسياً، لكن idle timer وsuccess screen بسيطة جداً |
| **Gift Cards** | `/manager/gift-cards` | CRUD موجود، لكن redemption flow في checkout يحتاج اختباراً نهاية-لنهاية |
| **Promotions** | `/manager/promotions` | UI كامل، لكن تطبيق الخصومات على checkout يحتاج مراجعة |
| **Payroll** | `/manager/payroll` | لقطة رواتب موجودة، لكن حسابات الغياب والتأخر لم تُختبر فعلياً |

---

### 🚫 FAKE FEATURE — واجهة فقط / بيانات وهمية

| الوحدة | الصفحات | السبب |
|---|---|---|
| **B2B Marketplace** | `/manager/b2b` | `MOCK_SUPPLIERS` مشفر مباشرة في الكود — لا يوجد backend حقيقي، الطلبات لا تُرسل |
| **Partner Program** | `/manager/partners` | `MOCK_PARTNERS` مشفر في الكود، referral code يُولَّد عشوائياً في كل تحميل، لا يُحفظ |
| **API Management** | `/admin/api` | مفاتيح API تُخزَّن في `localStorage` فقط — بيانات تجريبية كما هو موثق |
| **BI Analytics** | `/manager/bi-analytics` | 480 سطر، يستدعي بعض الـ API لكن charts تحتاج تحققاً من مصادر البيانات |
| **Tahalyli** | `/manager/tahalyli` | صفحة تقارير إضافية، استدعاء API حقيقي، لكن المحتوى يبدو مكرراً من Analytics |

---

### ❌ BROKEN / INCOMPLETE — يحتاج إعادة بناء

| الوحدة | الصفحات | المشكلة |
|---|---|---|
| **Offline Queue** | `lib/offline-queue.ts` | **141 سطر فقط** — IndexedDB بسيط، لا يوجد Conflict Resolution، لا Sync Engine حقيقي، لا يعمل عملياً في حالات فصل الإنترنت الطويلة |
| **Print Infrastructure** | `lib/thermal-printer.ts`, relay agent | الطباعة المباشرة من المتصفح غير موثوقة على Android/POS. الـ relay agent موجود لكن يحتاج تثبيت يدوي من المستخدم |
| **Warehouse Management** | `/manager/warehouse` | API موجود (4 endpoints فقط)، الـ UI يستدعيه لكن لا يوجد نموذج بيانات حقيقي للمستودعات |
| **Support System** | `/manager/support` | UI موجود لكن النظام الداخلي للتذاكر يبدو غير مكتمل |

---

### 🗑️ للحذف الفوري

| الوحدة | السبب |
|---|---|
| **B2B Marketplace** | بيانات وهمية 100%، لا قيمة وظيفية، يشتت المستخدم |
| **Partner Program** | بيانات وهمية 100%، referral code مؤقت، لا يُحفظ |

---

## المخاطر المعمارية الحرجة

### 🔴 خطر عالي

**1. `server/routes.ts` = 19,727 سطر في ملف واحد**
- أصعب ملف في المشروع للصيانة
- أي خطأ في بداية الملف يؤثر على كل الـ API
- Merge conflicts كارثية
- الحل: تقسيمه لـ modules منفصلة

**2. لا يوجد Error Tracking / Monitoring**
- لا Sentry، لا Datadog، لا حتى structured logging
- إذا انهار شيء في الإنتاج، لا تعرف أين أو متى
- الحل: إضافة structured error logging فورياً

**3. Offline Architecture شبه معدومة**
- 141 سطر لا تكفي لـ offline-first
- لا Conflict Resolution
- لا Queue Engine حقيقي
- الحل: إعادة بناء كاملة باستخدام Dexie + Background Sync

### 🟡 خطر متوسط

**4. WebSocket بدون Reconnection Logic مضمون**
- `server/websocket.ts` (603 سطر) يحتوي broadcast logic
- لكن client-side reconnection غير موثق
- الحل: Exponential backoff + Ack system

**5. No Audit Logs**
- لا يوجد تسجيل لـ: الحذف، التعديل، الخصومات، الإلغاء
- في بيئة مطعم هذا خطر أمني وتشغيلي

**6. Session Management بسيطة جداً**
- Employee session في `localStorage` فقط
- إذا فقد الجهاز، لا crash recovery

---

## خارطة الأولوية الموصى بها

```
المرحلة 1 — التثبيت (الأسبوع 1-2)
├── حذف B2B Marketplace و Partner Program
├── تقسيم routes.ts لملفات منفصلة
├── إصلاح Offline Queue الحقيقي
└── إضافة Error Logging

المرحلة 2 — تقوية الأساس (الأسبوع 3-6)
├── إعادة بناء Print Infrastructure
├── WebSocket Reconnection + Ack System
├── Audit Logs لكل العمليات الحساسة
└── Crash Recovery للـ POS

المرحلة 3 — تحسين Core (الشهر 2)
├── POS: Multi-cart، Hold Orders، Split Payment
├── Kitchen: Stations، Timers، Rush Mode
├── Inventory: Recipe Deduction التحقق والإصلاح
└── Payroll: اختبار وإصلاح الحسابات

المرحلة 4 — إعادة بناء UX (الشهر 3)
├── Cashier-first UX (أقل نقرات)
├── إزالة الـ Modals الزائدة
└── تحسين الأداء (lazy loading، caching)
```

---

## القرار النهائي

| التصنيف | العدد | النسبة |
|---|---|---|
| ✅ Stable | 14 وحدة | 42% |
| 🔧 Recoverable | 9 وحدات | 27% |
| 🚫 Fake Feature | 5 وحدات | 15% |
| ❌ Broken | 4 وحدات | 12% |
| 🗑️ للحذف | 2 وحدات | 6% |

**الخلاصة:** النظام يمتلك قاعدة صلبة في الوظائف الأساسية (POS، طلبات، مطبخ، موظفين). المشكلة الحقيقية ليست في الـ Features بل في **البنية المعمارية** — ملف واحد بـ 20 ألف سطر، لا offline حقيقي، لا error tracking، وخمس وحدات وهمية تشتت الجهد.

**التوصية الفورية:** ابدأ بحذف الوحدات الوهمية وتقسيم routes.ts قبل أي إضافة جديدة.
