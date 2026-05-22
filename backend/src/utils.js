export function detectDeviceType(userAgent = '') {
  const value = userAgent.toLowerCase()
  if (/iphone|android|mobile|ipad/.test(value)) {
    return 'mobile'
  }

  return 'desktop'
}

export function normalizeProduct(row) {
  return {
    id: row.id,
    name: row.name,
    sku: row.sku,
    description: row.description,
    price: Number(row.price),
    condition: row.product_condition,
    stock: row.stock,
    categoryId: row.category_id,
    categoryName: row.category_name,
    imageUrl: row.image_url,
    isPublished: Boolean(row.is_published),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

