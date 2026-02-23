// routes/discussions.js — Threaded discussion forums for LMS v2
const express = require('express')
const router = express.Router()
const { prisma } = require('../prisma')
const { requireAuth } = require('../middleware/auth')
const { moderate } = require('../utils/moderation')

const MANAGER_ROLES = new Set(['ADMIN', 'CREATOR', 'TUTOR'])

async function isCourseManager(userId, courseId) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
    if (MANAGER_ROLES.has(user?.role)) return true
    const course = await prisma.course.findUnique({ where: { id: courseId }, select: { creatorId: true } })
    return course?.creatorId === userId
}

async function canAccessCourse(userId, courseId) {
    if (await isCourseManager(userId, courseId)) return true
    const enrollment = await prisma.enrollment.findFirst({ where: { userId, courseId, status: 'APPROVED' } })
    return !!enrollment
}

// GET /discussions/:courseId — List discussions (optionally filtered by lessonId)
router.get('/:courseId', requireAuth, async (req, res) => {
    const { courseId } = req.params
    const { lessonId } = req.query

    if (!await canAccessCourse(req.user.id, courseId)) {
        return res.status(403).json({ ok: false, msg: 'Access denied.' })
    }

    const where = { courseId }
    if (lessonId) where.lessonId = lessonId

    const discussions = await prisma.courseDiscussion.findMany({
        where,
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        include: {
            author: { select: { id: true, name: true, avatarUrl: true, role: true } },
            replies: {
                orderBy: { createdAt: 'asc' },
                include: { author: { select: { id: true, name: true, avatarUrl: true, role: true } } },
            },
            _count: { select: { replies: true } },
        },
        take: 50,
    })

    res.json({ ok: true, discussions })
})

// GET /discussions/:courseId/:id — Get single discussion thread
router.get('/:courseId/:id', requireAuth, async (req, res) => {
    const { courseId, id } = req.params
    if (!await canAccessCourse(req.user.id, courseId)) {
        return res.status(403).json({ ok: false, msg: 'Access denied.' })
    }

    const discussion = await prisma.courseDiscussion.findUnique({
        where: { id },
        include: {
            author: { select: { id: true, name: true, avatarUrl: true, role: true } },
            replies: {
                orderBy: { createdAt: 'asc' },
                include: { author: { select: { id: true, name: true, avatarUrl: true, role: true } } },
            },
        },
    })
    if (!discussion) return res.status(404).json({ ok: false, msg: 'Discussion not found.' })
    res.json({ ok: true, discussion })
})

// POST /discussions/:courseId — Create discussion
router.post('/:courseId', requireAuth, async (req, res) => {
    const { courseId } = req.params
    const { title, body, lessonId } = req.body

    if (!await canAccessCourse(req.user.id, courseId)) {
        return res.status(403).json({ ok: false, msg: 'Access denied.' })
    }
    if (!title?.trim() || !body?.trim()) {
        return res.status(400).json({ ok: false, msg: 'Title and body are required.' })
    }

    // Moderate title + body
    const [titleMod, bodyMod] = await Promise.all([moderate(title.trim()), moderate(body.trim())])
    if (!titleMod.allowed) return res.status(400).json({ ok: false, msg: titleMod.reason || 'Title not allowed.' })
    if (!bodyMod.allowed) return res.status(400).json({ ok: false, msg: bodyMod.reason || 'Message not allowed.' })

    const discussion = await prisma.courseDiscussion.create({
        data: {
            courseId,
            lessonId: lessonId || null,
            authorId: req.user.id,
            title: (titleMod.cleaned || title.trim()).slice(0, 300),
            body: (bodyMod.cleaned || body.trim()).slice(0, 10000),
        },
        include: {
            author: { select: { id: true, name: true, avatarUrl: true, role: true } },
        },
    })
    res.status(201).json({ ok: true, discussion })
})

// PATCH /discussions/:courseId/:id — Update discussion (author or manager)
router.patch('/:courseId/:id', requireAuth, async (req, res) => {
    const { courseId, id } = req.params

    const existing = await prisma.courseDiscussion.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ ok: false, msg: 'Discussion not found.' })

    const isManager = await isCourseManager(req.user.id, courseId)
    if (existing.authorId !== req.user.id && !isManager) {
        return res.status(403).json({ ok: false, msg: 'Access denied.' })
    }

    const { body, isPinned, isResolved } = req.body
    const data = {}
    if (body !== undefined) data.body = body.trim().slice(0, 10000)
    if (isManager && isPinned !== undefined) data.isPinned = Boolean(isPinned)
    if (isResolved !== undefined) data.isResolved = Boolean(isResolved)

    const discussion = await prisma.courseDiscussion.update({ where: { id }, data })
    res.json({ ok: true, discussion })
})

// DELETE /discussions/:courseId/:id — Delete discussion (author or manager)
router.delete('/:courseId/:id', requireAuth, async (req, res) => {
    const { courseId, id } = req.params
    const existing = await prisma.courseDiscussion.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ ok: false, msg: 'Discussion not found.' })

    const isManager = await isCourseManager(req.user.id, courseId)
    if (existing.authorId !== req.user.id && !isManager) {
        return res.status(403).json({ ok: false, msg: 'Access denied.' })
    }

    await prisma.courseDiscussion.delete({ where: { id } })
    res.json({ ok: true })
})

// POST /discussions/:courseId/:id/replies — Reply to discussion
router.post('/:courseId/:id/replies', requireAuth, async (req, res) => {
    const { courseId, id } = req.params
    const { body } = req.body

    if (!await canAccessCourse(req.user.id, courseId)) {
        return res.status(403).json({ ok: false, msg: 'Access denied.' })
    }
    if (!body?.trim()) return res.status(400).json({ ok: false, msg: 'Reply body is required.' })

    const replyMod = await moderate(body.trim())
    if (!replyMod.allowed) return res.status(400).json({ ok: false, msg: replyMod.reason || 'Reply not allowed.' })

    const discussion = await prisma.courseDiscussion.findUnique({ where: { id } })
    if (!discussion) return res.status(404).json({ ok: false, msg: 'Discussion not found.' })

    const isManager = await isCourseManager(req.user.id, courseId)
    const reply = await prisma.discussionReply.create({
        data: {
            discussionId: id,
            authorId: req.user.id,
            body: (replyMod.cleaned || body.trim()).slice(0, 5000),
            isInstructorReply: isManager,
        },
        include: { author: { select: { id: true, name: true, avatarUrl: true, role: true } } },
    })
    res.status(201).json({ ok: true, reply })
})

// DELETE /discussions/:courseId/:discussionId/replies/:replyId — Delete reply
router.delete('/:courseId/:discussionId/replies/:replyId', requireAuth, async (req, res) => {
    const { courseId, replyId } = req.params
    const reply = await prisma.discussionReply.findUnique({ where: { id: replyId } })
    if (!reply) return res.status(404).json({ ok: false, msg: 'Reply not found.' })

    const isManager = await isCourseManager(req.user.id, courseId)
    if (reply.authorId !== req.user.id && !isManager) {
        return res.status(403).json({ ok: false, msg: 'Access denied.' })
    }

    await prisma.discussionReply.delete({ where: { id: replyId } })
    res.json({ ok: true })
})

module.exports = router
