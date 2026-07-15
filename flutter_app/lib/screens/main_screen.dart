import 'package:flutter/material.dart';
import '../core/colors.dart';
import '../models/product.dart';
import '../tabs/home_tab.dart';
import '../tabs/menu_tab.dart';
import '../tabs/cart_tab.dart';
import '../tabs/orders_tab.dart';
import '../tabs/profile_tab.dart';
import 'login_screen.dart';

// ─── Cart Item ────────────────────────────────────────────────────────────────
class CartItem {
  final ProductModel product;
  final String? selectedSize;
  int quantity;

  CartItem({
    required this.product,
    this.selectedSize,
    this.quantity = 1,
  });

  double get total => product.price * quantity;
  String get displayName => product.displayName;
  String get sizeLabel => selectedSize != null ? ' ($selectedSize)' : '';
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
class MainScreen extends StatefulWidget {
  const MainScreen({super.key});
  @override
  State<MainScreen> createState() => MainScreenState();
}

class MainScreenState extends State<MainScreen> {
  int _tabIndex = 0;
  final List<CartItem> _cart = [];

  // ── Cart operations ──────────────────────────────────────────────────────
  void addToCart(ProductModel product, {String? size}) {
    setState(() {
      final existing = _cart.where(
        (i) => i.product.id == product.id && i.selectedSize == size,
      ).firstOrNull;

      if (existing != null) {
        existing.quantity++;
      } else {
        _cart.add(CartItem(product: product, selectedSize: size));
      }
    });

    // Brief snackbar feedback
    ScaffoldMessenger.of(context).clearSnackBars();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('تمت الإضافة: ${product.displayName}',
            style: const TextStyle(fontFamily: 'IBMPlexSansArabic')),
        duration: const Duration(seconds: 1),
        backgroundColor: AppColors.primary,
        behavior: SnackBarBehavior.floating,
        margin: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }

  void increaseQty(CartItem item) => setState(() => item.quantity++);

  void decreaseQty(CartItem item) => setState(() {
    if (item.quantity > 1) {
      item.quantity--;
    } else {
      _cart.remove(item);
    }
  });

  void clearCart() => setState(() => _cart.clear());

  // ── Computed ─────────────────────────────────────────────────────────────
  int get totalCount => _cart.fold(0, (s, i) => s + i.quantity);
  double get totalPrice => _cart.fold(0.0, (s, i) => s + i.total);

  // ── Logout ───────────────────────────────────────────────────────────────
  void _logout() {
    clearCart();
    Navigator.pushAndRemoveUntil(
      context,
      PageRouteBuilder(
        pageBuilder: (_, __, ___) => const LoginScreen(),
        transitionsBuilder: (_, anim, __, child) =>
            FadeTransition(opacity: anim, child: child),
        transitionDuration: const Duration(milliseconds: 350),
      ),
      (_) => false,
    );
  }

  // ── Navigate to cart tab ─────────────────────────────────────────────────
  void goToCart() => setState(() => _tabIndex = 2);

  @override
  Widget build(BuildContext context) {
    final tabs = <Widget>[
      HomeTab(onAddToCart: addToCart, onGoToCart: goToCart),
      MenuTab(onAddToCart: addToCart),
      CartTab(
        cart: _cart,
        total: totalPrice,
        onIncrease: increaseQty,
        onDecrease: decreaseQty,
        onClear: clearCart,
        onGoMenu: () => setState(() => _tabIndex = 1),
      ),
      const OrdersTab(),
      ProfileTab(onLogout: _logout),
    ];

    return Scaffold(
      body: IndexedStack(index: _tabIndex, children: tabs),
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          border: Border(top: BorderSide(color: AppColors.border, width: 1)),
        ),
        child: BottomNavigationBar(
          currentIndex: _tabIndex,
          onTap: (i) => setState(() => _tabIndex = i),
          items: [
            const BottomNavigationBarItem(
              icon: Icon(Icons.home_outlined),
              activeIcon: Icon(Icons.home_rounded),
              label: 'الرئيسية',
            ),
            const BottomNavigationBarItem(
              icon: Icon(Icons.restaurant_menu_outlined),
              activeIcon: Icon(Icons.restaurant_menu_rounded),
              label: 'القائمة',
            ),
            BottomNavigationBarItem(
              icon: Badge(
                isLabelVisible: totalCount > 0,
                label: Text('$totalCount', style: const TextStyle(fontSize: 10)),
                child: const Icon(Icons.shopping_cart_outlined),
              ),
              activeIcon: Badge(
                isLabelVisible: totalCount > 0,
                label: Text('$totalCount', style: const TextStyle(fontSize: 10)),
                child: const Icon(Icons.shopping_cart_rounded),
              ),
              label: 'السلة',
            ),
            const BottomNavigationBarItem(
              icon: Icon(Icons.receipt_long_outlined),
              activeIcon: Icon(Icons.receipt_long_rounded),
              label: 'طلباتي',
            ),
            const BottomNavigationBarItem(
              icon: Icon(Icons.person_outline_rounded),
              activeIcon: Icon(Icons.person_rounded),
              label: 'حسابي',
            ),
          ],
        ),
      ),
    );
  }
}
