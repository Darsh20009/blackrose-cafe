import 'dart:async';

import 'package:flutter/foundation.dart' show defaultTargetPlatform;
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:webview_flutter/webview_flutter.dart';

/// The main app target URL — points to the web app
const String kAppUrl = 'https://blackrose.com.sa';

class BlackRoseWebApp extends StatelessWidget {
  const BlackRoseWebApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Black Rose Café',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF7C3AED), // QIROX Purple
          brightness: Brightness.light,
        ),
        useMaterial3: true,
      ),
      home: const _WebViewScreen(),
    );
  }
}

class _WebViewScreen extends StatefulWidget {
  const _WebViewScreen();

  @override
  State<_WebViewScreen> createState() => _WebViewScreenState();
}

class _WebViewScreenState extends State<_WebViewScreen>
    with WidgetsBindingObserver {
  late final WebViewController _controller;
  bool _isLoading = true;
  bool _hasError = false;
  bool _webViewReady = false;
  Timer? _resumeTimer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _controller = WebViewController();
    unawaited(_initializeController());
  }

  Future<void> _initializeController() async {
    try {
      await _controller.setJavaScriptMode(JavaScriptMode.unrestricted);
      await _controller.setBackgroundColor(Colors.white);
      await _controller.addJavaScriptChannel(
        'BlackRosePayment',
        onMessageReceived: (message) =>
            unawaited(_openPaymentUrl(message.message)),
      );
      await _controller.setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (_) => setState(() {
            _isLoading = true;
            _hasError = false;
            _webViewReady = false;
          }),
          onPageFinished: (_) => setState(() {
            _isLoading = false;
            _webViewReady = true;
          }),
          onWebResourceError: (_) => setState(() {
            _isLoading = false;
            _hasError = true;
          }),
          onNavigationRequest: (request) {
            // Allow all navigation within the app domain
            return NavigationDecision.navigate;
          },
        ),
      );
      await _controller.setUserAgent(
        'BlackRoseApp/3.1.0 Flutter/WebView (${defaultTargetPlatform.name})',
      );
      await _controller.loadRequest(Uri.parse(kAppUrl));
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _isLoading = false;
        _hasError = true;
      });
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state != AppLifecycleState.resumed) return;

    _resumeTimer?.cancel();
    _resumeTimer = Timer(const Duration(milliseconds: 350), () {
      if (!mounted || !_webViewReady) return;
      unawaited(
        _controller
            .runJavaScript(
              "window.dispatchEvent(new Event('blackrose-app-resumed'))",
            )
            .catchError((_) {}),
      );
    });
  }

  Future<void> _openPaymentUrl(String rawUrl) async {
    final paymentUrl = Uri.tryParse(rawUrl);
    if (paymentUrl == null ||
        paymentUrl.scheme != 'https' ||
        paymentUrl.host.isEmpty ||
        paymentUrl.userInfo.isNotEmpty) {
      _notifyPaymentOpenFailed();
      return;
    }

    try {
      final opened = await launchUrl(
        paymentUrl,
        mode: LaunchMode.externalApplication,
      );
      if (!opened) _notifyPaymentOpenFailed();
    } catch (_) {
      _notifyPaymentOpenFailed();
    }
  }

  void _notifyPaymentOpenFailed() {
    if (!_webViewReady) return;
    unawaited(
      _controller
          .runJavaScript(
            "window.dispatchEvent(new Event('blackrose-payment-open-failed'))",
          )
          .catchError((_) {}),
    );
  }

  @override
  void dispose() {
    _resumeTimer?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  Future<void> _reload() async {
    setState(() {
      _isLoading = true;
      _hasError = false;
    });
    await _controller.reload();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Stack(
        children: [
          // WebView
          WebViewWidget(controller: _controller),

          // Loading overlay
          if (_isLoading)
            Container(
              color: Colors.white,
              child: const Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    SizedBox(
                      width: 48,
                      height: 48,
                      child: CircularProgressIndicator(
                        strokeWidth: 3,
                        color: Color(0xFF7C3AED),
                      ),
                    ),
                    SizedBox(height: 16),
                    Text(
                      'Black Rose Café',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF7C3AED),
                      ),
                    ),
                  ],
                ),
              ),
            ),

          // Error state
          if (_hasError && !_isLoading)
            Container(
              color: Colors.white,
              child: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.wifi_off, size: 64, color: Colors.grey),
                    const SizedBox(height: 16),
                    const Text(
                      'لا يوجد اتصال بالإنترنت',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'تحقق من اتصالك وحاول مرة أخرى',
                      style: TextStyle(color: Colors.grey),
                    ),
                    const SizedBox(height: 24),
                    ElevatedButton.icon(
                      onPressed: _reload,
                      icon: const Icon(Icons.refresh),
                      label: const Text('إعادة المحاولة'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF7C3AED),
                        foregroundColor: Colors.white,
                      ),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}
