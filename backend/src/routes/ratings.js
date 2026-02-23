// routes/ratings.js — Course rating & review system for LMS v2
const express = require('express')
const router = express.Router()
const { prisma } = require('../prisma')
const { requireAuth } = require('../middleware/auth')
const { moderate } = require('../utils/moderation')

// GET /ratings/:courseId — Get ratings and average
router.get('/:courseId', async (req, res) => {
    const { courseId } = req.params

    const ratings = await prisma.courseRating.findMany({
        where: { courseId },
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    })

    const avg = ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
        : 0

    const distribution = [1, 2, 3, 4, 5].reduce((acc, n) => {
        acc[n] = ratings.filter((r) => r.rating === n).length
        return acc
    }, {})

    res.json({ ok: true, ratings, average: Math.round(avg * 10) / 10, total: ratings.length, distribution })
})

// GET /ratings/:courseId/mine — Get current user's rating
router.get('/:courseId/mine', requireAuth, async (req, res) => {
    const { courseId } = req.params
    const rating = await prisma.courseRating.findUnique({
        where: { courseId_userId: { courseId, userId: req.user.id } },
    })
    res.json({ ok: true, rating })
})

// POST /ratings/:courseId — Submit or update rating
router.post('/:courseId', requireAuth, async (req, res) => {
    const { courseId } = req.params
    const { rating, review } = req.body

    if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ ok: false, msg: 'Rating must be between 1 and 5.' })
    }

    // Must be an approved enrollee
    const enrollment = await prisma.enrollment.findFirst({
        where: { userId: req.user.id, courseId, status: 'APPROVED' },
    })
    if (!enrollment) {
        return res.status(403).json({ ok: false, msg: 'You must be enrolled to rate this course.' })
    }

    // Moderate review text if provided
    let safeReview = null
    if (review && typeof review === 'string' && review.trim()) {
        const modResult = await moderate(review.trim())
        if (!modResult.allowed) {
            return res.status(400).json({ ok: false, msg: modResult.reason || 'Your review contains content that is not allowed.' })
        }
        safeReview = (modResult.cleaned || review.trim()).slice(0, 2000)
    }

    const saved = await prisma.courseRating.upsert({
        where: { courseId_userId: { courseId, userId: req.user.id } },
        create: {
            courseId,
            userId: req.user.id,
            rating: Math.round(rating),
            review: safeReview,
        },
        update: {
            rating: Math.round(rating),
            review: review !== undefined ? safeReview : undefined,
        },
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    })

    res.json({ ok: true, rating: saved })
})

// DELETE /ratings/:courseId/mine — Remove own rating
router.delete('/:courseId/mine', requireAuth, async (req, res) => {
    const { courseId } = req.params
    await prisma.courseRating.deleteMany({
        where: { courseId, userId: req.user.id },
    })
    res.json({ ok: true })
})

module.exports = router
