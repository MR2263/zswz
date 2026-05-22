import fs from 'node:fs'
import path from 'node:path'
import sqlite3 from 'sqlite3'
import bcrypt from 'bcryptjs'
import { ADMIN_PASSWORD, ADMIN_USERNAME, DATA_DIR, DB_PATH } from './config.js'

fs.mkdirSync(DATA_DIR, { recursive: true })

const sqlite = sqlite3.verbose()
export const db = new sqlite.Database(DB_PATH)

export function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(error) {
      if (error) {
        reject(error)
        return
      }

      resolve({ id: this.lastID, changes: this.changes })
    })
  })
}

export function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => {
      if (error) {
        reject(error)
        return
      }

      resolve(row)
    })
  })
}

export function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) {
        reject(error)
        return
      }

      resolve(rows)
    })
  })
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
  await run(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `)

  await run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL
    )
  `)

  await run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      sku TEXT,
      description TEXT NOT NULL,
      price REAL NOT NULL,
      product_condition TEXT NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      category_id INTEGER,
      image_url TEXT,
      is_published INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (category_id) REFERENCES categories (id)
    )
  `)

  await run(`
    CREATE TABLE IF NOT EXISTS page_views (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT NOT NULL,
      product_id INTEGER,
      session_id TEXT NOT NULL,
      user_agent TEXT,
      referrer TEXT,
      device_type TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (product_id) REFERENCES products (id)
    )
  `)

  await run(`
    CREATE TABLE IF NOT EXISTS action_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor TEXT NOT NULL,
      action TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id INTEGER,
      detail TEXT,
      created_at TEXT NOT NULL
    )
  `)

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

