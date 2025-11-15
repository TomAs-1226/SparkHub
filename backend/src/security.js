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
    'http://10.0.2.2:5173'
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
    const cspDirectives = {
        "default-src": ["'self'"],
        "script-src": ["'self'"],
        "style-src": ["'self'", "'unsafe-inline'"],
        "img-src": ["'self'", "data:"],
        "font-src": ["'self'", "data:"],
        "connect-src": connectSrc,
        "frame-ancestors": ["'none'"],
        "object-src": ["'none'"],
    }

    cspDirectives['upgrade-insecure-requests'] = enableHsts ? [] : null

    app.use(helmet({
        crossOriginOpenerPolicy: { policy: 'same-origin' },
        crossOriginResourcePolicy: { policy: 'same-site' },
        referrerPolicy: { policy: 'no-referrer' },
        hsts: enableHsts ? undefined : false,
        contentSecurityPolicy: {
            useDefaults: true,
            directives: cspDirectives,
        }
    }))

    // HTTP Parameter Pollution protection
    app.use(hpp())

    // Strict CORS (default-deny, allow only your frontends)
    app.use(cors({
        origin: allowOrigin,
        methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
        allowedHeaders: ['Content-Type','Authorization'],
        credentials: true
    }))

    // Global rate limit (memory store is fine for dev)
    const globalLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: Number(process.env.RATE_LIMIT_MAX_REQUESTS || 1200),
        standardHeaders: true,
        legacyHeaders: false,
        // For production at scale, prefer Redis:
        // store: new RedisStore({
        //   sendCommand: (...args) => new IORedis(process.env.REDIS_URL).call(...args),
        // })
    })
    app.use(globalLimiter)

    // Stricter auth limiter
    const authLimiter = rateLimit({
        windowMs: 10 * 60 * 1000,
        max: 20,
        standardHeaders: true,
        legacyHeaders: false
    })
    app.use('/auth', authLimiter)
}