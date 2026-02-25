const express = require('express')
const { requireAuth } = require('../middleware/auth')
const prisma = require('../prisma')

const router = express.Router()

// GET /user-notes
router.get('/', requireAuth, async (req, res) => {
    try {
        const notes = await prisma.userNote.findMany({
            where: { userId: req.user.id },
            orderBy: [{ pinned: 'desc' }, { updatedAt: 'desc' }],
        })
        return res.json({ ok: true, notes })
    } catch (err) {
        return res.status(500).json({ ok: false, msg: 'Server error' })
    }
})

// POST /user-notes
router.post('/', requireAuth, async (req, res) => {
    try {
        const content = String(req.body.content || '').slice(0, 5000)
        const color = String(req.body.color || 'yellow')
        const note = await prisma.userNote.create({
            data: { userId: req.user.id, content, color },
        })
        return res.json({ ok: true, note })
    } catch (err) {
        return res.status(500).json({ ok: false, msg: 'Server error' })
    }
})

// PATCH /user-notes/:id
router.patch('/:id', requireAuth, async (req, res) => {
    try {
        const note = await prisma.userNote.findUnique({ where: { id: req.params.id } })
        if (!note || note.userId !== req.user.id) return res.status(404).json({ ok: false, msg: 'Not found' })
        const data = {}
        if (typeof req.body.content === 'string') data.content = req.body.content.slice(0, 5000)
        if (typeof req.body.color === 'string') data.color = req.body.color
        if (typeof req.body.pinned === 'boolean') data.pinned = req.body.pinned
        const updated = await prisma.userNote.update({ where: { id: req.params.id }, data })
        return res.json({ ok: true, note: updated })
    } catch (err) {
        return res.status(500).json({ ok: false, msg: 'Server error' })
    }
})

// DELETE /user-notes/:id
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const note = await prisma.userNote.findUnique({ where: { id: req.params.id } })
        if (!note || note.userId !== req.user.id) return res.status(404).json({ ok: false, msg: 'Not found' })
        await prisma.userNote.delete({ where: { id: req.params.id } })
        return res.json({ ok: true })
    } catch (err) {
        return res.status(500).json({ ok: false, msg: 'Server error' })
    }
})

module.exports = router
