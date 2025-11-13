const express = require('express')
const { z } = require('zod')
const { prisma } = require('../prisma')
const { requireAuth, requireRole } = require('../middleware/auth')
const { validate } = require('../middleware/validate')
const { logAudit } = require('../utils/audit')

const router = express.Router()

// Helpers
const csvJoin = (arr) => (Array.isArray(arr) ? arr.join(',') : (arr || ''))
const csvSplit = (s) => (s ? s.split(',').map(x => x.trim()).filter(Boolean) : [])

// ----- Create quiz (CREATOR/ADMIN) -----
const createQuizSchema = z.object({
    body: z.object({
        courseId: z.string().min(1),
        title: z.string().min(2).max(200),
        passScore: z.number().int().min(0).max(100).default(60)
    })
})
router.post('/', requireAuth, requireRole(['CREATOR', 'ADMIN']), validate(createQuizSchema), async (req, res) => {
    const { courseId, title, passScore } = req.body

    // Ensure request user is the course creator or admin
    const course = await prisma.course.findUnique({ where: { id: courseId } })
    if (!course) return res.status(404).json({ ok: false, msg: '课程不存在' })
    if (req.user.role !== 'ADMIN' && course.creatorId !== req.user.id) {
        return res.status(403).json({ ok: false, msg: '无权限' })
    }

    const quiz = await prisma.quiz.create({ data: { courseId, title, passScore } })
    await logAudit(req, 'QUIZ_CREATE', 'Quiz', quiz.id, { courseId })
    res.json({ ok: true, quiz })
})

// ----- Add question -----
const addQSchema = z.object({
    params: z.object({ id: z.string().min(1) }),
    body: z.object({
        text: z.string().min(1),
        options: z.array(z.string().min(1)).min(2).max(8),
        correctIdx: z.number().int().min(0),
        order: z.number().int().min(1).optional()
    })
})
router.post('/:id/questions', requireAuth, requireRole(['CREATOR', 'ADMIN']), validate(addQSchema), async (req, res) => {
    const { id } = req.params
    const { text, options, correctIdx, order } = req.body

    const quiz = await prisma.quiz.findUnique({ where: { id } , include: { course: true } })
    if (!quiz) return res.status(404).json({ ok: false, msg: '测验不存在' })
    if (req.user.role !== 'ADMIN' && quiz.course.creatorId !== req.user.id) {
        return res.status(403).json({ ok: false, msg: '无权限' })
    }
    if (correctIdx < 0 || correctIdx >= options.length) return res.status(400).json({ ok: false, msg: 'correctIdx 超范围' })

    const q = await prisma.quizQuestion.create({
        data: {
            quizId: id,
            text,
            optionsCsv: csvJoin(options),
            correctIdx,
            order: order ?? 1
        }
    })
    await logAudit(req, 'QUIZ_ADD_QUESTION', 'QuizQuestion', q.id, { quizId: id })
    res.json({ ok: true, question: { ...q, options } })
})

// ----- Publish quiz -----
router.post('/:id/publish', requireAuth, requireRole(['CREATOR', 'ADMIN']), async (req, res) => {
    const quiz = await prisma.quiz.findUnique({ where: { id: req.params.id }, include: { course: true, questions: true } })
    if (!quiz) return res.status(404).json({ ok: false, msg: '测验不存在' })
    if (req.user.role !== 'ADMIN' && quiz.course.creatorId !== req.user.id) {
        return res.status(403).json({ ok: false, msg: '无权限' })
    }
    if (!quiz.questions.length) return res.status(400).json({ ok: false, msg: '至少需要一个题目' })

    const up = await prisma.quiz.update({ where: { id: quiz.id }, data: { isPublished: true } })
    await logAudit(req, 'QUIZ_PUBLISH', 'Quiz', quiz.id)
    res.json({ ok: true, quiz: up })
})

// ----- List quizzes for course -----
router.get('/course/:courseId', requireAuth, async (req, res) => {
    const rows = await prisma.quiz.findMany({
        where: { courseId: req.params.courseId, isPublished: true },
        orderBy: { createdAt: 'desc' }
    })
    res.json({ ok: true, list: rows })
})

// ----- Attempt quiz (grade + maybe certificate) -----
const attemptSchema = z.object({
    params: z.object({ id: z.string().min(1) }),
    body: z.object({
        answers: z.array(z.number().int().min(0)).min(1)
    })
})
router.post('/:id/attempts', requireAuth, validate(attemptSchema), async (req, res) => {
    const quiz = await prisma.quiz.findUnique({
        where: { id: req.params.id },
        include: { questions: { orderBy: { order: 'asc' } } }
    })
    if (!quiz || !quiz.isPublished) return res.status(404).json({ ok: false, msg: '测验不存在' })

    const answers = req.body.answers
    if (answers.length !== quiz.questions.length) {
        return res.status(400).json({ ok: false, msg: '答案数量不匹配' })
    }

    // grade
    let correct = 0
    quiz.questions.forEach((q, i) => {
        if (answers[i] === q.correctIdx) correct++
    })
    const score = Math.round(100 * (correct / quiz.questions.length))
    const passed = score >= quiz.passScore

    const att = await prisma.quizAttempt.create({
        data: {
            quizId: quiz.id,
            userId: req.user.id,
            answersCsv: csvJoin(answers),
            score,
            passed
        }
    })

    let certificate = null
    if (passed) {
        // issue certificate for the course (one per user/course)
        const existing = await prisma.certificate.findFirst({
            where: { userId: req.user.id, courseId: quiz.courseId }
        })
        if (!existing) {
            const code = `CERT-${Math.random().toString(36).slice(2,10).toUpperCase()}`
            certificate = await prisma.certificate.create({
                data: { userId: req.user.id, courseId: quiz.courseId, code }
            })
            await logAudit(req, 'CERT_ISSUE', 'Certificate', certificate.id, { courseId: quiz.courseId, code })
        }
    }

    await logAudit(req, 'QUIZ_ATTEMPT', 'QuizAttempt', att.id, { score, passed })
    res.json({ ok: true, attempt: att, certificate })
})

// ----- Verify certificate by code -----
router.get('/certificates/verify/:code', async (req, res) => {
    const cert = await prisma.certificate.findUnique({
        where: { code: req.params.code },
        include: { user: true, course: true }
    })
    if (!cert) return res.status(404).json({ ok: false, msg: '证书不存在' })
    res.json({
        ok: true,
        certificate: {
            code: cert.code,
            user: { id: cert.userId, name: cert.user.name, email: cert.user.email },
            course: { id: cert.courseId, title: cert.course.title },
            issuedAt: cert.issuedAt,
            expiresAt: cert.expiresAt
        }
    })
})

module.exports = router