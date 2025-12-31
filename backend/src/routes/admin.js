const express = require('express')
const router = express.Router()
const { prisma } = require('../prisma')
const { requireAuth, requireRole } = require('../middleware/auth')
const { sendWeeklyDigests, getWeeklyStats } = require('../scheduler/weekly-digest')

router.use(requireAuth, requireRole(['ADMIN']))

router.get('/users', async (_req, res) => {
    const list = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        select: { id: true, email: true, name: true, role: true, avatarUrl: true, createdAt: true }
    })
    res.json({ ok: true, list })
})

router.patch('/users/:id', async (req, res) => {
    const allowed = ['ADMIN', 'STUDENT', 'CREATOR', 'TUTOR', 'RECRUITER']
    const role = typeof req.body.role === 'string' ? req.body.role.toUpperCase() : null
    if (!role || !allowed.includes(role)) {
        return res.status(400).json({ ok: false, msg: '角色无效' })
    }
    if (req.params.id === req.user.id) {
        return res.status(400).json({ ok: false, msg: '不能修改自己的角色' })
    }
    const user = await prisma.user.update({
        where: { id: req.params.id },
        data: { role },
        select: { id: true, email: true, name: true, role: true, avatarUrl: true }
    })
    res.json({ ok: true, user })
})

router.delete('/users/:id', async (req, res) => {
    if (req.params.id === req.user.id) {
        return res.status(400).json({ ok: false, msg: 'Cannot delete yourself' })
    }
    await prisma.user.delete({ where: { id: req.params.id } })
    res.json({ ok: true })
})

// Weekly digest management
router.get('/digest/stats', async (_req, res) => {
    try {
        const stats = await getWeeklyStats()
        res.json({
            ok: true,
            stats: {
                newCourses: stats.newCourses.length,
                upcomingEvents: stats.upcomingEvents.length,
                newJobs: stats.newJobs.length,
                newResources: stats.newResources.length,
                totalUsers: stats.totalUsers,
                totalEnrollments: stats.totalEnrollments,
            },
            details: stats
        })
    } catch (err) {
        console.error('Error fetching digest stats:', err)
        res.status(500).json({ ok: false, msg: 'Unable to fetch digest stats' })
    }
})

router.post('/digest/send', async (_req, res) => {
    try {
        const result = await sendWeeklyDigests()
        if (result.ok) {
            res.json({
                ok: true,
                message: `Weekly digest sent to ${result.sent} recipients`,
                sent: result.sent,
                failed: result.failed || 0,
                totalRecipients: result.totalRecipients
            })
        } else {
            res.status(500).json({
                ok: false,
                msg: result.error || 'Failed to send weekly digest'
            })
        }
    } catch (err) {
        console.error('Error sending weekly digest:', err)
        res.status(500).json({ ok: false, msg: 'Unable to send weekly digest' })
    }
})

module.exports = router