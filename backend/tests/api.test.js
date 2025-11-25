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
    await prisma.courseMessage.deleteMany()
    await prisma.courseSubmission.deleteMany()
    await prisma.courseAssignment.deleteMany()
    await prisma.courseMaterial.deleteMany()
    await prisma.courseSession.deleteMany()
    await prisma.lesson.deleteMany()
    await prisma.enrollment.deleteMany()
    await prisma.courseMeetingLink.deleteMany()
    await prisma.quizQuestion.deleteMany()
    await prisma.quizAttempt.deleteMany()
    await prisma.quiz.deleteMany()
    await prisma.certificate.deleteMany()
    await prisma.session.deleteMany()
    await prisma.tutorAvailability.deleteMany()
    await prisma.tutorProfile.deleteMany()
    await prisma.feedback.deleteMany()
    await prisma.auditLog.deleteMany()
    await prisma.course.deleteMany()
    await prisma.userSession.deleteMany()
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

async function tokenFor(user) {
    const session = await prisma.userSession.create({ data: { userId: user.id } })
    return signToken(user, session.id, process.env.JWT_SECRET)
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
        .set('Authorization', `Bearer ${await tokenFor(tutor)}`)
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
        .set('Authorization', `Bearer ${await tokenFor(otherTutor)}`)
    assert.equal(forbidden.status, 403)

    const adminDelete = await request(app)
        .delete(`/events/${eventId}`)
        .set('Authorization', `Bearer ${await tokenFor(admin)}`)
    assert.equal(adminDelete.status, 200)
})

test('resources carry detail content and enforce delete guards', async () => {
    const tutor = await createUser({ role: 'TUTOR' })
    const student = await createUser({ role: 'STUDENT' })

    const createRes = await request(app)
        .post('/resources')
        .set('Authorization', `Bearer ${await tokenFor(tutor)}`)
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
        .set('Authorization', `Bearer ${await tokenFor(student)}`)
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
        .set('Authorization', `Bearer ${await tokenFor(recruiter)}`)
        .send(payload)
    assert.equal(createRes.status, 200)
    assert.deepEqual(createRes.body.job.skills, payload.skills)
    const jobId = createRes.body.job.id

    const detailRes = await request(app).get(`/jobs/${jobId}`)
    assert.equal(detailRes.status, 200)
    assert.deepEqual(detailRes.body.job.files, payload.files)

    const forbidden = await request(app)
        .delete(`/jobs/${jobId}`)
        .set('Authorization', `Bearer ${await tokenFor(learner)}`)
    assert.equal(forbidden.status, 403)
})

test('admin user management surfaces roster and blocks self-mutation', async () => {
    const admin = await createUser({ role: 'ADMIN', email: 'admin@test.local' })
    const learner = await createUser({ role: 'STUDENT', email: 'learner@test.local' })

    const listRes = await request(app)
        .get('/admin/users')
        .set('Authorization', `Bearer ${await tokenFor(admin)}`)
    assert.equal(listRes.status, 200)
    assert.ok(listRes.body.list.some((user) => user.id === learner.id))

    const selfUpdate = await request(app)
        .patch(`/admin/users/${admin.id}`)
        .set('Authorization', `Bearer ${await tokenFor(admin)}`)
        .send({ role: 'STUDENT' })
    assert.equal(selfUpdate.status, 400)

    const promote = await request(app)
        .patch(`/admin/users/${learner.id}`)
        .set('Authorization', `Bearer ${await tokenFor(admin)}`)
        .send({ role: 'TUTOR' })
    assert.equal(promote.status, 200)
    assert.equal(promote.body.user.role, 'TUTOR')
})

test('courses expose join codes, gated materials, and enrollment forms', async () => {
    const creator = await createUser({ role: 'CREATOR' })
    const student = await createUser({ role: 'STUDENT' })

    const createRes = await request(app)
        .post('/courses')
        .set('Authorization', `Bearer ${await tokenFor(creator)}`)
        .send({ title: 'Studio Lab', summary: 'Build side projects', isPublished: true })
    assert.equal(createRes.status, 200)
    const courseId = createRes.body.course.id
    const joinCode = createRes.body.course.joinCode

    const sessionRes = await request(app)
        .post(`/courses/${courseId}/sessions`)
        .set('Authorization', `Bearer ${await tokenFor(creator)}`)
        .send({ startsAt: new Date().toISOString(), location: 'Virtual', mode: 'Online' })
    assert.equal(sessionRes.status, 200)

    const materialRes = await request(app)
        .post(`/courses/${courseId}/materials`)
        .set('Authorization', `Bearer ${await tokenFor(creator)}`)
        .send({ title: 'Kickoff Deck', attachmentUrl: 'https://example.com/deck.pdf', visibleTo: 'ENROLLED' })
    assert.equal(materialRes.status, 200)

    const detailPublic = await request(app).get(`/courses/${courseId}`)
    assert.equal(detailPublic.status, 200)
    assert.equal(detailPublic.body.course.materials[0].locked, true)

    const lockedCalendar = await request(app)
        .get(`/courses/${courseId}/calendar.ics`)
        .set('Authorization', `Bearer ${await tokenFor(student)}`)
    assert.equal(lockedCalendar.status, 403)

    const enrollRes = await request(app)
        .post(`/courses/${courseId}/enroll`)
        .set('Authorization', `Bearer ${await tokenFor(student)}`)
        .send({ answers: { intent: 'I love labs' } })
    assert.equal(enrollRes.status, 200)
    assert.equal(enrollRes.body.viewer.isEnrolled, false)
    assert.equal(enrollRes.body.viewer.enrollmentStatus, 'PENDING')

    const invalidCodeRes = await request(app)
        .post(`/courses/${courseId}/enroll`)
        .set('Authorization', `Bearer ${await tokenFor(student)}`)
        .send({ answers: { intent: 'Retry' }, joinCode: 'WRONG' })
    assert.equal(invalidCodeRes.status, 200)
    assert.equal(invalidCodeRes.body.codeStatus, 'INVALID')
    assert.equal(invalidCodeRes.body.viewer.enrollmentStatus, 'PENDING')

    const enrollmentId = enrollRes.body.enrollment.id
    const approvalRes = await request(app)
        .patch(`/courses/${courseId}/enrollments/${enrollmentId}`)
        .set('Authorization', `Bearer ${await tokenFor(creator)}`)
        .send({ status: 'APPROVED', adminNote: 'Welcome aboard' })
    assert.equal(approvalRes.status, 200)

    const calendarRes = await request(app)
        .get(`/courses/${courseId}/calendar.ics`)
        .set('Authorization', `Bearer ${await tokenFor(student)}`)
    assert.equal(calendarRes.status, 200)
    assert.ok(/BEGIN:VCALENDAR/.test(calendarRes.text))

    const detailPrivate = await request(app)
        .get(`/courses/${courseId}`)
        .set('Authorization', `Bearer ${await tokenFor(student)}`)
    assert.equal(detailPrivate.status, 200)
    assert.equal(detailPrivate.body.course.materials[0].attachmentUrl, 'https://example.com/deck.pdf')
    assert.equal(detailPrivate.body.viewer.enrollmentStatus, 'APPROVED')

    const codeJoin = await request(app)
        .post('/courses/join-code')
        .set('Authorization', `Bearer ${await tokenFor(student)}`)
        .send({ code: joinCode })
    assert.equal(codeJoin.status, 200)
    assert.equal(codeJoin.body.viewer.isEnrolled, true)
})

test('course channel and chat persist messages with role-based visibility', async () => {
    const creator = await createUser({ role: 'CREATOR' })
    const student = await createUser({ role: 'STUDENT' })

    const createCourse = await request(app)
        .post('/courses')
        .set('Authorization', `Bearer ${await tokenFor(creator)}`)
        .send({ title: 'LMS Basics', summary: 'Test course', isPublished: true })
    assert.equal(createCourse.status, 200)
    const courseId = createCourse.body.course.id

    await prisma.enrollment.create({
        data: {
            courseId,
            userId: student.id,
            status: 'APPROVED',
            formAnswersJson: '{}',
            joinedViaCode: true,
        },
    })

    const noteRes = await request(app)
        .post(`/courses/${courseId}/messages`)
        .set('Authorization', `Bearer ${await tokenFor(creator)}`)
        .send({ content: 'Staff planning note', visibility: 'STAFF' })
    assert.equal(noteRes.status, 200)

    const studentChannel = await request(app)
        .get(`/courses/${courseId}/messages`)
        .set('Authorization', `Bearer ${await tokenFor(student)}`)
    assert.equal(studentChannel.status, 200)
    assert.equal(Array.isArray(studentChannel.body.list), true)
    assert.equal(studentChannel.body.list.length, 0)

    const chatRes = await request(app)
        .post(`/courses/${courseId}/chat`)
        .set('Authorization', `Bearer ${await tokenFor(student)}`)
        .send({ content: 'When is the next session?', attachments: [{ url: 'https://example.com/agenda.pdf', name: 'agenda.pdf' }] })
    assert.equal(chatRes.status, 200)

    const instructorChat = await request(app)
        .get(`/courses/${courseId}/chat`)
        .set('Authorization', `Bearer ${await tokenFor(creator)}`)
    assert.equal(instructorChat.status, 200)
    assert.equal(instructorChat.body.list.length, 1)
    assert.equal(instructorChat.body.list[0].attachments[0].url, 'https://example.com/agenda.pdf')
})

test('course assignments allow creators to collect submissions', async () => {
    const tutor = await createUser({ role: 'TUTOR' })
    const student = await createUser({ role: 'STUDENT' })

    const createRes = await request(app)
        .post('/courses')
        .set('Authorization', `Bearer ${await tokenFor(tutor)}`)
        .send({ title: 'Creative Writing', summary: 'Weekly prompts', isPublished: true })
    assert.equal(createRes.status, 200)
    const courseId = createRes.body.course.id
    const joinCode = createRes.body.course.joinCode

    const assignmentRes = await request(app)
        .post(`/courses/${courseId}/assignments`)
        .set('Authorization', `Bearer ${await tokenFor(tutor)}`)
        .send({
            title: 'Prompt 1',
            description: 'Write 300 words about your city',
            dueAt: new Date(Date.now() + 3600_000).toISOString(),
            resources: ['https://example.com/reference.pdf'],
        })
    assert.equal(assignmentRes.status, 200)
    const assignmentId = assignmentRes.body.assignment.id

    await request(app)
        .post(`/courses/${courseId}/enroll`)
        .set('Authorization', `Bearer ${await tokenFor(student)}`)
        .send({ joinCode, answers: { intent: 'Love writing' } })

    const submitRes = await request(app)
        .post(`/courses/${courseId}/assignments/${assignmentId}/submissions`)
        .set('Authorization', `Bearer ${await tokenFor(student)}`)
        .send({ content: 'Here is my story', attachmentUrl: 'https://example.com/story.pdf' })
    assert.equal(submitRes.status, 200)
    const submissionId = submitRes.body.submission.id

    const listRes = await request(app)
        .get(`/courses/${courseId}/assignments/${assignmentId}/submissions`)
        .set('Authorization', `Bearer ${await tokenFor(tutor)}`)
    assert.equal(listRes.status, 200)
    assert.equal(listRes.body.list.length, 1)

    const gradeRes = await request(app)
        .patch(`/courses/${courseId}/assignments/${assignmentId}/submissions/${submissionId}`)
        .set('Authorization', `Bearer ${await tokenFor(tutor)}`)
        .send({ status: 'REVIEWED', grade: 'A', feedback: 'Great work!' })
    assert.equal(gradeRes.status, 200)
    assert.equal(gradeRes.body.submission.grade, 'A')
})

test('course tags and meeting links round-trip through the API', async () => {
    const admin = await createUser({ role: 'ADMIN' })
    const createRes = await request(app)
        .post('/courses')
        .set('Authorization', `Bearer ${await tokenFor(admin)}`)
        .send({
            title: 'LMS Fundamentals',
            summary: 'Deep dive into course tooling',
            isPublished: true,
            tags: ['STEM', 'Robotics'],
        })
    assert.equal(createRes.status, 200)
    const courseId = createRes.body.course.id

    const linkRes = await request(app)
        .post(`/courses/${courseId}/meeting-links`)
        .set('Authorization', `Bearer ${await tokenFor(admin)}`)
        .send({ title: 'Kickoff', url: 'meet.google.com/xyz-123', note: 'Weekly sync' })
    assert.equal(linkRes.status, 200)
    assert.equal(linkRes.body.course.meetingLinks.length, 1)
    assert.equal(linkRes.body.course.tags.length, 2)

    const tagsRes = await request(app).get('/courses/tags')
    assert.equal(tagsRes.status, 200)
    const tagSlugs = (tagsRes.body.tags || []).map((tag) => tag.slug)
    assert(tagSlugs.includes('stem'))
    assert(tagSlugs.includes('robotics'))
})
