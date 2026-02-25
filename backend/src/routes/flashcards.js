const express = require('express')
const { requireAuth } = require('../middleware/auth')
const prisma = require('../prisma')

const router = express.Router()

// GET /flashcards — list all cards for the current user (optionally filter by deck)
router.get('/', requireAuth, async (req, res) => {
    try {
        const { deck } = req.query
        const where = { userId: req.user.id }
        if (deck) where.deckName = String(deck)
        const cards = await prisma.flashcard.findMany({
            where,
            orderBy: [{ deckName: 'asc' }, { position: 'asc' }, { createdAt: 'asc' }],
        })
        return res.json({ ok: true, cards })
    } catch (err) {
        console.error('FLASHCARDS GET ERROR:', err)
        return res.status(500).json({ ok: false, msg: 'Server error' })
    }
})

// GET /flashcards/decks — list distinct deck names for the user
router.get('/decks', requireAuth, async (req, res) => {
    try {
        const decks = await prisma.flashcard.findMany({
            where: { userId: req.user.id },
            select: { deckName: true },
            distinct: ['deckName'],
            orderBy: { deckName: 'asc' },
        })
        return res.json({ ok: true, decks: decks.map((d) => d.deckName) })
    } catch (err) {
        return res.status(500).json({ ok: false, msg: 'Server error' })
    }
})

// POST /flashcards — create a new card
router.post('/', requireAuth, async (req, res) => {
    try {
        const front = String(req.body.front || '').trim()
        const back = String(req.body.back || '').trim()
        const deckName = String(req.body.deckName || 'Default').trim()
        if (!front || !back) return res.status(400).json({ ok: false, msg: 'front and back are required' })
        const card = await prisma.flashcard.create({
            data: { userId: req.user.id, front, back, deckName },
        })
        return res.json({ ok: true, card })
    } catch (err) {
        console.error('FLASHCARD CREATE ERROR:', err)
        return res.status(500).json({ ok: false, msg: 'Server error' })
    }
})

// PATCH /flashcards/:id — update front, back, or deckName
router.patch('/:id', requireAuth, async (req, res) => {
    try {
        const card = await prisma.flashcard.findUnique({ where: { id: req.params.id } })
        if (!card || card.userId !== req.user.id) return res.status(404).json({ ok: false, msg: 'Card not found' })
        const data = {}
        if (typeof req.body.front === 'string' && req.body.front.trim()) data.front = req.body.front.trim()
        if (typeof req.body.back === 'string' && req.body.back.trim()) data.back = req.body.back.trim()
        if (typeof req.body.deckName === 'string') data.deckName = req.body.deckName.trim() || 'Default'
        if (typeof req.body.position === 'number') data.position = req.body.position
        const updated = await prisma.flashcard.update({ where: { id: req.params.id }, data })
        return res.json({ ok: true, card: updated })
    } catch (err) {
        return res.status(500).json({ ok: false, msg: 'Server error' })
    }
})

// DELETE /flashcards/:id
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const card = await prisma.flashcard.findUnique({ where: { id: req.params.id } })
        if (!card || card.userId !== req.user.id) return res.status(404).json({ ok: false, msg: 'Card not found' })
        await prisma.flashcard.delete({ where: { id: req.params.id } })
        return res.json({ ok: true })
    } catch (err) {
        return res.status(500).json({ ok: false, msg: 'Server error' })
    }
})

// DELETE /flashcards — delete all cards in a deck (or all if no deck specified)
router.delete('/', requireAuth, async (req, res) => {
    try {
        const { deck } = req.query
        const where = { userId: req.user.id }
        if (deck) where.deckName = String(deck)
        await prisma.flashcard.deleteMany({ where })
        return res.json({ ok: true })
    } catch (err) {
        return res.status(500).json({ ok: false, msg: 'Server error' })
    }
})

module.exports = router
