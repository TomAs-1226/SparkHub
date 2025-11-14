// 简单鉴权与角色控制
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const { prisma } = require('../prisma')

function signToken(user, secret) {
    return jwt.sign({ id: user.id, role: user.role, name: user.name }, secret, { expiresIn: '7d' })
}

async function requireAuth(req, res, next) {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : null
    if (!token) return res.status(401).json({ ok: false, msg: '未登录' })
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET)
        req.user = payload
        if (!req.user?.role) {
            const user = await prisma.user.findUnique({
                where: { id: payload.id || payload.uid },
                select: { id: true, role: true, name: true },
            })
            if (!user) return res.status(401).json({ ok: false, msg: '未登录' })
            req.user = { id: user.id, role: user.role, name: user.name }
        }
        next()
    } catch (err) {
        console.error('AUTH ERROR', err)
        res.status(401).json({ ok: false, msg: 'pass无效' })
    }
}

async function maybeAuth(req, _res, next) {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : null
    if (!token) {
        return next()
    }
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET)
        req.user = payload
        if (!req.user?.role) {
            const user = await prisma.user.findUnique({
                where: { id: payload.id || payload.uid },
                select: { id: true, role: true, name: true }
            })
            if (user) {
                req.user = { id: user.id, role: user.role, name: user.name }
            }
        }
    } catch (err) {
        console.warn('optional auth failed', err.message)
    } finally {
        next()
    }
}

function requireRole(roles = []) {
    return (req, res, next) => {
        if (!req.user) return res.status(401).json({ ok: false, msg: '未登录' })
        if (!roles.includes(req.user.role)) return res.status(403).json({ ok: false, msg: '无权限' })
        next()
    }
}

module.exports = { signToken, requireAuth, requireRole, bcrypt, maybeAuth }