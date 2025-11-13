// 简单鉴权与角色控制
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')

function signToken(user, secret) {
    return jwt.sign({ id: user.id, role: user.role, name: user.name }, secret, { expiresIn: '7d' })
}

function requireAuth(req, res, next) {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : null
    if (!token) return res.status(401).json({ ok: false, msg: '未登录' })
    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET)
        next()
    } catch {
        res.status(401).json({ ok: false, msg: 'pass无效' })
    }
}

function requireRole(roles = []) {
    return (req, res, next) => {
        if (!req.user) return res.status(401).json({ ok: false, msg: '未登录' })
        if (!roles.includes(req.user.role)) return res.status(403).json({ ok: false, msg: '无权限' })
        next()
    }
}

module.exports = { signToken, requireAuth, requireRole, bcrypt }