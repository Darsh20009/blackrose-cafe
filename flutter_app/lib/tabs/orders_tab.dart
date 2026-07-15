import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../core/api.dart';
import '../core/colors.dart';
import '../models/order.dart';

class OrdersTab extends StatefulWidget {
  const OrdersTab({super.key});
  @override
  State<OrdersTab> createState() => _OrdersTabState();
}

class _OrdersTabState extends State<OrdersTab> {
  List<OrderModel> _orders = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final raw = await Api.get('/api/orders');
      final list = (raw as List?)
              ?.map((e) => OrderModel.fromJson(e as Map<String, dynamic>))
              .toList() ?? [];
      list.sort((a, b) => b.createdAt.compareTo(a.createdAt));
      if (mounted) setState(() { _orders = list; _loading = false; });
    } catch (_) {
      if (mounted) setState(() { _loading = false; _error = 'تعذر تحميل الطلبات'; });
    }
  }

  Color _statusColor(String s) {
    switch (s) {
      case 'delivered': return const Color(0xFF2D9B6E);
      case 'cancelled': return AppColors.error;
      case 'preparing':
      case 'ready':
      case 'delivering': return const Color(0xFFF59E0B);
      default: return AppColors.textSecond;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('طلباتي', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.text)),
                  IconButton(
                    onPressed: _load,
                    icon: const Icon(Icons.refresh_rounded, color: AppColors.primary),
                    tooltip: 'تحديث',
                  ),
                ],
              ),
            ),
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
                  : _error != null
                      ? _ErrorView(message: _error!, onRetry: _load)
                      : _orders.isEmpty
                          ? const _EmptyOrders()
                          : RefreshIndicator(
                              color: AppColors.primary,
                              onRefresh: _load,
                              child: ListView.separated(
                                padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                                itemCount: _orders.length,
                                separatorBuilder: (_, __) => const SizedBox(height: 10),
                                itemBuilder: (_, i) => _OrderCard(
                                  order: _orders[i],
                                  statusColor: _statusColor(_orders[i].status),
                                ),
                              ),
                            ),
            ),
          ],
        ),
      ),
    );
  }
}

class _OrderCard extends StatelessWidget {
  final OrderModel order;
  final Color statusColor;
  const _OrderCard({required this.order, required this.statusColor});

  @override
  Widget build(BuildContext context) {
    final date = DateFormat('dd/MM/yyyy – hh:mm a', 'ar').format(order.createdAt);
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('#${order.orderNumber}',
                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.text)),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: statusColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(order.statusAr,
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: statusColor)),
              ),
            ],
          ),

          const SizedBox(height: 8),

          // Date + delivery
          Text(date, style: const TextStyle(fontSize: 12, color: AppColors.textSecond)),
          const SizedBox(height: 4),
          Text(
            order.deliveryMethod == 'delivery' ? '🚗 توصيل' : '🏃 استلام من الفرع',
            style: const TextStyle(fontSize: 12, color: AppColors.textSecond),
          ),

          const Divider(height: 20, color: AppColors.border),

          // Items
          ...order.items.take(3).map((item) => Padding(
            padding: const EdgeInsets.only(bottom: 4),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('${item.quantity}× ${item.nameAr}',
                    style: const TextStyle(fontSize: 13, color: AppColors.text)),
                Text('${(item.price * item.quantity).toStringAsFixed(0)} ر.س',
                    style: const TextStyle(fontSize: 13, color: AppColors.textSecond)),
              ],
            ),
          )),
          if (order.items.length > 3)
            Text('+${order.items.length - 3} منتجات أخرى',
                style: const TextStyle(fontSize: 12, color: AppColors.textSecond)),

          const Divider(height: 20, color: AppColors.border),

          // Total
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('المجموع', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.text)),
              Text('${order.total.toStringAsFixed(order.total % 1 == 0 ? 0 : 1)} ر.س',
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.primary)),
            ],
          ),
        ],
      ),
    );
  }
}

class _EmptyOrders extends StatelessWidget {
  const _EmptyOrders();
  @override
  Widget build(BuildContext context) => const Center(
    child: Column(mainAxisSize: MainAxisSize.min, children: [
      Icon(Icons.receipt_long_outlined, size: 72, color: AppColors.textSecond),
      SizedBox(height: 16),
      Text('لا توجد طلبات بعد', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: AppColors.text)),
      SizedBox(height: 8),
      Text('طلباتك ستظهر هنا بعد أول عملية شراء', style: TextStyle(color: AppColors.textSecond)),
    ]),
  );
}

class _ErrorView extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  const _ErrorView({required this.message, required this.onRetry});
  @override
  Widget build(BuildContext context) => Center(
    child: Column(mainAxisSize: MainAxisSize.min, children: [
      const Icon(Icons.wifi_off_rounded, size: 64, color: AppColors.textSecond),
      const SizedBox(height: 16),
      Text(message, style: const TextStyle(color: AppColors.textSecond, fontSize: 15)),
      const SizedBox(height: 20),
      ElevatedButton(
          style: ElevatedButton.styleFrom(minimumSize: const Size(160, 44)),
          onPressed: onRetry,
          child: const Text('إعادة المحاولة')),
    ]),
  );
}
