// Load environment variables from the backend folder first, then fall back to a repo-level .env
const path = require('path')
const dotenv = require('dotenv')
const backendEnvPath = path.resolve(__dirname, '..', '.env')
dotenv.config({ path: backendEnvPath })
// Allow a top-level project .env to fill in any missing keys (common in some dev setups)
const repoEnvPath = path.resolve(__dirname, '..', '..', '.env')
dotenv.config({ path: repoEnvPath, override: false })

const express = require('express')
const os = require('os')
const cluster = require('cluster')
const wireSecurity = require('./security')
const { ensurePrismaSync } = require('./utils/prisma-sync')

let toobusyInstance = null

ensurePrismaSync()

// Global error handlers with recovery
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason)
    // Don't exit - just log and continue
})

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error)
    // For critical errors, attempt graceful shutdown
    if (error.code === 'EADDRINUSE' || error.code === 'EACCES') {
        console.error('Fatal error, shutting down...')
        process.exit(1)
    }
    // For other errors, log but don't crash
    console.error('Continuing after error...')
})

const app = express()

// Body limits — 2 MB for JSON (accommodates larger note/content payloads without opening bomb risk)
app.use(express.json({ limit: '2mb' }))
app.use(express.urlencoded({ extended: true, limit: '2mb' }))

// Load-shed when the event loop is saturated to stay responsive for normal traffic
const enableLoadShedding = process.env.ENABLE_LOAD_SHED === 'true'
if (enableLoadShedding) {
    try {
        toobusyInstance = require('toobusy-js')
        toobusyInstance.maxLag(parseInt(process.env.TOOBUSY_MAX_LAG_MS || '120', 10))
        toobusyInstance.interval(250)
        app.use((req, res, next) => {
            if (toobusyInstance && toobusyInstance()) {
                res.status(503).json({ ok: false, msg: 'Server is momentarily busy, please retry' })
                return
            }
            next()
        })
    } catch (err) {
        console.warn('Load shedding disabled: install toobusy-js to enable it', err?.message)
        // Disable load shedding if the optional dependency is unavailable
        process.env.ENABLE_LOAD_SHED = 'false'
    }
}

// Simple request log (optional)
app.use((req, _res, next) => { console.log(`${req.method} ${req.url}`); next() })

// SECURITY: Helmet, CORS, HPP, compression, rate limits
const envOrigins = (process.env.FRONTEND_ORIGINS || process.env.FRONTEND_URL || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)

wireSecurity(app, {
    frontendOrigins: envOrigins
})

// Static files (if any)
const uploadDir = process.env.UPLOAD_DIR || './uploads'
app.use('/uploads', express.static(path.resolve(uploadDir)))

// Request timeout middleware - prevents hung requests from blocking server
const REQUEST_TIMEOUT = parseInt(process.env.REQUEST_TIMEOUT_MS || '30000', 10)
app.use((req, res, next) => {
    // Set a timeout for all requests
    req.setTimeout(REQUEST_TIMEOUT, () => {
        if (!res.headersSent) {
            console.warn(`Request timeout: ${req.method} ${req.url}`)
            res.status(408).json({ ok: false, msg: 'Request timeout' })
        }
    })
    next()
})

// Async error wrapper helper - catches unhandled promise rejections in routes
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
}
app.locals.asyncHandler = asyncHandler

// Routes
app.use('/testing', require('./routes/testing'))
app.use('/auth', require('./routes/auth'))
app.use('/courses', require('./routes/courses'))
app.use('/events', require('./routes/events'))
app.use('/tutors', require('./routes/tutors'))
app.use('/jobs', require('./routes/jobs'))
app.use('/quizzes', require('./routes/quizzes'))
app.use('/availability', require('./routes/availability'))
app.use('/feedback', require('./routes/feedback'))
app.use('/resources', require('./routes/resources'))
app.use('/admin', require('./routes/admin'))
app.use('/upload', require('./routes/upload'))
app.use('/emails', require('./routes/emails'))
app.use('/ai', require('./routes/ai'))
app.use('/matching', require('./routes/matching'))
// LMS v2 routes
app.use('/progress', require('./routes/progress'))
app.use('/announcements', require('./routes/announcements'))
app.use('/ratings', require('./routes/ratings'))
app.use('/discussions', require('./routes/discussions'))
app.use('/notes', require('./routes/notes'))
app.use('/bookmarks', require('./routes/bookmarks'))
// Inbox / messaging
app.use('/inbox', require('./routes/inbox'))

// Weekly digest scheduler — runs every Monday at 9 AM
try {
    const cron = require('node-cron')
    const { sendWeeklyDigests } = require('./scheduler/weekly-digest')
    cron.schedule('0 9 * * 1', () => {
        console.log('[Cron] Running weekly digest…')
        sendWeeklyDigests().catch((err) => console.error('[Cron] Weekly digest error:', err))
    })
    console.log('[Cron] Weekly digest scheduled: every Monday at 09:00')
} catch (err) {
    console.warn('[Cron] node-cron not available, weekly digest scheduler disabled:', err?.message)
}

// Health checks with database verification
const { healthCheck, isConnected } = require('./prisma')

app.get('/', (_req, res) => res.json({ ok: true, name: 'SparkHub API' }))

app.get('/healthz', async (_req, res) => {
    try {
        const dbHealth = await healthCheck()
        res.json({
            ok: dbHealth.ok,
            status: dbHealth.ok ? 'healthy' : 'degraded',
            database: dbHealth.connected ? 'connected' : 'disconnected',
            uptime: process.uptime()
        })
    } catch (error) {
        res.status(503).json({ ok: false, status: 'unhealthy', error: error.message })
    }
})

app.get('/readyz', async (_req, res) => {
    try {
        const dbHealth = await healthCheck()
        if (dbHealth.ok) {
            res.json({ ok: true, status: 'ready' })
        } else {
            res.status(503).json({ ok: false, status: 'not ready', reason: 'database unavailable' })
        }
    } catch (error) {
        res.status(503).json({ ok: false, status: 'not ready', error: error.message })
    }
})

// JSON 404 + error (keep JSON only)
app.use((req, res) => res.status(404).json({ ok: false, msg: 'Not found', path: req.originalUrl }))
app.use((err, _req, res, _next) => {
    console.error('Unhandled error:', err)
    res.status(500).json({ ok: false, msg: err?.message || 'Server error' })
})

// Start (supports clustered workers for scale-out)
const DEFAULT_PORT = Number(process.env.PORT || process.env.API_PORT || 4000)
const PORT = Number.isFinite(DEFAULT_PORT) ? DEFAULT_PORT : 4000

function startHttpServer() {
    const server = app.listen(PORT, () => {
        console.log(`API ready: http://localhost:${PORT} (pid ${process.pid})`)
    })
    // Keep connections alive but guard against slowloris-style hangs
    server.keepAliveTimeout = 65000
    server.headersTimeout = 66000
    server.requestTimeout = 70000

    // Graceful shutdown path so load balancers can drain
    const shutdown = () => {
        console.log('Shutting down HTTP server for maintenance...')
        server.close(() => {
            if (enableLoadShedding && toobusyInstance) {
                toobusyInstance.shutdown()
            }
            process.exit(0)
        })
        setTimeout(() => {
            console.warn('Forcing shutdown after timeout')
            if (enableLoadShedding && toobusyInstance) {
                toobusyInstance.shutdown()
            }
            process.exit(1)
        }, 10000).unref()
    }

    process.once('SIGTERM', shutdown)
    process.once('SIGINT', shutdown)
}

if (require.main === module) {
    const enableCluster = process.env.ENABLE_CLUSTER === 'true'
    const workerTarget = Math.max(1, Number(process.env.WEB_CONCURRENCY) || os.cpus().length)

    if (enableCluster && cluster.isPrimary && workerTarget > 1) {
        console.log(`Starting SparkHub API with ${workerTarget} workers`)
        for (let i = 0; i < workerTarget; i += 1) {
            cluster.fork()
        }
        cluster.on('exit', (worker) => {
            console.warn(`Worker ${worker.process.pid} exited; replacing to maintain capacity`)
            cluster.fork()
        })
    } else {
        startHttpServer()
    }
}

module.exports = app