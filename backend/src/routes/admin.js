const express = require('express')
const router = express.Router()
const path = require('path')
const fs = require('fs')
const { prisma } = require('../prisma')
const { requireAuth, requireRole } = require('../middleware/auth')
const { sendWeeklyDigests, getWeeklyStats } = require('../scheduler/weekly-digest')

// All routes below (except /announcement GET and /verify-pin) require admin auth
// Public announcement route — no auth needed
router.get('/announcement', async (_req, res) => {
    try {
        const now = new Date()
        const announcement = await prisma.siteAnnouncement.findFirst({
            where: {
                isActive: true,
                OR: [{ expiresAt: null }, { expiresAt: { gt: now } }]
            },
            orderBy: { createdAt: 'desc' }
        })
        res.json({ ok: true, announcement: announcement || null })
    } catch (err) {
        res.status(500).json({ ok: false, msg: 'Server error' })
    }
})

// All routes below require admin auth
router.use(requireAuth, requireRole(['ADMIN']))

// Verify secondary admin PIN
router.post('/verify-pin', (req, res) => {
    const expected = process.env.ADMIN_PIN || process.env.ADMIN_SECRET
    if (!expected) return res.json({ ok: true }) // no PIN configured = open
    if (req.body.pin === expected) return res.json({ ok: true })
    return res.status(401).json({ ok: false, msg: 'Incorrect PIN' })
})

// POST /admin/announcement — create / replace active announcement
router.post('/announcement', async (req, res) => {
    try {
        const { message, kind = 'info', expiresAt } = req.body
        if (!message || typeof message !== 'string') {
            return res.status(400).json({ ok: false, msg: 'message is required' })
        }
        // Deactivate any existing active announcements
        await prisma.siteAnnouncement.updateMany({
            where: { isActive: true },
            data: { isActive: false }
        })
        const announcement = await prisma.siteAnnouncement.create({
            data: {
                message: message.trim(),
                kind,
                isActive: true,
                expiresAt: expiresAt ? new Date(expiresAt) : null
            }
        })
        res.json({ ok: true, announcement })
    } catch (err) {
        res.status(500).json({ ok: false, msg: 'Server error' })
    }
})

// DELETE /admin/announcement — deactivate all announcements
router.delete('/announcement', async (_req, res) => {
    try {
        await prisma.siteAnnouncement.updateMany({
            where: { isActive: true },
            data: { isActive: false }
        })
        res.json({ ok: true })
    } catch (err) {
        res.status(500).json({ ok: false, msg: 'Server error' })
    }
})

// System stats
router.get('/system-stats', async (_req, res) => {
    try {
        const [userCount, courseCount, eventCount, resourceCount, enrollmentCount] = await Promise.all([
            prisma.user.count(),
            prisma.course.count(),
            prisma.event.count(),
            prisma.resource.count(),
            prisma.enrollment.count(),
        ])

        // DB file size
        let dbSizeBytes = 0
        try {
            const dbPath = path.resolve(__dirname, '../../prisma/dev.db')
            const stat = fs.statSync(dbPath)
            dbSizeBytes = stat.size
        } catch {}

        // Upload folder size
        let uploadSizeBytes = 0
        let uploadFileCount = 0
        try {
            const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads')
            const files = fs.readdirSync(uploadDir)
            uploadFileCount = files.length
            for (const f of files) {
                try {
                    uploadSizeBytes += fs.statSync(path.join(uploadDir, f)).size
                } catch {}
            }
        } catch {}

        res.json({
            ok: true,
            stats: {
                users: userCount,
                courses: courseCount,
                events: eventCount,
                resources: resourceCount,
                enrollments: enrollmentCount,
                dbSizeBytes,
                uploadSizeBytes,
                uploadFileCount,
                nodeVersion: process.version,
                uptime: Math.floor(process.uptime()),
                env: process.env.NODE_ENV || 'development'
            }
        })
    } catch (err) {
        res.status(500).json({ ok: false, msg: 'Server error' })
    }
})

// Asset / Media Library
router.get('/assets', (_req, res) => {
    try {
        const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads')
        if (!fs.existsSync(uploadDir)) return res.json({ ok: true, assets: [] })
        const files = fs.readdirSync(uploadDir)
        const baseUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 4000}`
        const assets = files.map((name) => {
            let size = 0, createdAt = null
            try {
                const st = fs.statSync(path.join(uploadDir, name))
                size = st.size
                createdAt = st.birthtime
            } catch {}
            const ext = path.extname(name).toLowerCase()
            const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.avif']
            const videoExts = ['.mp4', '.mov', '.avi', '.webm']
            const audioExts = ['.mp3', '.wav', '.ogg', '.m4a']
            const type = imageExts.includes(ext) ? 'image'
                : videoExts.includes(ext) ? 'video'
                    : audioExts.includes(ext) ? 'audio'
                        : 'file'
            return { name, url: `${baseUrl}/uploads/${name}`, size, type, createdAt }
        })
        assets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        res.json({ ok: true, assets })
    } catch (err) {
        res.status(500).json({ ok: false, msg: 'Server error' })
    }
})

// Delete a single asset from uploads
router.delete('/assets/:name', (req, res) => {
    try {
        const name = req.params.name.replace(/[/\\]/g, '') // sanitize
        const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads')
        const filePath = path.join(uploadDir, name)
        if (!filePath.startsWith(uploadDir)) {
            return res.status(400).json({ ok: false, msg: 'Invalid path' })
        }
        if (!fs.existsSync(filePath)) return res.status(404).json({ ok: false, msg: 'File not found' })
        fs.unlinkSync(filePath)
        res.json({ ok: true })
    } catch (err) {
        res.status(500).json({ ok: false, msg: 'Server error' })
    }
})

// User management
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
        return res.status(400).json({ ok: false, msg: 'Invalid role' })
    }
    if (req.params.id === req.user.id) {
        return res.status(400).json({ ok: false, msg: 'You cannot change your own role' })
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
