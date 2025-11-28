const express = require('express')
const { prisma } = require('../prisma')
const { requireAuth, requireRole } = require('../middleware/auth')
const { sendWeeklyUpdateEmail } = require('../utils/email')

const router = express.Router()

async function getOrCreatePreferences(userId) {
    const existing = await prisma.emailPreference.findUnique({ where: { userId } })
    if (existing) return existing
    return prisma.emailPreference.create({ data: { userId } })
}

router.use(requireAuth)

function parseAttachmentsJson(raw) {
    if (!raw) return []
    try {
        const parsed = JSON.parse(raw)
        return Array.isArray(parsed) ? parsed : []
    } catch (_err) {
        return []
    }
}

function normalizeAttachments(input) {
    if (!Array.isArray(input)) return []
    return input
        .map((item) => ({
            name: typeof item?.name === 'string' ? item.name : 'Attachment',
            url: typeof item?.url === 'string' ? item.url : '',
            mimeType: typeof item?.mimeType === 'string' ? item.mimeType : null,
            size: typeof item?.size === 'number' ? item.size : null,
        }))
        .filter((a) => a.url)
}

function presentWeeklyUpdate(update) {
    const attachments = parseAttachmentsJson(update.attachmentsJson)
    const { attachmentsJson, ...rest } = update
    return { ...rest, attachments }
}

router.get('/preferences', async (req, res) => {
    const prefs = await getOrCreatePreferences(req.user.id)
    res.json({ ok: true, preferences: prefs })
})

router.patch('/preferences', async (req, res) => {
    const allowed = ['weeklyUpdates', 'productUpdates', 'marketing']
    const data = {}
    for (const key of allowed) {
        if (typeof req.body[key] === 'boolean') {
            data[key] = req.body[key]
        }
    }
    if (Object.keys(data).length === 0) {
        return res.status(400).json({ ok: false, msg: 'No preference updates provided.' })
    }
    const prefs = await prisma.emailPreference.upsert({
        where: { userId: req.user.id },
        update: data,
        create: { userId: req.user.id, ...data }
    })
    res.json({ ok: true, preferences: prefs })
})

router.get('/weekly-updates', async (_req, res) => {
    const updatesRaw = await prisma.weeklyUpdate.findMany({
        where: { status: 'PUBLISHED' },
        orderBy: { publishedAt: 'desc' },
        take: 12,
        select: { id: true, title: true, summary: true, body: true, publishedAt: true, attachmentsJson: true }
    })
    res.json({ ok: true, updates: updatesRaw.map(presentWeeklyUpdate) })
})

router.use('/weekly-updates', requireRole(['ADMIN']))

router.post('/weekly-updates', async (req, res) => {
    const { title, summary, body, publishAt, status, attachments } = req.body
    if (!title || !body) {
        return res.status(400).json({ ok: false, msg: 'Title and body are required.' })
    }
    const normalizedAttachments = normalizeAttachments(attachments)
    const update = await prisma.weeklyUpdate.create({
        data: {
            title: String(title).trim(),
            summary: summary ? String(summary).trim() : null,
            body: String(body),
            attachmentsJson: JSON.stringify(normalizedAttachments),
            publishAt: publishAt ? new Date(publishAt) : null,
            status: typeof status === 'string' ? status.toUpperCase() : 'DRAFT',
            createdById: req.user.id
        }
    })
    res.status(201).json({ ok: true, update: presentWeeklyUpdate(update) })
})

router.get('/weekly-updates/admin', async (_req, res) => {
    const updatesRaw = await prisma.weeklyUpdate.findMany({
        orderBy: { createdAt: 'desc' },
        take: 25
    })
    res.json({ ok: true, updates: updatesRaw.map(presentWeeklyUpdate) })
})

router.patch('/weekly-updates/:id', async (req, res) => {
    const { title, summary, body, status, publishAt, attachments } = req.body
    const data = {}
    if (typeof title === 'string') data.title = title.trim()
    if (typeof summary === 'string') data.summary = summary.trim()
    if (typeof body === 'string') data.body = body
    if (typeof status === 'string') data.status = status.toUpperCase()
    if (publishAt) data.publishAt = new Date(publishAt)
    if (typeof attachments !== 'undefined') data.attachmentsJson = JSON.stringify(normalizeAttachments(attachments))

    if (Object.keys(data).length === 0) {
        return res.status(400).json({ ok: false, msg: 'No updates provided.' })
    }

    const update = await prisma.weeklyUpdate.update({ where: { id: req.params.id }, data })
    res.json({ ok: true, update: presentWeeklyUpdate(update) })
})

router.post('/weekly-updates/:id/publish', async (req, res) => {
    const now = new Date()
    const update = await prisma.weeklyUpdate.update({
        where: { id: req.params.id },
        data: { status: 'PUBLISHED', publishedAt: now, publishAt: req.body.publishAt ? new Date(req.body.publishAt) : null }
    })
    res.json({ ok: true, update: presentWeeklyUpdate(update) })
})

router.post('/weekly-updates/:id/send', async (req, res) => {
    const update = await prisma.weeklyUpdate.findUnique({ where: { id: req.params.id } })
    if (!update) {
        return res.status(404).json({ ok: false, msg: 'Update not found.' })
    }
    if (update.status !== 'PUBLISHED') {
        return res.status(400).json({ ok: false, msg: 'Only published updates can be sent.' })
    }

    const subscribers = await prisma.emailPreference.findMany({
        where: { weeklyUpdates: true },
        include: { user: { select: { id: true, email: true, name: true } } }
    })
    const recipients = subscribers
        .map((entry) => entry.user)
        .filter((u) => u && u.email)
    const updateWithAttachments = presentWeeklyUpdate(update)
    const result = await sendWeeklyUpdateEmail(updateWithAttachments, recipients)
    res.json({ ok: true, sent: result.sent || 0 })
})

module.exports = router
