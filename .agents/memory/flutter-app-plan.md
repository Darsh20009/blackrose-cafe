---
name: Flutter App Development Plan — Comprehensive Permanent Reference
description: خطة شاملة ودائمة ونهائية لبناء تطبيق Flutter احترافي من الصفر — تشمل كل التفاصيل بدون اختصارات. صالحة لتحويل أي تطبيق ويب إلى Flutter.
---

# دليل بناء تطبيق Flutter احترافي — مرجع دائم وشامل بدون اختصارات

**تاريخ الإنشاء:** 1 يوليو 2026
**المشروع المرجعي:** BLACK ROSE CAFE / QIROX Cafe
**الباكند:** Node.js + Express + MongoDB Atlas (موجود في Replit)
**ملاحظة:** هذا المستند مرجع دائم قابل لإعادة الاستخدام في أي مشروع Flutter مستقبلي.

---

## القسم الأول: لماذا Flutter وليس WebView أو React Native؟

### مقارنة شاملة بين الخيارات:

| المعيار | Flutter | React Native | WebView |
|---------|---------|--------------|---------|
| الأداء | ممتاز — Skia/Impeller renderer مباشر | جيد — JS Bridge | ضعيف — متصفح كامل |
| مظهر iOS | Cupertino widgets أصلية | محدود | لا يوجد |
| مظهر Android | Material Design كامل | محدود | لا يوجد |
| لغة البرمجة | Dart — سهل وسريع التعلم | JavaScript/TypeScript | HTML/CSS/JS |
| حجم التطبيق | صغير نسبياً | متوسط | كبير |
| حالة بدون انترنت | دعم كامل | جزئي | لا يعمل |
| رسوميات مخصصة | تحكم كامل في كل بكسل | محدود | لا |
| دعم Google | رسمي | لا | لا |
| مجتمع المطورين | ضخم ومتنامي | ضخم | ضعيف |
| نشر iOS + Android | ملف Dart واحد | ملف JS واحد | ملف واحد |

### الخلاصة: Flutter هو الخيار الأمثل لتطبيق احترافي يعمل كتطبيق حقيقي (ليس WebView).

---

## القسم الثاني: متطلبات البيئة الكاملة قبل البدء

### على الجهاز المحلي (ضروري للتطوير):

```
١. Flutter SDK الإصدار 3.22 أو أحدث
   - التحميل من: https://flutter.dev/docs/get-started/install
   - التحقق من التثبيت: flutter doctor

٢. Dart SDK (مدمج تلقائياً مع Flutter، لا حاجة لتثبيته منفصلاً)

٣. لبناء تطبيق Android:
   - Android Studio (يحتوي على Android SDK)
   - Android Emulator للاختبار
   - Java Development Kit (JDK) الإصدار 17

٤. لبناء تطبيق iOS (يتطلب جهاز Mac فقط):
   - Xcode الإصدار 15 أو أحدث
   - CocoaPods: تثبيت بالأمر: sudo gem install cocoapods
   - iOS Simulator للاختبار
   - حساب Apple Developer (99 دولار سنوياً للنشر على App Store)

٥. محرر الكود:
   - VS Code مع إضافة Flutter + Dart (الأنسب)
   - أو Android Studio مع إضافة Flutter
```

### للنشر السحابي التلقائي (Continuous Integration / Continuous Deployment):

```
Codemagic (https://codemagic.io):
- يبني iOS + Android تلقائياً على خوادم Mac في السحابة
- لا يتطلب جهاز Mac محلياً لبناء iOS
- يرفع التطبيق تلقائياً على App Store + Google Play
- ملف الإعداد: codemagic.yaml في جذر مجلد Flutter
- الخطة المجانية: 500 دقيقة شهرياً
```

---

## القسم الثالث: هيكل المجلدات الكامل والاحترافي

```
flutter_app/                          ← المجلد الجذر لمشروع Flutter
│
├── lib/                              ← كل كود Dart هنا
│   │
│   ├── main.dart                     ← نقطة الدخول الوحيدة للتطبيق
│   │                                    يحتوي على: WidgetsFlutterBinding.ensureInitialized()
│   │                                    تهيئة Hive، Firebase، اتجاه الشاشة، runApp()
│   │
│   ├── app.dart                      ← MaterialApp / CupertinoApp الرئيسي
│   │                                    يحتوي على: MultiBlocProvider، GoRouter، الثيم، اللغة
│   │
│   ├── core/                         ← الطبقة الأساسية — مشتركة بين كل الميزات
│   │   │
│   │   ├── constants/                ← الثوابت التي لا تتغير
│   │   │   ├── app_colors.dart       ← كل الألوان (light + dark)
│   │   │   ├── app_text_styles.dart  ← كل أنماط النص (حجم، وزن، خط)
│   │   │   ├── app_strings.dart      ← كل النصوص الثابتة (عربي/إنجليزي)
│   │   │   └── app_config.dart       ← BASE_URL، اسم التطبيق، timeouts، رقم الإصدار
│   │   │
│   │   ├── theme/                    ← نظام الثيم
│   │   │   ├── app_theme.dart        ← Light Theme + Dark Theme كاملان
│   │   │   └── app_typography.dart   ← نظام الخطوط (IBM Plex Sans Arabic)
│   │   │
│   │   ├── router/                   ← نظام التنقل بين الشاشات
│   │   │   └── app_router.dart       ← GoRouter: كل المسارات، التوجيه، الحماية
│   │   │
│   │   ├── network/                  ← طبقة الشبكة
│   │   │   ├── api_client.dart       ← Dio instance + Interceptors (Auth، Refresh، Logging)
│   │   │   ├── api_endpoints.dart    ← كل روابط API مركزية في مكان واحد
│   │   │   └── network_exceptions.dart ← تحويل أخطاء الشبكة لرسائل مفهومة
│   │   │
│   │   ├── storage/                  ← التخزين المحلي
│   │   │   ├── local_storage.dart    ← SharedPreferences: الإعدادات البسيطة
│   │   │   └── secure_storage.dart   ← flutter_secure_storage: التوكنات والبيانات الحساسة
│   │   │
│   │   └── utils/                    ← الأدوات المساعدة
│   │       ├── validators.dart       ← التحقق من صحة الإدخال (هاتف، إيميل، كلمة مرور)
│   │       ├── date_utils.dart       ← تنسيق التواريخ بالعربي
│   │       └── currency_utils.dart   ← تنسيق العملة بالريال السعودي
│   │
│   ├── features/                     ← كل ميزة في مجلدها المنعزل تماماً
│   │   │
│   │   ├── auth/                     ← تسجيل الدخول والتسجيل
│   │   │   ├── data/
│   │   │   │   ├── models/
│   │   │   │   │   └── customer_model.dart   ← نموذج بيانات العميل
│   │   │   │   └── repositories/
│   │   │   │       └── auth_repository.dart  ← منطق المصادقة
│   │   │   ├── domain/
│   │   │   │   ├── entities/
│   │   │   │   │   └── user_entity.dart
│   │   │   │   └── usecases/
│   │   │   │       ├── login_usecase.dart
│   │   │   │       └── register_usecase.dart
│   │   │   └── presentation/
│   │   │       ├── bloc/
│   │   │       │   ├── auth_cubit.dart       ← منطق حالة المصادقة
│   │   │       │   └── auth_state.dart       ← حالات: Initial، Loading، Authenticated، Error
│   │   │       └── pages/
│   │   │           ├── splash_page.dart      ← شاشة البداية (الشعار + التحقق من الجلسة)
│   │   │           ├── onboarding_page.dart  ← ٣ شاشات تعريفية
│   │   │           ├── login_page.dart       ← تسجيل الدخول برقم الجوال
│   │   │           ├── otp_page.dart         ← إدخال رمز التحقق
│   │   │           └── register_page.dart    ← إنشاء حساب جديد
│   │   │
│   │   ├── home/                     ← الصفحة الرئيسية
│   │   │   └── presentation/
│   │   │       └── pages/
│   │   │           ├── home_page.dart        ← البانرات، الفئات، المنتجات المميزة
│   │   │           └── main_shell_page.dart  ← Bottom Navigation Bar (التنقل الرئيسي)
│   │   │
│   │   ├── products/                 ← المنتجات والقائمة
│   │   │   ├── data/
│   │   │   │   └── models/
│   │   │   │       └── product_model.dart    ← نموذج المنتج (id، اسم، سعر، صور، إضافات)
│   │   │   └── presentation/
│   │   │       ├── cubit/
│   │   │       │   ├── products_cubit.dart   ← تحميل، بحث، فلترة المنتجات
│   │   │       │   └── products_state.dart   ← Initial، Loading، Loaded، Error
│   │   │       └── pages/
│   │   │           ├── menu_page.dart        ← شبكة المنتجات مع فلتر الفئات والبحث
│   │   │           └── product_detail_page.dart ← تفاصيل المنتج، الأحجام، الإضافات، الكمية
│   │   │
│   │   ├── cart/                     ← سلة التسوق
│   │   │   ├── data/
│   │   │   │   └── models/
│   │   │   │       └── cart_item_model.dart  ← منتج + كمية + حجم + إضافات
│   │   │   └── presentation/
│   │   │       ├── cubit/
│   │   │       │   ├── cart_cubit.dart       ← إضافة، حذف، تعديل الكمية، الكوبون، رسوم التوصيل
│   │   │       │   └── cart_state.dart       ← قائمة العناصر، المجموع، الخصم، إجمالي
│   │   │       └── pages/
│   │   │           └── cart_page.dart        ← قائمة السلة، ملخص الأسعار، زر الدفع
│   │   │
│   │   ├── checkout/                 ← الدفع وإتمام الطلب
│   │   │   └── presentation/
│   │   │       └── pages/
│   │   │           ├── checkout_page.dart    ← طريقة التوصيل، الدفع، الكوبون، ملاحظات
│   │   │           └── order_success_page.dart ← شاشة نجاح الطلب مع رقم الطلب
│   │   │
│   │   ├── orders/                   ← الطلبات وتتبعها
│   │   │   ├── data/
│   │   │   │   └── models/
│   │   │   │       └── order_model.dart      ← نموذج الطلب (رقم، حالة، عناصر، تاريخ)
│   │   │   └── presentation/
│   │   │       ├── cubit/
│   │   │       │   ├── orders_cubit.dart     ← جلب الطلبات، تحديث الحالة
│   │   │       │   └── orders_state.dart     ← Loading، Loaded، Error
│   │   │       └── pages/
│   │   │           ├── orders_page.dart      ← قائمة الطلبات السابقة
│   │   │           ├── order_detail_page.dart ← تفاصيل طلب واحد
│   │   │           └── order_tracking_page.dart ← تتبع الطلب بـ timeline مباشر
│   │   │
│   │   ├── profile/                  ← الملف الشخصي
│   │   │   └── presentation/
│   │   │       └── pages/
│   │   │           ├── profile_page.dart     ← البيانات الشخصية، الإعدادات، تسجيل الخروج
│   │   │           ├── edit_profile_page.dart ← تعديل الاسم والإيميل
│   │   │           ├── addresses_page.dart   ← عناوين التوصيل المحفوظة
│   │   │           └── favorites_page.dart   ← المنتجات المفضلة
│   │   │
│   │   ├── loyalty/                  ← برنامج الولاء والنقاط
│   │   │   └── presentation/
│   │   │       └── pages/
│   │   │           └── loyalty_page.dart     ← بطاقة النقاط، المستوى، تاريخ التحويلات
│   │   │
│   │   └── notifications/            ← الإشعارات
│   │       └── presentation/
│   │           └── pages/
│   │               └── notifications_page.dart ← قائمة الإشعارات المستلمة
│   │
│   └── shared/                       ← مكونات مشتركة بين جميع الميزات
│       └── widgets/
│           ├── app_button.dart       ← زر موحد مع حالة التحميل
│           ├── app_text_field.dart   ← حقل إدخال موحد مع validation
│           ├── empty_state.dart      ← شاشة "لا توجد بيانات"
│           ├── loading_overlay.dart  ← طبقة تحميل فوق الشاشة
│           └── shimmer_box.dart      ← هيكل تحميل Skeleton
│
├── assets/                           ← الملفات الثابتة
│   ├── images/                       ← الصور (logo.png, onboarding1.png, ...)
│   ├── icons/                        ← الأيقونات المخصصة
│   ├── fonts/                        ← ملفات الخطوط (IBMPlexSansArabic-*.ttf)
│   └── animations/                   ← ملفات Lottie (JSON) للرسوميات
│
├── test/                             ← ملفات الاختبار
│   ├── unit/                         ← اختبار المنطق والدوال
│   ├── widget/                       ← اختبار الواجهات
│   └── integration/                  ← اختبار المسارات الكاملة
│
├── android/                          ← إعدادات Android الأصلية
│   └── app/
│       ├── build.gradle              ← إصدار التطبيق، الحزم، الصلاحيات
│       ├── google-services.json      ← إعداد Firebase لـ Android (يتم تحميله من Firebase Console)
│       └── src/main/
│           ├── AndroidManifest.xml   ← الصلاحيات: انترنت، كاميرا، موقع، إشعارات
│           └── kotlin/...            ← كود Android الأصلي (إذا احتجنا)
│
├── ios/                              ← إعدادات iOS الأصلية
│   └── Runner/
│       ├── Info.plist                ← اسم التطبيق، الصلاحيات، Bundle ID
│       ├── AppDelegate.swift         ← نقطة دخول iOS الأصلية
│       └── GoogleService-Info.plist  ← إعداد Firebase لـ iOS (يتم تحميله من Firebase Console)
│
├── pubspec.yaml                      ← كل تبعيات التطبيق (dependencies)
├── pubspec.lock                      ← نسخ محددة من كل تبعية
├── codemagic.yaml                    ← إعداد البناء والنشر التلقائي
└── README.md                         ← وثائق المشروع
```

---

## القسم الرابع: ملف pubspec.yaml الكامل مع شرح كل مكتبة

```yaml
name: qirox_cafe
description: تطبيق قهوة احترافي لـ iOS وAndroid — مبني بـ Flutter
publish_to: none
version: 1.0.0+1

environment:
  sdk: ">=3.3.0 <4.0.0"
  flutter: ">=3.22.0"

dependencies:
  flutter:
    sdk: flutter
  flutter_localizations:
    sdk: flutter

  # إدارة الحالة (State Management)
  flutter_bloc: ^8.1.6          # نمط BLoC/Cubit لفصل المنطق عن الواجهة
  equatable: ^2.0.5             # مقارنة كائنات Dart بدون boilerplate

  # التنقل بين الشاشات (Navigation)
  go_router: ^14.2.0            # Declarative routing — أفضل من Navigator مباشرة

  # طلبات الشبكة (Network)
  dio: ^5.4.3                   # HTTP client متقدم مع interceptors
  pretty_dio_logger: ^1.3.1     # طباعة طلبات API بشكل منسق في وضع التطوير

  # التخزين المحلي (Local Storage)
  shared_preferences: ^2.2.3    # حفظ إعدادات بسيطة (ثيم، لغة)
  flutter_secure_storage: ^9.0.0 # حفظ التوكنات والبيانات الحساسة بتشفير
  hive_flutter: ^1.1.0          # قاعدة بيانات محلية سريعة (للعمل بدون انترنت)

  # الواجهة والتصميم (User Interface)
  cached_network_image: ^3.3.1  # تحميل الصور من الانترنت مع cache محلي
  shimmer: ^3.0.0               # تأثير الـ skeleton عند التحميل
  lottie: ^3.1.0                # تشغيل ملفات Lottie للرسوميات
  flutter_svg: ^2.0.10          # عرض ملفات SVG (أيقونات عالية الجودة)
  google_fonts: ^6.2.1          # خطوط Google بدون تنزيل يدوي
  animations: ^2.0.11           # انتقالات احترافية بين الصفحات
  smooth_page_indicator: ^1.1.0 # نقاط المؤشر للـ Onboarding
  carousel_slider: ^4.2.1       # عارض البانرات الدوارة

  # المصادقة (Authentication)
  firebase_auth: ^4.19.4        # تسجيل الدخول بـ Google + رقم الجوال
  google_sign_in: ^6.2.1        # تسجيل الدخول بحساب Google
  sign_in_with_apple: ^6.1.0    # تسجيل الدخول بـ Apple ID (مطلوب على iOS)

  # Firebase (الأساسي + الإشعارات)
  firebase_core: ^2.30.1        # أساسي — يجب تهيئته أولاً
  firebase_messaging: ^14.9.1   # إشعارات Push (FCM)
  flutter_local_notifications: ^17.1.2 # عرض الإشعارات داخل التطبيق

  # الدفع الإلكتروني (Payments)
  flutter_stripe: ^10.1.1       # Stripe SDK للدفع بالبطاقة
  pay: ^2.0.0                   # Apple Pay + Google Pay

  # الخرائط والموقع (Maps & Location)
  google_maps_flutter: ^2.6.0   # خريطة Google Maps
  geolocator: ^11.0.0           # الحصول على موقع المستخدم
  geocoding: ^3.0.0             # تحويل الإحداثيات لعناوين نصية

  # الوسائط (Media)
  image_picker: ^1.1.1          # اختيار صور من الجهاز أو الكاميرا

  # أدوات مساعدة (Utilities)
  intl: ^0.19.0                 # تنسيق التواريخ والأرقام والعملات
  url_launcher: ^6.3.0          # فتح روابط خارجية في المتصفح
  share_plus: ^9.0.0            # مشاركة النص والصور
  connectivity_plus: ^6.0.3     # معرفة حالة الانترنت
  package_info_plus: ^8.0.0     # معلومات التطبيق (الاسم، الإصدار)
  permission_handler: ^11.3.1   # طلب صلاحيات الجهاز (كاميرا، موقع، إشعارات)
  flutter_rating_bar: ^4.0.1    # نجوم التقييم القابلة للتفاعل
  badges: ^3.1.2                # Badge الأحمر فوق أيقونة السلة
  timeago: ^3.6.1               # تحويل التواريخ لـ "منذ دقيقتين"

dev_dependencies:
  flutter_test:
    sdk: flutter
  bloc_test: ^9.1.7             # اختبار الـ BLoC/Cubit
  mocktail: ^1.0.3              # محاكاة الـ dependencies في الاختبارات
  build_runner: ^2.4.9          # تشغيل Code Generators
  hive_generator: ^2.0.1        # توليد adapters لـ Hive
  json_annotation: ^4.9.0       # annotations لـ JSON serialization
  json_serializable: ^6.8.0     # توليد كود JSON تلقائياً
  flutter_lints: ^4.0.0         # قواعد جودة الكود

flutter:
  uses-material-design: true

  # الخطوط
  fonts:
    - family: IBMPlexSansArabic
      fonts:
        - asset: assets/fonts/IBMPlexSansArabic-Regular.ttf
        - asset: assets/fonts/IBMPlexSansArabic-Medium.ttf
          weight: 500
        - asset: assets/fonts/IBMPlexSansArabic-SemiBold.ttf
          weight: 600
        - asset: assets/fonts/IBMPlexSansArabic-Bold.ttf
          weight: 700

  # الأصول (Assets)
  assets:
    - assets/images/
    - assets/icons/
    - assets/animations/
```

---

## القسم الخامس: نمط BLoC — الشرح الكامل والمثال التطبيقي

### لماذا BLoC/Cubit؟
- **فصل المنطق عن الواجهة** — الواجهة لا تعرف كيف تجلب البيانات
- **قابلية الاختبار** — يمكن اختبار المنطق بدون واجهة
- **إعادة الاستخدام** — نفس الـ Cubit يمكن استخدامه في أكثر من شاشة
- **تتبع الحالة** — كل تغيير في البيانات يمر بحالة واضحة (Loading، Loaded، Error)

### مثال تطبيقي كامل: ProductsCubit

```dart
// ---- الحالات (States) ----
// lib/features/products/presentation/cubit/products_state.dart

import 'package:equatable/equatable.dart';
import '../../data/models/product_model.dart';
import '../../data/models/category_model.dart';

abstract class ProductsState extends Equatable {}

class ProductsInitial extends ProductsState {
  @override List<Object> get props => [];
}

class ProductsLoading extends ProductsState {
  @override List<Object> get props => [];
}

class ProductsLoaded extends ProductsState {
  final List<ProductModel> products;          // المنتجات المعروضة (بعد الفلتر والبحث)
  final List<ProductModel> allProducts;       // كل المنتجات (النسخة الأصلية)
  final List<CategoryModel> categories;      // كل الفئات
  final String? selectedCategory;            // الفئة المختارة حالياً
  final String searchQuery;                  // نص البحث الحالي

  const ProductsLoaded({
    required this.products,
    required this.allProducts,
    required this.categories,
    this.selectedCategory,
    this.searchQuery = '',
  });

  @override List<Object?> get props => [products, allProducts, categories, selectedCategory, searchQuery];
}

class ProductsError extends ProductsState {
  final String message;
  const ProductsError(this.message);
  @override List<Object> get props => [message];
}

// ---- الـ Cubit (المنطق) ----
// lib/features/products/presentation/cubit/products_cubit.dart

import 'package:flutter_bloc/flutter_bloc.dart';
import '../../data/models/product_model.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/network/api_endpoints.dart';
import 'products_state.dart';

class ProductsCubit extends Cubit<ProductsState> {
  ProductsCubit() : super(ProductsInitial());

  // تحميل كل البيانات من API
  Future<void> loadAll() async {
    emit(ProductsLoading());
    try {
      // نجلب المنتجات والفئات بشكل متوازٍ
      final results = await Future.wait([
        ApiClient().get(ApiEndpoints.products),
        ApiClient().get(ApiEndpoints.categories),
      ]);

      final products = (results[0].data as List)
          .map((json) => ProductModel.fromJson(json))
          .toList();

      final categories = (results[1].data as List)
          .map((json) => CategoryModel.fromJson(json))
          .toList();

      emit(ProductsLoaded(
        products: products,
        allProducts: products,
        categories: categories,
      ));
    } catch (error) {
      emit(ProductsError('فشل في تحميل المنتجات. تحقق من الانترنت وحاول مرة أخرى.'));
    }
  }

  // فلترة حسب الفئة
  void filterByCategory(String? categoryId) {
    final currentState = state;
    if (currentState is! ProductsLoaded) return;

    final filtered = categoryId == null
        ? currentState.allProducts
        : currentState.allProducts.where((p) => p.categoryId == categoryId).toList();

    emit(ProductsLoaded(
      products: _applySearch(filtered, currentState.searchQuery),
      allProducts: currentState.allProducts,
      categories: currentState.categories,
      selectedCategory: categoryId,
      searchQuery: currentState.searchQuery,
    ));
  }

  // بحث بالنص
  void search(String query) {
    final currentState = state;
    if (currentState is! ProductsLoaded) return;

    final baseList = currentState.selectedCategory == null
        ? currentState.allProducts
        : currentState.allProducts.where((p) => p.categoryId == currentState.selectedCategory).toList();

    emit(ProductsLoaded(
      products: _applySearch(baseList, query),
      allProducts: currentState.allProducts,
      categories: currentState.categories,
      selectedCategory: currentState.selectedCategory,
      searchQuery: query,
    ));
  }

  List<ProductModel> _applySearch(List<ProductModel> list, String query) {
    if (query.isEmpty) return list;
    return list.where((p) =>
      p.nameAr.contains(query) ||
      p.nameEn.toLowerCase().contains(query.toLowerCase()) ||
      p.descriptionAr.contains(query)
    ).toList();
  }
}
```

---

## القسم السادس: طبقة الشبكة الكاملة — Dio مع Interceptors

```dart
// lib/core/network/api_client.dart

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:pretty_dio_logger/pretty_dio_logger.dart';
import '../storage/secure_storage.dart';
import 'api_endpoints.dart';
import 'network_exceptions.dart';

class ApiClient {
  static final ApiClient _instance = ApiClient._internal();
  factory ApiClient() => _instance;

  late final Dio _dio;

  ApiClient._internal() {
    _dio = Dio(BaseOptions(
      baseUrl: ApiEndpoints.baseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 30),
      sendTimeout: const Duration(seconds: 30),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Language': 'ar',
      },
    ));

    _dio.interceptors.addAll([
      _AuthInterceptor(),       // يضيف Bearer token في كل طلب
      _RetryInterceptor(),      // يعيد المحاولة عند انقطاع الشبكة
      if (kDebugMode) PrettyDioLogger(
        requestHeader: true,
        requestBody: true,
        responseBody: true,
        responseHeader: false,
        error: true,
        compact: true,
      ),
    ]);
  }

  Future<Response> get(String path, {Map<String, dynamic>? queryParams}) async {
    try {
      return await _dio.get(path, queryParameters: queryParams);
    } on DioException catch (error) {
      throw NetworkException.fromDioError(error);
    }
  }

  Future<Response> post(String path, {dynamic data}) async {
    try {
      return await _dio.post(path, data: data);
    } on DioException catch (error) {
      throw NetworkException.fromDioError(error);
    }
  }

  Future<Response> patch(String path, {dynamic data}) async {
    try {
      return await _dio.patch(path, data: data);
    } on DioException catch (error) {
      throw NetworkException.fromDioError(error);
    }
  }

  Future<Response> delete(String path) async {
    try {
      return await _dio.delete(path);
    } on DioException catch (error) {
      throw NetworkException.fromDioError(error);
    }
  }
}

// Interceptor المصادقة — يضيف التوكن تلقائياً
class _AuthInterceptor extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    final token = await SecureStorage.getToken();
    if (token != null && token.isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  void onError(DioException error, ErrorInterceptorHandler handler) async {
    // إذا انتهت صلاحية التوكن (401)، نحاول تجديده
    if (error.response?.statusCode == 401) {
      // هنا يمكن إضافة منطق تجديد التوكن
      // إذا فشل التجديد، نوجه المستخدم لشاشة تسجيل الدخول
    }
    handler.next(error);
  }
}

// Interceptor إعادة المحاولة
class _RetryInterceptor extends Interceptor {
  @override
  void onError(DioException error, ErrorInterceptorHandler handler) async {
    // نعيد المحاولة مرة واحدة عند انقطاع الاتصال
    if (error.type == DioExceptionType.connectionError) {
      await Future.delayed(const Duration(seconds: 2));
      try {
        final response = await ApiClient()._dio.request(
          error.requestOptions.path,
          options: Options(method: error.requestOptions.method),
          data: error.requestOptions.data,
          queryParameters: error.requestOptions.queryParameters,
        );
        return handler.resolve(response);
      } catch (_) {}
    }
    handler.next(error);
  }
}
```

---

## القسم السابع: نقاط API الكاملة (كل روابط الباكند)

```dart
// lib/core/network/api_endpoints.dart

class ApiEndpoints {
  // رابط الباكند الأساسي — يجب تغييره حسب البيئة
  static const String baseUrl = 'https://your-replit-app.replit.app';

  // ---- المصادقة ----
  static const String customerLogin      = '/api/customers/login';
  static const String customerRegister   = '/api/customers/register';
  static const String customerLogout     = '/api/customers/logout';
  static const String customerProfile    = '/api/customers/me';
  static const String verifyPhone        = '/api/customers/verify-phone';
  static const String forgotPassword     = '/api/customers/forgot-password';
  static const String resetPassword      = '/api/customers/reset-password';
  static const String fcmToken           = '/api/customers/fcm-token';  // لإشعارات FCM

  // ---- المنتجات والقائمة ----
  static const String products           = '/api/coffee-items';
  static const String categories         = '/api/menu-categories';
  static const String productAddons      = '/api/product-addons';
  static const String customBanners      = '/api/custom-banners';

  // ---- السلة ----
  static const String cart               = '/api/cart';

  // ---- الطلبات ----
  static const String orders             = '/api/orders';
  static String orderById(String id)     => '/api/orders/$id';
  static String orderStatus(String id)   => '/api/orders/$id/status';

  // ---- برنامج الولاء ----
  static const String loyaltySettings    = '/api/public/loyalty-settings';
  static const String loyaltyCard        = '/api/loyalty/card';
  static const String loyaltyRedeem      = '/api/loyalty/redeem';

  // ---- بطاقات الهدايا ----
  static String giftCardValidate(String code) => '/api/gift-cards/$code/validate';
  static String giftCardRedeem(String code)   => '/api/gift-cards/$code/redeem-customer';

  // ---- الكوبونات ----
  static String validateCoupon(String code) => '/api/promo-codes/validate?code=$code';

  // ---- إعدادات المتجر ----
  static const String businessConfig     = '/api/business-config';
  static const String branches           = '/api/branches';
  static const String paymentMethods     = '/api/payment-methods';

  // ---- الحجوزات ----
  static const String reservations       = '/api/product-reservations/customer';
}
```

---

## القسم الثامن: نظام الثيم الكامل (Light + Dark)

```dart
// lib/core/theme/app_theme.dart

import 'package:flutter/material.dart';
import '../constants/app_colors.dart';

class AppTheme {
  // ---- الثيم الفاتح ----
  static ThemeData light() {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      colorScheme: const ColorScheme.light(
        primary: AppColors.primary,
        onPrimary: Colors.white,
        secondary: AppColors.primaryDark,
        error: AppColors.error,
        surface: Colors.white,
        onSurface: AppColors.textPrimaryLight,
      ),
      fontFamily: 'IBMPlexSansArabic',
      scaffoldBackgroundColor: const Color(0xFFFDFDFD),

      // شريط العنوان
      appBarTheme: const AppBarTheme(
        backgroundColor: Color(0xFFFDFDFD),
        foregroundColor: AppColors.textPrimaryLight,
        elevation: 0,
        centerTitle: true,
        titleTextStyle: TextStyle(
          fontSize: 17, fontWeight: FontWeight.w700,
          color: AppColors.textPrimaryLight,
          fontFamily: 'IBMPlexSansArabic',
        ),
      ),

      // البطاقات
      cardTheme: CardTheme(
        color: Colors.white,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: AppColors.borderLight),
        ),
      ),

      // حقول الإدخال
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: const Color(0xFFF4F4F5),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        hintStyle: const TextStyle(color: AppColors.textSecondaryLight, fontFamily: 'IBMPlexSansArabic'),
      ),

      // الأزرار الرئيسية
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          minimumSize: const Size(double.infinity, 52),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, fontFamily: 'IBMPlexSansArabic'),
          elevation: 0,
        ),
      ),

      // شريط التنقل السفلي
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: Colors.white,
        selectedItemColor: AppColors.primary,
        unselectedItemColor: AppColors.textSecondaryLight,
        type: BottomNavigationBarType.fixed,
        elevation: 8,
        selectedLabelStyle: TextStyle(fontFamily: 'IBMPlexSansArabic', fontWeight: FontWeight.w600),
        unselectedLabelStyle: TextStyle(fontFamily: 'IBMPlexSansArabic'),
      ),
    );
  }

  // ---- الثيم الداكن ----
  static ThemeData dark() {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: const ColorScheme.dark(
        primary: AppColors.primary,
        onPrimary: Colors.white,
        surface: Color(0xFF1A1A1A),
        onSurface: Colors.white,
      ),
      fontFamily: 'IBMPlexSansArabic',
      scaffoldBackgroundColor: const Color(0xFF0D0D0D),
      appBarTheme: const AppBarTheme(
        backgroundColor: Color(0xFF0D0D0D),
        foregroundColor: Colors.white,
        elevation: 0,
        centerTitle: true,
      ),
      cardTheme: CardTheme(
        color: const Color(0xFF1A1A1A),
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: Color(0xFF2A2A2A)),
        ),
      ),
    );
  }
}
```

---

## القسم التاسع: نظام التوجيه الكامل (GoRouter)

```dart
// lib/core/router/app_router.dart

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../features/auth/presentation/bloc/auth_cubit.dart';
import '../../features/auth/presentation/pages/splash_page.dart';
import '../../features/auth/presentation/pages/onboarding_page.dart';
import '../../features/auth/presentation/pages/login_page.dart';
import '../../features/auth/presentation/pages/otp_page.dart';
import '../../features/auth/presentation/pages/register_page.dart';
import '../../features/home/presentation/pages/main_shell_page.dart';
import '../../features/home/presentation/pages/home_page.dart';
import '../../features/products/presentation/pages/menu_page.dart';
import '../../features/products/presentation/pages/product_detail_page.dart';
import '../../features/cart/presentation/pages/cart_page.dart';
import '../../features/checkout/presentation/pages/checkout_page.dart';
import '../../features/checkout/presentation/pages/order_success_page.dart';
import '../../features/orders/presentation/pages/orders_page.dart';
import '../../features/orders/presentation/pages/order_detail_page.dart';
import '../../features/orders/presentation/pages/order_tracking_page.dart';
import '../../features/profile/presentation/pages/profile_page.dart';
import '../../features/profile/presentation/pages/edit_profile_page.dart';
import '../../features/profile/presentation/pages/addresses_page.dart';
import '../../features/profile/presentation/pages/favorites_page.dart';
import '../../features/loyalty/presentation/pages/loyalty_page.dart';
import '../../features/notifications/presentation/pages/notifications_page.dart';

// أسماء المسارات — constants لمنع الأخطاء المطبعية
class AppRoutes {
  static const String splash          = '/';
  static const String onboarding      = '/onboarding';
  static const String login           = '/login';
  static const String otp             = '/otp';
  static const String register        = '/register';
  static const String home            = '/home';
  static const String menu            = '/menu';
  static const String productDetail   = '/product/:id';
  static const String cart            = '/cart';
  static const String checkout        = '/checkout';
  static const String orderSuccess    = '/order-success';
  static const String orders          = '/orders';
  static const String orderDetail     = '/orders/:id';
  static const String orderTracking   = '/orders/:id/track';
  static const String profile         = '/profile';
  static const String editProfile     = '/profile/edit';
  static const String addresses       = '/profile/addresses';
  static const String favorites       = '/profile/favorites';
  static const String loyalty         = '/loyalty';
  static const String notifications   = '/notifications';

  // دوال مساعدة لبناء المسارات الديناميكية
  static String productDetailPath(String id)   => '/product/$id';
  static String orderDetailPath(String id)     => '/orders/$id';
  static String orderTrackingPath(String id)   => '/orders/$id/track';
}

// إنشاء الـ Router
GoRouter createRouter(AuthCubit authCubit) {
  return GoRouter(
    initialLocation: AppRoutes.splash,
    debugLogDiagnostics: false,

    // توجيه تلقائي حسب حالة المصادقة
    redirect: (context, state) {
      final authState = authCubit.state;
      final isAuthenticated = authState is AuthAuthenticated;
      final isOnAuthPages = [
        AppRoutes.splash, AppRoutes.onboarding,
        AppRoutes.login, AppRoutes.otp, AppRoutes.register,
      ].any((p) => state.fullPath?.startsWith(p.split(':')[0]) == true);

      // إذا لم يكن مسجلاً ويحاول الوصول لصفحة محمية
      if (!isAuthenticated && !isOnAuthPages) return AppRoutes.login;

      // إذا كان مسجلاً ويحاول الوصول لصفحة تسجيل الدخول
      if (isAuthenticated && isOnAuthPages && state.fullPath != AppRoutes.splash) {
        return AppRoutes.home;
      }

      return null; // لا يوجد توجيه
    },

    routes: [
      // شاشات المصادقة
      GoRoute(path: AppRoutes.splash,      builder: (_, __) => const SplashPage()),
      GoRoute(path: AppRoutes.onboarding,  builder: (_, __) => const OnboardingPage()),
      GoRoute(path: AppRoutes.login,       builder: (_, __) => const LoginPage()),
      GoRoute(path: AppRoutes.otp,         builder: (_, state) => OtpPage(phone: state.extra as String)),
      GoRoute(path: AppRoutes.register,    builder: (_, __) => const RegisterPage()),

      // الشاشة الرئيسية مع Bottom Navigation
      ShellRoute(
        builder: (_, __, child) => MainShellPage(child: child),
        routes: [
          GoRoute(path: AppRoutes.home,    builder: (_, __) => const HomePage()),
          GoRoute(path: AppRoutes.menu,    builder: (_, __) => const MenuPage()),
          GoRoute(path: AppRoutes.orders,  builder: (_, __) => const OrdersPage()),
          GoRoute(path: AppRoutes.profile, builder: (_, __) => const ProfilePage()),
        ],
      ),

      // شاشات فرعية
      GoRoute(
        path: AppRoutes.productDetail,
        builder: (_, state) => ProductDetailPage(productId: state.pathParameters['id']!),
      ),
      GoRoute(path: AppRoutes.cart,         builder: (_, __) => const CartPage()),
      GoRoute(path: AppRoutes.checkout,     builder: (_, __) => const CheckoutPage()),
      GoRoute(
        path: AppRoutes.orderSuccess,
        builder: (_, state) => OrderSuccessPage(orderId: state.extra as String? ?? ''),
      ),
      GoRoute(
        path: AppRoutes.orderDetail,
        builder: (_, state) => OrderDetailPage(orderId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: AppRoutes.orderTracking,
        builder: (_, state) => OrderTrackingPage(orderId: state.pathParameters['id']!),
      ),
      GoRoute(path: AppRoutes.editProfile,  builder: (_, __) => const EditProfilePage()),
      GoRoute(path: AppRoutes.addresses,    builder: (_, __) => const AddressesPage()),
      GoRoute(path: AppRoutes.favorites,    builder: (_, __) => const FavoritesPage()),
      GoRoute(path: AppRoutes.loyalty,      builder: (_, __) => const LoyaltyPage()),
      GoRoute(path: AppRoutes.notifications, builder: (_, __) => const NotificationsPage()),
    ],
  );
}
```

---

## القسم العاشر: إعداد Firebase للإشعارات Push (FCM)

### الخطوات التفصيلية:

```
١. إنشاء مشروع Firebase:
   - اذهب إلى: https://console.firebase.google.com
   - اضغط "Add project" وأدخل اسم المشروع
   - اضغط "Continue" ثم "Create project"

٢. إضافة تطبيق Android:
   - اضغط على أيقونة Android في Firebase Console
   - Package name: com.yourcompany.appname (يجب أن يطابق android/app/build.gradle)
   - حمّل google-services.json
   - ضعه في: android/app/google-services.json

٣. إضافة تطبيق iOS:
   - اضغط على أيقونة iOS في Firebase Console
   - Bundle ID: com.yourcompany.appname (يجب أن يطابق Xcode project)
   - حمّل GoogleService-Info.plist
   - ضعه في: ios/Runner/GoogleService-Info.plist

٤. تفعيل FCM في Flutter:
   - أضف للـ pubspec.yaml: firebase_core وfirebase_messaging
   - في main.dart أضف: await Firebase.initializeApp()
   - في AppDelegate.swift (iOS): أضف FirebaseApp.configure()

٥. تسجيل FCM Token مع الباكند:
   - بعد تسجيل الدخول، أرسل FCM token للباكند
   - POST /api/customers/fcm-token بجسم: { "token": "..." }
   - يحتاج الباكند endpoint جديد لحفظ الـ token

٦. إرسال إشعار من الباكند:
   - استخدم firebase-admin في Node.js
   - npm install firebase-admin
   - أرسل notification عند تغيير حالة الطلب
```

---

## القسم الحادي عشر: خطوات نشر التطبيق الكاملة

### أولاً: الإعداد الأولي (مرة واحدة فقط)

```
Apple App Store:
١. سجّل حساب Apple Developer: https://developer.apple.com (99 دولار/سنة)
٢. أنشئ App ID في Certificates, Identifiers & Profiles
٣. أنشئ Certificate للتوقيع (Distribution Certificate)
٤. أنشئ Provisioning Profile (App Store Distribution)
٥. أنشئ التطبيق في App Store Connect: https://appstoreconnect.apple.com
٦. أضف الوصف، لقطات الشاشة، الأيقونة، السعر (مجاني)

Google Play Store:
١. سجّل حساب Google Play Console: https://play.google.com/console (25 دولار مرة واحدة)
٢. أنشئ تطبيقاً جديداً
٣. أنشئ Keystore لتوقيع التطبيق:
   keytool -genkey -v -keystore key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias key
٤. احفظ كلمة المرور بأمان — لا يمكن استردادها إذا ضاعت
```

### ثانياً: ملف codemagic.yaml الكامل للنشر التلقائي

```yaml
workflows:
  # ---- بناء iOS ونشره على App Store ----
  ios-release:
    name: iOS Release — App Store
    max_build_duration: 90
    instance_type: mac_mini_m2
    environment:
      flutter: stable
      xcode: latest
      cocoapods: default
      vars:
        # هذه المتغيرات تُضاف في إعدادات Codemagic (مشفّرة)
        APP_STORE_CONNECT_ISSUER_ID: $APP_STORE_CONNECT_ISSUER_ID
        APP_STORE_CONNECT_KEY_IDENTIFIER: $APP_STORE_CONNECT_KEY_IDENTIFIER
        APP_STORE_CONNECT_PRIVATE_KEY: $APP_STORE_CONNECT_PRIVATE_KEY
        CERTIFICATE_PRIVATE_KEY: $CERTIFICATE_PRIVATE_KEY
        BUNDLE_ID: com.yourcompany.appname
    scripts:
      - name: تثبيت CocoaPods
        script: |
          find . -name "Podfile" -execdir pod install \;
      - name: تهيئة code signing
        script: |
          keychain initialize
          app-store-connect fetch-signing-files "$BUNDLE_ID" \
            --type IOS_APP_STORE \
            --create
          keychain add-certificates
          xcode-project use-profiles
      - name: بناء ملف IPA
        script: |
          flutter build ipa --release \
            --export-options-plist=/Users/builder/export_options.plist
    artifacts:
      - build/ios/ipa/*.ipa
    publishing:
      app_store_connect:
        api_key: $APP_STORE_CONNECT_PRIVATE_KEY
        key_id: $APP_STORE_CONNECT_KEY_IDENTIFIER
        issuer_id: $APP_STORE_CONNECT_ISSUER_ID
        submit_to_testflight: true
        submit_to_app_store: false  # true للنشر المباشر

  # ---- بناء Android ونشره على Google Play ----
  android-release:
    name: Android Release — Google Play
    max_build_duration: 60
    environment:
      flutter: stable
      vars:
        GOOGLE_PLAY_SERVICE_ACCOUNT: $GOOGLE_PLAY_SERVICE_ACCOUNT
        KEY_JKS: $KEY_JKS           # Keystore مشفّر بـ base64
        KEY_ALIAS: key
        KEY_PASSWORD: $KEY_PASSWORD
        STORE_PASSWORD: $STORE_PASSWORD
    scripts:
      - name: فك تشفير Keystore
        script: |
          echo $KEY_JKS | base64 --decode > android/app/key.jks
      - name: بناء AAB
        script: |
          flutter build appbundle --release \
            --dart-define=KEY_ALIAS=$KEY_ALIAS \
            --dart-define=KEY_PASSWORD=$KEY_PASSWORD \
            --dart-define=STORE_PASSWORD=$STORE_PASSWORD
    artifacts:
      - build/app/outputs/bundle/release/*.aab
    publishing:
      google_play:
        credentials: $GOOGLE_PLAY_SERVICE_ACCOUNT
        track: internal    # internal → alpha → beta → production
        submit_as_draft: false
```

---

## القسم الثاني عشر: خطوات تحويل أي تطبيق ويب موجود إلى Flutter

### الخطوة الأولى — تحليل الباكند الموجود:
```
١. وثّق كل API endpoints (المسار، الطريقة، الجسم، الاستجابة)
٢. افهم نظام المصادقة:
   - Session-based (cookies) — يجب تحويله إلى JWT للموبايل
   - JWT tokens — يعمل مباشرة
   - OAuth (Google/Apple) — يعمل مع Firebase Auth
٣. وثّق كل النماذج (User، Product، Order...)
٤. حدد ما يحتاج تعديلاً في الباكند:
   - إضافة endpoint لـ JWT login إذا كان session-based
   - إضافة endpoint لحفظ FCM tokens
   - التأكد من دعم CORS للطلبات من الموبايل
```

### الخطوة الثانية — رسم شاشات التطبيق:
```
١. قائمة بكل شاشة مطلوبة
٢. رسم User Flow (كيف يتنقل المستخدم)
٣. تحديد الشاشات المحمية (تتطلب تسجيل دخول)
٤. تحديد الشاشات العامة (لا تتطلب تسجيل دخول)
```

### الخطوة الثالثة — إنشاء مشروع Flutter:
```bash
# إنشاء مشروع جديد
flutter create --org com.yourcompany --project-name appname flutter_app

# دخول المجلد
cd flutter_app

# تشغيل
flutter run
```

### الخطوة الرابعة — بناء Core Layer (الطبقة الأساسية):
```
١. AppColors (الألوان)
٢. AppTextStyles (الخطوط)
٣. AppTheme (light + dark)
٤. ApiClient (Dio مع Interceptors)
٥. ApiEndpoints (كل الروابط)
٦. SecureStorage (للتوكن)
٧. GoRouter (التنقل)
٨. SharedWidgets (App Button، App TextField...)
```

### الخطوة الخامسة — بناء الميزات Feature by Feature:
```
ترتيب البناء المنصوح به:
١. Auth (تسجيل الدخول)
٢. Home (الصفحة الرئيسية)
٣. Products/Menu (المنتجات)
٤. Cart (السلة)
٥. Checkout (الدفع)
٦. Orders (الطلبات)
٧. Profile (الملف الشخصي)
٨. Notifications (الإشعارات)
٩. Loyalty (الولاء)
١٠. Support (الدعم)

لكل ميزة:
- data/models (النماذج)
- domain/usecases (المنطق)
- presentation/cubit (إدارة الحالة)
- presentation/pages (الشاشات)
- presentation/widgets (المكونات الفرعية)
```

### الخطوة السادسة — Firebase:
```
١. أنشئ مشروع Firebase
٢. أضف google-services.json (Android)
٣. أضف GoogleService-Info.plist (iOS)
٤. فعّل FCM للإشعارات
٥. فعّل Authentication (Phone، Google، Apple)
```

### الخطوة السابعة — النشر:
```
١. أنشئ ملف codemagic.yaml
٢. أضف Certificates في Codemagic
٣. أضف متغيرات البيئة (المشفّرة)
٤. شغّل أول build
٥. ارفع على TestFlight (iOS) أو Internal Testing (Android)
٦. اختبر مع مجموعة محدودة
٧. انشر للجمهور
```

---

## القسم الثالث عشر: أوامر Flutter اليومية الكاملة

```bash
# ---- تشغيل ----
flutter run                                    # تشغيل على أي جهاز متصل
flutter run -d "iPhone 15 Pro"                 # تشغيل على محاكي iOS محدد
flutter run -d emulator-5554                   # تشغيل على محاكي Android محدد
flutter run --release                          # تشغيل في وضع الإنتاج

# ---- بناء ----
flutter build ipa --release                    # بناء iOS للنشر
flutter build apk --release                    # بناء Android APK
flutter build appbundle --release              # بناء Android App Bundle (للـ Play Store)

# ---- إدارة الباكجات ----
flutter pub get                                # تثبيت كل الباكجات
flutter pub upgrade                            # تحديث الباكجات
flutter pub outdated                           # عرض الباكجات القديمة

# ---- Code Generation ----
dart run build_runner build --delete-conflicting-outputs   # توليد كود JSON + Hive

# ---- الاختبار ----
flutter test                                   # تشغيل كل الاختبارات
flutter test test/unit/                        # اختبارات unit فقط
flutter test --coverage                        # تقرير تغطية الاختبارات

# ---- الجودة ----
flutter analyze                                # تحليل الكود عن أخطاء
flutter format lib/                            # تنسيق الكود تلقائياً

# ---- الأجهزة ----
flutter devices                                # عرض كل الأجهزة المتصلة
flutter emulators                              # عرض المحاكيات المتاحة
flutter emulators --launch <emulator_id>       # تشغيل محاكي معين

# ---- تنظيف ----
flutter clean                                  # حذف مجلد build (لإصلاح مشاكل الـ cache)
flutter pub cache clean                        # تنظيف cache الباكجات

# ---- معلومات ----
flutter doctor                                 # فحص بيئة التطوير
flutter --version                              # عرض إصدار Flutter
```

---

## القسم الرابع عشر: ملاحظات خاصة بالمشروع الحالي

### الباكند:
```
نوع الباكند: Node.js + Express + MongoDB Atlas
رابط Replit (تطوير): https://your-replit-url.replit.app
الـ Authentication: Session-based cookies (يحتاج تعديل للموبايل)

المشكلة: Cookies لا تعمل بشكل موثوق في تطبيقات الموبايل
الحل: إضافة JWT endpoint في الباكند:
  POST /api/customers/login-jwt → يُعيد JWT token
  استخدام SecureStorage لحفظ التوكن
  إرسال Bearer token في كل طلب
```

### اللغة والاتجاه:
```
اللغة الافتراضية: عربي (RTL — Right to Left)
Flutter يدعم RTL بشكل ممتاز عبر: Directionality.rtl
يجب التأكد من:
  - textDirection: TextDirection.rtl في حقول الإدخال
  - Padding بالعربي: right padding في الواجهة يصبح left
  - الأيقونات تعكس نفسها تلقائياً في RTL
```

### الخط:
```
الخط المستخدم: IBM Plex Sans Arabic
ملفات الخط تحتاج تنزيل وإضافة يدوياً إلى assets/fonts/
أو استخدام google_fonts: GoogleFonts.ibmPlexSansArabic()
```

### الإشعارات:
```
الباكند الحالي يدعم Web Push (VAPID)
الموبايل يحتاج FCM (Firebase Cloud Messaging)
يجب إضافة endpoint في الباكند: POST /api/customers/fcm-token
وتفعيل إرسال إشعارات FCM عند تغيير حالة الطلب
```

**تاريخ آخر تحديث:** 1 يوليو 2026
**الباكند:** Node.js + Express + MongoDB Atlas
