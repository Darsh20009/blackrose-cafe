import 'package:flutter/material.dart';
import 'core/colors.dart';
import 'core/storage.dart';
import 'core/theme.dart';
import 'screens/login_screen.dart';
import 'screens/main_screen.dart';

class BlackRoseApp extends StatelessWidget {
  const BlackRoseApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Black Rose',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.build(),
      themeMode: ThemeMode.light,
      // Always white background — never black
      builder: (ctx, child) => Container(
        color: AppColors.background,
        child: child ?? const SizedBox.shrink(),
      ),
      home: const _StartupRouter(),
    );
  }
}

/// Reads token from local storage then immediately shows login or main.
/// No animation, no delay, no network call.
class _StartupRouter extends StatefulWidget {
  const _StartupRouter();

  @override
  State<_StartupRouter> createState() => _StartupRouterState();
}

class _StartupRouterState extends State<_StartupRouter> {
  @override
  void initState() {
    super.initState();
    _go();
  }

  Future<void> _go() async {
    final loggedIn = await AppStorage.isLoggedIn();
    if (!mounted) return;
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(
        builder: (_) => loggedIn ? const MainScreen() : const LoginScreen(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    // Plain white screen shown for the ~1 frame before _go() completes
    return const Scaffold(
      backgroundColor: AppColors.background,
      body: SizedBox.shrink(),
    );
  }
}
