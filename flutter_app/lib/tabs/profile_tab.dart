import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../core/api.dart';
import '../core/colors.dart';
import '../core/storage.dart';
import '../models/customer.dart';

class ProfileTab extends StatefulWidget {
  final VoidCallback onLogout;
  const ProfileTab({required this.onLogout, super.key});
  @override
  State<ProfileTab> createState() => _ProfileTabState();
}

class _ProfileTabState extends State<ProfileTab> {
  CustomerModel? _customer;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final raw = await Api.get('/api/customers/profile');
      if (mounted) {
        setState(() {
          _customer = CustomerModel.fromJson(raw as Map<String, dynamic>);
          _loading = false;
        });
      }
    } catch (_) {
      // Not logged in or network error — show phone from storage
      final phone = await AppStorage.getPhone();
      final name  = await AppStorage.getName();
      if (mounted) {
        setState(() {
          if (phone != null && phone.isNotEmpty) {
            _customer = CustomerModel(id: '', name: name ?? 'مستخدم', phone: phone, loyaltyPoints: 0);
          }
          _loading = false;
        });
      }
    }
  }

  Future<void> _logout() async {
    // Show confirmation
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('تسجيل الخروج', textAlign: TextAlign.center),
        content: const Text('هل تريد تسجيل الخروج من حسابك؟', textAlign: TextAlign.center),
        actionsAlignment: MainAxisAlignment.center,
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('إلغاء')),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.error, minimumSize: const Size(100, 40)),
            child: const Text('خروج'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;

    try { await Api.post('/api/customers/logout'); } catch (_) {}
    await AppStorage.clearAll();
    widget.onLogout();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: _loading
            ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
            : CustomScrollView(
                slivers: [
                  SliverToBoxAdapter(
                    child: Column(
                      children: [
                        const SizedBox(height: 24),

                        // ── Avatar ────────────────────────────────────
                        CircleAvatar(
                          radius: 44,
                          backgroundColor: AppColors.primaryLight,
                          child: Text(
                            _customer?.name.isNotEmpty == true ? _customer!.name[0].toUpperCase() : '👤',
                            style: const TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: AppColors.primaryDark),
                          ),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          _customer?.name.isNotEmpty == true ? _customer!.name : 'مستخدم',
                          style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: AppColors.text),
                        ),
                        Text(
                          _customer?.phone ?? '',
                          style: const TextStyle(fontSize: 14, color: AppColors.textSecond),
                        ),

                        const SizedBox(height: 24),

                        // ── Loyalty points ─────────────────────────────
                        if (_customer != null)
                          Container(
                            margin: const EdgeInsets.symmetric(horizontal: 16),
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(
                                colors: [Color(0xFF1A6B4A), Color(0xFF2D9B6E)],
                              ),
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: Row(
                              children: [
                                const Text('⭐', style: TextStyle(fontSize: 32)),
                                const SizedBox(width: 16),
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text('نقاط الولاء', style: TextStyle(color: Colors.white70, fontSize: 13)),
                                    Text(
                                      '${_customer!.loyaltyPoints} نقطة',
                                      style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w800),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),

                        const SizedBox(height: 24),

                        // ── Menu items ────────────────────────────────
                        _MenuItem(
                          icon: Icons.support_agent_outlined,
                          label: 'الدعم الفني',
                          onTap: () async {
                            final uri = Uri.parse('https://wa.me/966500000000');
                            if (await canLaunchUrl(uri)) await launchUrl(uri);
                          },
                        ),
                        _MenuItem(
                          icon: Icons.info_outline_rounded,
                          label: 'عن التطبيق',
                          onTap: () => showAboutDialog(
                            context: context,
                            applicationName: 'Black Rose',
                            applicationVersion: '3.0.0',
                            applicationLegalese: '© 2024 Black Rose Café',
                          ),
                        ),

                        const Divider(height: 32, indent: 16, endIndent: 16, color: AppColors.border),

                        _MenuItem(
                          icon: Icons.logout_rounded,
                          label: 'تسجيل الخروج',
                          color: AppColors.error,
                          onTap: _logout,
                        ),

                        const SizedBox(height: 40),
                      ],
                    ),
                  ),
                ],
              ),
      ),
    );
  }
}

class _MenuItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final Color color;
  const _MenuItem({required this.icon, required this.label, required this.onTap, this.color = AppColors.text});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 4),
      child: Material(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(12),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(
              border: Border.all(color: AppColors.border),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                Icon(icon, color: color, size: 22),
                const SizedBox(width: 14),
                Text(label, style: TextStyle(fontSize: 15, fontWeight: FontWeight.w500, color: color)),
                const Spacer(),
                Icon(Icons.chevron_left_rounded, color: color.withValues(alpha: 0.4), size: 22),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
