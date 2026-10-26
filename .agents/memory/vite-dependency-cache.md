---
name: Vite dependency cache recovery
description: Recovery path for stale optimized dependencies causing browser module-load failures in the Replit dev preview.
---

عند ظهور فشل تحميل module أو CORS يتبعه خطأ React hooks في معاينة التطوير، بينما الخادم يعمل والبناء سليم، امسح ذاكرة Vite المولّدة داخل `node_modules/.vite` وأعد تشغيل workflow ليعيد تحسين الاعتماديات.

**Why:** تحديث cache المولّد جعل Vite يعيد تحسين الاعتماديات، وبعد إعادة التشغيل اختفت أخطاء المتصفح واستعادت الصفحات العامة وتسجيل الإدارة العرض.

**How to apply:** استخدم هذا كخطوة تشخيصية منخفضة المخاطر قبل تعديل React أو استبدال المكتبات؛ لا تحذف `node_modules` أو lockfiles، وتحقق من المتصفح بعد إعادة التشغيل.
