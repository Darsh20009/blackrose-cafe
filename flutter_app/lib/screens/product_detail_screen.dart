import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../core/colors.dart';
import '../models/product.dart';

class ProductDetailScreen extends StatefulWidget {
  final ProductModel product;
  final void Function(ProductModel, {String? size}) onAddToCart;
  const ProductDetailScreen({required this.product, required this.onAddToCart, super.key});
  @override
  State<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends State<ProductDetailScreen> {
  String? _selectedSize;
  int _quantity = 1;

  @override
  void initState() {
    super.initState();
    if (widget.product.sizes.isNotEmpty) {
      _selectedSize = widget.product.sizes.first;
    }
  }

  void _addToCart() {
    for (var i = 0; i < _quantity; i++) {
      widget.onAddToCart(widget.product, size: _selectedSize);
    }
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text('تمت إضافة $_quantity × ${widget.product.displayName}',
          style: const TextStyle(fontFamily: 'IBMPlexSansArabic')),
      backgroundColor: AppColors.primary,
      behavior: SnackBarBehavior.floating,
      margin: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
    ));
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.product;
    return Scaffold(
      backgroundColor: AppColors.background,
      body: CustomScrollView(
        slivers: [
          // ── Hero Image ─────────────────────────────────────────────
          SliverAppBar(
            expandedHeight: 300,
            pinned: true,
            backgroundColor: AppColors.primaryLight,
            iconTheme: const IconThemeData(color: AppColors.text),
            flexibleSpace: FlexibleSpaceBar(
              background: p.imageUrl != null && p.imageUrl!.isNotEmpty
                  ? CachedNetworkImage(
                      imageUrl: p.imageUrl!,
                      fit: BoxFit.cover,
                      placeholder: (_, __) => Container(color: AppColors.primaryLight),
                      errorWidget: (_, __, ___) => _coffeeHero(),
                    )
                  : _coffeeHero(),
            ),
          ),

          // ── Product Info ───────────────────────────────────────────
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Name + Price
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Text(
                          p.displayName,
                          style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.text),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Text(
                        p.priceLabel,
                        style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.primary),
                      ),
                    ],
                  ),

                  if (p.descriptionAr.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    Text(p.descriptionAr,
                        style: const TextStyle(fontSize: 14, color: AppColors.textSecond, height: 1.6)),
                  ],

                  // ── Sizes ─────────────────────────────────────────
                  if (p.sizes.isNotEmpty) ...[
                    const SizedBox(height: 24),
                    const Text('الحجم', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.text)),
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 10,
                      children: p.sizes.map((s) {
                        final selected = _selectedSize == s;
                        return GestureDetector(
                          onTap: () => setState(() => _selectedSize = s),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                            decoration: BoxDecoration(
                              color: selected ? AppColors.primary : AppColors.card,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: selected ? AppColors.primary : AppColors.border),
                            ),
                            child: Text(s,
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                  color: selected ? Colors.white : AppColors.text,
                                )),
                          ),
                        );
                      }).toList(),
                    ),
                  ],

                  // ── Quantity ──────────────────────────────────────
                  const SizedBox(height: 24),
                  const Text('الكمية', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.text)),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      _QtyBtn(icon: Icons.remove, onTap: () { if (_quantity > 1) setState(() => _quantity--); }),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 20),
                        child: Text('$_quantity', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: AppColors.text)),
                      ),
                      _QtyBtn(icon: Icons.add, filled: true, onTap: () => setState(() => _quantity++)),
                    ],
                  ),

                  const SizedBox(height: 32),

                  // ── Add to cart button ────────────────────────────
                  ElevatedButton(
                    onPressed: _addToCart,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.shopping_cart_outlined, size: 20),
                        const SizedBox(width: 8),
                        Text('أضف للسلة — ${(p.price * _quantity).toStringAsFixed(p.price * _quantity % 1 == 0 ? 0 : 1)} ر.س'),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _coffeeHero() => Container(
    color: AppColors.primaryLight,
    child: const Center(child: Text('☕', style: TextStyle(fontSize: 96))),
  );
}

class _QtyBtn extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  final bool filled;
  const _QtyBtn({required this.icon, required this.onTap, this.filled = false});

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Container(
      width: 40,
      height: 40,
      decoration: BoxDecoration(
        color: filled ? AppColors.primary : AppColors.card,
        borderRadius: BorderRadius.circular(10),
        border: filled ? null : Border.all(color: AppColors.border),
      ),
      child: Icon(icon, size: 20, color: filled ? Colors.white : AppColors.text),
    ),
  );
}
