const express = require('express')
const router = express.Router()
const { prisma } = require('../prisma')
const { requireAuth, requireRole } = require('../middleware/auth')

// 新增资源（管理员）
router.post('/', requireAuth, requireRole(['ADMIN']), async (req, res) => {
    const { title, kind, url, summary } = req.body
    const r = await prisma.resource.create({ data: { title, kind, url, summary } })
    res.json({ ok: true, resource: r })
})

// 资源列表（公开）
router.get('/', async (_req, res) => {
    const list = await prisma.resource.findMany({ orderBy: { createdAt: 'desc' } })
    res.json({ ok: true, list })
})

module.exports = router