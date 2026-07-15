import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class AppStorage {
  AppStorage._();

  static const _store = FlutterSecureStorage(
    iOptions: IOSOptions(
      accessibility: KeychainAccessibility.first_unlock_this_device,
    ),
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );

  static const _kToken    = 'br_token';
  static const _kPhone    = 'br_phone';
  static const _kName     = 'br_name';
  static const _kCustomer = 'br_customer_id';

  // ─── Token ───────────────────────────────────────────────────────────────
  static Future<String?> getToken() async {
    try { return await _store.read(key: _kToken); } catch (_) { return null; }
  }

  static Future<void> saveToken(String t) async {
    try { await _store.write(key: _kToken, value: t); } catch (_) {}
  }

  // ─── Phone ───────────────────────────────────────────────────────────────
  static Future<String?> getPhone() async {
    try { return await _store.read(key: _kPhone); } catch (_) { return null; }
  }

  static Future<void> savePhone(String p) async {
    try { await _store.write(key: _kPhone, value: p); } catch (_) {}
  }

  // ─── Name ────────────────────────────────────────────────────────────────
  static Future<String?> getName() async {
    try { return await _store.read(key: _kName); } catch (_) { return null; }
  }

  static Future<void> saveName(String n) async {
    try { await _store.write(key: _kName, value: n); } catch (_) {}
  }

  // ─── Customer ID ─────────────────────────────────────────────────────────
  static Future<String?> getCustomerId() async {
    try { return await _store.read(key: _kCustomer); } catch (_) { return null; }
  }

  static Future<void> saveCustomerId(String id) async {
    try { await _store.write(key: _kCustomer, value: id); } catch (_) {}
  }

  // ─── Auth check ──────────────────────────────────────────────────────────
  static Future<bool> isLoggedIn() async {
    final t = await getToken();
    return t != null && t.isNotEmpty;
  }

  // ─── Logout ──────────────────────────────────────────────────────────────
  static Future<void> clearAll() async {
    try { await _store.deleteAll(); } catch (_) {}
  }
}
