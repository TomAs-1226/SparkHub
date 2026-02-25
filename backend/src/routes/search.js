const express = require('express')
const router = express.Router()
const { prisma } = require('../prisma')

// GET /search?q=<query> — search across courses, events, resources, and jobs
router.get('/', async (req, res) => {
    try {
        const q = typeof req.query.q === 'string' ? req.query.q.trim() : ''

        if (q.length < 2) {
            return res.json({ ok: true, courses: [], events: [], resources: [], jobs: [], total: 0 })
        }

        const filter = { contains: q }

        const [courses, events, resources, jobs] = await Promise.all([
            prisma.course.findMany({
                where: {
                    isPublished: true,
                    OR: [
                        { title: filter },
                        { summary: filter },
                    ],
                },
                select: { id: true, title: true, summary: true, coverUrl: true },
                take: 5,
            }),
            prisma.event.findMany({
                where: {
                    OR: [
                        { title: filter },
                        { description: filter },
                        { location: filter },
                    ],
                },
                select: { id: true, title: true, location: true, startsAt: true },
                take: 5,
                orderBy: { startsAt: 'asc' },
            }),
            prisma.resource.findMany({
                where: {
                    OR: [
                        { title: filter },
                        { summary: filter },
                    ],
                },
                select: { id: true, title: true, kind: true, summary: true },
                take: 5,
            }),
            prisma.jobPosting.findMany({
                where: {
                    OR: [
                        { title: filter },
                        { description: filter },
                    ],
                },
                select: { id: true, title: true, description: true, skillsCsv: true },
                take: 5,
            }),
        ])

        const total = courses.length + events.length + resources.length + jobs.length
        res.json({ ok: true, courses, events, resources, jobs, total })
    } catch (err) {
        console.error('SEARCH ERROR:', err)
        res.status(500).json({ ok: false, msg: 'Search failed' })
    }
})

module.exports = router
