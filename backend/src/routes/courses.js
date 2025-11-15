const express = require('express')
const router = express.Router()
const { prisma } = require('../prisma')
const { requireAuth, requireRole, maybeAuth } = require('../middleware/auth')

const COURSE_MANAGER_ROLES = ['CREATOR', 'ADMIN', 'TUTOR']
const MATERIAL_VISIBILITY = new Set(['PUBLIC', 'ENROLLED', 'STAFF'])
const ENROLLMENT_STATUSES = new Set(['PENDING', 'APPROVED', 'REJECTED'])
const MAX_TAGS = 8
const MESSAGE_KINDS = new Set(['CHANNEL', 'CHAT'])
const CHANNEL_VISIBILITY = new Set(['ENROLLED', 'STAFF'])
const MAX_MESSAGE_ATTACHMENTS = 4
const BAD_WORDS = ['shit', 'fuck', 'bitch', 'damn', 'crap', 'hell']
const DEFAULT_FORM_QUESTIONS = [
    {
        id: 'intent',
        label: 'Why do you want to join this course?',
        placeholder: 'Tell us what you hope to accomplish.',
        type: 'LONG',
    },
    {
        id: 'experience',
        label: 'What experience do you already have?',
        placeholder: 'Share clubs, certifications, or independent work.',
        type: 'LONG',
    },
    {
        id: 'availability',
        label: 'When are you available?',
        placeholder: 'List preferred meeting days/times.',
        type: 'SHORT',
    },
]

function generateJoinCode() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    return Array.from({ length: 6 })
        .map(() => alphabet[Math.floor(Math.random() * alphabet.length)])
        .join('')
}

function safeJsonParse(payload, fallback) {
    try {
        return JSON.parse(payload || '')
    } catch {
        return fallback
    }
}

function normalizeQuestions(input) {
    if (!Array.isArray(input)) return []
    return input
        .map((item, index) => {
            if (!item) return null
            if (typeof item === 'string') {
                return {
                    id: `question-${index}`,
                    label: item,
                    placeholder: '',
                    type: 'LONG',
                }
            }
            if (typeof item.label !== 'string' || !item.label.trim()) return null
            const id = typeof item.id === 'string' && item.id.trim().length > 2 ? item.id.trim() : `question-${index}`
            const type = typeof item.type === 'string' ? item.type.toUpperCase() : 'LONG'
            return {
                id,
                label: item.label.trim(),
                placeholder: typeof item.placeholder === 'string' ? item.placeholder : '',
                type,
            }
        })
        .filter(Boolean)
}

function normalizeAnswers(rawAnswers, questions) {
    const answers = {}
    const allowedKeys = new Set((questions || []).map((q) => q.id))
    if (rawAnswers && typeof rawAnswers === 'object') {
        for (const [key, value] of Object.entries(rawAnswers)) {
            if (allowedKeys.size && !allowedKeys.has(key)) continue
            const str = typeof value === 'string' ? value.trim() : String(value ?? '')
            if (str) answers[key] = str
        }
    }
    return answers
}

function normalizeStringList(input) {
    if (Array.isArray(input)) {
        return input
            .map((item) => (typeof item === 'string' ? item : String(item ?? '')))
            .map((item) => item.trim())
            .filter(Boolean)
    }
    if (typeof input === 'string') {
        return input
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean)
    }
    return []
}

function slugifyTag(value) {
    return String(value || '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40)
}

function normalizeTagsInput(input) {
    let values
    if (Array.isArray(input)) {
        values = input.map((item) => {
            if (typeof item === 'string') return item
            if (item && typeof item.label === 'string') return item.label
            return String(item ?? '')
        })
    } else {
        values = normalizeStringList(input)
    }
    const map = new Map()
    values.forEach((label) => {
        if (!label) return
        const slug = slugifyTag(label) || `tag-${map.size + 1}`
        if (map.has(slug)) return
        map.set(slug, { label, slug })
    })
    return Array.from(map.values()).slice(0, MAX_TAGS)
}

function parseCourseTags(raw) {
    const parsed = safeJsonParse(raw, [])
    if (!Array.isArray(parsed)) return []
    return parsed
        .map((tag) => {
            if (!tag) return null
            if (typeof tag === 'string') {
                const label = tag.trim()
                if (!label) return null
                return { label, slug: slugifyTag(label) || label.toLowerCase() }
            }
            const label = typeof tag.label === 'string' ? tag.label : ''
            if (!label) return null
            const slug = typeof tag.slug === 'string' && tag.slug.trim() ? tag.slug.trim() : slugifyTag(label)
            return { label, slug: slug || label.toLowerCase() }
        })
        .filter(Boolean)
}

function serializeTags(tags) {
    const normalized = normalizeTagsInput(tags)
    return JSON.stringify(normalized)
}

const EXTENSION_MIME = {
    pdf: 'application/pdf',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    pps: 'application/vnd.ms-powerpoint',
    ppsx: 'application/vnd.openxmlformats-officedocument.presentationml.slideshow',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}

function guessContentType(url, fallback) {
    if (fallback && typeof fallback === 'string' && fallback.includes('/')) return fallback
    const safeUrl = String(url || '').split('?')[0]
    const ext = safeUrl.includes('.') ? safeUrl.split('.').pop().toLowerCase() : ''
    if (ext && EXTENSION_MIME[ext]) return EXTENSION_MIME[ext]
    return fallback || null
}

function parseJsonArray(raw, fallback = []) {
    try {
        const parsed = JSON.parse(raw || '[]')
        return Array.isArray(parsed) ? parsed : fallback
    } catch {
        return fallback
    }
}

function cleanProfanity(input = '') {
    if (!input) return ''
    let output = String(input)
    BAD_WORDS.forEach((word) => {
        const pattern = new RegExp(`\\b${word}\\b`, 'gi')
        output = output.replace(pattern, '*'.repeat(word.length))
    })
    return output.trim()
}

function parseAttachmentsJson(raw) {
    const list = parseJsonArray(raw, [])
    if (!Array.isArray(list)) return []
    return list
        .map((item) => {
            if (!item) return null
            if (typeof item === 'string') {
                const trimmed = item.trim()
                return trimmed ? { url: trimmed, name: null, type: null } : null
            }
            if (typeof item.url !== 'string' || !item.url.trim()) return null
            return {
                url: item.url.trim(),
                name: typeof item.name === 'string' ? item.name : null,
                type: typeof item.type === 'string' ? item.type : null,
            }
        })
        .filter(Boolean)
}

function normalizeAttachmentsInput(raw) {
    if (!raw) return []
    const items = Array.isArray(raw) ? raw : [raw]
    const normalized = []
    for (const item of items) {
        if (typeof item === 'string') {
            const trimmed = item.trim()
            if (trimmed) normalized.push({ url: trimmed, name: null, type: null })
            continue
        }
        if (item && typeof item.url === 'string') {
            const url = item.url.trim()
            if (!url) continue
            normalized.push({
                url,
                name: typeof item.name === 'string' ? item.name : null,
                type: typeof item.type === 'string' ? item.type : null,
            })
        }
        if (normalized.length >= MAX_MESSAGE_ATTACHMENTS) break
    }
    return normalized.slice(0, MAX_MESSAGE_ATTACHMENTS)
}

function formatMessage(row) {
    if (!row) return null
    return {
        id: row.id,
        content: row.content,
        createdAt: row.createdAt,
        kind: row.kind,
        visibility: row.visibility,
        attachments: parseAttachmentsJson(row.attachmentsJson),
        author: row.fromUser
            ? {
                  id: row.fromUser.id,
                  name: row.fromUser.name,
                  avatarUrl: row.fromUser.avatarUrl,
                  role: row.fromUser.role,
              }
            : null,
    }
}

function icsEscape(value = '') {
    return String(value || '')
        .replace(/\\/g, '\\\\')
        .replace(/,/g, '\\,')
        .replace(/;/g, '\\;')
        .replace(/\r?\n/g, '\\n')
}

function formatICSDate(input) {
    const date = input instanceof Date ? input : new Date(input)
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

function mapMeetingLink(link) {
    return {
        id: link.id,
        title: link.title,
        url: link.url,
        note: link.note || null,
        createdAt: link.createdAt,
    }
}

function normalizeMeetingUrl(value) {
    if (typeof value !== 'string') return ''
    const trimmed = value.trim()
    if (!trimmed) return ''
    if (/^https?:\/\//i.test(trimmed)) return trimmed
    return `https://${trimmed}`
}

function buildCourseCalendarICS(course) {
    const nowStamp = formatICSDate(new Date())
    const events = (course.sessions || [])
        .map((session) => {
            const start = formatICSDate(session.startsAt)
            if (!start) return null
            const end = formatICSDate(session.endsAt || new Date(new Date(session.startsAt).getTime() + 60 * 60 * 1000))
            const summary = icsEscape(`${course.title} · ${session.mode || 'Session'}`)
            const description = icsEscape(session.note || course.summary || 'SparkHub course session')
            const location = icsEscape(session.location || session.mode || 'Virtual')
            return [
                'BEGIN:VEVENT',
                `UID:${session.id}@sparkhub`,
                nowStamp ? `DTSTAMP:${nowStamp}` : null,
                `DTSTART:${start}`,
                end ? `DTEND:${end}` : null,
                `SUMMARY:${summary}`,
                `DESCRIPTION:${description}`,
                `LOCATION:${location}`,
                'END:VEVENT',
            ]
                .filter(Boolean)
                .join('\r\n')
        })
        .filter(Boolean)
    if (!events.length) return null
    const title = icsEscape(course.title || 'SparkHub Course')
    return [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//SparkHub//LMS//EN',
        `X-WR-CALNAME:${title} schedule`,
        ...events,
        'END:VCALENDAR',
        '',
    ].join('\r\n')
}

function formatEnrollment(row) {
    return {
        id: row.id,
        status: row.status,
        joinedViaCode: row.joinedViaCode,
        createdAt: row.createdAt,
        adminNote: row.adminNote || null,
        formAnswers: safeJsonParse(row.formAnswersJson, {}),
        user: row.user
            ? {
                  id: row.user.id,
                  name: row.user.name,
                  email: row.user.email,
                  role: row.user.role,
                  avatarUrl: row.user.avatarUrl,
              }
            : null,
    }
}

function isApprovedEnrollment(enrollment) {
    return Boolean(enrollment && enrollment.status === 'APPROVED')
}

function canManageCourse(course, user) {
    if (!course || !user) return false
    if (user.role === 'ADMIN') return true
    if (COURSE_MANAGER_ROLES.includes(user.role) && course.creatorId === user.id) return true
    return false
}

async function buildCoursePayload(courseId, viewer) {
    const course = await prisma.course.findUnique({
        where: { id: courseId },
        include: {
            lessons: { orderBy: { order: 'asc' } },
            sessions: { orderBy: { startsAt: 'asc' } },
            materials: {
                orderBy: { createdAt: 'asc' },
                include: { uploader: { select: { id: true, name: true, avatarUrl: true } } },
            },
            meetingLinks: { orderBy: { createdAt: 'desc' } },
            creator: { select: { id: true, name: true } },
        },
    })
    if (!course) return null
    const enrollQuestions = safeJsonParse(course.enrollQuestionsJson, DEFAULT_FORM_QUESTIONS)
    let enrollment = null
    if (viewer) {
        enrollment = await prisma.enrollment.findUnique({
            where: { userId_courseId: { userId: viewer.id, courseId } },
        })
    }
    const canManage = canManageCourse(course, viewer)
    const enrollmentApproved = isApprovedEnrollment(enrollment)
    const now = Date.now()
    const viewerPastDue = []
    const managerPastDue = []

    const assignmentInclude = canManage
        ? {
              submissions: {
                  include: { student: { select: { id: true, name: true, avatarUrl: true, email: true } } },
                  orderBy: { createdAt: 'desc' },
              },
          }
        : viewer && viewer.role === 'STUDENT'
        ? { submissions: { where: { studentId: viewer.id } } }
        : undefined

    const assignmentsRaw = await prisma.courseAssignment.findMany({
        where: { courseId },
        orderBy: [{ dueAt: 'asc' }, { createdAt: 'asc' }],
        include: assignmentInclude,
    })

    const lessons = course.lessons.map((lesson) => {
        const deckUrl = lesson.contentUrl || lesson.attachmentUrl || null
        const deckType = guessContentType(deckUrl, lesson.contentType)
        return {
            id: lesson.id,
            title: lesson.title,
            type: lesson.type,
            body: lesson.body,
            videoUrl: lesson.videoUrl,
            attachmentUrl: lesson.attachmentUrl,
            contentUrl: deckUrl,
            contentType: deckType,
            order: lesson.order,
        }
    })

    const assignments = assignmentsRaw.map((assignment) => {
        const resources = parseJsonArray(assignment.resourcesJson, [])
        const attachments = parseJsonArray(assignment.attachmentsJson, [])
        const base = {
            id: assignment.id,
            title: assignment.title,
            description: assignment.description,
            dueAt: assignment.dueAt,
            resources,
            attachments,
            creatorId: assignment.creatorId,
            createdAt: assignment.createdAt,
            stats: canManage ? { submissions: assignment.submissions ? assignment.submissions.length : 0 } : undefined,
        }
        let viewerSubmissionRecord = null
        if (canManage && Array.isArray(assignment.submissions)) {
            base.submissions = assignment.submissions.map((submission) => ({
                id: submission.id,
                status: submission.status,
                grade: submission.grade,
                feedback: submission.feedback,
                attachmentUrl: submission.attachmentUrl,
                submittedAt: submission.createdAt,
                student: submission.student
                    ? {
                          id: submission.student.id,
                          name: submission.student.name,
                          email: submission.student.email,
                          avatarUrl: submission.student.avatarUrl,
                      }
                    : null,
            }))
        } else if (Array.isArray(assignment.submissions) && assignment.submissions[0]) {
            const submission = assignment.submissions[0]
            viewerSubmissionRecord = submission
            base.viewerSubmission = {
                id: submission.id,
                status: submission.status,
                grade: submission.grade,
                feedback: submission.feedback,
                attachmentUrl: submission.attachmentUrl,
                content: submission.content,
                submittedAt: submission.createdAt,
            }
        }

        const dueAtDate = assignment.dueAt ? new Date(assignment.dueAt) : null
        let dueStatus = 'OPEN'
        if (viewerSubmissionRecord && viewerSubmissionRecord.status) {
            dueStatus = viewerSubmissionRecord.status
        } else if (dueAtDate instanceof Date && !Number.isNaN(dueAtDate.getTime())) {
            if (dueAtDate.getTime() < now) {
                dueStatus = 'PAST_DUE'
                if (viewer && viewer.role === 'STUDENT' && !viewerSubmissionRecord) {
                    viewerPastDue.push({ id: assignment.id, title: assignment.title, dueAt: assignment.dueAt })
                }
                if (canManage) {
                    const outstanding = Array.isArray(assignment.submissions)
                        ? assignment.submissions.filter(
                              (submission) => submission.status !== 'GRADED' && submission.status !== 'DONE'
                          ).length
                        : null
                    managerPastDue.push({ id: assignment.id, title: assignment.title, dueAt: assignment.dueAt, outstanding })
                }
            } else if (dueAtDate.getTime() - now < 72 * 3600 * 1000) {
                dueStatus = 'DUE_SOON'
            }
        }
        base.dueStatus = dueStatus
        return base
    })

    const materials = course.materials.map((material) => {
        const visible =
            material.visibleTo === 'PUBLIC' ||
            canManage ||
            (material.visibleTo === 'ENROLLED' && enrollmentApproved)
        return {
            id: material.id,
            title: material.title,
            description: material.description,
            coverUrl: material.coverUrl,
            visibility: material.visibleTo,
            createdAt: material.createdAt,
            uploader: material.uploader
                ? { id: material.uploader.id, name: material.uploader.name, avatarUrl: material.uploader.avatarUrl }
                : null,
            attachmentUrl: visible ? material.attachmentUrl : null,
            contentUrl: visible ? material.contentUrl : null,
            contentType: visible ? material.contentType : null,
            inlineViewer: material.inlineViewer,
            locked: !visible,
        }
    })

    const tags = parseCourseTags(course.tagsJson)
    const meetingLinks = (course.meetingLinks || []).map(mapMeetingLink)

    let enrollmentRoster
    if (canManage) {
        const rows = await prisma.enrollment.findMany({
            where: { courseId },
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { id: true, name: true, email: true, role: true, avatarUrl: true } } },
        })
        enrollmentRoster = rows.map(formatEnrollment)
    }

    const assignmentSummary = {
        pastDueViewer: viewerPastDue,
        pastDueCourse: managerPastDue,
        pastDueCount: (canManage ? managerPastDue : viewerPastDue).length,
    }

    let channelMessages = []
    let chatMessages = []
    if (canManage || enrollmentApproved) {
        const channelRows = await prisma.courseMessage.findMany({
            where: { courseId, kind: 'CHANNEL', ...(canManage ? {} : { visibility: 'ENROLLED' }) },
            include: { fromUser: { select: { id: true, name: true, avatarUrl: true, role: true } } },
            orderBy: { createdAt: 'desc' },
            take: 40,
        })
        channelMessages = channelRows.map(formatMessage).filter(Boolean)
        const chatRows = await prisma.courseMessage.findMany({
            where: { courseId, kind: 'CHAT', ...(canManage ? {} : { visibility: 'ENROLLED' }) },
            include: { fromUser: { select: { id: true, name: true, avatarUrl: true, role: true } } },
            orderBy: { createdAt: 'desc' },
            take: 80,
        })
        chatMessages = chatRows.map(formatMessage).filter(Boolean).reverse()
    }

    return {
        ok: true,
        course: {
            id: course.id,
            title: course.title,
            summary: course.summary,
            coverUrl: course.coverUrl,
            isPublished: course.isPublished,
            creatorId: course.creatorId,
            creatorName: course.creator?.name || null,
            lessons,
            sessions: course.sessions,
            materials,
            assignments,
            enrollQuestions,
            joinCode: canManage ? course.joinCode : undefined,
            calendarDownloadUrl: canManage || enrollmentApproved ? `/courses/${course.id}/calendar.ics` : null,
            tags,
            meetingLinks,
            assignmentSummary,
            channelMessages,
            chatMessages,
        },
        viewer: {
            canManage,
            isEnrolled: enrollmentApproved,
            enrollmentStatus: enrollment?.status || null,
            formAnswers: enrollment ? safeJsonParse(enrollment.formAnswersJson, {}) : null,
            calendarUnlocked: Boolean(canManage || enrollmentApproved),
        },
        enrollments: enrollmentRoster,
    }
}

async function ensureCourseForManager(courseId, user) {
    const course = await prisma.course.findUnique({ where: { id: courseId } })
    if (!course) return { error: { status: 404, msg: '课程不存在' } }
    if (!canManageCourse(course, user)) {
        return { error: { status: 403, msg: '无权限' } }
    }
    return { course }
}

async function ensureCourseAccess(courseId, user) {
    const course = await prisma.course.findUnique({ where: { id: courseId } })
    if (!course) return { error: { status: 404, msg: '课程不存在' } }
    let enrollment = null
    if (user) {
        enrollment = await prisma.enrollment.findUnique({
            where: { userId_courseId: { userId: user.id, courseId } },
            include: { user: true },
        })
    }
    const canManage = canManageCourse(course, user)
    const enrollmentApproved = isApprovedEnrollment(enrollment)
    return { course, enrollment, canManage, enrollmentApproved }
}

async function handleMessageList(req, res, forcedKind) {
    const { course, canManage, enrollmentApproved, error } = await ensureCourseAccess(req.params.id, req.user)
    if (error) return res.status(error.status).json({ ok: false, msg: error.msg })
    const rawKind = forcedKind || (typeof req.query.kind === 'string' ? req.query.kind.toUpperCase() : 'CHANNEL')
    const kind = MESSAGE_KINDS.has(rawKind) ? rawKind : 'CHANNEL'
    if (!canManage && !enrollmentApproved) {
        return res.status(403).json({ ok: false, msg: '请先报名课程' })
    }
    if (kind === 'CHAT' && !canManage && !enrollmentApproved) {
        return res.status(403).json({ ok: false, msg: '请先报名课程' })
    }
    const where = { courseId: course.id, kind }
    if (!canManage) where.visibility = 'ENROLLED'
    const isChat = kind === 'CHAT'
    const rows = await prisma.courseMessage.findMany({
        where,
        include: { fromUser: { select: { id: true, name: true, avatarUrl: true, role: true } } },
        orderBy: { createdAt: isChat ? 'asc' : 'desc' },
        take: isChat ? 100 : 60,
    })
    res.json({ ok: true, list: rows.map(formatMessage).filter(Boolean) })
}

async function handleMessageCreate(req, res, forcedKind) {
    const { course, canManage, enrollmentApproved, error } = await ensureCourseAccess(req.params.id, req.user)
    if (error) return res.status(error.status).json({ ok: false, msg: error.msg })
    if (!canManage && !enrollmentApproved) {
        return res.status(403).json({ ok: false, msg: '请先报名课程' })
    }
    const rawKind = forcedKind || (typeof req.body.kind === 'string' ? req.body.kind.toUpperCase() : 'CHANNEL')
    if (!MESSAGE_KINDS.has(rawKind)) {
        return res.status(400).json({ ok: false, msg: '无效的留言类型' })
    }
    if (rawKind === 'CHAT' && !canManage && !enrollmentApproved) {
        return res.status(403).json({ ok: false, msg: '请先报名课程' })
    }
    const attachments = normalizeAttachmentsInput(req.body.attachments || req.body.attachmentUrls)
    const content = cleanProfanity(typeof req.body.content === 'string' ? req.body.content : String(req.body.content || ''))
    if (!content && attachments.length === 0) {
        return res.status(400).json({ ok: false, msg: '请填写留言内容' })
    }
    let visibility = 'ENROLLED'
    if (rawKind === 'CHANNEL') {
        const input = typeof req.body.visibility === 'string' ? req.body.visibility.toUpperCase() : 'ENROLLED'
        if (CHANNEL_VISIBILITY.has(input)) visibility = input
    }
    if (visibility === 'STAFF' && !canManage) visibility = 'ENROLLED'
    const message = await prisma.courseMessage.create({
        data: {
            courseId: course.id,
            fromUserId: req.user.id,
            content,
            kind: rawKind,
            attachmentsJson: JSON.stringify(attachments),
            visibility: rawKind === 'CHAT' ? 'ENROLLED' : visibility,
        },
        include: { fromUser: { select: { id: true, name: true, avatarUrl: true, role: true } } },
    })
    res.json({ ok: true, message: formatMessage(message) })
}

// 创建课程（创作者、导师、管理员）
router.post('/', requireAuth, requireRole(COURSE_MANAGER_ROLES), async (req, res) => {
    const { title, summary, coverUrl, isPublished = false, enrollQuestions, tags } = req.body
    if (!title || !summary) {
        return res.status(400).json({ ok: false, msg: 'Title and summary are required' })
    }
    const questions = normalizeQuestions(enrollQuestions)
    const tagsJson = serializeTags(tags || [])
    const course = await prisma.course.create({
        data: {
            title,
            summary,
            coverUrl,
            isPublished: Boolean(isPublished),
            creatorId: req.user.id,
            joinCode: generateJoinCode(),
            enrollQuestionsJson: JSON.stringify(questions.length ? questions : DEFAULT_FORM_QUESTIONS),
            tagsJson,
        },
    })
    res.json({ ok: true, course })
})

// 课程列表（公开）
router.get('/', async (_req, res) => {
    const list = await prisma.course.findMany({
        where: { isPublished: true },
        orderBy: { createdAt: 'desc' },
        include: { sessions: { orderBy: { startsAt: 'asc' }, take: 2 } },
    })
    res.json({
        ok: true,
        list: list.map((course) => ({
            id: course.id,
            title: course.title,
            summary: course.summary,
            coverUrl: course.coverUrl,
            isPublished: course.isPublished,
            upcomingSessions: course.sessions,
            tags: parseCourseTags(course.tagsJson),
        })),
    })
})

// 我的课程（创作者/导师/管理员）
router.get('/mine', requireAuth, requireRole(COURSE_MANAGER_ROLES), async (req, res) => {
    const list = await prisma.course.findMany({
        where: { creatorId: req.user.id },
        orderBy: { createdAt: 'desc' },
    })
    res.json({
        ok: true,
        list: list.map((course) => ({
            ...course,
            tags: parseCourseTags(course.tagsJson),
        })),
    })
})

// 我的选课列表
router.get('/enrollments/mine', requireAuth, async (req, res) => {
    const rows = await prisma.enrollment.findMany({
        where: { userId: req.user.id },
        include: { course: true },
        orderBy: { createdAt: 'desc' },
    })
    res.json({
        ok: true,
        list: rows.map((row) => ({
            id: row.id,
            courseId: row.courseId,
            status: row.status,
            createdAt: row.createdAt,
            course: row.course
                ? {
                      id: row.course.id,
                      title: row.course.title,
                      summary: row.course.summary,
                      coverUrl: row.course.coverUrl,
                  }
                : null,
            formAnswers: safeJsonParse(row.formAnswersJson, {}),
        })),
    })
})

router.get('/tags', async (_req, res) => {
    const rows = await prisma.course.findMany({
        where: { isPublished: true },
        select: { tagsJson: true },
    })
    const tagMap = new Map()
    rows.forEach((row) => {
        parseCourseTags(row.tagsJson).forEach((tag) => {
            const existing = tagMap.get(tag.slug) || { ...tag, count: 0 }
            existing.count += 1
            tagMap.set(tag.slug, existing)
        })
    })
    const tags = Array.from(tagMap.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 24)
    res.json({ ok: true, tags })
})

// 通过课程代码报名
router.post('/join-code', requireAuth, async (req, res) => {
    if (req.user.role !== 'STUDENT') {
        return res.status(403).json({ ok: false, msg: 'Only students can enroll with a code' })
    }
    const rawCode = typeof req.body.code === 'string' ? req.body.code.trim().toUpperCase() : ''
    if (!rawCode) return res.status(400).json({ ok: false, msg: 'Course code required' })
    const course = await prisma.course.findFirst({ where: { joinCode: rawCode } })
    if (!course || !course.isPublished) {
        return res.status(404).json({ ok: false, msg: '未找到对应课程' })
    }
    const questions = safeJsonParse(course.enrollQuestionsJson, DEFAULT_FORM_QUESTIONS)
    const answers = normalizeAnswers(req.body.answers, questions)
    if (!Object.keys(answers).length) {
        answers.intent = 'Joined via code'
    }
    const existing = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId: req.user.id, courseId: course.id } },
    })
    const payloadData = {
        formAnswersJson: JSON.stringify(answers),
        joinedViaCode: true,
        status: 'APPROVED',
    }
    let enrollment
    if (existing) {
        enrollment = await prisma.enrollment.update({ where: { id: existing.id }, data: payloadData })
    } else {
        enrollment = await prisma.enrollment.create({
            data: {
                userId: req.user.id,
                courseId: course.id,
                ...payloadData,
            },
        })
    }
    const payload = await buildCoursePayload(course.id, req.user)
    res.json({ ok: true, enrollment, ...payload })
})

router.get('/:id/calendar.ics', maybeAuth, async (req, res) => {
    if (!req.user) return res.status(401).json({ ok: false, msg: '请先登录' })
    const course = await prisma.course.findUnique({
        where: { id: req.params.id },
        include: { sessions: { orderBy: { startsAt: 'asc' } } },
    })
    if (!course || !course.isPublished) return res.status(404).json({ ok: false, msg: '课程不存在' })
    const enrollment = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId: req.user.id, courseId: course.id } },
    })
    if (!canManageCourse(course, req.user) && !isApprovedEnrollment(enrollment)) {
        return res.status(403).json({ ok: false, msg: '请先报名课程' })
    }
    const ics = buildCourseCalendarICS(course)
    if (!ics) return res.status(404).json({ ok: false, msg: '暂无课程日程' })
    const filename = `${(course.title || 'sparkhub-course').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'sparkhub-course'}-schedule.ics`
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.send(ics)
})

// 课程详情（可选鉴权）
router.get('/:id', maybeAuth, async (req, res) => {
    const payload = await buildCoursePayload(req.params.id, req.user)
    if (!payload) return res.status(404).json({ ok: false, msg: '课程不存在' })
    res.json(payload)
})

// 更新课程
router.patch('/:id', requireAuth, requireRole(COURSE_MANAGER_ROLES), async (req, res) => {
    const { course, error } = await ensureCourseForManager(req.params.id, req.user)
    if (error) return res.status(error.status).json({ ok: false, msg: error.msg })
    const data = { ...req.body }
    if (req.body.enrollQuestions) {
        const normalized = normalizeQuestions(req.body.enrollQuestions)
        data.enrollQuestionsJson = JSON.stringify(normalized.length ? normalized : DEFAULT_FORM_QUESTIONS)
        delete data.enrollQuestions
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'tags')) {
        data.tagsJson = serializeTags(req.body.tags || [])
        delete data.tags
    }
    if (req.body.regenerateJoinCode) {
        data.joinCode = generateJoinCode()
        delete data.regenerateJoinCode
    }
    const updated = await prisma.course.update({ where: { id: course.id }, data })
    res.json({ ok: true, course: updated })
})

// 删除课程
router.delete('/:id', requireAuth, requireRole(COURSE_MANAGER_ROLES), async (req, res) => {
    const { course, error } = await ensureCourseForManager(req.params.id, req.user)
    if (error) return res.status(error.status).json({ ok: false, msg: error.msg })
    await prisma.courseMaterial.deleteMany({ where: { courseId: course.id } })
    await prisma.courseSession.deleteMany({ where: { courseId: course.id } })
    await prisma.lesson.deleteMany({ where: { courseId: course.id } })
    await prisma.enrollment.deleteMany({ where: { courseId: course.id } })
    await prisma.course.delete({ where: { id: course.id } })
    res.json({ ok: true })
})

// 新增课程章节
router.post('/:id/lessons', requireAuth, requireRole(COURSE_MANAGER_ROLES), async (req, res) => {
    const { course, error } = await ensureCourseForManager(req.params.id, req.user)
    if (error) return res.status(error.status).json({ ok: false, msg: error.msg })
    const { title, type = 'TEXT', videoUrl, body, order = 1, attachmentUrl, contentUrl, contentType } = req.body
    if (!title) return res.status(400).json({ ok: false, msg: '需要章节标题' })
    const lesson = await prisma.lesson.create({
        data: {
            courseId: course.id,
            title,
            type,
            videoUrl,
            body,
            order,
            attachmentUrl,
            contentUrl,
            contentType,
        },
    })
    res.json({ ok: true, lesson })
})

// 课程排期
router.post('/:id/sessions', requireAuth, requireRole(COURSE_MANAGER_ROLES), async (req, res) => {
    const { course, error } = await ensureCourseForManager(req.params.id, req.user)
    if (error) return res.status(error.status).json({ ok: false, msg: error.msg })
    const { startsAt, endsAt, location, mode, note } = req.body
    if (!startsAt) return res.status(400).json({ ok: false, msg: '需要开始时间' })
    const session = await prisma.courseSession.create({
        data: {
            courseId: course.id,
            startsAt: new Date(startsAt),
            endsAt: endsAt ? new Date(endsAt) : null,
            location,
            mode,
            note,
        },
    })
    res.json({ ok: true, session })
})

router.delete('/:id/sessions/:sessionId', requireAuth, requireRole(COURSE_MANAGER_ROLES), async (req, res) => {
    const { course, error } = await ensureCourseForManager(req.params.id, req.user)
    if (error) return res.status(error.status).json({ ok: false, msg: error.msg })
    const found = await prisma.courseSession.findUnique({ where: { id: req.params.sessionId } })
    if (!found || found.courseId !== course.id) {
        return res.status(404).json({ ok: false, msg: '排期不存在' })
    }
    await prisma.courseSession.delete({ where: { id: found.id } })
    res.json({ ok: true })
})

// 课程资料
router.post('/:id/materials', requireAuth, requireRole(COURSE_MANAGER_ROLES), async (req, res) => {
    const { course, error } = await ensureCourseForManager(req.params.id, req.user)
    if (error) return res.status(error.status).json({ ok: false, msg: error.msg })
    const { title, description, attachmentUrl, coverUrl, visibleTo = 'ENROLLED', contentUrl, contentType, inlineViewer } = req.body
    if (!title) return res.status(400).json({ ok: false, msg: '需要资料标题' })
    if (!MATERIAL_VISIBILITY.has(visibleTo)) {
        return res.status(400).json({ ok: false, msg: '可见范围不合法' })
    }
    const material = await prisma.courseMaterial.create({
        data: {
            courseId: course.id,
            title,
            description,
            attachmentUrl,
            coverUrl,
            visibleTo,
            contentUrl,
            contentType,
            uploaderId: req.user.id,
            inlineViewer: Boolean(inlineViewer),
        },
    })
    res.json({ ok: true, material })
})

router.delete('/:id/materials/:materialId', requireAuth, requireRole(COURSE_MANAGER_ROLES), async (req, res) => {
    const { course, error } = await ensureCourseForManager(req.params.id, req.user)
    if (error) return res.status(error.status).json({ ok: false, msg: error.msg })
    const found = await prisma.courseMaterial.findUnique({ where: { id: req.params.materialId } })
    if (!found || found.courseId !== course.id) {
        return res.status(404).json({ ok: false, msg: '资料不存在' })
    }
    await prisma.courseMaterial.delete({ where: { id: found.id } })
    res.json({ ok: true })
})

router.post('/:id/meeting-links', requireAuth, requireRole(COURSE_MANAGER_ROLES), async (req, res) => {
    const { course, error } = await ensureCourseForManager(req.params.id, req.user)
    if (error) return res.status(error.status).json({ ok: false, msg: error.msg })
    const { title, url, note } = req.body || {}
    if (!title) return res.status(400).json({ ok: false, msg: '需要会议标题' })
    const normalizedUrl = normalizeMeetingUrl(url)
    if (!normalizedUrl) return res.status(400).json({ ok: false, msg: '需要有效的会议链接' })
    const link = await prisma.courseMeetingLink.create({
        data: {
            courseId: course.id,
            title: title.trim(),
            url: normalizedUrl,
            note,
        },
    })
    const payload = await buildCoursePayload(course.id, req.user)
    res.json({ ok: true, link: mapMeetingLink(link), ...payload })
})

router.delete('/:id/meeting-links/:linkId', requireAuth, requireRole(COURSE_MANAGER_ROLES), async (req, res) => {
    const { course, error } = await ensureCourseForManager(req.params.id, req.user)
    if (error) return res.status(error.status).json({ ok: false, msg: error.msg })
    const link = await prisma.courseMeetingLink.findUnique({ where: { id: req.params.linkId } })
    if (!link || link.courseId !== course.id) {
        return res.status(404).json({ ok: false, msg: '会议链接不存在' })
    }
    await prisma.courseMeetingLink.delete({ where: { id: link.id } })
    const payload = await buildCoursePayload(course.id, req.user)
    res.json({ ok: true, ...payload })
})

router.get('/:id/materials', requireAuth, async (req, res) => {
    const payload = await buildCoursePayload(req.params.id, req.user)
    if (!payload) return res.status(404).json({ ok: false, msg: '课程不存在' })
    if (!payload.viewer.canManage && !payload.viewer.isEnrolled) {
        return res.status(403).json({ ok: false, msg: '请先报名课程' })
    }
    res.json({ ok: true, list: payload.course.materials })
})

router.post('/:id/assignments', requireAuth, requireRole(COURSE_MANAGER_ROLES), async (req, res) => {
    const { course, error } = await ensureCourseForManager(req.params.id, req.user)
    if (error) return res.status(error.status).json({ ok: false, msg: error.msg })
    const { title, description, dueAt, resources = [], attachments = [] } = req.body || {}
    if (!title || typeof title !== 'string') {
        return res.status(400).json({ ok: false, msg: '需要作业标题' })
    }
    const assignment = await prisma.courseAssignment.create({
        data: {
            courseId: course.id,
            title: title.trim(),
            description,
            dueAt: dueAt ? new Date(dueAt) : null,
            resourcesJson: JSON.stringify(normalizeStringList(resources)),
            attachmentsJson: JSON.stringify(normalizeStringList(attachments)),
            creatorId: req.user.id,
        },
    })
    const payload = await buildCoursePayload(course.id, req.user)
    res.json({ ok: true, assignment, ...payload })
})

router.patch('/:id/assignments/:assignmentId', requireAuth, requireRole(COURSE_MANAGER_ROLES), async (req, res) => {
    const { course, error } = await ensureCourseForManager(req.params.id, req.user)
    if (error) return res.status(error.status).json({ ok: false, msg: error.msg })
    const assignment = await prisma.courseAssignment.findUnique({ where: { id: req.params.assignmentId } })
    if (!assignment || assignment.courseId !== course.id) {
        return res.status(404).json({ ok: false, msg: '作业不存在' })
    }
    const data = { ...req.body }
    if (req.body.resources) {
        data.resourcesJson = JSON.stringify(normalizeStringList(req.body.resources))
        delete data.resources
    }
    if (req.body.attachments) {
        data.attachmentsJson = JSON.stringify(normalizeStringList(req.body.attachments))
        delete data.attachments
    }
    if (req.body.dueAt) {
        data.dueAt = new Date(req.body.dueAt)
    }
    const updated = await prisma.courseAssignment.update({ where: { id: assignment.id }, data })
    const payload = await buildCoursePayload(course.id, req.user)
    res.json({ ok: true, assignment: updated, ...payload })
})

router.delete('/:id/assignments/:assignmentId', requireAuth, requireRole(COURSE_MANAGER_ROLES), async (req, res) => {
    const { course, error } = await ensureCourseForManager(req.params.id, req.user)
    if (error) return res.status(error.status).json({ ok: false, msg: error.msg })
    const assignment = await prisma.courseAssignment.findUnique({ where: { id: req.params.assignmentId } })
    if (!assignment || assignment.courseId !== course.id) {
        return res.status(404).json({ ok: false, msg: '作业不存在' })
    }
    await prisma.courseAssignment.delete({ where: { id: assignment.id } })
    const payload = await buildCoursePayload(course.id, req.user)
    res.json({ ok: true, ...payload })
})

router.get('/:id/assignments/:assignmentId/submissions', requireAuth, requireRole(COURSE_MANAGER_ROLES), async (req, res) => {
    const { course, error } = await ensureCourseForManager(req.params.id, req.user)
    if (error) return res.status(error.status).json({ ok: false, msg: error.msg })
    const assignment = await prisma.courseAssignment.findUnique({ where: { id: req.params.assignmentId } })
    if (!assignment || assignment.courseId !== course.id) {
        return res.status(404).json({ ok: false, msg: '作业不存在' })
    }
    const list = await prisma.courseSubmission.findMany({
        where: { assignmentId: assignment.id },
        orderBy: { createdAt: 'desc' },
        include: { student: { select: { id: true, name: true, email: true, avatarUrl: true } } },
    })
    res.json({
        ok: true,
        list: list.map((submission) => ({
            id: submission.id,
            status: submission.status,
            grade: submission.grade,
            feedback: submission.feedback,
            attachmentUrl: submission.attachmentUrl,
            content: submission.content,
            createdAt: submission.createdAt,
            student: submission.student,
        })),
    })
})

router.patch(
    '/:id/assignments/:assignmentId/submissions/:submissionId',
    requireAuth,
    requireRole(COURSE_MANAGER_ROLES),
    async (req, res) => {
        const { course, error } = await ensureCourseForManager(req.params.id, req.user)
        if (error) return res.status(error.status).json({ ok: false, msg: error.msg })
        const assignment = await prisma.courseAssignment.findUnique({ where: { id: req.params.assignmentId } })
        if (!assignment || assignment.courseId !== course.id) {
            return res.status(404).json({ ok: false, msg: '作业不存在' })
        }
        const submission = await prisma.courseSubmission.findUnique({ where: { id: req.params.submissionId } })
        if (!submission || submission.assignmentId !== assignment.id) {
            return res.status(404).json({ ok: false, msg: '提交不存在' })
        }
        const data = {}
        if (typeof req.body.status === 'string') data.status = req.body.status.toUpperCase()
        if (typeof req.body.grade === 'string') data.grade = req.body.grade
        if (typeof req.body.feedback === 'string') data.feedback = req.body.feedback
        const updated = await prisma.courseSubmission.update({ where: { id: submission.id }, data })
        res.json({ ok: true, submission: updated })
    }
)

router.post('/:id/assignments/:assignmentId/submissions', requireAuth, async (req, res) => {
    if (req.user.role !== 'STUDENT') {
        return res.status(403).json({ ok: false, msg: '只有学生可以提交作业' })
    }
    const course = await prisma.course.findUnique({ where: { id: req.params.id } })
    if (!course || !course.isPublished) return res.status(404).json({ ok: false, msg: '课程不存在' })
    const enrollment = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId: req.user.id, courseId: course.id } },
    })
    if (!isApprovedEnrollment(enrollment)) {
        return res.status(403).json({ ok: false, msg: '请等待管理员批准' })
    }
    const assignment = await prisma.courseAssignment.findUnique({ where: { id: req.params.assignmentId } })
    if (!assignment || assignment.courseId !== course.id) {
        return res.status(404).json({ ok: false, msg: '作业不存在' })
    }
    const { content = '', attachmentUrl } = req.body || {}
    const submission = await prisma.courseSubmission.upsert({
        where: { assignmentId_studentId: { assignmentId: assignment.id, studentId: req.user.id } },
        create: {
            assignmentId: assignment.id,
            studentId: req.user.id,
            content,
            attachmentUrl,
        },
        update: { content, attachmentUrl, status: 'SUBMITTED' },
    })
    const payload = await buildCoursePayload(course.id, req.user)
    res.json({ ok: true, submission, ...payload })
})

// 课程报名表单
router.post('/:id/enroll', requireAuth, async (req, res) => {
    if (req.user.role !== 'STUDENT') return res.status(403).json({ ok: false, msg: '只有学生才能报名' })
    const course = await prisma.course.findUnique({ where: { id: req.params.id } })
    if (!course || !course.isPublished) return res.status(404).json({ ok: false, msg: '课程不存在' })
    const joinCodeInput = typeof req.body.joinCode === 'string' ? req.body.joinCode.trim().toUpperCase() : ''
    const normalizedCourseCode = (course.joinCode || '').trim().toUpperCase()
    const joinCodeMatches = Boolean(joinCodeInput) && joinCodeInput === normalizedCourseCode
    const questions = safeJsonParse(course.enrollQuestionsJson, DEFAULT_FORM_QUESTIONS)
    const answers = normalizeAnswers(req.body.answers, questions)
    if (!Object.keys(answers).length) {
        if (joinCodeMatches) {
            answers.intent = 'Joined via instructor code'
        } else {
            return res.status(400).json({ ok: false, msg: '请填写报名表单' })
        }
    }
    const existing = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId: req.user.id, courseId: course.id } },
    })
    const baseData = {
        formAnswersJson: JSON.stringify(answers),
        joinedViaCode: joinCodeMatches,
    }
    if (joinCodeMatches) {
        baseData.status = 'APPROVED'
    } else if (!existing) {
        baseData.status = 'PENDING'
    }
    let enrollment
    if (existing) {
        enrollment = await prisma.enrollment.update({ where: { id: existing.id }, data: baseData })
    } else {
        enrollment = await prisma.enrollment.create({
            data: {
                userId: req.user.id,
                courseId: course.id,
                status: baseData.status || 'PENDING',
                ...baseData,
            },
        })
    }
    const payload = await buildCoursePayload(course.id, req.user)
    const codeStatus = joinCodeMatches ? 'APPROVED' : joinCodeInput ? 'INVALID' : null
    res.json({ ok: true, enrollment, codeStatus, ...payload })
})

router.patch('/:id/enrollments/:enrollmentId', requireAuth, requireRole(COURSE_MANAGER_ROLES), async (req, res) => {
    const { course, error } = await ensureCourseForManager(req.params.id, req.user)
    if (error) return res.status(error.status).json({ ok: false, msg: error.msg })
    const { status, adminNote } = req.body || {}
    if (status && !ENROLLMENT_STATUSES.has(String(status).toUpperCase())) {
        return res.status(400).json({ ok: false, msg: '无效的状态' })
    }
    const enrollment = await prisma.enrollment.findUnique({
        where: { id: req.params.enrollmentId },
        include: { user: { select: { id: true, name: true, email: true, role: true, avatarUrl: true } } },
    })
    if (!enrollment || enrollment.courseId !== course.id) {
        return res.status(404).json({ ok: false, msg: '报名不存在' })
    }
    const updated = await prisma.enrollment.update({
        where: { id: enrollment.id },
        data: {
            status: status ? String(status).toUpperCase() : enrollment.status,
            adminNote,
        },
    })
    const payload = await buildCoursePayload(course.id, req.user)
    res.json({ ok: true, enrollment: formatEnrollment({ ...updated, user: enrollment.user }), ...payload })
})

// 课程留言（与课程管理者互动）
router.post('/:id/messages', requireAuth, (req, res) => {
    handleMessageCreate(req, res)
})

// 查看留言（作者 / 已选课 / 管理员）
router.get('/:id/messages', requireAuth, (req, res) => {
    handleMessageList(req, res)
})

router.get('/:id/chat', requireAuth, (req, res) => {
    handleMessageList(req, res, 'CHAT')
})

router.post('/:id/chat', requireAuth, (req, res) => {
    handleMessageCreate(req, res, 'CHAT')
})

module.exports = router
