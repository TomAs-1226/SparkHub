// routes/bookmarks.js — Course bookmarks for LMS v2
const express = require('express')
const router = express.Router()
const { prisma } = require('../prisma')
const { requireAuth } = require('../middleware/auth')

// GET /bookmarks — Get all bookmarked courses for current user
router.get('/', requireAuth, async (req, res) => {
    const bookmarks = await prisma.courseBookmark.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
        include: {
            course: {
                select: {
                    id: true, title: true, summary: true, coverUrl: true,
                    tagsJson: true, creator: { select: { id: true, name: true, avatarUrl: true } },
                    _count: { select: { enrollments: true, lessons: true } },
                },
            },
        },
    })
    res.json({ ok: true, bookmarks })
})

// POST /bookmarks/:courseId — Bookmark a course
router.post('/:courseId', requireAuth, async (req, res) => {
    const { courseId } = req.params
    const course = await prisma.course.findUnique({ where: { id: courseId } })
    if (!course) return res.status(404).json({ ok: false, msg: 'Course not found.' })

    try {
        const bookmark = await prisma.courseBookmark.create({
            data: { userId: req.user.id, courseId },
        })
        res.status(201).json({ ok: true, bookmark })
    } catch (err) {
        if (err.code === 'P2002') {
            return res.status(409).json({ ok: false, msg: 'Already bookmarked.' })
        }
        throw err
    }
})

// DELETE /bookmarks/:courseId — Remove bookmark
router.delete('/:courseId', requireAuth, async (req, res) => {
    const { courseId } = req.params
    await prisma.courseBookmark.deleteMany({
        where: { userId: req.user.id, courseId },
    })
    res.json({ ok: true })
})

module.exports = router
