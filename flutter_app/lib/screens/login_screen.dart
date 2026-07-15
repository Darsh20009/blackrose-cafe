import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../core/api.dart';
import '../core/colors.dart';
import 'otp_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _phoneCtrl = TextEditingController();
  bool _loading = false;
  String? _error;

  Future<void> _sendOtp() async {
    final phone = _phoneCtrl.text.trim();
    if (phone.length < 9) {
      setState(() => _error = 'أدخل رقم جوال صحيح (9 أرقام على الأقل)');
      return;
    }

    setState(() { _loading = true; _error = null; });

    try {
      await Api.post('/api/customers/send-otp', data: {'phone': phone});
      if (!mounted) return;
      Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => OtpScreen(phone: phone)),
      );
    } on Exception catch (e) {
      final msg = e.toString();
      if (msg.contains('404') || msg.contains('not found')) {
        // New user — navigate to OTP anyway (API might send one)
        if (mounted) {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => OtpScreen(phone: phone)),
          );
        }
      } else {
        setState(() => _error = 'تعذر الإرسال. تحقق من الاتصال بالإنترنت.');
      }
    } catch (_) {
      setState(() => _error = 'تعذر الإرسال. تحقق من الاتصال بالإنترنت.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 48),

              // Logo
              Center(
                child: Column(
                  children: [
                    Container(
                      width: 88,
                      height: 88,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(22),
                        boxShadow: [BoxShadow(color: AppColors.primary.withValues(alpha: 0.2), blurRadius: 20, offset: const Offset(0, 8))],
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(22),
                        child: Image.asset(
                          'assets/images/logo.png',
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => Container(
                            color: AppColors.primary,
                            child: const Center(child: Text('BR', style: TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.bold))),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    const Text('Black Rose', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: AppColors.text)),
                  ],
                ),
              ),

              const SizedBox(height: 48),

              const Text(
                'مرحباً بك 👋',
                style: TextStyle(fontSize: 26, fontWeight: FontWeight.w800, color: AppColors.text),
              ),
              const SizedBox(height: 8),
              const Text(
                'أدخل رقم جوالك لتسجيل الدخول أو إنشاء حساب جديد',
                style: TextStyle(fontSize: 14, color: AppColors.textSecond, height: 1.5),
              ),

              const SizedBox(height: 32),

              // Phone field
              const Text('رقم الجوال', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.text)),
              const SizedBox(height: 8),

              TextField(
                controller: _phoneCtrl,
                keyboardType: TextInputType.phone,
                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                textDirection: TextDirection.ltr,
                textAlign: TextAlign.left,
                maxLength: 12,
                onChanged: (_) => setState(() => _error = null),
                onSubmitted: (_) => _sendOtp(),
                decoration: InputDecoration(
                  counterText: '',
                  hintText: '05XXXXXXXX',
                  hintTextDirection: TextDirection.ltr,
                  prefixIcon: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Text('🇸🇦', style: TextStyle(fontSize: 20)),
                        const SizedBox(width: 8),
                        Text('+966', style: TextStyle(fontSize: 14, color: AppColors.text.withValues(alpha: 0.7), fontWeight: FontWeight.w600)),
                        const SizedBox(width: 10),
                        Container(width: 1, height: 22, color: AppColors.border),
                      ],
                    ),
                  ),
                ),
              ),

              // Error
              if (_error != null) ...[
                const SizedBox(height: 10),
                Row(
                  children: [
                    const Icon(Icons.error_outline, color: AppColors.error, size: 16),
                    const SizedBox(width: 6),
                    Text(_error!, style: const TextStyle(color: AppColors.error, fontSize: 13)),
                  ],
                ),
              ],

              const SizedBox(height: 28),

              // Submit button
              ElevatedButton(
                onPressed: _loading ? null : _sendOtp,
                child: _loading
                    ? const SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(
                          color: Colors.white,
                          strokeWidth: 2.5,
                        ),
                      )
                    : const Text('إرسال رمز التحقق'),
              ),

              const SizedBox(height: 24),

              // Terms
              const Center(
                child: Text(
                  'بالمتابعة توافق على شروط الاستخدام وسياسة الخصوصية',
                  style: TextStyle(fontSize: 12, color: AppColors.textSecond),
                  textAlign: TextAlign.center,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  void dispose() {
    _phoneCtrl.dispose();
    super.dispose();
  }
}
