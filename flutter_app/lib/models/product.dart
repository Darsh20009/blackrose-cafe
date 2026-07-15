class ProductModel {
  final String id;
  final String nameAr;
  final String nameEn;
  final String descriptionAr;
  final double price;
  final String? imageUrl;
  final String categoryId;
  final bool isAvailable;
  final bool isFeatured;
  final List<String> sizes;
  final double rating;
  final int reviewCount;

  const ProductModel({
    required this.id,
    required this.nameAr,
    required this.nameEn,
    required this.descriptionAr,
    required this.price,
    this.imageUrl,
    required this.categoryId,
    required this.isAvailable,
    required this.isFeatured,
    required this.sizes,
    required this.rating,
    required this.reviewCount,
  });

  String get displayName => nameAr.isNotEmpty ? nameAr : nameEn;
  String get priceLabel  => '${price.toStringAsFixed(price % 1 == 0 ? 0 : 1)} ر.س';

  factory ProductModel.fromJson(Map<String, dynamic> j) => ProductModel(
    id:            j['id'] as String? ?? j['_id'] as String? ?? '',
    nameAr:        j['nameAr'] as String? ?? '',
    nameEn:        j['nameEn'] as String? ?? '',
    descriptionAr: j['descriptionAr'] as String? ?? '',
    price:         (j['price'] as num?)?.toDouble() ?? 0,
    imageUrl:      j['image'] as String? ?? j['imageUrl'] as String?,
    categoryId:    j['categoryId'] as String? ?? '',
    isAvailable:   j['isAvailable'] as bool? ?? true,
    isFeatured:    j['isFeatured'] as bool? ?? false,
    sizes:         (j['sizes'] as List?)?.cast<String>() ?? [],
    rating:        (j['rating'] as num?)?.toDouble() ?? 0,
    reviewCount:   (j['reviewCount'] as num?)?.toInt() ?? 0,
  );
}

class CategoryModel {
  final String id;
  final String nameAr;
  final String nameEn;
  final String? emoji;
  final int order;

  const CategoryModel({
    required this.id,
    required this.nameAr,
    required this.nameEn,
    this.emoji,
    required this.order,
  });

  String get displayName => nameAr.isNotEmpty ? nameAr : nameEn;

  factory CategoryModel.fromJson(Map<String, dynamic> j) => CategoryModel(
    id:     j['id'] as String? ?? j['_id'] as String? ?? '',
    nameAr: j['nameAr'] as String? ?? '',
    nameEn: j['nameEn'] as String? ?? '',
    emoji:  j['emoji'] as String?,
    order:  (j['order'] as num?)?.toInt() ?? 0,
  );
}
