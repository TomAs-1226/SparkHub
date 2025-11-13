const express = require('express')
const multer = require('multer')
const path = require('path')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, process.env.UPLOAD_DIR || './uploads'),
    filename: (_req, file, cb) => {
        const safeName = `${Date.now()}-${file.originalname.replace(/[^\w.-]/g, '_')}`
        cb(null, safeName)
    }
})
const fileFilter = (_req, file, cb) => {
    const allowed = [
        'image/png',
        'image/jpeg',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'application/zip',
    ]
    if (!allowed.includes(file.mimetype)) return cb(new Error('Unsupported file type'), false)
    cb(null, true)
}
const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB cap
})

router.post('/', requireAuth, upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ ok: false, msg: 'No file' })
    res.json({ ok: true, path: `/uploads/${req.file.filename}` })
})

module.exports = router