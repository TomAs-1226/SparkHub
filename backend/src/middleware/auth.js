// Authentication helpers with session enforcement
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { prisma } = require('../prisma');
const { SESSION_KICK_REASON } = require('../utils/sessions');

const FALLBACK_DEV_SECRET = 'sparkhub-dev-secret';
const JWT_SECRET = process.env.JWT_SECRET || FALLBACK_DEV_SECRET;

if (!process.env.JWT_SECRET) {
    console.warn('[auth] JWT_SECRET is not set, using a fallback development secret.');
}

const SESSION_CONFLICT_STATUS = 440;

class SessionAuthError extends Error {
    constructor(code, message, status = 401) {
        super(message);
        this.code = code;
        this.status = status;
    }
}

function signToken(user, sessionId, secret = JWT_SECRET) {
    if (!sessionId) {
        throw new Error('Session id is required when issuing tokens.');
    }
    return jwt.sign({ id: user.id, role: user.role, name: user.name, sid: sessionId }, secret, { expiresIn: '7d' });
}

async function fetchSessionContext(token) {
    let payload;
    try {
        payload = jwt.verify(token, JWT_SECRET);
    } catch (err) {
        throw new SessionAuthError('INVALID_TOKEN', 'pass无效');
    }

    const sessionId = payload.sid || payload.sessionId;
    if (!sessionId) {
        throw new SessionAuthError('SESSION_UPGRADE_REQUIRED', 'Session expired. Please sign in again.', SESSION_CONFLICT_STATUS);
    }

    const session = await prisma.userSession.findUnique({
        where: { id: sessionId },
        include: { user: { select: { id: true, role: true, name: true } } },
    });
    if (!session) {
        throw new SessionAuthError('SESSION_NOT_FOUND', 'Session expired. Please sign in again.', SESSION_CONFLICT_STATUS);
    }
    if (session.revokedAt) {
        throw new SessionAuthError(
            'SESSION_REVOKED',
            session.revokedReason || SESSION_KICK_REASON,
            SESSION_CONFLICT_STATUS,
        );
    }
    await prisma.userSession.update({ where: { id: session.id }, data: { lastActiveAt: new Date() } });
    return { session, user: session.user };
}

async function requireAuth(req, res, next) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ ok: false, msg: '未登录' });
    try {
        const context = await fetchSessionContext(token);
        req.user = context.user;
        req.session = context.session;
        next();
    } catch (err) {
        const status = err instanceof SessionAuthError ? err.status : 401;
        const payload = { ok: false, msg: err.message || 'pass无效' };
        if (err instanceof SessionAuthError) payload.code = err.code;
        res.status(status).json(payload);
    }
}

async function maybeAuth(req, _res, next) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return next();
    try {
        const context = await fetchSessionContext(token);
        req.user = context.user;
        req.session = context.session;
    } catch (err) {
        // optional auth should not block requests
        if (err instanceof SessionAuthError) {
            req.sessionError = err;
        }
    } finally {
        next();
    }
}

function requireRole(roles = []) {
    return (req, res, next) => {
        if (!req.user) return res.status(401).json({ ok: false, msg: '未登录' });
        if (!roles.includes(req.user.role)) return res.status(403).json({ ok: false, msg: '无权限' });
        next();
    };
}

module.exports = { signToken, requireAuth, requireRole, bcrypt, maybeAuth, SessionAuthError, SESSION_CONFLICT_STATUS };
