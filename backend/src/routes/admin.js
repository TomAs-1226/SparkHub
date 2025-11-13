const express = require('express')
const router = express.Router()
const { prisma } = require('../prisma')
const { requireAuth, requireRole } = require('../middleware/auth')

router.use(requireAuth, requireRole(['ADMIN']))

router.get('/users', async (_req, res) => {
    const list = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        select: { id: true, email: true, name: true, role: true, avatarUrl: true, createdAt: true }
    })
    res.json({ ok: true, list })
})

router.patch('/users/:id', async (req, res) => {
    const allowed = ['ADMIN', 'STUDENT', 'CREATOR', 'TUTOR', 'RECRUITER']
    const role = typeof req.body.role === 'string' ? req.body.role.toUpperCase() : null
    if (!role || !allowed.includes(role)) {
        return res.status(400).json({ ok: false, msg: '角色无效' })
    }
    if (req.params.id === req.user.id) {
        return res.status(400).json({ ok: false, msg: '不能修改自己的角色' })
    }
    const user = await prisma.user.update({
        where: { id: req.params.id },
        data: { role },
        select: { id: true, email: true, name: true, role: true, avatarUrl: true }
    })
    res.json({ ok: true, user })
})

router.delete('/users/:id', async (req, res) => {
    if (req.params.id === req.user.id) {
        return res.status(400).json({ ok: false, msg: '不能删除自己' })
    }
    await prisma.user.delete({ where: { id: req.params.id } })
    res.json({ ok: true })
})

module.exports = router
