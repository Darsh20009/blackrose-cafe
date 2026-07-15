class CustomerModel {
  final String id;
  final String name;
  final String phone;
  final String? email;
  final int loyaltyPoints;

  const CustomerModel({
    required this.id,
    required this.name,
    required this.phone,
    this.email,
    required this.loyaltyPoints,
  });

  factory CustomerModel.fromJson(Map<String, dynamic> j) => CustomerModel(
    id:            j['id'] as String? ?? j['_id'] as String? ?? '',
    name:          j['name'] as String? ?? '',
    phone:         j['phone'] as String? ?? '',
    email:         j['email'] as String?,
    loyaltyPoints: (j['loyaltyPoints'] as num?)?.toInt() ?? 0,
  );
}
