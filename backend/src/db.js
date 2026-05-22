import fs from 'node:fs'
import path from 'node:path'
import bcrypt from 'bcryptjs'
import { ADMIN_PASSWORD, ADMIN_USERNAME, DATA_DIR } from './config.js'

const STORE_PATH = path.join(DATA_DIR, 'store.json')

const store = {
  admins: [],
  categories: [],
  products: [],
  pageViews: [],
  actionLogs: [],
}

const ids = {
  admins: 1,
  categories: 1,
  products: 1,
  pageViews: 1,
  actionLogs: 1,
}

let initialized = false

function loadStore() {
  if (!fs.existsSync(STORE_PATH)) {
    return
  }

  const saved = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'))
  Object.assign(store, saved.store || {})
  Object.assign(ids, saved.ids || {})
}

function saveStore() {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(STORE_PATH, JSON.stringify({ store, ids }, null, 2))
}

function now(offset = '') {
  const date = new Date()
  const match = /^-(\d+) day$/.exec(offset)
  if (match) {
    date.setDate(date.getDate() - Number(match[1]))
  }
  return date.toISOString().slice(0, 19).replace('T', ' ')
}

function day(value) {
  return String(value || '').slice(0, 10)
}

function normalize(sql) {
  return sql.replace(/\s+/g, ' ').trim().toLowerCase()
}

function nextId(table) {
  const id = ids[table]
  ids[table] += 1
  return id
}

function productRow(product) {
  const category = store.categories.find((item) => item.id === product.category_id)
  return {
    ...product,
    category_name: category?.name || null,
  }
}

function groupByDay(rows) {
  const grouped = new Map()
  rows.forEach((item) => {
    const key = day(item.created_at)
    grouped.set(key, (grouped.get(key) || 0) + 1)
  })
  return [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, views]) => ({ day: date, views }))
}

function recentRows(days) {
  const since = new Date()
  since.setDate(since.getDate() - days)
  return store.pageViews.filter((item) => new Date(item.created_at.replace(' ', 'T')) >= since)
}

export async function run(sql, params = []) {
  const query = normalize(sql)

  if (query.startsWith('create table')) {
    return { id: undefined, changes: 0 }
  }

  if (query.startsWith('insert into admins')) {
    const [username, passwordHash] = params
    const id = nextId('admins')
    store.admins.push({ id, username, password_hash: passwordHash, created_at: now() })
    saveStore()
    return { id, changes: 1 }
  }

  if (query.startsWith('insert into categories')) {
    const [name, slug] = params
    const id = nextId('categories')
    store.categories.push({ id, name, slug, created_at: now() })
    saveStore()
    return { id, changes: 1 }
  }

  if (query.startsWith('update categories')) {
    const [name, slug, id] = params
    const category = store.categories.find((item) => item.id === Number(id))
    if (category) {
      category.name = name
      category.slug = slug
      saveStore()
    }
    return { id: Number(id), changes: category ? 1 : 0 }
  }

  if (query.startsWith('insert into products')) {
    const id = nextId('products')
    const values = query.includes('(name, sku, description')
      ? {
          name: params[0],
          sku: params[1] || '',
          description: params[2],
          price: Number(params[3]),
          product_condition: params[4],
          stock: Number(params[5]),
          category_id: params[6] ? Number(params[6]) : null,
          image_url: params[7] || '',
          is_published: params[8] ? 1 : 0,
        }
      : {
          name: params[0],
          price: Number(params[1]),
          description: params[2],
          product_condition: params[3],
          stock: Number(params[4]),
          category_id: params[5] ? Number(params[5]) : null,
          image_url: params[6] || '',
          is_published: params[7] ? 1 : 0,
          sku: params[8] || '',
        }

    store.products.push({
      id,
      ...values,
      created_at: now(),
      updated_at: now(),
    })
    saveStore()
    return { id, changes: 1 }
  }

  if (query.startsWith('update products') && query.includes('set name =')) {
    const [name, sku, description, price, condition, stock, categoryId, imageUrl, isPublished, id] = params
    const product = store.products.find((item) => item.id === Number(id))
    if (product) {
      Object.assign(product, {
        name,
        sku: sku || '',
        description,
        price: Number(price),
        product_condition: condition,
        stock: Number(stock),
        category_id: categoryId ? Number(categoryId) : null,
        image_url: imageUrl || '',
        is_published: isPublished ? 1 : 0,
        updated_at: now(),
      })
      saveStore()
    }
    return { id: Number(id), changes: product ? 1 : 0 }
  }

  if (query.startsWith('update products') && query.includes('set stock =')) {
    const [stock, id] = params
    const product = store.products.find((item) => item.id === Number(id))
    if (product) {
      product.stock = Number(stock)
      product.updated_at = now()
      saveStore()
    }
    return { id: Number(id), changes: product ? 1 : 0 }
  }

  if (query.startsWith('update products') && query.includes('set is_published =')) {
    const [isPublished, id] = params
    const product = store.products.find((item) => item.id === Number(id))
    if (product) {
      product.is_published = isPublished ? 1 : 0
      product.updated_at = now()
      saveStore()
    }
    return { id: Number(id), changes: product ? 1 : 0 }
  }

  if (query.startsWith('insert into page_views')) {
    const [path, productId, sessionId, userAgent, referrer, deviceType, offset] = params
    const id = nextId('pageViews')
    store.pageViews.push({
      id,
      path,
      product_id: productId ? Number(productId) : null,
      session_id: sessionId,
      user_agent: userAgent || '',
      referrer: referrer || 'direct',
      device_type: deviceType || 'unknown',
      created_at: now(offset),
    })
    saveStore()
    return { id, changes: 1 }
  }

  if (query.startsWith('insert into action_logs')) {
    const [actor, action, targetType, targetId, detail] = params
    const id = nextId('actionLogs')
    store.actionLogs.push({
      id,
      actor,
      action,
      target_type: targetType,
      target_id: targetId ? Number(targetId) : null,
      detail,
      created_at: now(),
    })
    saveStore()
    return { id, changes: 1 }
  }

  return { id: undefined, changes: 0 }
}

export async function get(sql, params = []) {
  const query = normalize(sql)

  if (query.includes('from admins where username')) {
    return store.admins.find((item) => item.username === params[0])
  }

  if (query.includes('count(*) as count from categories')) {
    return { count: store.categories.length }
  }

  if (query.includes('count(*) as count from products where is_published = 1')) {
    return { count: store.products.filter((item) => item.is_published).length }
  }

  if (query.includes('count(*) as count from products')) {
    return { count: store.products.length }
  }

  if (query.includes('sum(stock)')) {
    return { count: store.products.reduce((sum, item) => sum + Number(item.stock || 0), 0) }
  }

  if (query.includes('count(distinct session_id)')) {
    return { count: new Set(store.pageViews.map((item) => item.session_id)).size }
  }

  if (query.includes('date(created_at) = date')) {
    const today = day(now())
    return { count: store.pageViews.filter((item) => day(item.created_at) === today).length }
  }

  if (query.includes('count(*) as count from page_views')) {
    return { count: store.pageViews.length }
  }

  if (query.includes('from products p') && query.includes('where p.id =')) {
    const product = store.products.find((item) => item.id === Number(params[0]) && item.is_published)
    return product ? productRow(product) : undefined
  }

  return undefined
}

export async function all(sql, params = []) {
  const query = normalize(sql)

  if (query.includes('select id, name from categories')) {
    return [...store.categories].sort((left, right) => left.id - right.id)
  }

  if (query.includes('from categories')) {
    return [...store.categories].sort((left, right) => right.id - left.id)
  }

  if (query.includes('from products p') && query.includes('where p.is_published = 1')) {
    let rows = store.products.filter((item) => item.is_published)
    if (query.includes('p.category_id = ?')) {
      rows = rows.filter((item) => item.category_id === Number(params[0]))
    }
    if (query.includes('p.name like')) {
      const keyword = String(params.at(-1) || '').replaceAll('%', '').toLowerCase()
      rows = rows.filter((item) => `${item.name}${item.description}`.toLowerCase().includes(keyword))
    }
    return rows.map(productRow).sort((left, right) => right.updated_at.localeCompare(left.updated_at))
  }

  if (query.includes('from products p') && query.includes('left join categories')) {
    return store.products.map(productRow).sort((left, right) => right.updated_at.localeCompare(left.updated_at))
  }

  if (query.includes('select p.id, p.name, count(v.id) as views')) {
    return store.products
      .map((product) => ({
        id: product.id,
        name: product.name,
        views: store.pageViews.filter((view) => view.product_id === product.id).length,
      }))
      .sort((left, right) => right.views - left.views)
      .slice(0, 5)
  }

  if (query.includes('from products p') && query.includes('where p.stock <= 3')) {
    return store.products
      .filter((item) => item.stock <= 3)
      .map((item) => ({ id: item.id, name: item.name, stock: item.stock }))
      .sort((left, right) => left.stock - right.stock)
  }

  if (query.includes('from page_views v') && query.includes('left join products')) {
    return store.products
      .map((product) => ({
        id: product.id,
        name: product.name,
        views: store.pageViews.filter((view) => view.product_id === product.id).length,
      }))
      .filter((item) => item.views > 0)
      .sort((left, right) => right.views - left.views)
      .slice(0, 5)
  }

  if (query.includes('from page_views') && query.includes('group by device_type')) {
    const grouped = new Map()
    store.pageViews.forEach((item) => {
      grouped.set(item.device_type || 'unknown', (grouped.get(item.device_type || 'unknown') || 0) + 1)
    })
    return [...grouped.entries()]
      .map(([device_type, count]) => ({ device_type, count }))
      .sort((left, right) => right.count - left.count)
  }

  if (query.includes('strftime') && query.includes('from page_views')) {
    return groupByDay(query.includes("'-6 day'") ? recentRows(6) : store.pageViews)
  }

  if (query.includes('group by path')) {
    const grouped = new Map()
    store.pageViews.forEach((item) => {
      const current = grouped.get(item.path) || { path: item.path, views: 0, lastVisitedAt: item.created_at }
      current.views += 1
      if (item.created_at > current.lastVisitedAt) {
        current.lastVisitedAt = item.created_at
      }
      grouped.set(item.path, current)
    })
    return [...grouped.values()]
      .sort((left, right) => right.lastVisitedAt.localeCompare(left.lastVisitedAt))
      .slice(0, 6)
  }

  if (query.includes('from action_logs')) {
    return [...store.actionLogs].sort((left, right) => right.created_at.localeCompare(left.created_at)).slice(0, 30)
  }

  if (query.includes('select p.name, p.sku')) {
    return store.products.map((item) => ({
      name: item.name,
      sku: item.sku,
      price: item.price,
      product_condition: item.product_condition,
      stock: item.stock,
      category_name: productRow(item).category_name,
      is_published: item.is_published,
      updated_at: item.updated_at,
    }))
  }

  if (query.includes('select id from products')) {
    return store.products.map((item) => ({ id: item.id }))
  }

  return []
}

async function seedAdmin() {
  const existing = await get('SELECT id FROM admins WHERE username = ?', [ADMIN_USERNAME])
  if (existing) {
    return
  }

  const passwordHash = bcrypt.hashSync(ADMIN_PASSWORD, 10)
  await run(
    'INSERT INTO admins (username, password_hash, created_at) VALUES (?, ?, datetime("now"))',
    [ADMIN_USERNAME, passwordHash],
  )
}

async function seedCategories() {
  const row = await get('SELECT COUNT(*) AS count FROM categories')
  if (row?.count > 0) {
    return
  }

  const categories = ['电子数码', '学习办公', '生活用品', '配件耗材']
  for (const name of categories) {
    await run(
      'INSERT INTO categories (name, slug, created_at) VALUES (?, ?, datetime("now"))',
      [name, name],
    )
  }
}

async function seedProducts() {
  const row = await get('SELECT COUNT(*) AS count FROM products')
  if (row?.count > 0) {
    return
  }

  const categories = await all('SELECT id, name FROM categories ORDER BY id ASC')
  const categoryMap = Object.fromEntries(categories.map((item) => [item.name, item.id]))
  const sampleProducts = [
    {
      name: '二手蓝牙键盘',
      price: 88,
      description: '支持平板和手机连接，按键反馈清晰，适合宿舍和移动办公使用。',
      condition: '9成新',
      stock: 6,
      categoryId: categoryMap['学习办公'],
      imageUrl: 'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?auto=format&fit=crop&w=1200&q=80',
      isPublished: 1,
      sku: 'KB-001',
    },
    {
      name: '桌面显示器支架',
      price: 59,
      description: '金属材质，适配常见显示器和小型电视，节省桌面空间。',
      condition: '8.5成新',
      stock: 11,
      categoryId: categoryMap['电子数码'],
      imageUrl: 'https://images.unsplash.com/photo-1527443154391-507e9dc6c5cc?auto=format&fit=crop&w=1200&q=80',
      isPublished: 1,
      sku: 'ST-002',
    },
    {
      name: '宿舍收纳推车',
      price: 42,
      description: '三层移动收纳，适合零食、洗护用品和文具分类存放。',
      condition: '9.5成新',
      stock: 3,
      categoryId: categoryMap['生活用品'],
      imageUrl: 'https://images.unsplash.com/photo-1582582429416-cf57c42f5d08?auto=format&fit=crop&w=1200&q=80',
      isPublished: 1,
      sku: 'SH-003',
    },
    {
      name: 'Type-C 扩展坞',
      price: 129,
      description: '支持 HDMI、USB 3.0 和 PD 充电，适配主流轻薄本。',
      condition: '9成新',
      stock: 2,
      categoryId: categoryMap['配件耗材'],
      imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=1200&q=80',
      isPublished: 0,
      sku: 'DOCK-004',
    },
  ]

  for (const item of sampleProducts) {
    await run(
      `INSERT INTO products
      (name, price, description, product_condition, stock, category_id, image_url, is_published, sku, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now"), datetime("now"))`,
      [
        item.name,
        item.price,
        item.description,
        item.condition,
        item.stock,
        item.categoryId,
        item.imageUrl,
        item.isPublished,
        item.sku,
      ],
    )
  }
}

async function seedViews() {
  const row = await get('SELECT COUNT(*) AS count FROM page_views')
  if (row?.count > 0) {
    return
  }

  const products = await all('SELECT id FROM products')
  for (const product of products) {
    for (let index = 0; index < 3; index += 1) {
      await run(
        `INSERT INTO page_views
        (path, product_id, session_id, user_agent, referrer, device_type, created_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime("now", ?))`,
        [
          `/products/${product.id}`,
          product.id,
          `seed-session-${product.id}-${index}`,
          'seed-agent',
          'direct',
          index % 2 === 0 ? 'mobile' : 'desktop',
          `-${index + 1} day`,
        ],
      )
    }
  }
}

export async function initializeDatabase() {
  if (initialized) {
    return
  }
  initialized = true
  loadStore()
  await seedAdmin()
  await seedCategories()
  await seedProducts()
  await seedViews()
}

export async function logAction({ actor, action, targetType, targetId = null, detail = '' }) {
  await run(
    `INSERT INTO action_logs (actor, action, target_type, target_id, detail, created_at)
     VALUES (?, ?, ?, ?, ?, datetime("now"))`,
    [actor, action, targetType, targetId, detail],
  )
}
