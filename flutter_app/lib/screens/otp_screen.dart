import 'package:flutter/material.dart';
import 'package:pinput/pinput.dart';
import '../core/api.dart';
import '../core/colors.dart';
import '../core/storage.dart';
import 'main_screen.dart';

class OtpScreen extends StatefulWidget {
  final String phone;
  const OtpScreen({required this.phone, super.key});
  @override
  State<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends State<OtpScreen> {
  String _code = '';
  bool _loading = false;
  String? _error;

  Future<void> _verify() async {
    if (_code.length < 6) {
      setState(() => _error = 'أدخل الرمز المكون من 6 أرقام');
      return;
    }
    setState(() { _loading = true; _error = null; });

    try {
      final res = await Api.post(
        '/api/customers/verify-otp',
        data: {'phone': widget.phone, 'otp': _code},
      );

      final data = res as Map<String, dynamic>? ?? {};
      final token = data['token'] as String?;

      if (token != null && token.isNotEmpty) {
        await AppStorage.saveToken(token);
      }
      await AppStorage.savePhone(widget.phone);

      final customer = data['customer'] as Map<String, dynamic>?;
      if (customer != null) {
        final name = customer['name'] as String? ?? '';
        final id   = customer['id'] as String? ?? customer['_id'] as String? ?? '';
        if (name.isNotEmpty) await AppStorage.saveName(name);
        if (id.isNotEmpty) await AppStorage.saveCustomerId(id);
      }

      if (!mounted) return;
      Navigator.pushAndRemoveUntil(
        context,
        PageRouteBuilder(
          pageBuilder: (_, __, ___) => const MainScreen(),
          transitionsBuilder: (_, anim, __, child) =>
              FadeTransition(opacity: anim, child: child),
          transitionDuration: const Duration(milliseconds: 400),
        ),
        (_) => false,
      );
    } catch (_) {
      setState(() => _error = 'الرمز غير صحيح أو انتهت صلاحيته. حاول مجدداً.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final pinTheme = PinTheme(
      width: 50,
      height: 58,
      textStyle: const TextStyle(
        fontSize: 22,
        fontWeight: FontWeight.w700,
        color: AppColors.text,
      ),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
    );

    final focusedTheme = pinTheme.copyDecorationWith(
      border: Border.all(color: AppColors.primary, width: 2),
      color: AppColors.primaryLight,
    );

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('التحقق من الجوال'),
        backgroundColor: AppColors.background,
      ),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 16),

            const Text(
              'أدخل رمز التحقق',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: AppColors.text),
            ),
            const SizedBox(height: 8),
            RichText(
              text: TextSpan(
                style: const TextStyle(fontSize: 14, color: AppColors.textSecond, height: 1.5),
                children: [
                  const TextSpan(text: 'تم إرسال رمز مكون من 6 أرقام إلى '),
                  TextSpan(text: widget.phone, style: const TextStyle(fontWeight: FontWeight.w600, color: AppColors.text)),
                ],
              ),
            ),

            const SizedBox(height: 40),

            // OTP boxes
            Center(
              child: Directionality(
                textDirection: TextDirection.ltr,
                child: Pinput(
                  length: 6,
                  defaultPinTheme: pinTheme,
                  focusedPinTheme: focusedTheme,
                  submittedPinTheme: pinTheme.copyDecorationWith(
                    border: Border.all(color: AppColors.primary),
                  ),
                  onChanged: (v) => setState(() { _code = v; _error = null; }),
                  onCompleted: (_) => _verify(),
                  autofocus: true,
                ),
              ),
            ),

            if (_error != null) ...[
              const SizedBox(height: 20),
              Center(
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.error_outline, color: AppColors.error, size: 16),
                    const SizedBox(width: 6),
                    Text(_error!, style: const TextStyle(color: AppColors.error, fontSize: 13)),
                  ],
                ),
              ),
            ],

            const SizedBox(height: 32),

            ElevatedButton(
              onPressed: _loading ? null : _verify,
              child: _loading
                  ? const SizedBox(
                      width: 22,
                      height: 22,
                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                    )
                  : const Text('تأكيد وتسجيل الدخول'),
            ),

            const SizedBox(height: 20),

            Center(
              child: TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text(
                  'تغيير رقم الجوال',
                  style: TextStyle(color: AppColors.primary, fontSize: 14),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
