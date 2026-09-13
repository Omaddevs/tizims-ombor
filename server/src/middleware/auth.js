import jwt from 'jsonwebtoken'
import { getData } from '../db/lowdb.js'

const JWT_SECRET = process.env.JWT_SECRET || 'tizims-ombor-dev-secret-change-me'
export const JWT_EXPIRES_IN = '30d'

export function signToken(user) {
  return jwt.sign({ sub: user.id, orgId: user.orgId, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Kirish talab qilinadi' })
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    const user = getData().users.find((u) => u.id === payload.sub)
    if (!user || user.blocked) return res.status(401).json({ error: 'Hisob topilmadi yoki bloklangan' })
    req.user = user
    req.orgId = user.role === 'super_admin' ? req.headers['x-org-id'] || null : user.orgId
    next()
  } catch {
    return res.status(401).json({ error: 'Token yaroqsiz yoki muddati o\'tgan' })
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Ushbu amal uchun ruxsat yo\'q' })
    }
    next()
  }
}
