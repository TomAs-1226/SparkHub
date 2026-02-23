// routes/tutors.js — Tutor profiles, sessions, and publishing
const express = require('express')
const router = express.Router()
const { prisma } = require('../prisma')
const { requireAuth, requireRole } = require('../middleware/auth')

const MEET_BASE = process.env.MEET_BASE || 'https://meet.jit.si'

function presentProfile(p) {
    if (!p) return null
    return {
        ...p,
        subjects: p.subjectsCsv ? p.subjectsCsv.split(',').map((s) => s.trim()).filter(Boolean) : [],
    }
}

// GET /tutors — list published tutor profiles
router.get('/', async (req, res) => {
    const includeAll = req.query.all === 'true' // admin param
    const where = includeAll ? {} : { isPublished: true }
    const list = await prisma.tutorProfile.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true, avatarUrl: true, role: true } } },
        orderBy: { id: 'asc' },
    })
    res.json({ ok: true, list: list.map(presentProfile) })
})

// GET /tutors/profile — get own tutor profile (TUTOR or ADMIN)
router.get('/profile', requireAuth, requireRole(['TUTOR', 'ADMIN']), async (req, res) => {
    const profile = await prisma.tutorProfile.findUnique({ where: { userId: req.user.id } })
    if (!profile) return res.json({ ok: true, profile: null })
    res.json({ ok: true, profile: presentProfile(profile) })
})

// POST /tutors/profile — create or update tutor profile (upsert)
router.post('/profile', requireAuth, requireRole(['TUTOR', 'ADMIN']), async (req, res) => {
    const { bio, subjects = [], rateInfo } = req.body
    if (!bio?.trim()) {
        return res.status(400).json({ ok: false, msg: 'Bio is required.' })
    }
    const subjectsCsv = Array.isArray(subjects)
        ? subjects.map((s) => String(s).trim()).filter(Boolean).join(',')
        : String(subjects || '').trim()

    const profile = await prisma.tutorProfile.upsert({
        where: { userId: req.user.id },
        create: { userId: req.user.id, bio: bio.trim(), subjectsCsv, rateInfo: rateInfo?.trim() || null },
        update: { bio: bio.trim(), subjectsCsv, rateInfo: rateInfo?.trim() || null },
    })
    res.json({ ok: true, profile: presentProfile(profile) })
})

// PUT /tutors/profile — explicit update (same as POST upsert, kept for semantic clarity)
router.put('/profile', requireAuth, requireRole(['TUTOR', 'ADMIN']), async (req, res) => {
    const { bio, subjects = [], rateInfo } = req.body
    const existing = await prisma.tutorProfile.findUnique({ where: { userId: req.user.id } })
    if (!existing) return res.status(404).json({ ok: false, msg: 'Profile not found. Create one first via POST /tutors/profile.' })

    const subjectsCsv = Array.isArray(subjects)
        ? subjects.map((s) => String(s).trim()).filter(Boolean).join(',')
        : String(subjects || '').trim()

    const data = {}
    if (bio !== undefined) data.bio = bio.trim()
    if (subjectsCsv !== undefined) data.subjectsCsv = subjectsCsv
    if (rateInfo !== undefined) data.rateInfo = rateInfo?.trim() || null

    const profile = await prisma.tutorProfile.update({ where: { userId: req.user.id }, data })
    res.json({ ok: true, profile: presentProfile(profile) })
})

// POST /tutors/publish — toggle isPublished flag
router.post('/publish', requireAuth, requireRole(['TUTOR', 'ADMIN']), async (req, res) => {
    const profile = await prisma.tutorProfile.findUnique({ where: { userId: req.user.id } })
    if (!profile) {
        return res.status(400).json({ ok: false, msg: 'Create a profile before publishing.' })
    }
    if (!profile.bio?.trim()) {
        return res.status(400).json({ ok: false, msg: 'Your profile must have a bio before publishing.' })
    }

    const isPublished = req.body.isPublished !== undefined ? Boolean(req.body.isPublished) : !profile.isPublished
    const updated = await prisma.tutorProfile.update({ where: { userId: req.user.id }, data: { isPublished } })
    res.json({ ok: true, profile: presentProfile(updated), isPublished: updated.isPublished })
})

// POST /tutors/sessions — book a session with a tutor (any authenticated user)
router.post('/sessions', requireAuth, async (req, res) => {
    const { tutorId, startsAt, endsAt, note } = req.body
    if (!tutorId || !startsAt || !endsAt) {
        return res.status(400).json({ ok: false, msg: 'tutorId, startsAt, and endsAt are required.' })
    }

    const s = new Date(startsAt)
    const e = new Date(endsAt)
    if (!(e > s)) return res.status(400).json({ ok: false, msg: 'End time must be after start time.' })

    const tutor = await prisma.tutorProfile.findUnique({ where: { id: tutorId } })
    if (!tutor) return res.status(404).json({ ok: false, msg: 'Tutor not found.' })

    // Optional: enforce availability slot check
    if (process.env.ENFORCE_AVAILABILITY === '1') {
        const slot = await prisma.tutorAvailability.findFirst({
            where: { tutorId: tutor.userId, startsAt: { lte: s }, endsAt: { gte: e } },
        })
        if (!slot) return res.status(400).json({ ok: false, msg: 'Tutor is not available at that time.' })
    }

    const session = await prisma.session.create({
        data: { tutorId, studentId: req.user.id, startsAt: s, endsAt: e, note },
    })

    // Auto-generate Jitsi meeting URL
    const shortId = session.id.slice(0, 8)
    const meetingUrl = `${MEET_BASE}/spark-${shortId}`
    try {
        await prisma.session.update({ where: { id: session.id }, data: { meetingUrl } })
        session.meetingUrl = meetingUrl
    } catch {
        session.meetingUrl = meetingUrl
    }

    res.json({ ok: true, session })
})

// GET /tutors/sessions/mine — list user's sessions (tutor sees their bookings; student sees their bookings)
router.get('/sessions/mine', requireAuth, async (req, res) => {
    if (req.user.role === 'TUTOR' || req.user.role === 'ADMIN') {
        const prof = await prisma.tutorProfile.findUnique({ where: { userId: req.user.id } })
        if (!prof) return res.json({ ok: true, list: [] })
        const list = await prisma.session.findMany({
            where: { tutorId: prof.id },
            include: { student: { select: { id: true, name: true, email: true, avatarUrl: true } } },
            orderBy: { startsAt: 'asc' },
        })
        return res.json({ ok: true, list })
    }
    const list = await prisma.session.findMany({
        where: { studentId: req.user.id },
        include: {
            tutor: {
                include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
            },
        },
        orderBy: { startsAt: 'asc' },
    })
    return res.json({ ok: true, list })
})

// PATCH /tutors/sessions/:id — update session status
router.patch('/sessions/:id', requireAuth, async (req, res) => {
    const session = await prisma.session.findUnique({
        where: { id: req.params.id },
        include: { tutor: true },
    })
    if (!session) return res.status(404).json({ ok: false, msg: 'Session not found.' })

    const isTutor = session.tutor?.userId === req.user.id
    const isStudent = session.studentId === req.user.id
    const isAdmin = req.user.role === 'ADMIN'
    if (!isTutor && !isStudent && !isAdmin) {
        return res.status(403).json({ ok: false, msg: 'Access denied.' })
    }

    const { status, note } = req.body
    const data = {}
    if (status && ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'].includes(status)) data.status = status
    if (note !== undefined) data.note = note

    const updated = await prisma.session.update({ where: { id: session.id }, data })
    res.json({ ok: true, session: updated })
})

module.exports = router
