const test = require('node:test')
const assert = require('node:assert/strict')
const request = require('supertest')
const { randomUUID } = require('node:crypto')

process.env.DATABASE_URL = process.env.DATABASE_URL || 'file:./prisma/test.db'
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret'
process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'

const app = require('../src/server')
const { prisma } = require('../src/prisma')
const { signToken } = require('../src/middleware/auth')

async function resetDb() {
    await prisma.eventSignup.deleteMany()
    await prisma.event.deleteMany()
    await prisma.resource.deleteMany()
    await prisma.jobApplication.deleteMany()
    await prisma.jobPosting.deleteMany()
    await prisma.user.deleteMany()
}

async function createUser(overrides = {}) {
    const suffix = randomUUID().slice(0, 8)
    return prisma.user.create({
        data: {
            email: overrides.email || `user-${suffix}@test.local`,
            password: overrides.password || 'hashed-pass',
            name: overrides.name || 'Test User',
            role: overrides.role || 'STUDENT',
            avatarUrl: overrides.avatarUrl || null,
        },
    })
}

function tokenFor(user) {
    return signToken(user, process.env.JWT_SECRET)
}

test.beforeEach(async () => {
    await resetDb()
})

test.after(async () => {
    await prisma.$disconnect()
})

test('events route enforces ownership and exposes attachments', async () => {
    const tutor = await createUser({ role: 'TUTOR', name: 'Tutor T' })
    const admin = await createUser({ role: 'ADMIN', name: 'Admin A' })
    const otherTutor = await createUser({ role: 'TUTOR', name: 'Tutor O' })

    const createRes = await request(app)
        .post('/events')
        .set('Authorization', `Bearer ${tokenFor(tutor)}`)
        .send({
            title: 'Deep Dive',
            location: 'Lab',
            startsAt: new Date().toISOString(),
            endsAt: new Date(Date.now() + 3600_000).toISOString(),
            capacity: 20,
            description: 'Hands-on workshop',
            coverUrl: 'https://example.com/cover.png',
            attachments: ['https://example.com/agenda.pdf'],
        })

    assert.equal(createRes.status, 200)
    assert.equal(createRes.body.ok, true)
    const eventId = createRes.body.event.id

    const detailRes = await request(app).get(`/events/${eventId}`)
    assert.equal(detailRes.status, 200)
    assert.deepEqual(detailRes.body.event.attachments, ['https://example.com/agenda.pdf'])

    const forbidden = await request(app)
        .delete(`/events/${eventId}`)
        .set('Authorization', `Bearer ${tokenFor(otherTutor)}`)
    assert.equal(forbidden.status, 403)

    const adminDelete = await request(app)
        .delete(`/events/${eventId}`)
        .set('Authorization', `Bearer ${tokenFor(admin)}`)
    assert.equal(adminDelete.status, 200)
})

test('resources carry detail content and enforce delete guards', async () => {
    const tutor = await createUser({ role: 'TUTOR' })
    const student = await createUser({ role: 'STUDENT' })

    const createRes = await request(app)
        .post('/resources')
        .set('Authorization', `Bearer ${tokenFor(tutor)}`)
        .send({
            title: 'Research Kit',
            kind: 'Guide',
            url: 'https://example.com/resource',
            summary: 'Starter kit',
            details: 'Step-by-step instructions',
            imageUrl: 'https://example.com/cover.png',
            attachmentUrl: 'https://example.com/resource.pdf',
        })
    assert.equal(createRes.status, 200)
    const resourceId = createRes.body.resource.id

    const detailRes = await request(app).get(`/resources/${resourceId}`)
    assert.equal(detailRes.status, 200)
    assert.equal(detailRes.body.resource.details, 'Step-by-step instructions')

    const forbidden = await request(app)
        .delete(`/resources/${resourceId}`)
        .set('Authorization', `Bearer ${tokenFor(student)}`)
    assert.equal(forbidden.status, 403)
})

test('job postings persist structured fields and restrict deletion', async () => {
    const recruiter = await createUser({ role: 'RECRUITER' })
    const learner = await createUser({ role: 'STUDENT' })

    const payload = {
        title: 'Campus UX Fellow',
        description: 'Mentor students building prototypes',
        skills: ['Figma', 'React'],
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 7200_000).toISOString(),
        duration: '4 weeks',
        benefits: 'Stipend + swag',
        photos: ['https://example.com/photo.png'],
        files: ['brief.pdf'],
        contact: 'apply@example.com',
    }

    const createRes = await request(app)
        .post('/jobs')
        .set('Authorization', `Bearer ${tokenFor(recruiter)}`)
        .send(payload)
    assert.equal(createRes.status, 200)
    assert.deepEqual(createRes.body.job.skills, payload.skills)
    const jobId = createRes.body.job.id

    const detailRes = await request(app).get(`/jobs/${jobId}`)
    assert.equal(detailRes.status, 200)
    assert.deepEqual(detailRes.body.job.files, payload.files)

    const forbidden = await request(app)
        .delete(`/jobs/${jobId}`)
        .set('Authorization', `Bearer ${tokenFor(learner)}`)
    assert.equal(forbidden.status, 403)
})

test('admin user management surfaces roster and blocks self-mutation', async () => {
    const admin = await createUser({ role: 'ADMIN', email: 'admin@test.local' })
    const learner = await createUser({ role: 'STUDENT', email: 'learner@test.local' })

    const listRes = await request(app)
        .get('/admin/users')
        .set('Authorization', `Bearer ${tokenFor(admin)}`)
    assert.equal(listRes.status, 200)
    assert.ok(listRes.body.list.some((user) => user.id === learner.id))

    const selfUpdate = await request(app)
        .patch(`/admin/users/${admin.id}`)
        .set('Authorization', `Bearer ${tokenFor(admin)}`)
        .send({ role: 'STUDENT' })
    assert.equal(selfUpdate.status, 400)

    const promote = await request(app)
        .patch(`/admin/users/${learner.id}`)
        .set('Authorization', `Bearer ${tokenFor(admin)}`)
        .send({ role: 'TUTOR' })
    assert.equal(promote.status, 200)
    assert.equal(promote.body.user.role, 'TUTOR')
})
