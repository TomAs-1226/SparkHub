require('dotenv').config()
const express = require('express')
const path = require('path')
const wireSecurity = require('./security')
const { ensurePrismaSync } = require('./utils/prisma-sync')

ensurePrismaSync()

const app = express()

// Body limits (prevent big JSON bombs)
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true, limit: '1mb' }))

// Simple request log (optional)
app.use((req, _res, next) => { console.log(`${req.method} ${req.url}`); next() })

// SECURITY: Helmet, CORS, HPP, compression, rate limits
wireSecurity(app, {
    frontendOrigins: [
        process.env.FRONTEND_URL,
        'http://localhost:5173',
        'http://10.0.2.2:5173' // emulator hitting local dev frontend (optional)
    ]
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

// Start
const PORT = process.env.PORT || 3000

if (require.main === module) {
    app.listen(PORT, () => console.log(`API ready: http://localhost:${PORT}`))
}

module.exports = app