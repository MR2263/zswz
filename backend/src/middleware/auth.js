import jwt from 'jsonwebtoken'
import { JWT_SECRET } from '../config.js'

export function requireAuth(request, response, next) {
  const header = request.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null

  if (!token) {
    response.status(401).json({ message: '未授权访问' })
    return
  }

  try {
    request.user = jwt.verify(token, JWT_SECRET)
    next()
  } catch {
    response.status(401).json({ message: '登录已失效，请重新登录' })
  }
}

