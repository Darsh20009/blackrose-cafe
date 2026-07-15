class OrderModel {
  final String id;
  final String orderNumber;
  final String status;
  final double total;
  final String deliveryMethod;
  final List<OrderItemModel> items;
  final DateTime createdAt;

  const OrderModel({
    required this.id,
    required this.orderNumber,
    required this.status,
    required this.total,
    required this.deliveryMethod,
    required this.items,
    required this.createdAt,
  });

  String get statusAr {
    switch (status) {
      case 'pending':    return 'قيد الانتظار';
      case 'confirmed':  return 'تم التأكيد';
      case 'preparing':  return 'جاري التحضير';
      case 'ready':      return 'جاهز للاستلام';
      case 'delivering': return 'في الطريق';
      case 'delivered':  return 'تم التسليم';
      case 'cancelled':  return 'ملغي';
      default:           return status;
    }
  }

  bool get isActive => ['pending', 'confirmed', 'preparing', 'ready', 'delivering'].contains(status);

  factory OrderModel.fromJson(Map<String, dynamic> j) => OrderModel(
    id:             j['id'] as String? ?? j['_id'] as String? ?? '',
    orderNumber:    j['orderNumber']?.toString() ?? '',
    status:         j['status'] as String? ?? 'pending',
    total:          (j['total'] as num?)?.toDouble() ?? 0,
    deliveryMethod: j['deliveryMethod'] as String? ?? 'pickup',
    items: (j['items'] as List?)
        ?.map((i) => OrderItemModel.fromJson(i as Map<String, dynamic>))
        .toList() ?? [],
    createdAt: DateTime.tryParse(j['createdAt'] as String? ?? '') ?? DateTime.now(),
  );
}

class OrderItemModel {
  final String nameAr;
  final int quantity;
  final double price;
  final String? selectedSize;

  const OrderItemModel({
    required this.nameAr,
    required this.quantity,
    required this.price,
    this.selectedSize,
  });

  factory OrderItemModel.fromJson(Map<String, dynamic> j) => OrderItemModel(
    nameAr:       j['nameAr'] as String? ?? j['name'] as String? ?? 'منتج',
    quantity:     (j['quantity'] as num?)?.toInt() ?? 1,
    price:        (j['price'] as num?)?.toDouble() ?? 0,
    selectedSize: j['selectedSize'] as String?,
  );
}
