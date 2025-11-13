const express = require('express')
const router = express.Router()
const { prisma } = require('../prisma')
const { requireAuth, requireRole } = require('../middleware/auth')

const MEET_BASE = process.env.MEET_BASE || 'https://meet.jit.si'

// 创建/更新导师资料（导师）
router.post('/profile', requireAuth, requireRole(['TUTOR', 'ADMIN']), async (req, res) => {
    const {bio, subjects = []} = req.body
    const subjectsCsv = Array.isArray(subjects) ? subjects.join(',') : (subjects || '')

    const up = await prisma.tutorProfile.upsert({
        where: {userId: req.user.id},
        create: {userId: req.user.id, bio, subjectsCsv},
        update: {bio, subjectsCsv}
    })

    res.json({
        ok: true,
        profile: {...up, subjects: up.subjectsCsv ? up.subjectsCsv.split(',').filter(Boolean) : []}
    })
})
// 导师列表
router.get('/', async (_req, res) => {
    const list = await prisma.tutorProfile.findMany({ include: { user: true } })
    res.json({ ok: true, list })
})

// 预约（学生）
router.post('/sessions', requireAuth, async (req, res) => {
  const { tutorId, startsAt, endsAt, note } = req.body
  if (!tutorId || !startsAt || !endsAt) {
    return res.status(400).json({ ok: false, msg: '缺少必要参数' })
  }

  const s = new Date(startsAt)
  const e = new Date(endsAt)
  if (!(e > s)) return res.status(400).json({ ok: false, msg: '时间范围无效' })

  const tutor = await prisma.tutorProfile.findUnique({ where: { id: tutorId } })
  if (!tutor) return res.status(404).json({ ok: false, msg: '导师不存在' })

  // 可选：强制校验导师可用时段（基于导师的 userId）
  if (process.env.ENFORCE_AVAILABILITY === '1') {
    const ok = await prisma.tutorAvailability.findFirst({
      where: {
        tutorId: tutor.userId,
        startsAt: { lte: s },
        endsAt: { gte: e }
      }
    })
    if (!ok) return res.status(400).json({ ok: false, msg: '导师该时段不可用' })
  }

  const session = await prisma.session.create({
    data: { tutorId, studentId: req.user.id, startsAt: s, endsAt: e, note }
  })

  // 生成会议链接（不依赖外部服务）。若 Session 表无 meetingUrl 字段，则仍随响应返回。
  const shortId = session.id.slice(0, 8)
  const meetingUrl = `${MEET_BASE}/spark-${shortId}`
  try {
    await prisma.session.update({ where: { id: session.id }, data: { meetingUrl } })
    session.meetingUrl = meetingUrl
  } catch (_e) {
    // meetingUrl 字段可能不存在，直接把链接附在响应里
    session.meetingUrl = meetingUrl
  }

  res.json({ ok: true, session })
})

// 我的预约（学生/导师）
router.get('/sessions/mine', requireAuth, async (req, res) => {
    if (req.user.role === 'TUTOR') {
        const prof = await prisma.tutorProfile.findUnique({ where: { userId: req.user.id } })
        if (!prof) return res.json({ ok: true, list: [] })
        const list = await prisma.session.findMany({ where: { tutorId: prof.id }, include: { student: true } })
        return res.json({ ok: true, list })
    } else {
        const list = await prisma.session.findMany({ where: { studentId: req.user.id }, include: { tutor: true } })
        return res.json({ ok: true, list })
    }
})

module.exports = router