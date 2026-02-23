// routes/progress.js — Lesson progress tracking for LMS v2
const express = require('express')
const router = express.Router()
const { prisma } = require('../prisma')
const { requireAuth } = require('../middleware/auth')

// ── Helpers ───────────────────────────────────────────────────────────────────
async function isEnrolled(userId, courseId) {
    const enrollment = await prisma.enrollment.findFirst({
        where: { userId, courseId, status: 'APPROVED' },
    })
    return !!enrollment
}

async function isCourseManager(userId, courseId) {
    const course = await prisma.course.findUnique({ where: { id: courseId }, select: { creatorId: true } })
    if (!course) return false
    return course.creatorId === userId
}

// ── Mark lesson complete / update progress ─────────────────────────────────
// POST /progress/:courseId/lessons/:lessonId
router.post('/:courseId/lessons/:lessonId', requireAuth, async (req, res) => {
    const { courseId, lessonId } = req.params
    const userId = req.user.id
    const { completed = true, timeSpentSec = 0 } = req.body

    const enrolled = await isEnrolled(userId, courseId)
    const manager = await isCourseManager(userId, courseId)
    if (!enrolled && !manager) {
        return res.status(403).json({ ok: false, msg: 'Not enrolled in this course.' })
    }

    const lesson = await prisma.lesson.findFirst({ where: { id: lessonId, courseId } })
    if (!lesson) return res.status(404).json({ ok: false, msg: 'Lesson not found.' })

    const progress = await prisma.lessonProgress.upsert({
        where: { userId_lessonId: { userId, lessonId } },
        create: {
            userId,
            lessonId,
            courseId,
            completed: Boolean(completed),
            completedAt: completed ? new Date() : null,
            timeSpentSec: Math.max(0, Number(timeSpentSec) || 0),
        },
        update: {
            completed: Boolean(completed),
            completedAt: completed ? new Date() : null,
            timeSpentSec: { increment: Math.max(0, Number(timeSpentSec) || 0) },
        },
    })

    res.json({ ok: true, progress })
})

// ── Get progress summary for a course ─────────────────────────────────────
// GET /progress/:courseId
router.get('/:courseId', requireAuth, async (req, res) => {
    const { courseId } = req.params
    const userId = req.user.id

    const [course, allProgress] = await Promise.all([
        prisma.course.findUnique({
            where: { id: courseId },
            include: { lessons: { select: { id: true, title: true, order: true, type: true } } },
        }),
        prisma.lessonProgress.findMany({ where: { userId, courseId } }),
    ])

    if (!course) return res.status(404).json({ ok: false, msg: 'Course not found.' })

    const progressMap = Object.fromEntries(allProgress.map((p) => [p.lessonId, p]))
    const totalLessons = course.lessons.length
    const completedLessons = allProgress.filter((p) => p.completed).length
    const percentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

    res.json({
        ok: true,
        courseId,
        totalLessons,
        completedLessons,
        percentage,
        lessons: course.lessons.map((l) => ({
            id: l.id,
            title: l.title,
            order: l.order,
            type: l.type,
            completed: progressMap[l.id]?.completed ?? false,
            completedAt: progressMap[l.id]?.completedAt ?? null,
            timeSpentSec: progressMap[l.id]?.timeSpentSec ?? 0,
        })),
    })
})

// ── Get all course progress for current user ───────────────────────────────
// GET /progress/my/overview
router.get('/my/overview', requireAuth, async (req, res) => {
    const userId = req.user.id

    const enrollments = await prisma.enrollment.findMany({
        where: { userId, status: 'APPROVED' },
        include: {
            course: { include: { lessons: { select: { id: true } } } },
        },
    })

    const courseIds = enrollments.map((e) => e.courseId)
    const allProgress = await prisma.lessonProgress.findMany({
        where: { userId, courseId: { in: courseIds }, completed: true },
        select: { courseId: true, lessonId: true },
    })

    const completedByCourse = {}
    for (const p of allProgress) {
        completedByCourse[p.courseId] = (completedByCourse[p.courseId] || 0) + 1
    }

    const overview = enrollments.map((e) => {
        const total = e.course.lessons.length
        const done = completedByCourse[e.courseId] || 0
        return {
            courseId: e.courseId,
            courseTitle: e.course.title,
            totalLessons: total,
            completedLessons: done,
            percentage: total > 0 ? Math.round((done / total) * 100) : 0,
        }
    })

    res.json({ ok: true, overview })
})

module.exports = router
