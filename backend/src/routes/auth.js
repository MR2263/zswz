import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { get, logAction } from '../db.js'
import { JWT_SECRET } from '../config.js'

const router = Router()

router.post('/login', async (request, response) => {
  const { username, password } = request.body || {}
  if (!username || !password) {
    response.status(400).json({ message: '请输入账号和密码' })
    return
  }

  const admin = await get('SELECT * FROM admins WHERE username = ?', [username])
  if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
    response.status(401).json({ message: '账号或密码错误' })
    return
  }

  const token = jwt.sign({ sub: admin.id, username: admin.username }, JWT_SECRET, { expiresIn: '7d' })
  await logAction({
    actor: admin.username,
    action: 'LOGIN',
    targetType: 'auth',
    detail: '管理员登录后台',
  })

  response.json({
    token,
    profile: {
      id: admin.id,
      username: admin.username,
    },
  })
})

export default router

