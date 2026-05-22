import path from 'node:path'

export const PORT = Number(process.env.PORT || 4000)
export const JWT_SECRET = process.env.JWT_SECRET || 'replace-this-secret-in-production'
export const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin'
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123456'
const runtimeRoot = process.env.VERCEL ? '/tmp' : process.cwd()
export const DB_PATH = path.resolve(runtimeRoot, 'data', 'app.db')
export const UPLOAD_DIR = path.resolve(runtimeRoot, 'uploads')
export const DATA_DIR = path.resolve(runtimeRoot, 'data')
