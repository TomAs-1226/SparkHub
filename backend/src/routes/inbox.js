// routes/inbox.js — In-app inbox / messaging system
const express = require('express')
const router = express.Router()
const { prisma } = require('../prisma')
const { requireAuth, requireRole } = require('../middleware/auth')

const PAGE_SIZE = 20

// GET /inbox — paginated list for current user
router.get('/', requireAuth, async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page || '1', 10))
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || PAGE_SIZE, 10)))
    const kind = req.query.kind // optional filter: DIGEST | SYSTEM | DM
    const unreadOnly = req.query.unread === 'true'

    const where = { userId: req.user.id }
    if (kind) where.kind = kind
    if (unreadOnly) where.isRead = false

    const [messages, total] = await Promise.all([
        prisma.inboxMessage.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma.inboxMessage.count({ where }),
    ])

    res.json({ ok: true, messages, total, page, pages: Math.ceil(total / limit) })
})

// GET /inbox/unread-count — lightweight badge count
router.get('/unread-count', requireAuth, async (req, res) => {
    const count = await prisma.inboxMessage.count({
        where: { userId: req.user.id, isRead: false },
    })
    res.json({ ok: true, count })
})

// GET /inbox/:id — single message (marks read)
router.get('/:id', requireAuth, async (req, res) => {
    const message = await prisma.inboxMessage.findUnique({ where: { id: req.params.id } })
    if (!message) return res.status(404).json({ ok: false, msg: 'Message not found.' })
    if (message.userId !== req.user.id) return res.status(403).json({ ok: false, msg: 'Access denied.' })

    if (!message.isRead) {
        await prisma.inboxMessage.update({ where: { id: message.id }, data: { isRead: true } })
    }
    res.json({ ok: true, message: { ...message, isRead: true } })
})

// PATCH /inbox/:id/read — mark one message read
router.patch('/:id/read', requireAuth, async (req, res) => {
    const message = await prisma.inboxMessage.findUnique({ where: { id: req.params.id } })
    if (!message || message.userId !== req.user.id) return res.status(404).json({ ok: false, msg: 'Message not found.' })

    const updated = await prisma.inboxMessage.update({ where: { id: message.id }, data: { isRead: true } })
    res.json({ ok: true, message: updated })
})

// PATCH /inbox/read-all — mark all messages read for current user
router.patch('/read-all', requireAuth, async (req, res) => {
    const { count } = await prisma.inboxMessage.updateMany({
        where: { userId: req.user.id, isRead: false },
        data: { isRead: true },
    })
    res.json({ ok: true, updated: count })
})

// DELETE /inbox/:id — delete a message
router.delete('/:id', requireAuth, async (req, res) => {
    const message = await prisma.inboxMessage.findUnique({ where: { id: req.params.id } })
    if (!message || message.userId !== req.user.id) return res.status(404).json({ ok: false, msg: 'Message not found.' })

    await prisma.inboxMessage.delete({ where: { id: message.id } })
    res.json({ ok: true })
})

// POST /inbox/send — ADMIN: send a message to a user or broadcast
router.post('/send', requireAuth, requireRole(['ADMIN']), async (req, res) => {
    const { userId, allUsers, title, body, kind = 'SYSTEM', fromName } = req.body
    if (!title?.trim() || !body?.trim()) {
        return res.status(400).json({ ok: false, msg: 'Title and body are required.' })
    }
    if (!userId && !allUsers) {
        return res.status(400).json({ ok: false, msg: 'Specify userId or allUsers: true.' })
    }

    if (allUsers) {
        const users = await prisma.user.findMany({ select: { id: true } })
        await prisma.inboxMessage.createMany({
            data: users.map((u) => ({
                userId: u.id,
                kind,
                fromName: fromName || 'SparkHub Team',
                title: title.trim(),
                body: body.trim(),
            })),
        })
        return res.json({ ok: true, sent: users.length })
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return res.status(404).json({ ok: false, msg: 'User not found.' })

    const message = await prisma.inboxMessage.create({
        data: {
            userId,
            kind,
            fromName: fromName || 'SparkHub Team',
            title: title.trim(),
            body: body.trim(),
        },
    })
    res.json({ ok: true, message })
})

// POST /inbox/digest — ADMIN: trigger weekly digest generation now
router.post('/digest', requireAuth, requireRole(['ADMIN']), async (req, res) => {
    try {
        const { sendWeeklyDigests } = require('../scheduler/weekly-digest')
        const result = await sendWeeklyDigests()
        res.json({ ok: true, ...result })
    } catch (err) {
        console.error('DIGEST ERROR:', err)
        res.status(500).json({ ok: false, msg: err.message || 'Failed to send digest.' })
    }
})

module.exports = router
