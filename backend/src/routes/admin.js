import { Router } from 'express'
import ExcelJS from 'exceljs'
import { all, get, logAction, run } from '../db.js'
import { requireAuth } from '../middleware/auth.js'
import { upload } from '../middleware/upload.js'
import { normalizeProduct } from '../utils.js'

const router = Router()

router.use(requireAuth)

router.get('/overview', async (_request, response) => {
  const [totalProducts, onlineProducts, totalStock, views, hotProducts, lowStockProducts, deviceStats] = await Promise.all([
    get('SELECT COUNT(*) AS count FROM products'),
    get('SELECT COUNT(*) AS count FROM products WHERE is_published = 1'),
    get('SELECT COALESCE(SUM(stock), 0) AS count FROM products'),
    get('SELECT COUNT(*) AS count FROM page_views'),
    all(
      `SELECT p.id, p.name, COUNT(v.id) AS views
       FROM products p
       LEFT JOIN page_views v ON v.product_id = p.id
       GROUP BY p.id
       ORDER BY views DESC, p.updated_at DESC
       LIMIT 5`,
    ),
    all(
      `SELECT p.id, p.name, p.stock
       FROM products p
       WHERE p.stock <= 3
       ORDER BY p.stock ASC, p.updated_at DESC`,
    ),
    all(
      `SELECT device_type, COUNT(*) AS count
       FROM page_views
       GROUP BY device_type`,
    ),
  ])

  response.json({
    cards: {
      totalProducts: totalProducts.count,
      onlineProducts: onlineProducts.count,
      totalStock: totalStock.count,
      totalViews: views.count,
    },
    hotProducts,
    lowStockProducts,
    deviceStats,
  })
})

router.get('/analytics/trend', async (_request, response) => {
  const rows = await all(
    `SELECT strftime('%Y-%m-%d', created_at) AS day, COUNT(*) AS views
     FROM page_views
     WHERE datetime(created_at) >= datetime('now', '-6 day')
     GROUP BY day
     ORDER BY day ASC`,
  )
  response.json(rows)
})

router.get('/analytics/summary', async (_request, response) => {
  const [totalViews, todayViews, uniqueVisitors, trend, hotProducts, deviceStats, recentPages] = await Promise.all([
    get('SELECT COUNT(*) AS count FROM page_views'),
    get(`SELECT COUNT(*) AS count FROM page_views WHERE date(created_at) = date('now')`),
    get('SELECT COUNT(DISTINCT session_id) AS count FROM page_views'),
    all(
      `SELECT strftime('%Y-%m-%d', created_at) AS day, COUNT(*) AS views
       FROM page_views
       WHERE datetime(created_at) >= datetime('now', '-6 day')
       GROUP BY day
       ORDER BY day ASC`,
    ),
    all(
      `SELECT p.id, p.name, COUNT(v.id) AS views
       FROM page_views v
       LEFT JOIN products p ON p.id = v.product_id
       WHERE v.product_id IS NOT NULL
       GROUP BY p.id
       ORDER BY views DESC
       LIMIT 5`,
    ),
    all(
      `SELECT COALESCE(device_type, 'unknown') AS device_type, COUNT(*) AS count
       FROM page_views
       GROUP BY device_type
       ORDER BY count DESC`,
    ),
    all(
      `SELECT path, COUNT(*) AS views, MAX(created_at) AS lastVisitedAt
       FROM page_views
       GROUP BY path
       ORDER BY lastVisitedAt DESC
       LIMIT 6`,
    ),
  ])

  response.json({
    cards: {
      totalViews: totalViews.count,
      todayViews: todayViews.count,
      uniqueVisitors: uniqueVisitors.count,
    },
    trend,
    hotProducts,
    deviceStats,
    recentPages,
  })
})

router.get('/categories', async (_request, response) => {
  const rows = await all('SELECT id, name, slug, created_at FROM categories ORDER BY id DESC')
  response.json(rows)
})

router.post('/categories', async (request, response) => {
  const { name, slug } = request.body || {}
  if (!name || !slug) {
    response.status(400).json({ message: '分类名称和标识不能为空' })
    return
  }

  const result = await run(
    'INSERT INTO categories (name, slug, created_at) VALUES (?, ?, datetime("now"))',
    [name, slug],
  )
  await logAction({
    actor: request.user.username,
    action: 'CREATE_CATEGORY',
    targetType: 'category',
    targetId: result.id,
    detail: `新增分类 ${name}`,
  })
  response.status(201).json({ id: result.id })
})

router.put('/categories/:id', async (request, response) => {
  const { name, slug } = request.body || {}
  await run('UPDATE categories SET name = ?, slug = ? WHERE id = ?', [name, slug, request.params.id])
  await logAction({
    actor: request.user.username,
    action: 'UPDATE_CATEGORY',
    targetType: 'category',
    targetId: Number(request.params.id),
    detail: `更新分类 ${name}`,
  })
  response.json({ success: true })
})

router.get('/products', async (_request, response) => {
  const rows = await all(
    `SELECT p.*, c.name AS category_name
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     ORDER BY p.updated_at DESC`,
  )
  response.json(rows.map(normalizeProduct))
})

router.post('/products', async (request, response) => {
  const { name, sku, description, price, condition, stock, categoryId, imageUrl, isPublished } = request.body || {}
  const result = await run(
    `INSERT INTO products
    (name, sku, description, price, product_condition, stock, category_id, image_url, is_published, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now"), datetime("now"))`,
    [name, sku || '', description, price, condition, stock, categoryId || null, imageUrl || '', isPublished ? 1 : 0],
  )
  await logAction({
    actor: request.user.username,
    action: 'CREATE_PRODUCT',
    targetType: 'product',
    targetId: result.id,
    detail: `新增商品 ${name}`,
  })
  response.status(201).json({ id: result.id })
})

router.put('/products/:id', async (request, response) => {
  const { name, sku, description, price, condition, stock, categoryId, imageUrl, isPublished } = request.body || {}
  await run(
    `UPDATE products
     SET name = ?, sku = ?, description = ?, price = ?, product_condition = ?, stock = ?, category_id = ?, image_url = ?, is_published = ?, updated_at = datetime("now")
     WHERE id = ?`,
    [name, sku || '', description, price, condition, stock, categoryId || null, imageUrl || '', isPublished ? 1 : 0, request.params.id],
  )
  await logAction({
    actor: request.user.username,
    action: 'UPDATE_PRODUCT',
    targetType: 'product',
    targetId: Number(request.params.id),
    detail: `更新商品 ${name}`,
  })
  response.json({ success: true })
})

router.patch('/products/:id/stock', async (request, response) => {
  const { stock } = request.body || {}
  await run('UPDATE products SET stock = ?, updated_at = datetime("now") WHERE id = ?', [stock, request.params.id])
  await logAction({
    actor: request.user.username,
    action: 'UPDATE_STOCK',
    targetType: 'product',
    targetId: Number(request.params.id),
    detail: `调整库存为 ${stock}`,
  })
  response.json({ success: true })
})

router.patch('/products/:id/publish', async (request, response) => {
  const { isPublished } = request.body || {}
  await run('UPDATE products SET is_published = ?, updated_at = datetime("now") WHERE id = ?', [isPublished ? 1 : 0, request.params.id])
  await logAction({
    actor: request.user.username,
    action: isPublished ? 'PUBLISH_PRODUCT' : 'UNPUBLISH_PRODUCT',
    targetType: 'product',
    targetId: Number(request.params.id),
    detail: isPublished ? '商品上架' : '商品下架',
  })
  response.json({ success: true })
})

router.post('/upload', upload.single('image'), async (request, response) => {
  if (!request.file) {
    response.status(400).json({ message: '请选择图片' })
    return
  }

  response.status(201).json({
    url: `/uploads/${request.file.filename}`,
  })
})

router.get('/logs', async (_request, response) => {
  const rows = await all('SELECT * FROM action_logs ORDER BY created_at DESC LIMIT 30')
  response.json(rows)
})

router.get('/export/products', async (_request, response) => {
  const products = await all(
    `SELECT p.name, p.sku, p.price, p.product_condition, p.stock, c.name AS category_name, p.is_published, p.updated_at
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     ORDER BY p.updated_at DESC`,
  )

  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('商品数据')
  worksheet.columns = [
    { header: '名称', key: 'name', width: 24 },
    { header: 'SKU', key: 'sku', width: 16 },
    { header: '价格', key: 'price', width: 12 },
    { header: '成色', key: 'product_condition', width: 12 },
    { header: '库存', key: 'stock', width: 10 },
    { header: '分类', key: 'category_name', width: 16 },
    { header: '状态', key: 'status', width: 12 },
    { header: '更新时间', key: 'updated_at', width: 24 },
  ]

  products.forEach((item) => {
    worksheet.addRow({
      ...item,
      status: item.is_published ? '上架中' : '已下架',
    })
  })

  response.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  response.setHeader('Content-Disposition', 'attachment; filename="products.xlsx"')
  await workbook.xlsx.write(response)
  response.end()
})

router.get('/export/analytics', async (_request, response) => {
  const views = await all(
    `SELECT strftime('%Y-%m-%d', created_at) AS day, device_type, COUNT(*) AS views
     FROM page_views
     GROUP BY day, device_type
     ORDER BY day ASC`,
  )
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('访问统计')
  worksheet.columns = [
    { header: '日期', key: 'day', width: 18 },
    { header: '设备类型', key: 'device_type', width: 16 },
    { header: '访问量', key: 'views', width: 12 },
  ]
  views.forEach((item) => worksheet.addRow(item))

  response.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  response.setHeader('Content-Disposition', 'attachment; filename="analytics.xlsx"')
  await workbook.xlsx.write(response)
  response.end()
})

export default router
