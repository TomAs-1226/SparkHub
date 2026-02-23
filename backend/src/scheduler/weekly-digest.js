/**
 * Weekly Digest Scheduler — SparkHub v2.2
 *
 * Generates an AI-written weekly digest using OpenAI (gpt-4o-mini),
 * then delivers it to each opted-in user's in-app inbox.
 * Falls back to a template digest if OpenAI is unavailable.
 *
 * Schedule: every Monday at 09:00 (configured in server.js via node-cron)
 * Manual run: node src/scheduler/weekly-digest.js
 */

const path = require('path')
const dotenv = require('dotenv')
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') })
dotenv.config({ path: path.resolve(__dirname, '..', '..', '..', '.env'), override: false })

const { prisma } = require('../prisma')

// ── Stats collector ────────────────────────────────────────────────────────────

async function getWeeklyStats() {
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    const [newCourses, upcomingEvents, newJobs, newResources, totalUsers, newEnrollments] =
        await Promise.all([
            prisma.course.findMany({
                where: { isPublished: true, createdAt: { gte: oneWeekAgo } },
                select: { id: true, title: true, summary: true },
                take: 5,
            }),
            prisma.event.findMany({
                where: { startsAt: { gte: new Date() } },
                select: { id: true, title: true, location: true, startsAt: true },
                orderBy: { startsAt: 'asc' },
                take: 5,
            }),
            prisma.jobPosting.findMany({
                where: { createdAt: { gte: oneWeekAgo } },
                select: { id: true, title: true, description: true },
                take: 5,
            }),
            prisma.resource.findMany({
                where: { createdAt: { gte: oneWeekAgo } },
                select: { id: true, title: true, kind: true },
                take: 5,
            }),
            prisma.user.count(),
            prisma.enrollment.count({ where: { createdAt: { gte: oneWeekAgo } } }),
        ])

    return { newCourses, upcomingEvents, newJobs, newResources, totalUsers, newEnrollments, weekStart: oneWeekAgo }
}

// ── AI-generated digest body ───────────────────────────────────────────────────

async function generateAiDigestBody(stats) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
        console.log('[Digest] No OPENAI_API_KEY — using template digest.')
        return generateTemplateDigest(stats)
    }

    const statsText = [
        `Community members: ${stats.totalUsers}`,
        `New enrollments this week: ${stats.newEnrollments}`,
        stats.newCourses.length > 0
            ? `New courses: ${stats.newCourses.map((c) => `"${c.title}"`).join(', ')}`
            : 'No new courses this week.',
        stats.upcomingEvents.length > 0
            ? `Upcoming events: ${stats.upcomingEvents.map((e) => `"${e.title}" on ${new Date(e.startsAt).toDateString()}`).join(', ')}`
            : 'No upcoming events.',
        stats.newJobs.length > 0
            ? `New opportunities: ${stats.newJobs.map((j) => `"${j.title}"`).join(', ')}`
            : 'No new opportunities.',
        stats.newResources.length > 0
            ? `New resources: ${stats.newResources.map((r) => `"${r.title}" (${r.kind})`).join(', ')}`
            : 'No new resources.',
    ].join('\n')

    try {
        const { OpenAI } = require('openai')
        const openai = new OpenAI({ apiKey })

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            max_tokens: 600,
            messages: [
                {
                    role: 'system',
                    content: `You are a warm, engaging community newsletter writer for SparkHub — an educational learning platform.
Write a weekly digest that feels personal and motivating. Use Markdown formatting (## headings, bullet points, bold text).
Keep it under 350 words. Be encouraging, highlight what's exciting, and end with a motivational note.
Do NOT include a subject line or email headers — just the body content.`,
                },
                {
                    role: 'user',
                    content: `Write this week's SparkHub digest using these stats:\n\n${statsText}`,
                },
            ],
        })

        const body = completion.choices[0]?.message?.content?.trim()
        if (body && body.length > 50) {
            console.log('[Digest] AI digest generated successfully.')
            return body
        }
    } catch (err) {
        console.warn('[Digest] OpenAI call failed, falling back to template:', err?.message)
    }

    return generateTemplateDigest(stats)
}

function generateTemplateDigest(stats) {
    const lines = [
        `## This Week on SparkHub 🚀`,
        ``,
        `Here's what's been happening in our learning community:`,
        ``,
        `**Community:** ${stats.totalUsers} members · ${stats.newEnrollments} new enrollments this week`,
        ``,
    ]

    if (stats.newCourses.length > 0) {
        lines.push(`## New Courses`)
        stats.newCourses.forEach((c) => lines.push(`- **${c.title}** — ${c.summary?.slice(0, 80) || 'New course available'}…`))
        lines.push(``)
    }

    if (stats.upcomingEvents.length > 0) {
        lines.push(`## Upcoming Events`)
        stats.upcomingEvents.forEach((e) =>
            lines.push(`- **${e.title}** · ${new Date(e.startsAt).toDateString()} · ${e.location}`)
        )
        lines.push(``)
    }

    if (stats.newJobs.length > 0) {
        lines.push(`## New Opportunities`)
        stats.newJobs.forEach((j) => lines.push(`- **${j.title}**`))
        lines.push(``)
    }

    if (stats.newResources.length > 0) {
        lines.push(`## Fresh Resources`)
        stats.newResources.forEach((r) => lines.push(`- ${r.title} _(${r.kind})_`))
        lines.push(``)
    }

    lines.push(`---`)
    lines.push(`Keep learning and growing! Visit your dashboard to explore everything. 🎓`)

    return lines.join('\n')
}

// ── Eligible recipients ────────────────────────────────────────────────────────

async function getEligibleUsers() {
    return prisma.user.findMany({
        where: {
            OR: [
                { emailPreference: { weeklyUpdates: true } },
                { emailPreference: null }, // default opted-in
            ],
        },
        select: { id: true, name: true },
    })
}

// ── Main entry point ──────────────────────────────────────────────────────────

async function sendWeeklyDigests() {
    console.log('[Digest] Starting weekly digest generation…', new Date().toISOString())

    try {
        const stats = await getWeeklyStats()
        console.log(
            `[Digest] Stats: ${stats.newCourses.length} courses, ${stats.upcomingEvents.length} events, ` +
            `${stats.newJobs.length} jobs, ${stats.newResources.length} resources`
        )

        const users = await getEligibleUsers()
        console.log(`[Digest] Eligible recipients: ${users.length}`)

        if (users.length === 0) {
            return { ok: true, sent: 0, message: 'No eligible recipients.' }
        }

        const body = await generateAiDigestBody(stats)
        const weekLabel = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        const title = `Your Weekly SparkHub Digest — ${weekLabel}`

        // Deliver to each user's inbox in bulk
        await prisma.inboxMessage.createMany({
            data: users.map((u) => ({
                userId: u.id,
                kind: 'DIGEST',
                fromName: 'SparkHub Weekly',
                title,
                body,
            })),
        })

        console.log(`[Digest] Delivered to ${users.length} inboxes.`)

        // Log to WeeklyUpdate for admin records
        try {
            await prisma.weeklyUpdate.create({
                data: {
                    title,
                    summary: `Sent to ${users.length} users via in-app inbox.`,
                    body,
                    status: 'PUBLISHED',
                    publishedAt: new Date(),
                    attachmentsJson: '[]',
                },
            })
        } catch (logErr) {
            console.warn('[Digest] Failed to log to WeeklyUpdate:', logErr?.message)
        }

        return { ok: true, sent: users.length }
    } catch (err) {
        console.error('[Digest] Error:', err)
        return { ok: false, error: err.message }
    }
}

// Run directly
if (require.main === module) {
    sendWeeklyDigests()
        .then((r) => { console.log('[Digest] Done:', r); process.exit(r.ok ? 0 : 1) })
        .catch((err) => { console.error('[Digest] Fatal:', err); process.exit(1) })
}

module.exports = { sendWeeklyDigests, getWeeklyStats }
