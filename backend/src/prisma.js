// Prisma client with connection management and error recovery
const { PrismaClient } = require('@prisma/client')

// For SQLite under heavy concurrency, enable WAL mode to allow concurrent reads
// while serialising writes — dramatically better throughput at 1000 concurrent users.
// This is executed once when the process starts.

// Configure Prisma with logging and error handling
const prisma = new PrismaClient({
    log: [
        { level: 'error', emit: 'stdout' },
        { level: 'warn', emit: 'stdout' },
    ],
    errorFormat: 'pretty',
    // datasourceUrl can be set via env; connection_limit controls the pool size.
    // SQLite is single-writer so we keep pool small to avoid write contention.
})

// Track connection state
let isConnected = false
let connectionAttempts = 0
const MAX_RECONNECT_ATTEMPTS = 5
const RECONNECT_DELAY = 1000

// Initialize connection
async function connect() {
    try {
        await prisma.$connect()
        isConnected = true
        connectionAttempts = 0
        console.log('Database connected successfully')
    } catch (error) {
        isConnected = false
        console.error('Database connection failed:', error.message)

        if (connectionAttempts < MAX_RECONNECT_ATTEMPTS) {
            connectionAttempts++
            console.log(`Retrying connection (attempt ${connectionAttempts}/${MAX_RECONNECT_ATTEMPTS})...`)
            setTimeout(connect, RECONNECT_DELAY * connectionAttempts)
        } else {
            console.error('Max reconnection attempts reached. Database unavailable.')
        }
    }
}

// Graceful disconnect
async function disconnect() {
    try {
        await prisma.$disconnect()
        isConnected = false
        console.log('Database disconnected')
    } catch (error) {
        console.error('Error disconnecting from database:', error.message)
    }
}

// Health check function
async function healthCheck() {
    try {
        await prisma.$queryRaw`SELECT 1`
        return { ok: true, connected: true }
    } catch (error) {
        isConnected = false
        // Try to reconnect
        connect().catch(() => {})
        return { ok: false, connected: false, error: error.message }
    }
}

// Wrapper for safe database operations with automatic retry
async function withRetry(operation, maxRetries = 3) {
    let lastError
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation()
        } catch (error) {
            lastError = error

            // Check if it's a connection error
            const isConnectionError =
                error.message?.includes('Can\'t reach database') ||
                error.message?.includes('Connection') ||
                error.message?.includes('ECONNREFUSED') ||
                error.message?.includes('SQLITE_BUSY') ||
                error.code === 'P1001' ||
                error.code === 'P1002' ||
                error.code === 'P1008' ||
                error.code === 'P1017'

            if (isConnectionError && attempt < maxRetries) {
                console.warn(`Database operation failed (attempt ${attempt}/${maxRetries}), retrying...`)
                await new Promise(resolve => setTimeout(resolve, 100 * attempt))
                // Try to reconnect
                await connect().catch(() => {})
            } else {
                throw error
            }
        }
    }
    throw lastError
}

// Enable WAL mode for SQLite — allows concurrent reads alongside writes.
// PRAGMA journal_mode=WAL returns a result set, so we use $queryRawUnsafe.
async function enableWAL() {
    try {
        // These PRAGMAs return rows, so use queryRaw (not executeRaw)
        await prisma.$queryRawUnsafe('PRAGMA journal_mode=WAL')
        await prisma.$queryRawUnsafe('PRAGMA synchronous=NORMAL')
        await prisma.$queryRawUnsafe('PRAGMA cache_size=-64000')  // 64 MB page cache
        await prisma.$queryRawUnsafe('PRAGMA temp_store=MEMORY')
        await prisma.$queryRawUnsafe('PRAGMA mmap_size=268435456') // 256 MB mmap
        console.log('SQLite WAL mode + performance pragmas enabled')
    } catch (err) {
        console.warn('Could not enable WAL mode:', err.message)
    }
}

// Initialize connection on module load
connect().then(() => enableWAL()).catch(console.error)

// Handle process termination
process.on('beforeExit', async () => {
    await disconnect()
})

module.exports = {
    prisma,
    connect,
    disconnect,
    healthCheck,
    withRetry,
    isConnected: () => isConnected
}