const express = require('express')
const { z } = require('zod')
const { prisma } = require('../prisma')
const { requireAuth, requireRole } = require('../middleware/auth')
const { validate } = require('../middleware/validate')
const { logAudit } = require('../utils/audit')

const router = express.Router()

// 创建可用时段（接受字符串或 Date，统一转为 Date）
const setSchema = z.object({
    body: z.object({
        startsAt: z.coerce.date(), // 允许 "2025-09-08T10:00:00Z" 或本地 ISO
        endsAt: z.coerce.date()
    })
})

router.post('/', requireAuth, requireRole(['TUTOR', 'ADMIN']), validate(setSchema), async (req, res) => {
    // z.coerce.date() 已经把字符串转为 Date
    const { startsAt, endsAt } = req.body
    const s = startsAt
    const e = endsAt

    if (!(e > s)) return res.status(400).json({ ok: false, msg: '时间范围无效' })

    // 防止与同一导师现有时段重叠（基于 User.id）
    const overlap = await prisma.tutorAvailability.findFirst({
        where: {
            tutorId: req.user.id,
            OR: [
                { startsAt: { lt: e }, endsAt: { gt: s } } // 任意交叉都视为重叠
            ]
        }
    })
    if (overlap) return res.status(400).json({ ok: false, msg: '时间段重叠' })

    const slot = await prisma.tutorAvailability.create({
        data: { tutorId: req.user.id, startsAt: s, endsAt: e }
    })

    await logAudit(req, 'AVAIL_CREATE', 'TutorAvailability', slot.id)
    res.json({ ok: true, slot })
})

// 列出可用时段（可选过滤：导师、时间范围）
router.get('/', async (req, res) => {
    const { tutorId, from, to } = req.query
    const where = {}
    if (tutorId) where.tutorId = String(tutorId)
    if (from || to) {
        if (from) (where.startsAt ??= {}).gte = new Date(String(from))
        if (to) (where.endsAt ??= {}).lte = new Date(String(to))
    }
    const rows = await prisma.tutorAvailability.findMany({
        where,
        orderBy: { startsAt: 'asc' }
    })
    res.json({ ok: true, list: rows })
})

// 删除可用时段（导师本人或管理员）
router.delete('/:id', requireAuth, requireRole(['TUTOR', 'ADMIN']), async (req, res) => {
    const slot = await prisma.tutorAvailability.findUnique({ where: { id: req.params.id } })
    if (!slot) return res.status(404).json({ ok: false, msg: '不存在' })
    if (req.user.role !== 'ADMIN' && slot.tutorId !== req.user.id) {
        return res.status(403).json({ ok: false, msg: '无权限' })
    }
    await prisma.tutorAvailability.delete({ where: { id: slot.id } })
    await logAudit(req, 'AVAIL_DELETE', 'TutorAvailability', slot.id)
    res.json({ ok: true })
})

module.exports = router