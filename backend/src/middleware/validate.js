// src/middleware/validate.js
// Usage: router.post('/', validate(schema), handler)
const { ZodError } = require('zod')

function validate(schema) {
    return (req, res, next) => {
        try {
            const data = {
                body: req.body,
                query: req.query,
                params: req.params,
                headers: req.headers
            }
            const parsed = schema.parse(data)
            // Overwrite with parsed (sanitized) values, if you want:
            req.body = parsed.body
            req.query = parsed.query
            req.params = parsed.params
            return next()
        } catch (err) {
            if (err instanceof ZodError) {
                const friendlyMessage = err.errors?.[0]?.message || 'Bad Request'
                return res.status(400).json({ ok: false, msg: friendlyMessage, errors: err.errors })
            }
            return next(err)
        }
    }
}

module.exports = { validate }