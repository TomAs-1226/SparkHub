const express = require('express')
const router = express.Router()
const { prisma } = require('../prisma')
const { requireAuth, requireRole } = require('../middleware/auth')

const authorSelect = { select: { id: true, name: true, avatarUrl: true } }

function presentResource(resource) {
    if (!resource) return null
    return resource
}

// 新增资源（管理员/导师）
router.post('/', requireAuth, requireRole(['ADMIN', 'TUTOR']), async (req, res) => {
    const { title, kind, url, summary, details, imageUrl, attachmentUrl } = req.body
    const resource = await prisma.resource.create({
        data: {
            title,
            kind,
            url,
            summary,
            details,
            imageUrl,
            attachmentUrl,
            authorId: req.user.id,
        },
        include: { author: authorSelect },
    })
    res.json({ ok: true, resource: presentResource(resource) })
})

// 资源列表（公开）
router.get('/', async (_req, res) => {
    const list = await prisma.resource.findMany({ orderBy: { createdAt: 'desc' }, include: { author: authorSelect } })
    res.json({ ok: true, list: list.map(presentResource) })
})

router.get('/mine', requireAuth, async (req, res) => {
    const list = await prisma.resource.findMany({
        where: { authorId: req.user.id },
        orderBy: { createdAt: 'desc' },
        include: { author: authorSelect },
    })
    res.json({ ok: true, list: list.map(presentResource) })
})

router.get('/:id', async (req, res) => {
    const resource = await prisma.resource.findUnique({
        where: { id: req.params.id },
        include: { author: authorSelect },
    })
    if (!resource) return res.status(404).json({ ok: false, msg: '资源不存在' })
    res.json({ ok: true, resource: presentResource(resource) })
})

router.delete('/:id', requireAuth, async (req, res) => {
    const resource = await prisma.resource.findUnique({ where: { id: req.params.id } })
    if (!resource) return res.status(404).json({ ok: false, msg: '资源不存在' })
    if (req.user.role !== 'ADMIN' && resource.authorId !== req.user.id) {
        return res.status(403).json({ ok: false, msg: '无权限' })
    }
    await prisma.resource.delete({ where: { id: resource.id } })
    res.json({ ok: true })
})

router.patch('/:id', requireAuth, async (req, res) => {
    const resource = await prisma.resource.findUnique({ where: { id: req.params.id } })
    if (!resource) return res.status(404).json({ ok: false, msg: '资源不存在' })
    if (req.user.role !== 'ADMIN' && resource.authorId !== req.user.id) {
        return res.status(403).json({ ok: false, msg: '无权限' })
    }
    const data = {}
    const fields = ['title', 'kind', 'url', 'summary', 'details', 'imageUrl', 'attachmentUrl']
    fields.forEach((field) => {
        if (typeof req.body[field] === 'string') data[field] = req.body[field]
    })
    const updated = await prisma.resource.update({
        where: { id: resource.id },
        data,
        include: { author: authorSelect },
    })
    res.json({ ok: true, resource: presentResource(updated) })
})

module.exports = router
