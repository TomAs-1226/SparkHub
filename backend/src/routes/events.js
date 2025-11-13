const express = require('express')
const router = express.Router()
const { prisma } = require('../prisma')
const { requireAuth, requireRole } = require('../middleware/auth')

// 创建活动（管理员）
router.post('/', requireAuth, requireRole(['ADMIN']), async (req, res) => {
    const { title, location, startsAt, endsAt, capacity, description } = req.body
    const event = await prisma.event.create({
        data: { title, location, startsAt: new Date(startsAt), endsAt: new Date(endsAt), capacity, description }
    })
    res.json({ ok: true, event })
})

// 活动列表
router.get('/', async (req, res) => {
    const limitRaw = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit
    const take = limitRaw ? parseInt(limitRaw, 10) : null
    const query = {
        orderBy: { startsAt: 'asc' }
    }
    if (take && Number.isFinite(take) && take > 0) {
        query.take = take
    }
    const list = await prisma.event.findMany(query)
    res.json({ ok: true, list })
})

// 活动详情
router.get('/:id', async (req, res) => {
    const event = await prisma.event.findUnique({ where: { id: req.params.id } })
    if (!event) return res.status(404).json({ ok: false, msg: '活动不存在' })
    res.json({ ok: true, event })
})

// 报名活动
router.post('/:id/signup', requireAuth, async (req, res) => {
    const ev = await prisma.event.findUnique({ where: { id: req.params.id } })
    if (!ev) return res.status(404).json({ ok: false, msg: '活动不存在' })
    const signup = await prisma.eventSignup.upsert({
        where: { eventId_userId: { eventId: ev.id, userId: req.user.id } },
        create: { eventId: ev.id, userId: req.user.id, note: req.body.note },
        update: { note: req.body.note }
    })
    res.json({ ok: true, signup })
})

// 查看报名（管理员）
router.get('/:id/signups', requireAuth, requireRole(['ADMIN']), async (req, res) => {
    const list = await prisma.eventSignup.findMany({ where: { eventId: req.params.id }, include: { user: true } })
    res.json({ ok: true, list })
})

module.exports = router