---
name: Paymob checkout and iOS return
description: Paymob Saudi integration ID requirements and the app's direct checkout and iOS return behavior.
---

يحتاج Paymob Unified Checkout إلى معرّفات تكامل صالحة ضمن `payment_methods`. تُهيأ معرّفات البطاقات وApple Pay كلٌ على حدة، ومعرّفات Apple Pay المتاحة هي Live فقط. لا تعرض طريقة دفع قبل وجود معرّفها الصحيح.

بعد تأكيد الطلب، افتح بوابة الدفع مباشرة دون نقرة ثانية. في تطبيق Flutter على iOS، افتح بوابة الدفع في Safari واحتفظ بمسار الرجوع إلى التطبيق والتحقق من حالة الدفع بعد استئنافه.

**Why:** وثائق Paymob تجعل `payment_methods` حقلاً مطلوباً، والعميل طلب فتح الدفع مباشرةً مع العودة إلى التطبيق على iOS.

**How to apply:** عند تعديل أي مسار دفع، وحّد سلوك صفحة إتمام الطلب والنافذة المنبثقة، وتحقق من معرّفات التكامل قبل إنشاء نية الدفع، ثم تحقق من الدفع بعد عودة التطبيق.
