const express = require('express')
const router = express.Router()
const { prisma } = require('../prisma')
const { requireAuth, requireRole } = require('../middleware/auth')

function trimString(value, max) {
    if (typeof value !== 'string') return ''
    const trimmed = value.trim()
    if (max && trimmed.length > max) return trimmed.slice(0, max)
    return trimmed
}

// 提交反馈（匿名或已登录）
router.post('/', async (req, res) => {
    try {
        const topic = trimString(req.body.topic, 120)
        const content = trimString(req.body.content, 5000)
        const userId = trimString(req.body.userId || '', 200)
        if (!topic || !content) {
            return res.status(400).json({ ok: false, msg: '请输入主题和内容' })
        }
        const fb = await prisma.feedback.create({ data: { userId: userId || null, topic, content } })
        res.json({ ok: true, feedback: fb })
    } catch (err) {
        console.error('CREATE FEEDBACK ERROR', err)
        res.status(500).json({ ok: false, msg: '提交失败' })
    }
})

// 查看反馈（管理员）
router.get('/', requireAuth, requireRole(['ADMIN']), async (_req, res) => {
    const list = await prisma.feedback.findMany({ orderBy: { createdAt: 'desc' } })
    res.json({ ok: true, list })
})

module.exports = router