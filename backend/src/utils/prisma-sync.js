const { spawnSync } = require('node:child_process')

let synced = false

function run(cmd, args) {
    const result = spawnSync(cmd, args, {
        stdio: 'inherit',
        env: process.env,
        shell: process.platform === 'win32',
    })
    if (result.status !== 0) {
        const joined = `${cmd} ${args.join(' ')}`
        throw new Error(`${joined} failed with code ${result.status}`)
    }
}

function ensurePrismaSync() {
    if (synced) return
    if (process.env.PRISMA_SKIP_SYNC === 'true') {
        synced = true
        return
    }

    synced = true

    if (!process.env.DATABASE_URL) {
        process.env.DATABASE_URL = 'file:./dev.db'
    }

    try {
        run('npx', ['prisma', 'generate'])
        run('npx', ['prisma', 'migrate', 'deploy'])
    } catch (error) {
        console.warn('[prisma-sync] Skipping automatic Prisma sync:', error.message)
    }
}

module.exports = { ensurePrismaSync }
