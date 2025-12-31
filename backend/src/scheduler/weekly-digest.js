/**
 * Weekly Digest Email Scheduler
 *
 * This script generates and sends weekly digest emails to users who have opted in.
 * Run this via cron job: 0 9 * * 1 (every Monday at 9 AM)
 *
 * Usage:
 *   node src/scheduler/weekly-digest.js
 *   NODE_ENV=production node src/scheduler/weekly-digest.js
 */

const path = require('path')
const dotenv = require('dotenv')

// Load environment variables
const backendEnvPath = path.resolve(__dirname, '..', '..', '.env')
dotenv.config({ path: backendEnvPath })
const repoEnvPath = path.resolve(__dirname, '..', '..', '..', '.env')
dotenv.config({ path: repoEnvPath, override: false })

const { prisma } = require('../prisma')
const { sendWeeklyUpdateEmail, resolveFrontendUrl } = require('../utils/email')

const BRAND = {
    primary: '#4F46E5',
    primaryDark: '#4338CA',
    background: '#f6f8fb',
    border: '#e2e8f0',
    text: '#0f172a',
    muted: '#475569'
}

async function getWeeklyStats() {
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    const [
        newCourses,
        upcomingEvents,
        newJobs,
        newResources,
        totalUsers,
        totalEnrollments,
    ] = await Promise.all([
        prisma.course.findMany({
            where: {
                isPublished: true,
                createdAt: { gte: oneWeekAgo }
            },
            select: { id: true, title: true, summary: true },
            take: 5
        }),
        prisma.event.findMany({
            where: {
                startsAt: { gte: new Date() }
            },
            select: { id: true, title: true, location: true, startsAt: true },
            orderBy: { startsAt: 'asc' },
            take: 5
        }),
        prisma.jobPosting.findMany({
            where: {
                createdAt: { gte: oneWeekAgo }
            },
            select: { id: true, title: true, description: true },
            take: 5
        }),
        prisma.resource.findMany({
            where: {
                createdAt: { gte: oneWeekAgo }
            },
            select: { id: true, title: true, kind: true },
            take: 5
        }),
        prisma.user.count(),
        prisma.enrollment.count({
            where: { createdAt: { gte: oneWeekAgo } }
        }),
    ])

    return {
        newCourses,
        upcomingEvents,
        newJobs,
        newResources,
        totalUsers,
        totalEnrollments,
        weekStart: oneWeekAgo,
    }
}

function formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    })
}

function generateDigestHtml(stats, recipientName) {
    const greeting = recipientName ? `Hi ${recipientName},` : 'Hi there,'
    const frontendUrl = resolveFrontendUrl('')

    const coursesList = stats.newCourses.length > 0
        ? stats.newCourses.map(c => `<li><a href="${frontendUrl}/courses/${c.id}" style="color:${BRAND.primary};text-decoration:none;font-weight:600;">${c.title}</a><br/><span style="color:${BRAND.muted};font-size:13px;">${c.summary?.slice(0, 100) || 'New course available'}...</span></li>`).join('')
        : '<li style="color:#64748b;">No new courses this week</li>'

    const eventsList = stats.upcomingEvents.length > 0
        ? stats.upcomingEvents.map(e => `<li><a href="${frontendUrl}/events" style="color:${BRAND.primary};text-decoration:none;font-weight:600;">${e.title}</a><br/><span style="color:${BRAND.muted};font-size:13px;">${formatDate(e.startsAt)} · ${e.location}</span></li>`).join('')
        : '<li style="color:#64748b;">No upcoming events</li>'

    const jobsList = stats.newJobs.length > 0
        ? stats.newJobs.map(j => `<li><a href="${frontendUrl}/opportunities/${j.id}" style="color:${BRAND.primary};text-decoration:none;font-weight:600;">${j.title}</a><br/><span style="color:${BRAND.muted};font-size:13px;">${j.description?.slice(0, 80) || 'New opportunity'}...</span></li>`).join('')
        : '<li style="color:#64748b;">No new opportunities this week</li>'

    const resourcesList = stats.newResources.length > 0
        ? stats.newResources.map(r => `<li><span style="font-weight:600;">${r.title}</span> <span style="background:#e2e8f0;padding:2px 8px;border-radius:12px;font-size:11px;">${r.kind}</span></li>`).join('')
        : '<li style="color:#64748b;">No new resources this week</li>'

    const summaryHighlights = []
    if (stats.newCourses.length > 0) summaryHighlights.push(`${stats.newCourses.length} new course${stats.newCourses.length > 1 ? 's' : ''}`)
    if (stats.upcomingEvents.length > 0) summaryHighlights.push(`${stats.upcomingEvents.length} upcoming event${stats.upcomingEvents.length > 1 ? 's' : ''}`)
    if (stats.newJobs.length > 0) summaryHighlights.push(`${stats.newJobs.length} new opportunit${stats.newJobs.length > 1 ? 'ies' : 'y'}`)
    if (stats.totalEnrollments > 0) summaryHighlights.push(`${stats.totalEnrollments} new enrollment${stats.totalEnrollments > 1 ? 's' : ''}`)

    const summaryText = summaryHighlights.length > 0
        ? `This week: ${summaryHighlights.join(', ')}.`
        : 'Explore what\'s happening on SparkHub this week.'

    const body = `
        <p>${greeting}</p>
        <p style="margin:0 0 16px;">${summaryText}</p>

        <div style="margin:20px 0;padding:16px;background:linear-gradient(135deg,#f0fdf4 0%,#ecfeff 100%);border-radius:16px;border:1px solid #d1fae5;">
            <p style="margin:0 0 4px;font-size:12px;color:#059669;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Quick Stats</p>
            <p style="margin:0;font-size:14px;color:#0f172a;">
                <strong>${stats.totalUsers}</strong> community members ·
                <strong>${stats.totalEnrollments}</strong> enrollments this week
            </p>
        </div>

        <h2 style="margin:24px 0 12px;font-size:16px;color:${BRAND.text};">New Courses</h2>
        <ul style="margin:0;padding-left:20px;line-height:1.8;">${coursesList}</ul>

        <h2 style="margin:24px 0 12px;font-size:16px;color:${BRAND.text};">Upcoming Events</h2>
        <ul style="margin:0;padding-left:20px;line-height:1.8;">${eventsList}</ul>

        <h2 style="margin:24px 0 12px;font-size:16px;color:${BRAND.text};">New Opportunities</h2>
        <ul style="margin:0;padding-left:20px;line-height:1.8;">${jobsList}</ul>

        <h2 style="margin:24px 0 12px;font-size:16px;color:${BRAND.text};">Fresh Resources</h2>
        <ul style="margin:0;padding-left:20px;line-height:1.8;">${resourcesList}</ul>

        <div style="margin:28px 0 0;text-align:center;">
            <a href="${frontendUrl}/dashboard" style="display:inline-block;background:${BRAND.primary};color:#fff;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:600;">
                Explore Your Dashboard
            </a>
        </div>
    `

    const text = `${greeting}

${summaryText}

Quick Stats: ${stats.totalUsers} community members · ${stats.totalEnrollments} enrollments this week

New Courses:
${stats.newCourses.map(c => `- ${c.title}`).join('\n') || '- No new courses this week'}

Upcoming Events:
${stats.upcomingEvents.map(e => `- ${e.title} (${formatDate(e.startsAt)} · ${e.location})`).join('\n') || '- No upcoming events'}

New Opportunities:
${stats.newJobs.map(j => `- ${j.title}`).join('\n') || '- No new opportunities this week'}

Fresh Resources:
${stats.newResources.map(r => `- ${r.title} (${r.kind})`).join('\n') || '- No new resources this week'}

Visit your dashboard: ${frontendUrl}/dashboard
`

    return { body, text, summary: summaryText }
}

async function getEligibleRecipients() {
    // Get users who have opted in to weekly updates
    const users = await prisma.user.findMany({
        where: {
            emailVerified: true,
            OR: [
                { emailPreference: { weeklyUpdates: true } },
                { emailPreference: null } // Default to opted-in if no preference set
            ]
        },
        select: { id: true, email: true, name: true }
    })

    // Get newsletter subscribers
    const subscribers = await prisma.newsletterSubscriber.findMany({
        where: { active: true },
        select: { email: true, name: true }
    })

    // Deduplicate by email
    const deduped = new Map()
    for (const user of users) {
        if (user?.email) {
            deduped.set(user.email.toLowerCase(), { ...user })
        }
    }
    for (const sub of subscribers) {
        if (sub?.email && !deduped.has(sub.email.toLowerCase())) {
            deduped.set(sub.email.toLowerCase(), { email: sub.email, name: sub.name || null })
        }
    }

    return Array.from(deduped.values())
}

async function sendWeeklyDigests() {
    console.log('Starting weekly digest generation...')
    console.log('Timestamp:', new Date().toISOString())

    try {
        // Get weekly stats
        const stats = await getWeeklyStats()
        console.log(`Stats collected: ${stats.newCourses.length} courses, ${stats.upcomingEvents.length} events, ${stats.newJobs.length} jobs, ${stats.newResources.length} resources`)

        // Get recipients
        const recipients = await getEligibleRecipients()
        console.log(`Found ${recipients.length} eligible recipients`)

        if (recipients.length === 0) {
            console.log('No recipients to send to. Exiting.')
            return { ok: true, sent: 0, message: 'No eligible recipients' }
        }

        // Generate digest content
        const { body, text, summary } = generateDigestHtml(stats)

        // Create the update object for the email sender
        const weeklyUpdate = {
            id: `auto-digest-${Date.now()}`,
            title: 'Your Weekly SparkHub Digest',
            summary,
            body,
            attachments: []
        }

        // Send emails
        const result = await sendWeeklyUpdateEmail(weeklyUpdate, recipients)

        console.log(`Digest sending complete: ${result.sent || 0} sent, ${result.failed?.length || 0} failed`)

        if (result.failed?.length > 0) {
            console.log('Failed deliveries:')
            result.failed.slice(0, 10).forEach(f => {
                console.log(`  - ${f.email}: ${f.error}`)
            })
            if (result.failed.length > 10) {
                console.log(`  ... and ${result.failed.length - 10} more`)
            }
        }

        // Log the digest to the database for tracking
        try {
            await prisma.weeklyUpdate.create({
                data: {
                    title: weeklyUpdate.title,
                    summary: weeklyUpdate.summary,
                    body: weeklyUpdate.body,
                    status: 'PUBLISHED',
                    publishedAt: new Date(),
                    attachmentsJson: '[]'
                }
            })
            console.log('Digest logged to database')
        } catch (logErr) {
            console.warn('Failed to log digest to database:', logErr.message)
        }

        return {
            ok: result.ok,
            sent: result.sent || 0,
            failed: result.failed?.length || 0,
            totalRecipients: recipients.length
        }
    } catch (err) {
        console.error('Error generating/sending weekly digest:', err)
        return { ok: false, error: err.message }
    }
}

// Run if executed directly
if (require.main === module) {
    sendWeeklyDigests()
        .then((result) => {
            console.log('Weekly digest job completed:', result)
            process.exit(result.ok ? 0 : 1)
        })
        .catch((err) => {
            console.error('Weekly digest job failed:', err)
            process.exit(1)
        })
}

module.exports = { sendWeeklyDigests, getWeeklyStats }
