import 'package:dio/dio.dart';
import 'storage.dart';

class Api {
  Api._();

  static const String baseUrl = 'https://blackrose.com.sa';

  static final Dio _dio = Dio(BaseOptions(
    baseUrl: baseUrl,
    connectTimeout: const Duration(seconds: 10),
    receiveTimeout: const Duration(seconds: 15),
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Accept-Language': 'ar',
    },
  ))
    ..interceptors.add(
      InterceptorsWrapper(
        onRequest: (opts, handler) async {
          try {
            final token = await AppStorage.getToken();
            if (token != null && token.isNotEmpty) {
              opts.headers['Authorization'] = 'Bearer $token';
            }
          } catch (_) {}
          handler.next(opts);
        },
        onError: (err, handler) async {
          if (err.response?.statusCode == 401) {
            try { await AppStorage.clearAll(); } catch (_) {}
          }
          handler.next(err);
        },
      ),
    );

  static Future<dynamic> get(String path, {Map<String, dynamic>? params}) async {
    final res = await _dio.get<dynamic>(path, queryParameters: params);
    return res.data;
  }

  static Future<dynamic> post(String path, {dynamic data}) async {
    final res = await _dio.post<dynamic>(path, data: data);
    return res.data;
  }

  static Future<dynamic> patch(String path, {dynamic data}) async {
    final res = await _dio.patch<dynamic>(path, data: data);
    return res.data;
  }

  static Future<dynamic> delete(String path) async {
    final res = await _dio.delete<dynamic>(path);
    return res.data;
  }
}
