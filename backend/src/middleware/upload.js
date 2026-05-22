import fs from 'node:fs'
import path from 'node:path'
import multer from 'multer'
import { UPLOAD_DIR } from '../config.js'

fs.mkdirSync(UPLOAD_DIR, { recursive: true })

const storage = multer.diskStorage({
  destination: (_request, _file, callback) => {
    callback(null, UPLOAD_DIR)
  },
  filename: (_request, file, callback) => {
    const extension = path.extname(file.originalname || '').toLowerCase()
    callback(null, `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${extension}`)
  },
})

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
})

