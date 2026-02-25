const { spawnSync } = require('node:child_process')
const cluster = require('node:cluster')

let synced = false

function run(cmd, args) {
    const result = spawnSync(cmd, args, {
        stdio: 'inherit',
        env: process.env,
        shell: process.platform === 'win32',
    })
    if (result.status !== 0) {
        throw new Error(`${cmd} ${args.join(' ')} failed with code ${result.status}`)
    }
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

async function retryMigrate(retries = 5, delayMs = 1000) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        const result = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
            stdio: 'pipe',
            env: process.env,
            shell: process.platform === 'win32',
        })
        if (result.status === 0) return true

        const stderr = result.stderr?.toString() || ''
        const isLocked = stderr.includes('database is locked') || stderr.includes('SQLITE_BUSY')

        if (isLocked && attempt < retries) {
            console.warn(`[prisma-sync] DB locked, retrying in ${delayMs}ms (attempt ${attempt}/${retries})…`)
            await sleep(delayMs)
            delayMs *= 2 // exponential backoff
        } else {
            // Print output so the error is visible, then give up non-fatally
            if (result.stdout) process.stdout.write(result.stdout)
            if (result.stderr) process.stderr.write(result.stderr)
            return false
        }
    }
    return false
}

async function ensurePrismaSync() {
    if (synced) return
    if (process.env.PRISMA_SKIP_SYNC === 'true') { synced = true; return }

    // In cluster mode only the primary should run migrations —
    // workers share the same DB file and would race each other
    if (cluster.isWorker) { synced = true; return }

    synced = true

    if (!process.env.DATABASE_URL) {
        process.env.DATABASE_URL = 'file:./dev.db'
    }

    try {
        run('npx', ['prisma', 'generate'])
    } catch (err) {
        console.warn('[prisma-sync] prisma generate failed:', err.message)
    }

    const ok = await retryMigrate()
    if (!ok) {
        console.warn('[prisma-sync] migrate deploy failed after retries — server will still start, but schema may be out of date.')
    }
}

module.exports = { ensurePrismaSync }
