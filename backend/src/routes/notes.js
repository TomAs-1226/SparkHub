// routes/notes.js — Per-lesson student notes for LMS v2
const express = require('express')
const router = express.Router()
const { prisma } = require('../prisma')
const { requireAuth } = require('../middleware/auth')

// GET /notes/:courseId — Get all notes for a course
router.get('/:courseId', requireAuth, async (req, res) => {
    const { courseId } = req.params
    const notes = await prisma.studentNote.findMany({
        where: { userId: req.user.id, courseId },
        orderBy: { createdAt: 'desc' },
        include: { lesson: { select: { id: true, title: true, order: true } } },
    })
    res.json({ ok: true, notes })
})

// POST /notes/:courseId — Create a note
router.post('/:courseId', requireAuth, async (req, res) => {
    const { courseId } = req.params
    const { content, lessonId } = req.body

    if (!content?.trim()) return res.status(400).json({ ok: false, msg: 'Note content is required.' })

    const note = await prisma.studentNote.create({
        data: {
            userId: req.user.id,
            courseId,
            lessonId: lessonId || null,
            content: content.trim().slice(0, 10000),
        },
        include: { lesson: { select: { id: true, title: true, order: true } } },
    })
    res.status(201).json({ ok: true, note })
})

// PATCH /notes/:courseId/:id — Update a note
router.patch('/:courseId/:id', requireAuth, async (req, res) => {
    const { id } = req.params
    const existing = await prisma.studentNote.findUnique({ where: { id } })
    if (!existing || existing.userId !== req.user.id) {
        return res.status(404).json({ ok: false, msg: 'Note not found.' })
    }

    const { content } = req.body
    const note = await prisma.studentNote.update({
        where: { id },
        data: { content: content.trim().slice(0, 10000) },
    })
    res.json({ ok: true, note })
})

// DELETE /notes/:courseId/:id — Delete a note
router.delete('/:courseId/:id', requireAuth, async (req, res) => {
    const { id } = req.params
    const existing = await prisma.studentNote.findUnique({ where: { id } })
    if (!existing || existing.userId !== req.user.id) {
        return res.status(404).json({ ok: false, msg: 'Note not found.' })
    }
    await prisma.studentNote.delete({ where: { id } })
    res.json({ ok: true })
})

module.exports = router
