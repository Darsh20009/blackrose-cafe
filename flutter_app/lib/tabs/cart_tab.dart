import 'package:flutter/material.dart';
import '../core/api.dart';
import '../core/colors.dart';
import '../core/storage.dart';
import '../screens/main_screen.dart';

class CartTab extends StatefulWidget {
  final List<CartItem> cart;
  final double total;
  final void Function(CartItem) onIncrease;
  final void Function(CartItem) onDecrease;
  final VoidCallback onClear;
  final VoidCallback onGoMenu;

  const CartTab({
    required this.cart,
    required this.total,
    required this.onIncrease,
    required this.onDecrease,
    required this.onClear,
    required this.onGoMenu,
    super.key,
  });

  @override
  State<CartTab> createState() => _CartTabState();
}

class _CartTabState extends State<CartTab> {
  bool _placing = false;

  Future<void> _placeOrder(BuildContext ctx) async {
    if (widget.cart.isEmpty) return;
    setState(() => _placing = true);

    try {
      final token = await AppStorage.getToken();
      if (token == null || token.isEmpty) {
        if (!ctx.mounted) return;
        _showMessage(ctx, 'سجّل الدخول أولاً لإتمام الطلب', isError: true);
        setState(() => _placing = false);
        return;
      }

      final items = widget.cart.map((i) => {
        'productId': i.product.id,
        'nameAr': i.product.displayName,
        'quantity': i.quantity,
        'price': i.product.price,
        if (i.selectedSize != null) 'selectedSize': i.selectedSize,
      }).toList();

      await Api.post('/api/orders', data: {
        'items': items,
        'total': widget.total,
        'subtotal': widget.total,
        'taxAmount': 0,
        'deliveryFee': 0,
        'deliveryMethod': 'pickup',
        'paymentMethod': 'cash',
      });

      widget.onClear();

      if (!ctx.mounted) return;
      _showMessage(ctx, '🎉 تم إرسال طلبك بنجاح!');
    } catch (_) {
      if (ctx.mounted) _showMessage(ctx, 'تعذر إرسال الطلب. تحقق من الاتصال.', isError: true);
    } finally {
      if (mounted) setState(() => _placing = false);
    }
  }

  void _showMessage(BuildContext ctx, String msg, {bool isError = false}) {
    ScaffoldMessenger.of(ctx).showSnackBar(SnackBar(
      content: Text(msg, style: const TextStyle(fontFamily: 'IBMPlexSansArabic')),
      backgroundColor: isError ? AppColors.error : AppColors.primary,
      behavior: SnackBarBehavior.floating,
      margin: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
    ));
  }

  @override
  Widget build(BuildContext ctx) {
    if (widget.cart.isEmpty) {
      return Scaffold(
        backgroundColor: AppColors.background,
        body: SafeArea(
          child: Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.shopping_cart_outlined, size: 80, color: AppColors.textSecond.withValues(alpha: 0.5)),
                const SizedBox(height: 16),
                const Text('السلة فارغة', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: AppColors.text)),
                const SizedBox(height: 8),
                const Text('أضف منتجات من القائمة لتبدأ طلبك', style: TextStyle(color: AppColors.textSecond)),
                const SizedBox(height: 28),
                ElevatedButton.icon(
                  onPressed: widget.onGoMenu,
                  icon: const Icon(Icons.restaurant_menu_rounded),
                  label: const Text('تصفح القائمة'),
                  style: ElevatedButton.styleFrom(minimumSize: const Size(200, 48)),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Column(
          children: [
            // ── Header ────────────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('السلة', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.text)),
                  TextButton.icon(
                    onPressed: widget.onClear,
                    icon: const Icon(Icons.delete_outline, size: 18, color: AppColors.error),
                    label: const Text('مسح الكل', style: TextStyle(color: AppColors.error, fontSize: 13)),
                    style: TextButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 8)),
                  ),
                ],
              ),
            ),

            // ── Items ─────────────────────────────────────────────────
            Expanded(
              child: ListView.separated(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                itemCount: widget.cart.length,
                separatorBuilder: (_, __) => const SizedBox(height: 10),
                itemBuilder: (_, i) {
                  final item = widget.cart[i];
                  return Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Row(
                      children: [
                        // Emoji placeholder
                        Container(
                          width: 52,
                          height: 52,
                          decoration: BoxDecoration(
                            color: AppColors.primaryLight,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Center(child: Text('☕', style: TextStyle(fontSize: 26))),
                        ),
                        const SizedBox(width: 12),

                        // Name + size + price
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                item.displayName,
                                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.text),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                              if (item.selectedSize != null)
                                Text('الحجم: ${item.selectedSize}',
                                    style: const TextStyle(fontSize: 12, color: AppColors.textSecond)),
                              const SizedBox(height: 4),
                              Text(
                                '${item.total.toStringAsFixed(item.total % 1 == 0 ? 0 : 1)} ر.س',
                                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.primary),
                              ),
                            ],
                          ),
                        ),

                        // Qty controls
                        Row(
                          children: [
                            _QtyBtn(
                              icon: Icons.remove,
                              onTap: () => widget.onDecrease(item),
                            ),
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 10),
                              child: Text('${item.quantity}',
                                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.text)),
                            ),
                            _QtyBtn(
                              icon: Icons.add,
                              filled: true,
                              onTap: () => widget.onIncrease(item),
                            ),
                          ],
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),

            // ── Footer ────────────────────────────────────────────────
            Container(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
              decoration: const BoxDecoration(
                color: AppColors.surface,
                border: Border(top: BorderSide(color: AppColors.border)),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('المجموع', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.text)),
                      Text(
                        '${widget.total.toStringAsFixed(widget.total % 1 == 0 ? 0 : 1)} ر.س',
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.primary),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  ElevatedButton(
                    onPressed: _placing ? null : () => _placeOrder(ctx),
                    child: _placing
                        ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5))
                        : const Text('تأكيد الطلب'),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _QtyBtn extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  final bool filled;
  const _QtyBtn({required this.icon, required this.onTap, this.filled = false});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 30,
        height: 30,
        decoration: BoxDecoration(
          color: filled ? AppColors.primary : AppColors.card,
          borderRadius: BorderRadius.circular(8),
          border: filled ? null : Border.all(color: AppColors.border),
        ),
        child: Icon(icon, size: 18, color: filled ? Colors.white : AppColors.text),
      ),
    );
  }
}
