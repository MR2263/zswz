import { Router } from 'express'
import { all, get, run } from '../db.js'
import { detectDeviceType, normalizeProduct } from '../utils.js'

const router = Router()

router.get('/categories', async (_request, response) => {
  const rows = await all('SELECT id, name, slug FROM categories ORDER BY id DESC')
  response.json(rows)
})

router.get('/products', async (request, response) => {
  const { categoryId, keyword } = request.query
  const filters = ['p.is_published = 1']
  const params = []

  if (categoryId) {
    filters.push('p.category_id = ?')
    params.push(categoryId)
  }

  if (keyword) {
    filters.push('(p.name LIKE ? OR p.description LIKE ?)')
    params.push(`%${keyword}%`, `%${keyword}%`)
  }

  const rows = await all(
    `SELECT p.*, c.name AS category_name
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE ${filters.join(' AND ')}
     ORDER BY p.updated_at DESC`,
    params,
  )

  response.json(rows.map(normalizeProduct))
})

router.get('/products/:id', async (request, response) => {
  const row = await get(
    `SELECT p.*, c.name AS category_name
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.id = ? AND p.is_published = 1`,
    [request.params.id],
  )

  if (!row) {
    response.status(404).json({ message: '商品不存在或未上架' })
    return
  }

  response.json(normalizeProduct(row))
})

router.post('/analytics/track', async (request, response) => {
  const { path, productId, sessionId, referrer } = request.body || {}
  if (!path || !sessionId) {
    response.status(400).json({ message: '缺少埋点信息' })
    return
  }

  await run(
    `INSERT INTO page_views
    (path, product_id, session_id, user_agent, referrer, device_type, created_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime("now"))`,
    [
      path,
      productId || null,
      sessionId,
      request.headers['user-agent'] || '',
      referrer || 'direct',
      detectDeviceType(request.headers['user-agent'] || ''),
    ],
  )

  response.status(201).json({ success: true })
})

export default router

