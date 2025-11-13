const express = require('express')
const router = express.Router()
const { prisma } = require('../prisma')
const { requireAuth, requireRole } = require('../middleware/auth')
const { isUnknownFieldError, cloneArgs } = require('../utils/prisma-compat')

const authorSelect = { select: { id: true, name: true, avatarUrl: true } }

async function runResourceQuery(method, args, allowAuthor = true) {
    const baseArgs = cloneArgs(args)
    const finalArgs = allowAuthor
        ? { ...baseArgs, include: { ...(baseArgs.include || {}), author: authorSelect } }
        : baseArgs
    try {
        return await prisma.resource[method](finalArgs)
    } catch (error) {
        if (allowAuthor && isUnknownFieldError(error)) {
            return runResourceQuery(method, args, false)
        }
        throw error
    }
}

function presentResource(resource) {
    if (!resource) return null
    return resource
}

function cleanString(input) {
    if (typeof input !== 'string') return null
    const trimmed = input.trim()
    return trimmed.length > 0 ? trimmed : null
}

// 新增资源（管理员/导师/创作者）
router.post('/', requireAuth, requireRole(['ADMIN', 'TUTOR', 'CREATOR']), async (req, res) => {
    try {
        const title = cleanString(req.body.title) || ''
        const kind = cleanString(req.body.kind) || ''
        const link = cleanString(req.body.url)
        const attachment = cleanString(req.body.attachmentUrl)

        if (!title || !kind) {
            return res.status(400).json({ ok: false, msg: 'Title and kind are required.' })
        }

        const primaryUrl = link || attachment
        if (!primaryUrl) {
            return res.status(400).json({ ok: false, msg: '请提供外部链接或上传文件' })
        }

        const resource = await runResourceQuery('create', {
            data: {
                title,
                kind,
                url: primaryUrl,
                summary: cleanString(req.body.summary),
                details: cleanString(req.body.details),
                imageUrl: cleanString(req.body.imageUrl),
                attachmentUrl: attachment,
                authorId: req.user.id,
            }
        })
        res.json({ ok: true, resource: presentResource(resource) })
    } catch (err) {
        console.error('CREATE RESOURCE ERROR', err)
        res.status(500).json({ ok: false, msg: '资源创建失败' })
    }
})

// 资源列表（公开）
router.get('/', async (_req, res) => {
    const list = await runResourceQuery('findMany', { orderBy: { createdAt: 'desc' } })
    res.json({ ok: true, list: list.map(presentResource) })
})

router.get('/mine', requireAuth, async (req, res) => {
    const list = await runResourceQuery('findMany', {
        where: { authorId: req.user.id },
        orderBy: { createdAt: 'desc' },
    })
    res.json({ ok: true, list: list.map(presentResource) })
})

router.get('/:id', async (req, res) => {
    const resource = await runResourceQuery('findUnique', {
        where: { id: req.params.id },
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
    const fields = ['title', 'kind', 'summary', 'details']
    fields.forEach((field) => {
        if (typeof req.body[field] === 'string') data[field] = req.body[field].trim()
    })
    if (typeof req.body.imageUrl === 'string') {
        data.imageUrl = cleanString(req.body.imageUrl)
    }
    if (typeof req.body.url === 'string') {
        data.url = cleanString(req.body.url)
    }
    if (typeof req.body.attachmentUrl === 'string') {
        data.attachmentUrl = cleanString(req.body.attachmentUrl)
    }

    const nextUrl = data.url === undefined ? resource.url : data.url
    const nextAttachment = data.attachmentUrl === undefined ? resource.attachmentUrl : data.attachmentUrl
    if (!nextUrl && !nextAttachment) {
        return res.status(400).json({ ok: false, msg: '资源必须包含链接或附件' })
    }

    const updated = await runResourceQuery('update', {
        where: { id: resource.id },
        data,
    })
    res.json({ ok: true, resource: presentResource(updated) })
})

module.exports = router
