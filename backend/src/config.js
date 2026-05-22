import path from 'node:path'

export const PORT = Number(process.env.PORT || 4000)
export const JWT_SECRET = process.env.JWT_SECRET || 'replace-this-secret-in-production'
export const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin'
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123456'
export const DB_PATH = path.resolve(process.cwd(), 'data', 'app.db')
export const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads')
export const DATA_DIR = path.resolve(process.cwd(), 'data')

