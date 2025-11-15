require('dotenv').config()
const express = require('express')
const path = require('path')
const wireSecurity = require('./security')
const { ensurePrismaSync } = require('./utils/prisma-sync')

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

// JSON 404 + error (keep JSON only)
app.use((req, res) => res.status(404).json({ ok: false, msg: 'Not found', path: req.originalUrl }))
app.use((err, _req, res, _next) => {
    console.error('Unhandled error:', err)
    res.status(500).json({ ok: false, msg: err?.message || 'Server error' })
})

// Start (single process, basic Node HTTP server)
const DEFAULT_PORT = Number(process.env.PORT || process.env.API_PORT || 4000)
const PORT = Number.isFinite(DEFAULT_PORT) ? DEFAULT_PORT : 4000

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`API ready: http://localhost:${PORT}`)
    })
}

module.exports = app