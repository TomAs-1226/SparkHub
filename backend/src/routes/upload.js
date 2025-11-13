const express = require('express')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()

const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads')
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true })
}

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
        const safeName = `${Date.now()}-${file.originalname.replace(/[^\w.-]/g, '_')}`
        cb(null, safeName)
    }
})

const upload = multer({
    storage,
    limits: { fileSize: 15 * 1024 * 1024 } // 15MB cap to support large lesson decks
})

router.post('/', requireAuth, (req, res) => {
    upload.single('file')(req, res, (err) => {
        if (err) {
            const msg = err.message || 'Upload failed'
            return res.status(400).json({ ok: false, msg })
        }
        if (!req.file) return res.status(400).json({ ok: false, msg: 'No file provided' })
        const relative = `/uploads/${req.file.filename}`
        res.json({ ok: true, path: relative })
    })
})

module.exports = router