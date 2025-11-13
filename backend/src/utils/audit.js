// src/utils/audit.js
const { prisma } = require('../prisma')

async function logAudit(req, action, targetType, targetId, data) {
    try {
        await prisma.auditLog.create({
            data: {
                userId: req?.user?.id || null,
                action,
                targetType: targetType || null,
                targetId: targetId || null,
                ip: req?.ip || req?.headers['x-forwarded-for'] || null,
                userAgent: req?.headers['user-agent'] || null,
                data: data ? JSON.stringify(data).slice(0, 5000) : null
            }
        })
    } catch (e) {
        console.error('audit log fail', e)
    }
}

module.exports = { logAudit }