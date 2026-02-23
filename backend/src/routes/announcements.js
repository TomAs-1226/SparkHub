// routes/announcements.js — Course announcements for LMS v2
const express = require('express')
const router = express.Router()
const { prisma } = require('../prisma')
const { requireAuth } = require('../middleware/auth')

const MANAGER_ROLES = new Set(['ADMIN', 'CREATOR', 'TUTOR'])

async function isCourseManager(userId, courseId) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
    if (MANAGER_ROLES.has(user?.role)) return true
    const course = await prisma.course.findUnique({ where: { id: courseId }, select: { creatorId: true } })
    return course?.creatorId === userId
}

async function isEnrolledOrManager(userId, courseId) {
    if (await isCourseManager(userId, courseId)) return true
    const enrollment = await prisma.enrollment.findFirst({ where: { userId, courseId, status: 'APPROVED' } })
    return !!enrollment
}

// GET /announcements/:courseId — List announcements
router.get('/:courseId', requireAuth, async (req, res) => {
    const { courseId } = req.params
    const access = await isEnrolledOrManager(req.user.id, courseId)
    if (!access) return res.status(403).json({ ok: false, msg: 'Access denied.' })

    const announcements = await prisma.courseAnnouncement.findMany({
        where: { courseId },
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        include: { author: { select: { id: true, name: true, avatarUrl: true, role: true } } },
    })
    res.json({ ok: true, announcements })
})

// POST /announcements/:courseId — Create announcement (manager only)
router.post('/:courseId', requireAuth, async (req, res) => {
    const { courseId } = req.params
    const { title, body, isPinned = false } = req.body

    if (!await isCourseManager(req.user.id, courseId)) {
        return res.status(403).json({ ok: false, msg: 'Only course managers can post announcements.' })
    }
    if (!title?.trim() || !body?.trim()) {
        return res.status(400).json({ ok: false, msg: 'Title and body are required.' })
    }

    const announcement = await prisma.courseAnnouncement.create({
        data: {
            courseId,
            authorId: req.user.id,
            title: title.trim().slice(0, 200),
            body: body.trim().slice(0, 5000),
            isPinned: Boolean(isPinned),
        },
        include: { author: { select: { id: true, name: true, avatarUrl: true, role: true } } },
    })
    res.status(201).json({ ok: true, announcement })
})

// PATCH /announcements/:courseId/:id — Update announcement
router.patch('/:courseId/:id', requireAuth, async (req, res) => {
    const { courseId, id } = req.params
    if (!await isCourseManager(req.user.id, courseId)) {
        return res.status(403).json({ ok: false, msg: 'Access denied.' })
    }

    const { title, body, isPinned } = req.body
    const data = {}
    if (title !== undefined) data.title = title.trim().slice(0, 200)
    if (body !== undefined) data.body = body.trim().slice(0, 5000)
    if (isPinned !== undefined) data.isPinned = Boolean(isPinned)

    const announcement = await prisma.courseAnnouncement.update({ where: { id }, data })
    res.json({ ok: true, announcement })
})

// DELETE /announcements/:courseId/:id — Delete announcement
router.delete('/:courseId/:id', requireAuth, async (req, res) => {
    const { courseId, id } = req.params
    if (!await isCourseManager(req.user.id, courseId)) {
        return res.status(403).json({ ok: false, msg: 'Access denied.' })
    }
    await prisma.courseAnnouncement.delete({ where: { id } })
    res.json({ ok: true })
})

module.exports = router
