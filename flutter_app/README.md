# QIROX Cafe — تطبيق Flutter الاحترافي

تطبيق موبايل كامل لإدارة الطلبات وتجربة العملاء لمقهى QIROX  
مبني بـ Flutter — يعمل على iOS وAndroid كتطبيق حقيقي (ليس WebView)

---

## الميزات الكاملة

| الميزة | الحالة | الوصف |
|--------|--------|-------|
| تسجيل الدخول بالجوال + OTP | ✅ | إرسال رمز التحقق + JWT |
| تسجيل حساب جديد | ✅ | اسم + هاتف + إيميل اختياري |
| تصفح القائمة الكاملة | ✅ | شبكة منتجات + فلتر فئات + بحث فوري |
| تفاصيل المنتج | ✅ | أحجام + إضافات + الكمية + السعر الكلي |
| سلة التسوق | ✅ | إضافة/حذف/تعديل + كوبون + رسوم توصيل |
| إتمام الطلب والدفع | ✅ | نقدي / بطاقة / Apple Pay + عناوين توصيل |
| تتبع الطلبات | ✅ | Timeline بـ 5 مراحل + تحديث كل 15 ثانية |
| سجل الطلبات | ✅ | كل الطلبات السابقة + تفاصيل كاملة |
| الملف الشخصي | ✅ | بيانات العميل + إعدادات |
| برنامج الولاء | ✅ | النقاط + المستويات الأربعة + الاستبدال |
| الإشعارات | ✅ | طلبات وعروض + Badge + مسح الكل |
| العناوين المحفوظة | ✅ | إضافة / حذف / تعيين افتراضي |
| المنتجات المفضلة | ✅ | حفظ + إضافة للسلة + حذف بالسحب |
| صفحة الدعم | ✅ | واتساب + إيميل + اتصال + FAQ |
| الإشعارات المحلية | ✅ | flutter_local_notifications |
| دعم RTL (عربية كاملة) | ✅ | IBM Plex Sans Arabic + Tajawal |

---

## البنية التقنية (Clean Architecture)

```
flutter_app/
├── lib/
│   ├── main.dart                    ← نقطة الدخول (Hive + تهيئة)
│   ├── app.dart                     ← MaterialApp + BLoC Providers + GoRouter
│   │
│   ├── core/                        ← الطبقة الأساسية المشتركة
│   │   ├── constants/               ← ألوان، نصوص، إعدادات التطبيق
│   │   ├── network/                 ← Dio + Auth Interceptor + API Endpoints
│   │   ├── router/                  ← GoRouter + جميع المسارات + Transitions
│   │   ├── services/                ← PushNotificationService (FCM)
│   │   ├── storage/                 ← SecureStorage (JWT + بيانات حساسة)
│   │   ├── theme/                   ← Light Theme + Dark Theme كاملان
│   │   └── utils/                   ← Currency, Validators, Date formatters
│   │
│   ├── features/                    ← ميزة مستقلة بذاتها (data/domain/presentation)
│   │   ├── auth/                    ← splash + onboarding + login + OTP + register
│   │   ├── home/                    ← الصفحة الرئيسية + Bottom Navigation Shell
│   │   ├── products/                ← القائمة + تفاصيل المنتج (BLoC)
│   │   ├── cart/                    ← السلة (Cubit: add/remove/qty/coupon)
│   │   ├── checkout/                ← الدفع + شاشة نجاح الطلب
│   │   ├── orders/                  ← الطلبات + التفاصيل + التتبع المباشر
│   │   ├── profile/                 ← الملف الشخصي + العناوين + المفضلة
│   │   ├── loyalty/                 ← النقاط والمستويات الأربعة
│   │   ├── notifications/           ← الإشعارات مع API حقيقي
│   │   └── support/                 ← الدعم: واتساب + إيميل + FAQ قابل للتوسع
│   │
│   └── shared/widgets/              ← AppButton، AppTextField، Shimmer، EmptyState
│
├── android/                         ← AndroidManifest + build.gradle
├── ios/                             ← Info.plist + Runner
├── pubspec.yaml                     ← جميع المكتبات مع الإصدارات
└── codemagic.yaml                   ← CI/CD تلقائي (App Store + Google Play)
```

---

## المكتبات الأساسية

| المكتبة | الإصدار | الغرض |
|---------|---------|-------|
| `flutter_bloc` | ^8.1.6 | إدارة الحالة (BLoC/Cubit) |
| `go_router` | ^14.2.0 | التنقل + Deep Links |
| `dio` | ^5.4.3 | HTTP مع Interceptors |
| `flutter_secure_storage` | ^9.0.0 | حفظ JWT بتشفير |
| `hive_flutter` | ^1.1.0 | قاعدة بيانات محلية |
| `cached_network_image` | ^3.3.1 | صور من الانترنت مع Cache |
| `shimmer` | ^3.0.0 | تأثير Skeleton Loading |
| `carousel_slider` | ^4.2.1 | البانرات الدوارة |
| `flutter_local_notifications` | ^17.1.2 | الإشعارات المحلية |
| `url_launcher` | ^6.3.0 | واتساب / إيميل / هاتف |
| `lottie` | ^3.1.0 | رسوميات Lottie |
| `badges` | ^3.1.2 | Badge على السلة |
| `timeago` | ^3.6.1 | "منذ 5 دقائق" |
| `flutter_rating_bar` | ^4.0.1 | نجوم التقييم |
| `equatable` | ^2.0.5 | مقارنة الكائنات في BLoC |
| `smooth_page_indicator` | ^1.1.0 | نقاط Onboarding |

---

## إعداد وتشغيل المشروع

### المتطلبات

```bash
# تحقق من البيئة
flutter doctor

# الإصدارات المطلوبة:
# Flutter SDK: >=3.22.0
# Dart SDK:    >=3.3.0
# Android:     Android Studio + JDK 17
# iOS:         Xcode 15+ (Mac فقط)
```

### الخطوات

```bash
# دخول مجلد Flutter
cd flutter_app

# تثبيت المكتبات
flutter pub get

# تشغيل (على محاكي أو جهاز متصل)
flutter run

# بناء للإنتاج
flutter build ipa --release         # iOS
flutter build appbundle --release   # Android
```

### إعداد رابط الباكند

عدّل الملف التالي:

```
flutter_app/lib/core/constants/app_config.dart
```

```dart
static const String baseUrl = 'https://your-app.replit.app';
// ↑ غيّر هذا إلى رابط Replit الخاص بك
```

---

## المصادقة (JWT)

التطبيق يستخدم JWT tokens مع كل طلب API.

**Endpoints المطلوبة من الباكند:**
```
POST /api/customers/send-otp     → إرسال OTP للهاتف
POST /api/customers/verify-otp   → التحقق من OTP → يُعيد JWT token
POST /api/customers/register     → تسجيل عميل جديد → JWT token
GET  /api/customers/profile      → بيانات العميل (Bearer token)
POST /api/customers/fcm-token    → تسجيل FCM token للإشعارات
```

**مسار المصادقة:**
```
هاتف → OTP → JWT token → SecureStorage → Bearer header في كل طلب
```

---

## النشر التلقائي مع Codemagic

1. أنشئ حساب على https://codemagic.io
2. اربط مستودع GitHub
3. Codemagic يقرأ `codemagic.yaml` تلقائياً
4. أضف في Codemagic (Environment Variables):
   - `APP_STORE_CONNECT_ISSUER_ID`
   - `APP_STORE_CONNECT_KEY_IDENTIFIER`
   - `APP_STORE_CONNECT_PRIVATE_KEY`
   - `KEY_JKS` (Android Keystore مشفّر بـ base64)
5. شغّل البناء — يرفع تلقائياً على TestFlight + Google Play Internal

---

## إضافة Firebase FCM (اختياري للإشعارات الحقيقية)

1. أنشئ مشروع في https://console.firebase.google.com
2. أضف `google-services.json` في `android/app/`
3. أضف `GoogleService-Info.plist` في `ios/Runner/`
4. أضف في `pubspec.yaml`:
   ```yaml
   firebase_core: ^2.30.1
   firebase_messaging: ^14.9.1
   ```
5. في `main.dart` أضف: `await Firebase.initializeApp()`
6. في `push_notification_service.dart`: استبدل الـ token بـ FCM token الحقيقي

---

**QIROX Systems © 2026 — Build systems. Stay human.**
