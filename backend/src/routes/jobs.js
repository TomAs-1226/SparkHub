const { z } = require('zod')
const { validate } = require('../middleware/validate')
const express = require('express')
const router = express.Router()
const { prisma } = require('../prisma')
const { requireAuth, requireRole } = require('../middleware/auth')

// Validate POST /jobs payload
const postJobSchema = z.object({
  body: z.object({
    title: z.string().min(2).max(120),
    description: z.string().min(10).max(5000),
    skills: z.array(z.string().min(1)).optional().default([]),
    startTime: z.string().datetime().optional(),
    endTime: z.string().datetime().optional(),
    duration: z.string().max(120).optional(),
    benefits: z.string().max(1000).optional(),
    photos: z.array(z.string().url()).optional().default([]),
    files: z.array(z.string()).optional().default([]),
    contact: z.string().min(3).max(200)
  })
})

function csvToArray(value) {
  if (!value) return []
  return value.split(',').map((item) => item.trim()).filter(Boolean)
}

function filesFromJson(raw) {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function filesToJson(files) {
  if (!Array.isArray(files)) return '[]'
  return JSON.stringify(files)
}

function presentJob(row) {
  if (!row) return null
  return {
    ...row,
    skills: csvToArray(row.skillsCsv),
    photos: csvToArray(row.photosCsv),
    files: filesFromJson(row.filesJson),
  }
}

// 发布职位（招聘者/管理员/导师）
router.post('/', requireAuth, requireRole(['RECRUITER', 'ADMIN', 'TUTOR', 'CREATOR']), validate(postJobSchema), async (req, res) => {
    const { title, description, skills = [], startTime, endTime, duration, benefits, photos = [], files = [], contact } = req.body
    const skillsCsv = Array.isArray(skills) ? skills.join(',') : (skills || '')
    const photosCsv = Array.isArray(photos) ? photos.join(',') : (photos || '')
    const job = await prisma.jobPosting.create({
        data: {
            recruiterId: req.user.id,
            title,
            description,
            skillsCsv,
            startTime: startTime ? new Date(startTime) : null,
            endTime: endTime ? new Date(endTime) : null,
            duration,
            benefits,
            photosCsv,
            filesJson: filesToJson(files),
            contact
        }
    })
    res.json({ ok: true, job: presentJob(job) })
})

// 职位列表
router.get('/', async (_req, res) => {
    const rows = await prisma.jobPosting.findMany({ orderBy: { createdAt: 'desc' } })
    const list = rows.map(presentJob)
    res.json({ ok: true, list })
})

router.get('/mine', requireAuth, async (req, res) => {
    const rows = await prisma.jobPosting.findMany({
        where: { recruiterId: req.user.id },
        orderBy: { createdAt: 'desc' }
    })
    res.json({ ok: true, list: rows.map(presentJob) })
})

// 职位详情
router.get('/:id', async (req, res) => {
    const jobRaw = await prisma.jobPosting.findUnique({ where: { id: req.params.id } })
    if (!jobRaw) return res.status(404).json({ ok: false, msg: '职位不存在' })
    res.json({ ok: true, job: presentJob(jobRaw) })
})

router.delete('/:id', requireAuth, async (req, res) => {
    const job = await prisma.jobPosting.findUnique({ where: { id: req.params.id } })
    if (!job) return res.status(404).json({ ok: false, msg: '职位不存在' })
    if (req.user.role !== 'ADMIN' && job.recruiterId !== req.user.id) {
        return res.status(403).json({ ok: false, msg: '无权限' })
    }
    await prisma.jobPosting.delete({ where: { id: job.id } })
    res.json({ ok: true })
})

// 申请职位（学生）
router.post('/:id/apply', requireAuth, async (req, res) => {
    const job = await prisma.jobPosting.findUnique({ where: { id: req.params.id } })
    if (!job) return res.status(404).json({ ok: false, msg: '职位不存在' })
    const app = await prisma.jobApplication.upsert({
        where: { jobId_userId: { jobId: job.id, userId: req.user.id } },
        create: { jobId: job.id, userId: req.user.id, message: req.body.message || '' },
        update: { message: req.body.message || '' }
    })
    res.json({ ok: true, application: app })
})

// 查看申请（招聘者）
router.get('/:id/applications', requireAuth, requireRole(['RECRUITER', 'ADMIN']), async (req, res) => {
    const job = await prisma.jobPosting.findUnique({ where: { id: req.params.id } })
    if (!job) return res.status(404).json({ ok: false, msg: '职位不存在' })
    if (req.user.role !== 'ADMIN' && job.recruiterId !== req.user.id) return res.status(403).json({ ok: false, msg: '无权限' })
    const list = await prisma.jobApplication.findMany({ where: { jobId: job.id }, include: { user: true } })
    res.json({ ok: true, list })
})

module.exports = router
