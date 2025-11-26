require('dotenv').config()
const express = require('express')
const path = require('path')
const os = require('os')
const cluster = require('cluster')
const wireSecurity = require('./security')
const { ensurePrismaSync } = require('./utils/prisma-sync')

let toobusyInstance = null

ensurePrismaSync()

process.on('unhandledRejection', (error) => {
    console.error('Unhandled rejection:', error)
})

process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error)
})

const app = express()

// Body limits (prevent big JSON bombs)
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true, limit: '1mb' }))

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

// Health
app.get('/', (_req, res) => res.json({ ok: true, name: 'SparkHub API' }))
app.get('/healthz', (_req, res) => res.json({ ok: true, status: 'healthy' }))
app.get('/readyz', (_req, res) => res.json({ ok: true, status: 'ready' }))

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
