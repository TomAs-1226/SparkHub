const express = require('express')
const router = express.Router()
const { prisma } = require('../prisma')
const { requireAuth, requireRole } = require('../middleware/auth')
const { isUnknownFieldError, cloneArgs } = require('../utils/prisma-compat')

const creatorSelect = { select: { id: true, name: true, avatarUrl: true } }

function cleanString(value) {
    if (typeof value !== 'string') return ''
    return value.trim()
}

function parseDateInput(value) {
    if (!value) return null
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
}

async function runEventQuery(method, args, allowCreator = true) {
    const baseArgs = cloneArgs(args)
    const finalArgs = allowCreator
        ? { ...baseArgs, include: { ...(baseArgs.include || {}), creator: creatorSelect } }
        : baseArgs
    try {
        return await prisma.event[method](finalArgs)
    } catch (error) {
        if (allowCreator && isUnknownFieldError(error)) {
            return runEventQuery(method, args, false)
        }
        throw error
    }
}

function parseAttachments(raw) {
    if (!raw) return []
    try {
        const parsed = JSON.parse(raw)
        return Array.isArray(parsed) ? parsed : []
    } catch {
        return []
    }
}

function toJson(arr) {
    if (!Array.isArray(arr)) return '[]'
    return JSON.stringify(arr.filter((item) => typeof item === 'string' && item.trim().length > 0))
}

function presentEvent(event) {
    if (!event) return null
    const { attachmentsJson, ...rest } = event
    return { ...rest, attachments: parseAttachments(attachmentsJson) }
}

// 创建活动（管理员 & 导师 & 创作者）
router.post('/', requireAuth, requireRole(['ADMIN', 'TUTOR', 'CREATOR']), async (req, res) => {
    const title = cleanString(req.body.title)
    const location = cleanString(req.body.location)
    const startsAt = parseDateInput(req.body.startsAt)
    const endsAt = parseDateInput(req.body.endsAt)
    const capacity = req.body.capacity ? Number(req.body.capacity) : null
    const description = cleanString(req.body.description || '')
    const coverUrl = cleanString(req.body.coverUrl || '') || null
    const attachments = Array.isArray(req.body.attachments) ? req.body.attachments : []

    if (!title || !location || !startsAt || !endsAt) {
        return res.status(400).json({ ok: false, msg: 'Title, location, and valid start/end times are required.' })
    }
    if (!(endsAt > startsAt)) {
        return res.status(400).json({ ok: false, msg: 'End time must be after start time.' })
    }
    try {
        const event = await runEventQuery('create', {
            data: {
                title,
                location,
                startsAt,
                endsAt,
                capacity,
                description,
                coverUrl,
                attachmentsJson: toJson(attachments),
                creatorId: req.user.id,
            }
        })
        res.json({ ok: true, event: presentEvent(event) })
    } catch (err) {
        console.error('CREATE EVENT ERROR', err)
        res.status(500).json({ ok: false, msg: '活动创建失败' })
    }
})

// 活动列表
router.get('/', async (req, res) => {
    const limitRaw = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit
    const take = limitRaw ? parseInt(limitRaw, 10) : null
    const query = {
        orderBy: { startsAt: 'asc' },
        include: { creator: creatorSelect },
    }
    if (take && Number.isFinite(take) && take > 0) {
        query.take = take
    }
    const rows = await runEventQuery('findMany', query)
    res.json({ ok: true, list: rows.map(presentEvent) })
})

// 我发布的活动
router.get('/mine', requireAuth, async (req, res) => {
    const rows = await runEventQuery('findMany', {
        where: { creatorId: req.user.id },
        orderBy: { createdAt: 'desc' },
    })
    res.json({ ok: true, list: rows.map(presentEvent) })
})

// 活动详情
router.get('/:id', async (req, res) => {
    const event = await runEventQuery('findUnique', {
        where: { id: req.params.id },
    })
    if (!event) return res.status(404).json({ ok: false, msg: '活动不存在' })
    res.json({ ok: true, event: presentEvent(event) })
})

// 更新活动
router.patch('/:id', requireAuth, async (req, res) => {
    const existing = await prisma.event.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ ok: false, msg: '活动不存在' })
    if (req.user.role !== 'ADMIN' && existing.creatorId !== req.user.id) {
        return res.status(403).json({ ok: false, msg: '无权限' })
    }
    const data = {}
    const editableFields = ['title', 'location', 'description', 'coverUrl']
    editableFields.forEach((field) => {
        if (typeof req.body[field] === 'string') data[field] = req.body[field]
    })
    if (req.body.startsAt) {
        const parsed = parseDateInput(req.body.startsAt)
        if (!parsed) return res.status(400).json({ ok: false, msg: 'Invalid start time' })
        data.startsAt = parsed
    }
    if (req.body.endsAt) {
        const parsedEnd = parseDateInput(req.body.endsAt)
        if (!parsedEnd) return res.status(400).json({ ok: false, msg: 'Invalid end time' })
        data.endsAt = parsedEnd
    }
    if (typeof req.body.capacity !== 'undefined') {
        data.capacity = req.body.capacity === null ? null : Number(req.body.capacity)
    }
    if (Array.isArray(req.body.attachments)) {
        data.attachmentsJson = toJson(req.body.attachments)
    }
    const event = await runEventQuery('update', {
        where: { id: existing.id },
        data,
    })
    res.json({ ok: true, event: presentEvent(event) })
})

// 删除活动
router.delete('/:id', requireAuth, async (req, res) => {
    const existing = await prisma.event.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ ok: false, msg: '活动不存在' })
    if (req.user.role !== 'ADMIN' && existing.creatorId !== req.user.id) {
        return res.status(403).json({ ok: false, msg: '无权限' })
    }
    await prisma.event.delete({ where: { id: existing.id } })
    res.json({ ok: true })
})

// 报名活动
router.post('/:id/signup', requireAuth, async (req, res) => {
    const ev = await prisma.event.findUnique({ where: { id: req.params.id } })
    if (!ev) return res.status(404).json({ ok: false, msg: '活动不存在' })
    const signup = await prisma.eventSignup.upsert({
        where: { eventId_userId: { eventId: ev.id, userId: req.user.id } },
        create: { eventId: ev.id, userId: req.user.id, note: req.body.note },
        update: { note: req.body.note }
    })
    res.json({ ok: true, signup })
})

// 查看报名（管理员）
router.get('/:id/signups', requireAuth, requireRole(['ADMIN']), async (req, res) => {
    const list = await prisma.eventSignup.findMany({ where: { eventId: req.params.id }, include: { user: true } })
    res.json({ ok: true, list })
})

module.exports = router
