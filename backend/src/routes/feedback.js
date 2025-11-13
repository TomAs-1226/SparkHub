const express = require('express')
const router = express.Router()
const { prisma } = require('../prisma')
const { requireAuth, requireRole } = require('../middleware/auth')

// 提交反馈（匿名或已登录）
router.post('/', async (req, res) => {
    const { userId, topic, content } = req.body
    const fb = await prisma.feedback.create({ data: { userId: userId || null, topic, content } })
    res.json({ ok: true, feedback: fb })
})

// 查看反馈（管理员）
router.get('/', requireAuth, requireRole(['ADMIN']), async (_req, res) => {
    const list = await prisma.feedback.findMany({ orderBy: { createdAt: 'desc' } })
    res.json({ ok: true, list })
})

module.exports = router