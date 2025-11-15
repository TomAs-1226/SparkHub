const { prisma } = require('../prisma');

const SESSION_KICK_REASON = 'You signed in from another device. We ended your previous session.';

function sanitizeMetaValue(value) {
    if (typeof value !== 'string') return null;
    return value.slice(0, 255);
}

async function startExclusiveSession(userId, meta = {}) {
    const now = new Date();
    const userAgent = sanitizeMetaValue(meta.userAgent);
    const ipAddress = sanitizeMetaValue(meta.ipAddress);
    return prisma.$transaction(async (tx) => {
        await tx.userSession.updateMany({
            where: { userId, revokedAt: null },
            data: { revokedAt: now, revokedReason: meta.reason || SESSION_KICK_REASON },
        });
        return tx.userSession.create({
            data: {
                userId,
                userAgent,
                ipAddress,
                lastActiveAt: now,
            },
        });
    });
}

async function markSessionHeartbeat(sessionId) {
    if (!sessionId) return null;
    return prisma.userSession.update({
        where: { id: sessionId },
        data: { lastActiveAt: new Date() },
    });
}

module.exports = {
    SESSION_KICK_REASON,
    startExclusiveSession,
    markSessionHeartbeat,
};
