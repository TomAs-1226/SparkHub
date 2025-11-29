const fs = require('fs')
const path = require('path')
const nodemailer = require('nodemailer')
const { prisma } = require('../prisma')

const BRAND = {
    primary: '#4F46E5',
    primaryDark: '#4338CA',
    background: '#f6f8fb',
    border: '#e2e8f0',
    text: '#0f172a',
    muted: '#475569'
}

const logoSvg = `
<svg width="96" height="96" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect width="96" height="96" rx="22" fill="#EEF2FF"/>
<path d="M24 62C24 45.4315 37.4315 32 54 32H70C70 48.5685 56.5685 62 40 62H24Z" fill="#4F46E5"/>
<path d="M72 34C72 50.5685 58.5685 64 42 64H26C26 47.4315 39.4315 34 56 34H72Z" fill="#22D3EE" fill-opacity="0.7"/>
<circle cx="38" cy="40" r="6" fill="#0EA5E9"/>
<path d="M46 76C46 69.3726 51.3726 64 58 64H72C72 70.6274 66.6274 76 60 76H46Z" fill="#6366F1"/>
</svg>`
const INLINE_LOGO = `data:image/svg+xml;utf8,${encodeURIComponent(logoSvg)}`

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
const logoUrl = process.env.EMAIL_LOGO_URL || INLINE_LOGO

function stripHtml(input = '') {
    return input.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
}

function wrapEmail({
    title,
    previewText,
    bodyHtml,
    ctaLabel,
    ctaHref,
    footerHtml,
}) {
    const preview = previewText
        ? `<div style="display:none; visibility:hidden; opacity:0; height:0; width:0; overflow:hidden;">${previewText}</div>`
        : ''
    const ctaBlock = ctaLabel && ctaHref
        ? `<div style="margin: 28px 0 10px;"><a href="${ctaHref}" style="display:inline-block;background:${BRAND.primary};color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:600;">${ctaLabel}</a></div>`
        : ''
    const footer = footerHtml
        || `<p style="color:${BRAND.muted};font-size:13px;margin:16px 0 0;">You are receiving this email because you have a SparkHub account. <a href="${resolveFrontendUrl('/settings')}" style="color:${BRAND.primary};text-decoration:none;">Manage notification preferences</a>.</p>`

    return `
        ${preview}
        <div style="background:${BRAND.background};padding:24px 0;font-family: 'Inter','Segoe UI', Arial, sans-serif;">
            <div style="max-width: 720px; margin: 0 auto; background: #fff; border: 1px solid ${BRAND.border}; border-radius: 18px; overflow: hidden; box-shadow: 0 10px 40px rgba(15,23,42,0.08);">
                <div style="display:flex;align-items:center;gap:12px;padding:16px 20px;border-bottom:1px solid ${BRAND.border}; background: linear-gradient(120deg, #eef2ff, #f8fafc);">
                    <img src="${logoUrl}" alt="SparkHub" width="48" height="48" style="display:block;border-radius:12px;border:1px solid #e0e7ff;background:#fff;object-fit:cover;" />
                    <div>
                        <div style="font-size:16px;font-weight:800;color:${BRAND.text};">SparkHub</div>
                        <div style="font-size:12px;color:${BRAND.muted};">Learning updates and security alerts</div>
                    </div>
                </div>
                <div style="padding:24px 24px 8px;color:${BRAND.text};line-height:1.6;">
                    ${title ? `<h1 style="margin:0 0 12px;font-size:20px;line-height:1.3;color:${BRAND.text};">${title}</h1>` : ''}
                    ${bodyHtml}
                    ${ctaBlock}
                </div>
                <div style="padding:0 24px 22px;">${footer}</div>
            </div>
        </div>
    `
}

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
    const body = `
        <p>${greeting}</p>
        <p style="margin:0 0 8px;">We received a request to reset your SparkHub passcode. If you made this request, use the secure link below to set a new passcode. The link will expire in one hour.</p>
        <p style="margin:12px 0 0;color:${BRAND.muted};font-size:14px;">For your security this link works only once.</p>
        <p style="margin: 24px 0 8px; word-break: break-all;">If the button does not work, copy and paste this URL into your browser:<br/><a href="${resetUrl}" style="color:${BRAND.primary};">${resetUrl}</a></p>
    `
    const html = wrapEmail({
        title: 'Reset your SparkHub passcode',
        previewText: 'Use this secure link to reset your SparkHub password.',
        bodyHtml: body,
        ctaLabel: 'Reset your passcode',
        ctaHref: resetUrl,
        footerHtml: `<p style="color:${BRAND.muted};font-size:13px;margin:16px 0 0;">If you did not request a reset, you can safely ignore this email. Your passcode will stay the same.</p>`
    })
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

function buildVerificationTemplate(user, verifyUrl, code) {
    const greeting = user?.name ? `Hi ${user.name},` : 'Hi there,'
    const text = `${greeting}\n\nWelcome to SparkHub! Use the code ${code} or the button below to verify your email. This link expires in 24 hours.\n\nVerify: ${verifyUrl}\n\nIf you did not create an account, you can ignore this email.`
    const body = `
        <p>${greeting}</p>
        <p style="margin:0 0 10px;">Welcome to SparkHub! Use the button or code below to verify your email so you can access your dashboard.</p>
        <div style="margin: 16px 0; padding: 14px 16px; border: 1px solid ${BRAND.border}; border-radius: 12px; background: #f8fafc;">
            <div style="font-size:13px; color:${BRAND.muted}; margin-bottom: 6px;">Verification code</div>
            <div style="font-family: 'SFMono-Regular', Menlo, monospace; font-weight: 700; letter-spacing: 2px; font-size: 18px; color:${BRAND.text};">${code}</div>
        </div>
        <p style="margin: 12px 0 0; color:${BRAND.muted}; font-size: 13px;">The link and code will expire in 24 hours to keep your account safe.</p>
    `
    const html = wrapEmail({
        title: 'Verify your SparkHub email',
        previewText: 'Confirm your email to start using SparkHub.',
        bodyHtml: body,
        ctaLabel: 'Verify email',
        ctaHref: verifyUrl,
        footerHtml: `<p style="color:${BRAND.muted};font-size:13px;margin:16px 0 0;">If you did not create a SparkHub account, you can ignore this email.</p>`
    })
    return { text, html }
}

async function sendVerificationEmail(user, token, code) {
    const verifyUrl = resolveFrontendUrl(`/verify-email?token=${encodeURIComponent(token)}`)
    const { text, html } = buildVerificationTemplate(user, verifyUrl, code)
    return sendEmail({
        to: user.email,
        subject: 'Confirm your SparkHub email',
        text,
        html,
        userId: user.id,
        category: 'VERIFY_EMAIL',
        metadata: { token, code }
    })
}

function buildWeeklyUpdateTemplate(update, recipientName) {
    const greeting = recipientName ? `Hi ${recipientName},` : 'Hi there,'
    const intro = update.summary || 'Here are the latest highlights from SparkHub.'
    const footer = `You are receiving weekly updates from SparkHub. You can update your email preferences from your profile.`
    const attachmentBlock = buildAttachmentList(update.attachments || [])
    const body = `
        <p>${greeting}</p>
        <p>${intro}</p>
        <div style="border-left: 4px solid ${BRAND.primary}; padding-left: 12px; margin: 16px 0;">${update.body}</div>
        ${attachmentBlock.html}
    `
    const html = wrapEmail({
        title: `SparkHub Weekly Update${update.title ? `: ${update.title}` : ''}`,
        previewText: intro,
        bodyHtml: body,
        footerHtml: `<p style="color:${BRAND.muted}; font-size: 13px;">${footer}</p>`,
    })
    const text = `${greeting}\n\n${intro}\n\n${stripHtml(update.body)}\n\n${attachmentBlock.text}\n\n${footer}`
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
    sendVerificationEmail,
    sendWeeklyUpdateEmail,
    resolveFrontendUrl
}
