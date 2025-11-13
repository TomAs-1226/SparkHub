// src/security.js
const helmet = require('helmet')
const cors = require('cors')
const hpp = require('hpp')
const compression = require('compression')
const rateLimit = require('express-rate-limit')
// Optional Redis store (uncomment if you set it up):
// const { RedisStore } = require('rate-limit-redis')
// const IORedis = require('ioredis')

/**
 * Wire core security middleware.
 * @param {import('express').Express} app
 * @param {{ frontendOrigins: string[] }} opts
 */
module.exports = function wireSecurity(app, opts = { frontendOrigins: [] }) {
    app.disable('x-powered-by')
    app.set('trust proxy', 1) // behind nginx/proxy

    // Response compression
    app.use(compression())

    // Strict security headers
    app.use(helmet({
        crossOriginOpenerPolicy: { policy: 'same-origin' },
        crossOriginResourcePolicy: { policy: 'same-site' },
        referrerPolicy: { policy: 'no-referrer' },
        // Start with a conservative CSP; adjust as your frontend grows
        contentSecurityPolicy: {
            useDefaults: true,
            directives: {
                "default-src": ["'self'"],
                "script-src": ["'self'"],
                "style-src": ["'self'", "'unsafe-inline'"], // allow inline style if needed; remove when possible
                "img-src": ["'self'", "data:"],
                "font-src": ["'self'", "data:"],
                "connect-src": ["'self'", ...opts.frontendOrigins],
                "frame-ancestors": ["'none'"],
                "object-src": ["'none'"],
                "upgrade-insecure-requests": []
            }
        }
    }))

    // HTTP Parameter Pollution protection
    app.use(hpp())

    // Strict CORS (default-deny, allow only your frontends)
    app.use(cors({
        origin: opts.frontendOrigins,
        methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
        allowedHeaders: ['Content-Type','Authorization'],
        credentials: true
    }))

    // Global rate limit (memory store is fine for dev)
    const globalLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 300,
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