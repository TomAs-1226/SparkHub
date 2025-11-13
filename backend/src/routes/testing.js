// routes/testing.js
const express = require('express')
const router = express.Router()
const { prisma } = require('../prisma')
const { requireAuth, requireRole } = require('../middleware/auth')

// Health
router.get('/health', (_req, res) => res.json({ ok: true, ts: Date.now() }))

// Who am I
router.get('/whoami', requireAuth, async (req, res) => {
    const u = await prisma.user.findUnique({ where: { id: req.user.id } })
    res.json({ ok: true, user: { id: u.id, email: u.email, role: u.role } })
})

// Promote current user to ADMIN (for testing)
router.post('/make-admin', requireAuth, async (req, res) => {
    const u = await prisma.user.update({ where: { id: req.user.id }, data: { role: 'ADMIN' } })
    res.json({ ok: true, user: { id: u.id, email: u.email, role: u.role } })
})

// Seed some [TEST] data (ADMIN)
router.post('/seed', requireAuth, requireRole(['ADMIN']), async (req, res) => {
    const created = { courses: 0, lessons: 0, events: 0, jobs: 0, resources: 0, tutors: 0 }
    // Course + lesson
    const c = await prisma.course.create({
        data: { title: '[TEST] Physics 101', summary: 'Kinematics basics', isPublished: true, creatorId: req.user.id }
    })
    created.courses++
    await prisma.lesson.create({ data: { courseId: c.id, title: 'Intro', type: 'TEXT', body: 'Welcome [TEST]', order: 1 } })
    created.lessons++

    // Event
    const now = new Date()
    await prisma.event.create({
        data: {
            title: '[TEST] Physics Talk',
            location: 'Main Hall',
            startsAt: new Date(now.getTime() + 2 * 3600 * 1000),
            endsAt: new Date(now.getTime() + 3 * 3600 * 1000),
            capacity: 100,
            description: 'Demo event'
        }
    })
    created.events++

    // Job
    await prisma.jobPosting.create({
        data: {
            recruiterId: req.user.id,
            title: '[TEST] Lab Assistant',
            description: 'Help with lab setup [TEST]',
            skillsCsv: 'Soldering,Python',
            contact: 'recruiter@example.com'
        }
    })
    created.jobs++

    // Resource
    await prisma.resource.create({
        data: { title: '[TEST] Intro to Circuits', kind: 'Guide', url: 'https://example.com/guide', summary: 'Sample resource' }
    })
    created.resources++

    // Tutor profile
    await prisma.tutorProfile.upsert({
        where: { userId: req.user.id },
        create: { userId: req.user.id, bio: '[TEST] Physics & Math tutor', subjectsCsv: 'Physics,Math' },
        update: { bio: '[TEST] Physics & Math tutor', subjectsCsv: 'Physics,Math' }
    })
    created.tutors++

    res.json({ ok: true, created })
})

// Clear test data (ADMIN). Deletes items marked with [TEST] or sessions with note [TEST]
router.post('/clear', requireAuth, requireRole(['ADMIN']), async (_req, res) => {
    let deleted = {
        courseMessages: 0,
        lessons: 0,
        enrollments: 0,
        courses: 0,
        eventSignups: 0,
        events: 0,
        jobApplications: 0,
        jobs: 0,
        resources: 0,
        feedbacks: 0,
        sessions: 0
    }

    // Courses
    const testCourses = await prisma.course.findMany({ where: { title: { startsWith: '[TEST]' } }, select: { id: true } })
    const cids = testCourses.map(c => c.id)
    if (cids.length) {
        const dm1 = await prisma.courseMessage.deleteMany({ where: { courseId: { in: cids } } })
        const dm2 = await prisma.lesson.deleteMany({ where: { courseId: { in: cids } } })
        const dm3 = await prisma.enrollment.deleteMany({ where: { courseId: { in: cids } } })
        const dm4 = await prisma.course.deleteMany({ where: { id: { in: cids } } })
        deleted.courseMessages += dm1.count; deleted.lessons += dm2.count; deleted.enrollments += dm3.count; deleted.courses += dm4.count
    }

    // Events
    const testEvents = await prisma.event.findMany({ where: { title: { startsWith: '[TEST]' } }, select: { id: true } })
    const eids = testEvents.map(e => e.id)
    if (eids.length) {
        const dm1 = await prisma.eventSignup.deleteMany({ where: { eventId: { in: eids } } })
        const dm2 = await prisma.event.deleteMany({ where: { id: { in: eids } } })
        deleted.eventSignups += dm1.count; deleted.events += dm2.count
    }

    // Jobs
    const testJobs = await prisma.jobPosting.findMany({ where: { title: { startsWith: '[TEST]' } }, select: { id: true } })
    const jids = testJobs.map(j => j.id)
    if (jids.length) {
        const dm1 = await prisma.jobApplication.deleteMany({ where: { jobId: { in: jids } } })
        const dm2 = await prisma.jobPosting.deleteMany({ where: { id: { in: jids } } })
        deleted.jobApplications += dm1.count; deleted.jobs += dm2.count
    }

    // Resources
    const dmRes = await prisma.resource.deleteMany({ where: { title: { startsWith: '[TEST]' } } })
    deleted.resources += dmRes.count

    // Feedbacks
    const dmFb = await prisma.feedback.deleteMany({ where: { topic: { startsWith: '[TEST]' } } })
    deleted.feedbacks += dmFb.count

    // Sessions
    const dmSess = await prisma.session.deleteMany({ where: { note: { contains: '[TEST]' } } })
    deleted.sessions += dmSess.count

    res.json({ ok: true, deleted })
})

module.exports = router