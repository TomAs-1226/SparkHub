// src/security.js
const helmet = require('helmet')
const cors = require('cors')
const hpp = require('hpp')
const compression = require('compression')
const rateLimit = require('express-rate-limit')
// Optional Redis store (uncomment if you set it up):
// const { RedisStore } = require('rate-limit-redis')
// const IORedis = require('ioredis')

const LOCAL_DEV_ORIGINS = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://10.0.2.2:5173',
    'http://sparkhub.playit.plus:19142'
]

const PRIVATE_NET_MATCHERS = [
    /^10\.(\d{1,3}\.){2}\d{1,3}$/,
    /^192\.168\.(\d{1,3})\.(\d{1,3})$/,
    /^172\.(1[6-9]|2\d|3[0-1])\.(\d{1,3})\.(\d{1,3})$/
]

function isPrivateNetworkHost(hostname = '') {
    return PRIVATE_NET_MATCHERS.some((regex) => regex.test(hostname))
}

function originHost(origin) {
    if (!origin) return ''
    try {
        return new URL(origin).hostname
    } catch (_err) {
        return ''
    }
}

function normalizeOrigins(list = []) {
    return Array.from(new Set(list.filter(Boolean)))
}

/**
 * Wire core security middleware.
 * @param {import('express').Express} app
 * @param {{ frontendOrigins?: string[] }} opts
 */
module.exports = function wireSecurity(app, opts = { frontendOrigins: [] }) {
    app.disable('x-powered-by')
    app.set('trust proxy', 1) // behind nginx/proxy

    const explicitOrigins = normalizeOrigins(opts.frontendOrigins)
    const allowedOrigins = normalizeOrigins([...LOCAL_DEV_ORIGINS, ...explicitOrigins])

    const isProduction = (process.env.NODE_ENV || '').toLowerCase() === 'production'
    const enableHsts = process.env.ENABLE_HSTS === 'true' || (isProduction && process.env.ENABLE_HSTS !== 'false')

    const connectSrc = normalizeOrigins([
        "'self'",
        ...allowedOrigins,
        ...allowedOrigins.map((origin) => origin.replace(/^http/, 'ws'))
    ])

    const allowOrigin = (origin, callback) => {
        if (!origin) {
            callback(null, true)
            return
        }
        if (allowedOrigins.includes(origin)) {
            callback(null, true)
            return
        }
        const localMatch = /^https?:\/\/((localhost)|(127\.0\.0\.1))(?:\:\d+)?$/i.test(origin)
        if (localMatch && process.env.ALLOW_LOCAL_ORIGINS !== 'false') {
            callback(null, true)
            return
        }
        const host = originHost(origin)
        if (isPrivateNetworkHost(host) && process.env.ALLOW_LAN_ORIGINS !== 'false') {
            callback(null, true)
            return
        }
        callback(new Error(`CORS: Origin ${origin} not allowed`))
    }

    // Response compression
    app.use(compression())

    // Strict security headers
    // Allow Google Docs Viewer and Office Online for embedded presentation/slide viewing
    const cspDirectives = {
        "default-src": ["'self'"],
        "script-src": ["'self'", "https://docs.google.com"],
        "style-src": ["'self'", "'unsafe-inline'"],
        "img-src": ["'self'", "data:", "https:", "blob:"],
        "font-src": ["'self'", "data:"],
        "connect-src": connectSrc,
        // Allow iframes for Google Docs/Slides viewer and Office Online
        "frame-src": [
            "'self'",
            "https://docs.google.com",
            "https://view.officeapps.live.com",
            "https://onedrive.live.com",
            "https://drive.google.com",
            "https://www.youtube.com",
            "https://player.vimeo.com",
        ],
        "frame-ancestors": ["'self'"],
        "object-src": ["'none'"],
        "media-src": ["'self'", "https:", "blob:"],
    }

    cspDirectives['upgrade-insecure-requests'] = enableHsts ? [] : null

    app.use(helmet({
        crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
        crossOriginResourcePolicy: { policy: 'cross-origin' },
        referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
        hsts: enableHsts ? undefined : false,
        contentSecurityPolicy: {
            useDefaults: false,
            directives: cspDirectives,
        }
    }))

    // HTTP Parameter Pollution protection
    app.use(hpp())

    // Strict CORS (default-deny, allow only your frontends)
    app.use(cors({
        origin: allowOrigin,
        methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
        allowedHeaders: ['Content-Type','Authorization','X-Request-ID'],
        credentials: true,
        maxAge: 86400, // Cache pre-flight for 24h — reduces OPTIONS requests under load
    }))

    // ── Rate limiting tuned for 1000 concurrent users ──────────────────────────
    // Global limit: generous per-IP window so 1000 distinct users aren't blocked
    const globalLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,                                    // 15 min window
        max: Number(process.env.RATE_LIMIT_MAX_REQUESTS || 3000),     // 3000 req/IP/window
        standardHeaders: true,
        legacyHeaders: false,
        message: { ok: false, msg: 'Too many requests. Please try again shortly.' },
        skip: (req) => ['/healthz', '/readyz', '/'].includes(req.path),
    })
    app.use(globalLimiter)

    // Stricter auth limiter — prevents brute-force on login/register
    const authLimiter = rateLimit({
        windowMs: 10 * 60 * 1000, // 10 min
        max: 30,
        standardHeaders: true,
        legacyHeaders: false,
        message: { ok: false, msg: 'Too many authentication attempts. Please wait.' },
    })
    app.use('/auth', authLimiter)

    // Upload limiter — large payloads are expensive
    const uploadLimiter = rateLimit({
        windowMs: 60 * 1000, // 1 min
        max: 30,
        standardHeaders: true,
        legacyHeaders: false,
        message: { ok: false, msg: 'Upload rate limit reached. Please wait a moment.' },
    })
    app.use('/upload', uploadLimiter)
}