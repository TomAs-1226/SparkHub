const express = require('express')
const router = express.Router()
const { prisma } = require('../prisma')
const { requireAuth, requireRole } = require('../middleware/auth')

// 创建课程（创作者）
router.post('/', requireAuth, requireRole(['CREATOR', 'ADMIN']), async (req, res) => {
    const { title, summary, coverUrl, isPublished = false } = req.body
    const course = await prisma.course.create({
        data: { title, summary, coverUrl, isPublished, creatorId: req.user.id }
    })
    res.json({ ok: true, course })
})

// 课程列表（公开）
router.get('/', async (req, res) => {
    const list = await prisma.course.findMany({ where: { isPublished: true }, orderBy: { createdAt: 'desc' } })
    res.json({ ok: true, list })
})

// 我的课程（创作者）
router.get('/mine', requireAuth, requireRole(['CREATOR', 'ADMIN']), async (req, res) => {
    const list = await prisma.course.findMany({ where: { creatorId: req.user.id }, orderBy: { createdAt: 'desc' } })
    res.json({ ok: true, list })
})

// 我的选课列表
router.get('/enrollments/mine', requireAuth, async (req, res) => {
    const rows = await prisma.enrollment.findMany({
        where: { userId: req.user.id },
        include: { course: true },
        orderBy: { createdAt: 'desc' }
    })
    res.json({
        ok: true,
        list: rows.map((row) => ({
            id: row.id,
            courseId: row.courseId,
            createdAt: row.createdAt,
            course: row.course
        }))
    })
})

// 课程详情
router.get('/:id', async (req, res) => {
    const course = await prisma.course.findUnique({ where: { id: req.params.id }, include: { lessons: true } })
    if (!course) return res.status(404).json({ ok: false, msg: '课程不存在' })
    res.json({ ok: true, course })
})

// 更新课程（只能作者或管理员）
router.patch('/:id', requireAuth, requireRole(['CREATOR', 'ADMIN']), async (req, res) => {
    const found = await prisma.course.findUnique({ where: { id: req.params.id } })
    if (!found) return res.status(404).json({ ok: false, msg: '课程不存在' })
    if (req.user.role !== 'ADMIN' && found.creatorId !== req.user.id) return res.status(403).json({ ok: false, msg: '无权限' })
    const course = await prisma.course.update({ where: { id: found.id }, data: req.body })
    res.json({ ok: true, course })
})

// 删除课程
router.delete('/:id', requireAuth, requireRole(['CREATOR', 'ADMIN']), async (req, res) => {
    const found = await prisma.course.findUnique({ where: { id: req.params.id } })
    if (!found) return res.status(404).json({ ok: false, msg: '课程不存在' })
    if (req.user.role !== 'ADMIN' && found.creatorId !== req.user.id) return res.status(403).json({ ok: false, msg: '无权限' })
    await prisma.lesson.deleteMany({ where: { courseId: found.id } })
    await prisma.enrollment.deleteMany({ where: { courseId: found.id } })
    await prisma.course.delete({ where: { id: found.id } })
    res.json({ ok: true })
})

// 新增章节（视频或文本）
router.post('/:id/lessons', requireAuth, requireRole(['CREATOR', 'ADMIN']), async (req, res) => {
    const { title, type, videoUrl, body, order = 1 } = req.body
    const course = await prisma.course.findUnique({ where: { id: req.params.id } })
    if (!course) return res.status(404).json({ ok: false, msg: '课程不存在' })
    if (req.user.role !== 'ADMIN' && course.creatorId !== req.user.id) return res.status(403).json({ ok: false, msg: '无权限' })
    const lesson = await prisma.lesson.create({ data: { courseId: course.id, title, type, videoUrl, body, order } })
    res.json({ ok: true, lesson })
})

// 选课
router.post('/:id/enroll', requireAuth, async (req, res) => {
    const course = await prisma.course.findUnique({ where: { id: req.params.id } })
    if (!course) return res.status(404).json({ ok: false, msg: '课程不存在' })
    const enrollment = await prisma.enrollment.upsert({
        where: { userId_courseId: { userId: req.user.id, courseId: course.id } },
        create: { userId: req.user.id, courseId: course.id },
        update: {}
    })
    res.json({ ok: true, enrollment })
})


// 课程留言（与课程管理者互动）
router.post('/:id/messages', requireAuth, async (req, res) => {
    const course = await prisma.course.findUnique({ where: { id: req.params.id } })
    if (!course) return res.status(404).json({ ok: false, msg: '课程不存在' })
    const msg = await prisma.courseMessage.create({
        data: { courseId: course.id, fromUserId: req.user.id, content: req.body.content }
    })
    res.json({ ok: true, message: msg })
})

// 查看留言（作者 / 已选课 / 管理员）
router.get('/:id/messages', requireAuth, async (req, res) => {
    const course = await prisma.course.findUnique({ where: { id: req.params.id } })
    if (!course) return res.status(404).json({ ok: false, msg: '课程不存在' })
    const isOwner = course.creatorId === req.user.id || req.user.role === 'ADMIN'
    const isEnrolled = await prisma.enrollment.findUnique({ where: { userId_courseId: { userId: req.user.id, courseId: course.id } } })
    if (!isOwner && !isEnrolled) return res.status(403).json({ ok: false, msg: '无权限' })
    const list = await prisma.courseMessage.findMany({ where: { courseId: course.id }, orderBy: { createdAt: 'asc' } })
    res.json({ ok: true, list })
})

module.exports = router