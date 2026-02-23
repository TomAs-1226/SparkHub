const express = require('express')
const router = express.Router()
const { prisma } = require('../prisma')
const { requireAuth } = require('../middleware/auth')

// Get all availability entries for the current user
router.get('/availability', requireAuth, async (req, res) => {
    try {
        const availability = await prisma.mentorAvailability.findMany({
            where: { userId: req.user.id },
            orderBy: { date: 'asc' }
        })
        res.json({ ok: true, availability })
    } catch (err) {
        console.error('Error fetching availability:', err)
        res.status(500).json({ ok: false, msg: 'Unable to fetch availability' })
    }
})

// Set availability (multiple dates)
router.post('/availability', requireAuth, async (req, res) => {
    try {
        const { dates, role, subjects, bio } = req.body // role: 'TUTOR' or 'STUDENT'

        if (!dates || !Array.isArray(dates) || dates.length === 0) {
            return res.status(400).json({ ok: false, msg: 'Please select at least one date' })
        }

        if (!role || !['TUTOR', 'STUDENT'].includes(role)) {
            return res.status(400).json({ ok: false, msg: 'Please specify if you are a tutor or student' })
        }

        // Delete existing availability for this user
        await prisma.mentorAvailability.deleteMany({
            where: { userId: req.user.id }
        })

        // Create new availability entries
        const entries = dates.map(date => ({
            userId: req.user.id,
            date: new Date(date),
            role,
            subjects: subjects || '',
            bio: bio || '',
            matched: false
        }))

        await prisma.mentorAvailability.createMany({ data: entries })

        res.json({ ok: true, msg: 'Availability updated successfully', count: entries.length })
    } catch (err) {
        console.error('Error setting availability:', err)
        res.status(500).json({ ok: false, msg: 'Unable to update availability' })
    }
})

// Find matches based on date and subject overlap
router.get('/find-matches', requireAuth, async (req, res) => {
    try {
        // Get current user's availability
        const myAvailability = await prisma.mentorAvailability.findMany({
            where: { userId: req.user.id },
            orderBy: { date: 'asc' }
        })

        if (myAvailability.length === 0) {
            return res.json({ ok: true, matches: [], msg: 'Set your availability first to find matches' })
        }

        const myRole = myAvailability[0].role
        const targetRole = myRole === 'TUTOR' ? 'STUDENT' : 'TUTOR'
        const myDates = myAvailability.map(a => a.date.toISOString().split('T')[0])
        const mySubjects = myAvailability[0].subjects?.toLowerCase().split(',').map(s => s.trim()).filter(Boolean) || []

        // Find others with matching dates and opposite role
        const potentialMatches = await prisma.mentorAvailability.findMany({
            where: {
                role: targetRole,
                userId: { not: req.user.id },
                date: { in: myAvailability.map(a => a.date) }
            },
            include: {
                user: {
                    select: { id: true, name: true, email: true, avatarUrl: true }
                }
            }
        })

        // Tokenize a subject string into individual words for precise matching
        function tokenizeSubjects(subjectStr) {
            if (!subjectStr) return []
            return subjectStr
                .toLowerCase()
                .split(/[,;\s]+/)
                .map((s) => s.trim())
                .filter((s) => s.length > 1) // skip single chars
        }

        // Word-level subject overlap: avoids "Java" matching "JavaScript"
        function countSubjectOverlap(myTokens, theirTokens) {
            if (myTokens.length === 0 || theirTokens.length === 0) return 0
            return myTokens.filter((t) => theirTokens.includes(t)).length
        }

        const myTokens = tokenizeSubjects(myAvailability[0].subjects || '')

        // Group by user and calculate match score
        const userMatches = new Map()
        for (const match of potentialMatches) {
            const userId = match.userId
            if (!userMatches.has(userId)) {
                userMatches.set(userId, {
                    user: match.user,
                    role: match.role,
                    subjects: match.subjects,
                    bio: match.bio,
                    matchingDates: [],
                    score: 0,
                })
            }
            const dateStr = match.date.toISOString().split('T')[0]
            userMatches.get(userId).matchingDates.push(dateStr)
        }

        // Calculate scores with improved algorithm
        const MAX_SCORE = 100
        const matches = []
        for (const [userId, data] of userMatches) {
            const theirTokens = tokenizeSubjects(data.subjects || '')
            const subjectOverlap = countSubjectOverlap(myTokens, theirTokens)

            // Bio keyword boost: check if bio mentions any of my subjects
            const bioText = (data.bio || '').toLowerCase()
            const bioBoost = myTokens.filter((t) => bioText.includes(t)).length

            // Availability density bonus: more matching dates = higher priority
            const dateScore = data.matchingDates.length * 10
            const subjectScore = subjectOverlap * 8
            const bioScore = Math.min(bioBoost * 2, 10) // cap bio boost at 10

            const rawScore = dateScore + subjectScore + bioScore
            data.score = rawScore
            data.matchPercent = Math.min(Math.round((rawScore / MAX_SCORE) * 100), 100)
            data.subjectMatch = subjectOverlap > 0
            data.subjectOverlap = subjectOverlap

            matches.push({ userId, ...data })
        }

        // Sort by score descending, then by date count as tiebreaker
        matches.sort((a, b) => b.score - a.score || b.matchingDates.length - a.matchingDates.length)

        res.json({ ok: true, matches: matches.slice(0, 20), myRole })
    } catch (err) {
        console.error('Error finding matches:', err)
        res.status(500).json({ ok: false, msg: 'Unable to find matches' })
    }
})

// Request a match with another user
router.post('/request', requireAuth, async (req, res) => {
    try {
        const { targetUserId, date, message } = req.body

        if (!targetUserId || !date) {
            return res.status(400).json({ ok: false, msg: 'Target user and date are required' })
        }

        // Check if a request already exists
        const existing = await prisma.matchRequest.findFirst({
            where: {
                OR: [
                    { fromUserId: req.user.id, toUserId: targetUserId },
                    { fromUserId: targetUserId, toUserId: req.user.id }
                ],
                date: new Date(date),
                status: { not: 'DECLINED' }
            }
        })

        if (existing) {
            return res.status(400).json({ ok: false, msg: 'A request already exists for this date' })
        }

        const request = await prisma.matchRequest.create({
            data: {
                fromUserId: req.user.id,
                toUserId: targetUserId,
                date: new Date(date),
                message: message || '',
                status: 'PENDING'
            }
        })

        res.json({ ok: true, request, msg: 'Match request sent!' })
    } catch (err) {
        console.error('Error creating match request:', err)
        res.status(500).json({ ok: false, msg: 'Unable to send request' })
    }
})

// Get my match requests (incoming and outgoing)
router.get('/requests', requireAuth, async (req, res) => {
    try {
        const [incoming, outgoing] = await Promise.all([
            prisma.matchRequest.findMany({
                where: { toUserId: req.user.id },
                include: {
                    fromUser: { select: { id: true, name: true, email: true, avatarUrl: true } }
                },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.matchRequest.findMany({
                where: { fromUserId: req.user.id },
                include: {
                    toUser: { select: { id: true, name: true, email: true, avatarUrl: true } }
                },
                orderBy: { createdAt: 'desc' }
            })
        ])

        res.json({ ok: true, incoming, outgoing })
    } catch (err) {
        console.error('Error fetching requests:', err)
        res.status(500).json({ ok: false, msg: 'Unable to fetch requests' })
    }
})

// Respond to a match request (accept/decline)
router.patch('/requests/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params
        const { status } = req.body // 'ACCEPTED' or 'DECLINED'

        if (!['ACCEPTED', 'DECLINED'].includes(status)) {
            return res.status(400).json({ ok: false, msg: 'Invalid status' })
        }

        const request = await prisma.matchRequest.findFirst({
            where: { id, toUserId: req.user.id }
        })

        if (!request) {
            return res.status(404).json({ ok: false, msg: 'Request not found' })
        }

        const updated = await prisma.matchRequest.update({
            where: { id },
            data: { status }
        })

        res.json({ ok: true, request: updated, msg: status === 'ACCEPTED' ? 'Match accepted!' : 'Request declined' })
    } catch (err) {
        console.error('Error updating request:', err)
        res.status(500).json({ ok: false, msg: 'Unable to update request' })
    }
})

// Reschedule a match
router.patch('/requests/:id/reschedule', requireAuth, async (req, res) => {
    try {
        const { id } = req.params
        const { newDate } = req.body

        if (!newDate) {
            return res.status(400).json({ ok: false, msg: 'New date is required' })
        }

        const request = await prisma.matchRequest.findFirst({
            where: {
                id,
                OR: [
                    { fromUserId: req.user.id },
                    { toUserId: req.user.id }
                ]
            }
        })

        if (!request) {
            return res.status(404).json({ ok: false, msg: 'Request not found' })
        }

        const updated = await prisma.matchRequest.update({
            where: { id },
            data: {
                date: new Date(newDate),
                status: 'PENDING' // Reset to pending for re-approval
            }
        })

        res.json({ ok: true, request: updated, msg: 'Session rescheduled' })
    } catch (err) {
        console.error('Error rescheduling:', err)
        res.status(500).json({ ok: false, msg: 'Unable to reschedule' })
    }
})

module.exports = router