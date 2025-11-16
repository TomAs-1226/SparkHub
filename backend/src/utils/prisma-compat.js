const { Prisma } = require('@prisma/client')

function isUnknownFieldError(error) {
    return error instanceof Prisma.PrismaClientValidationError && /Unknown field/.test(error.message || '')
}

function cloneArgs(args = {}) {
    const next = { ...args }
    if (next.include) next.include = { ...next.include }
    if (next.select) next.select = { ...next.select }
    if (next.data) next.data = { ...next.data }
    if (next.where) next.where = { ...next.where }
    if (next.orderBy) {
        next.orderBy = Array.isArray(next.orderBy) ? next.orderBy.map((item) => ({ ...item })) : { ...next.orderBy }
    }
    return next
}

module.exports = { isUnknownFieldError, cloneArgs }
