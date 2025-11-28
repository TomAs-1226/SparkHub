const fs = require('fs')
const path = require('path')
const nodemailer = require('nodemailer')
const { prisma } = require('../prisma')

function buildTransporter() {
    const host = process.env.SMTP_HOST
    const port = Number(process.env.SMTP_PORT || 587)
    const user = process.env.SMTP_USER
    const pass = process.env.SMTP_PASS
    const secure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true'

    if (!host || !user || !pass) {
        console.warn('Email disabled: missing SMTP credentials (SMTP_HOST/SMTP_USER/SMTP_PASS)')
        return null
    }

    return nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass }
    })
}

const transporter = buildTransporter()
const defaultFrom = process.env.MAIL_FROM || 'SparkHub <noreply@sparkhub.dev>'

async function recordEmailLog({ to, subject, bodyText, bodyHtml, category, userId, status, error, metadata }) {
    try {
        return await prisma.emailLog.create({
            data: {
                to,
                subject,
                bodyText: bodyText || null,
                bodyHtml: bodyHtml || null,
                category: category || 'GENERAL',
                status: status || 'QUEUED',
                userId: userId || null,
                errorMessage: error || null,
                metadataJson: metadata ? JSON.stringify(metadata) : '{}',
                sentAt: status === 'SENT' ? new Date() : null
            }
        })
    } catch (err) {
        console.error('Failed to record email log', err)
        return null
    }
}

async function sendEmail({ to, subject, text, html, category = 'GENERAL', userId = null, metadata = {}, attachments = [] }) {
    const initialLog = await recordEmailLog({ to, subject, bodyText: text, bodyHtml: html, category, userId, status: transporter ? 'QUEUED' : 'SKIPPED', metadata })

    if (!transporter) {
        console.log('Email preview (no SMTP configured):', { to, subject, text, html, attachments })
        return { ok: true, skipped: true, logId: initialLog?.id }
    }

    try {
        await transporter.sendMail({
            from: defaultFrom,
            to,
            subject,
            text,
            html,
            attachments
        })
        if (initialLog) {
            await prisma.emailLog.update({ where: { id: initialLog.id }, data: { status: 'SENT', sentAt: new Date() } })
        }
        return { ok: true, logId: initialLog?.id }
    } catch (err) {
        console.error('Error sending email', err)
        if (initialLog) {
            await prisma.emailLog.update({ where: { id: initialLog.id }, data: { status: 'FAILED', errorMessage: err.message } })
        }
        return { ok: false, error: err.message }
    }
}

function resolveFrontendUrl(pathname = '') {
    const base = process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:3000'
    return `${base.replace(/\/$/, '')}${pathname.startsWith('/') ? '' : '/'}${pathname}`
}

function resolveUploadPath(url = '') {
    const uploadDir = process.env.UPLOAD_DIR || './uploads'
    const filename = url.replace(/^\/uploads\//, '')
    return path.resolve(uploadDir, filename)
}

function buildAttachmentPreview(attachment) {
    if (!attachment?.mimeType || !attachment.mimeType.startsWith('text/')) return null
    const filePath = resolveUploadPath(attachment.url)
    if (!fs.existsSync(filePath)) return null
    try {
        const content = fs.readFileSync(filePath, 'utf-8')
        const trimmed = content.slice(0, 1200)
        const more = content.length > trimmed.length ? '\n…' : ''
        return `<pre style="background:#f8fafc;border-radius:12px;padding:12px;font-family:SFMono-Regular,Menlo,monospace;white-space:pre-wrap;">${trimmed}${more}</pre>`
    } catch (err) {
        console.warn('Failed to read attachment preview', err)
        return null
    }
}

function buildAttachmentList(attachments = []) {
    if (!Array.isArray(attachments) || attachments.length === 0) return { html: '', text: '' }
    const itemsHtml = []
    const itemsText = []
    attachments.forEach((att) => {
        const safeName = att?.name || 'Attachment'
        const url = att?.url || ''
        itemsHtml.push(`<li><a href="${resolveFrontendUrl(url)}" style="color:#4F46E5;">${safeName}</a>${att?.mimeType ? ` <span style="color:#475569">(${att.mimeType})</span>` : ''}</li>`)
        itemsText.push(`- ${safeName}${att?.mimeType ? ` (${att.mimeType})` : ''}${url ? ` → ${resolveFrontendUrl(url)}` : ''}`)
        const preview = buildAttachmentPreview(att)
        if (preview) itemsHtml.push(`<div style="margin:8px 0 16px 0;">${preview}</div>`)
    })
    return {
        html: `<div style="margin-top:12px;"><p style="font-weight:600;">Attachments</p><ul>${itemsHtml.join('')}</ul></div>`,
        text: `Attachments:\n${itemsText.join('\n')}`
    }
}

function buildPasswordResetTemplate(user, resetUrl) {
    const greeting = user?.name ? `Hi ${user.name},` : 'Hello,'
    const text = `${greeting}\n\nWe received a request to reset your SparkHub passcode. If you made this request, use the link below to set a new passcode. The link will expire in one hour.\n\nReset your passcode: ${resetUrl}\n\nIf you did not request a reset, you can safely ignore this email.`
    const html = `
        <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.5;">
            <p>${greeting}</p>
            <p>We received a request to reset your SparkHub passcode. If you made this request, use the secure link below to set a new passcode. The link will expire in one hour.</p>
            <p style="margin: 24px 0;"><a href="${resetUrl}" style="background:#4F46E5;color:#fff;padding:12px 18px;border-radius:6px;text-decoration:none;">Reset your passcode</a></p>
            <p style="word-break: break-all;">If the button does not work, copy and paste this URL into your browser:<br/><a href="${resetUrl}">${resetUrl}</a></p>
            <p>If you did not request a reset, you can safely ignore this email.</p>
        </div>
    `
    return { text, html }
}

async function sendPasswordResetEmail(user, token) {
    const resetUrl = resolveFrontendUrl(`/reset-password?token=${encodeURIComponent(token)}`)
    const { text, html } = buildPasswordResetTemplate(user, resetUrl)
    return sendEmail({
        to: user.email,
        subject: 'Reset your SparkHub passcode',
        text,
        html,
        userId: user.id,
        category: 'PASSWORD_RESET',
        metadata: { token }
    })
}

function buildWeeklyUpdateTemplate(update, recipientName) {
    const greeting = recipientName ? `Hi ${recipientName},` : 'Hi there,'
    const intro = update.summary || 'Here are the latest highlights from SparkHub.'
    const footer = `You are receiving weekly updates from SparkHub. You can update your email preferences from your profile.`
    const attachmentBlock = buildAttachmentList(update.attachments || [])
    const html = `
        <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
            <p>${greeting}</p>
            <p>${intro}</p>
            <div style="border-left: 4px solid #4F46E5; padding-left: 12px; margin: 16px 0;">${update.body}</div>
            ${attachmentBlock.html}
            <p style="color:#475569; font-size: 14px;">${footer}</p>
        </div>
    `
    const text = `${greeting}\n\n${intro}\n\n${update.body.replace(/<[^>]+>/g, '')}\n\n${attachmentBlock.text}\n\n${footer}`
    return { text, html }
}

async function sendWeeklyUpdateEmail(update, recipients) {
    if (!Array.isArray(recipients) || recipients.length === 0) {
        return { ok: true, skipped: true, sent: 0 }
    }
    let sent = 0
    const mailAttachments = (update.attachments || [])
        .map((att) => {
            if (!att?.url) return null
            const filePath = resolveUploadPath(att.url)
            if (!fs.existsSync(filePath)) return null
            return {
                filename: att.name || path.basename(filePath),
                path: filePath,
                contentType: att.mimeType || undefined
            }
        })
        .filter(Boolean)
    for (const recipient of recipients) {
        const { text, html } = buildWeeklyUpdateTemplate(update, recipient?.name)
        const result = await sendEmail({
            to: recipient.email,
            subject: `SparkHub Weekly Update: ${update.title}`,
            text,
            html,
            userId: recipient.id || null,
            category: 'WEEKLY_UPDATE',
            attachments: mailAttachments,
            metadata: { updateId: update.id, attachments: update.attachments || [] }
        })
        if (result.ok) sent += 1
    }
    return { ok: true, sent }
}

module.exports = {
    sendEmail,
    sendPasswordResetEmail,
    sendWeeklyUpdateEmail,
    resolveFrontendUrl
}
