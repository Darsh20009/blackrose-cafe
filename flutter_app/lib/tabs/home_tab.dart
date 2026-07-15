import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../core/api.dart';
import '../core/colors.dart';
import '../models/product.dart';
import '../screens/product_detail_screen.dart';

class HomeTab extends StatefulWidget {
  final void Function(ProductModel, {String? size}) onAddToCart;
  final VoidCallback onGoToCart;
  const HomeTab({required this.onAddToCart, required this.onGoToCart, super.key});
  @override
  State<HomeTab> createState() => _HomeTabState();
}

class _HomeTabState extends State<HomeTab> {
  List<ProductModel> _featured = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final raw = await Api.get('/api/coffee-items');
      final list = (raw as List?)
              ?.map((e) => ProductModel.fromJson(e as Map<String, dynamic>))
              .where((p) => p.isAvailable)
              .toList() ??
          [];
      if (mounted) {
        setState(() {
          _featured = list.where((p) => p.isFeatured).take(20).toList();
          if (_featured.isEmpty) _featured = list.take(20).toList();
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: CustomScrollView(
        slivers: [
          // ── AppBar ─────────────────────────────────────────────────────
          SliverSafeArea(
            bottom: false,
            sliver: SliverAppBar(
              backgroundColor: AppColors.background,
              surfaceTintColor: Colors.transparent,
              floating: true,
              snap: true,
              titleSpacing: 16,
              title: Row(
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: Image.asset(
                      'assets/images/logo.png',
                      width: 34,
                      height: 34,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => Container(
                        width: 34,
                        height: 34,
                        color: AppColors.primary,
                        child: const Center(
                          child: Text('BR',
                              style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text('Black Rose', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.text)),
                      Text('القهوة الفاخرة', style: TextStyle(fontSize: 11, color: AppColors.textSecond)),
                    ],
                  ),
                ],
              ),
            ),
          ),

          // ── Hero Banner ────────────────────────────────────────────────
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF1A6B4A), Color(0xFF2D9B6E)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: const Text('☕ الأكثر طلباً',
                                style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600)),
                          ),
                          const SizedBox(height: 10),
                          const Text(
                            'اكتشف أفضل\nالقهوة المختصة',
                            style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w800, height: 1.3),
                          ),
                          const SizedBox(height: 14),
                          GestureDetector(
                            onTap: widget.onGoToCart,
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: const Text('اطلب الآن',
                                  style: TextStyle(color: Color(0xFF1A6B4A), fontWeight: FontWeight.w700, fontSize: 13)),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    const Text('☕', style: TextStyle(fontSize: 64)),
                  ],
                ),
              ),
            ),
          ),

          // ── Section title ──────────────────────────────────────────────
          const SliverToBoxAdapter(
            child: Padding(
              padding: EdgeInsets.fromLTRB(16, 24, 16, 12),
              child: Text('منتجاتنا المميزة',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.text)),
            ),
          ),

          // ── Products Grid ──────────────────────────────────────────────
          if (_loading)
            const SliverToBoxAdapter(
              child: Center(
                child: Padding(
                  padding: EdgeInsets.all(48),
                  child: CircularProgressIndicator(color: AppColors.primary),
                ),
              ),
            )
          else if (_featured.isEmpty)
            const SliverToBoxAdapter(
              child: _EmptyState(),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
              sliver: SliverGrid(
                delegate: SliverChildBuilderDelegate(
                  (ctx, i) => _ProductCard(
                    product: _featured[i],
                    onAddToCart: widget.onAddToCart,
                  ),
                  childCount: _featured.length,
                ),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  childAspectRatio: 0.72,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                ),
              ),
            ),
        ],
      ),
    );
  }
}

// ─── Product Card ─────────────────────────────────────────────────────────────
class _ProductCard extends StatelessWidget {
  final ProductModel product;
  final void Function(ProductModel, {String? size}) onAddToCart;
  const _ProductCard({required this.product, required this.onAddToCart});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => ProductDetailScreen(
            product: product,
            onAddToCart: onAddToCart,
          ),
        ),
      ),
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image
            Expanded(
              child: ClipRRect(
                borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                child: product.imageUrl != null && product.imageUrl!.isNotEmpty
                    ? CachedNetworkImage(
                        imageUrl: product.imageUrl!,
                        width: double.infinity,
                        fit: BoxFit.cover,
                        placeholder: (_, __) => Container(color: AppColors.primaryLight),
                        errorWidget: (_, __, ___) => _coffeeEmoji(),
                      )
                    : _coffeeEmoji(),
              ),
            ),
            // Info
            Padding(
              padding: const EdgeInsets.all(10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    product.displayName,
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.text),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        product.priceLabel,
                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.primary),
                      ),
                      GestureDetector(
                        onTap: () => onAddToCart(product),
                        child: Container(
                          width: 30,
                          height: 30,
                          decoration: BoxDecoration(
                            color: AppColors.primary,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Icon(Icons.add_rounded, color: Colors.white, size: 20),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _coffeeEmoji() => Container(
        color: AppColors.primaryLight,
        child: const Center(
          child: Text('☕', style: TextStyle(fontSize: 44)),
        ),
      );
}

class _EmptyState extends StatelessWidget {
  const _EmptyState();
  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Padding(
        padding: EdgeInsets.all(48),
        child: Column(
          children: [
            Icon(Icons.coffee_outlined, size: 72, color: AppColors.textSecond),
            SizedBox(height: 16),
            Text('لا توجد منتجات متاحة حالياً',
                style: TextStyle(fontSize: 16, color: AppColors.textSecond, fontWeight: FontWeight.w500)),
            SizedBox(height: 8),
            Text('تحقق من الاتصال بالإنترنت وأعد المحاولة',
                style: TextStyle(fontSize: 13, color: AppColors.textSecond)),
          ],
        ),
      ),
    );
  }
}
