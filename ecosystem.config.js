/**
 * SparkHub PM2 Ecosystem Configuration
 *
 * Usage:
 *   pm2 start ecosystem.config.js             # production
 *   pm2 start ecosystem.config.js --env dev   # dev (watch mode)
 *   pm2 reload ecosystem.config.js            # zero-downtime reload
 *   pm2 save && pm2 startup                   # persist across reboots
 *
 * Multi-machine: copy this file to each node. The backend app_instance_var
 * causes each worker to bind to a unique PORT when INSTANCES > 1, so you
 * can place nginx/Caddy in front as a load balancer.
 */

const path = require("path");

// Detect multi-core mode — override with BACKEND_INSTANCES env var
const backendInstances = parseInt(process.env.BACKEND_INSTANCES || "1", 10);

module.exports = {
    apps: [
        // ─── Backend (Express + Prisma) ────────────────────────────────────
        {
            name: "sparkhub-backend",
            script: path.join(__dirname, "backend", "src", "server.js"),
            cwd: path.join(__dirname, "backend"),

            // Scale: 1 = single process, "max" = one per CPU core
            instances: backendInstances,
            exec_mode: backendInstances > 1 ? "cluster" : "fork",

            // Auto-restart on crash
            autorestart: true,
            max_restarts: 20,          // stop restarting after 20 failures (avoids restart loop)
            min_uptime: "10s",          // must stay up 10 s to count as a "successful" start
            restart_delay: 3000,        // wait 3 s before each restart attempt
            exp_backoff_restart_delay: 100, // exponential backoff: 100ms → 200 → 400 → ...

            // Memory guard — restart if RSS exceeds this
            max_memory_restart: "512M",

            // Watch (dev only — disabled in prod)
            watch: false,
            ignore_watch: ["node_modules", "uploads", "prisma/*.db*", "*.log"],

            // Log files — rotate daily
            output: path.join(__dirname, "logs", "backend-out.log"),
            error:  path.join(__dirname, "logs", "backend-err.log"),
            merge_logs: true,
            log_date_format: "YYYY-MM-DD HH:mm:ss Z",

            // Environment — production defaults
            env: {
                NODE_ENV: "production",
                PORT: 4000,
            },
            env_dev: {
                NODE_ENV: "development",
                PORT: 4000,
            },
        },

        // ─── Frontend (Next.js) ────────────────────────────────────────────
        {
            name: "sparkhub-frontend",
            script: "npm",
            args: "start",
            cwd: path.join(__dirname, "frontend"),

            instances: 1,
            exec_mode: "fork",

            autorestart: true,
            max_restarts: 20,
            min_uptime: "10s",
            restart_delay: 5000,        // Next.js starts slower; give it a moment
            exp_backoff_restart_delay: 200,

            max_memory_restart: "1G",

            watch: false,

            output: path.join(__dirname, "logs", "frontend-out.log"),
            error:  path.join(__dirname, "logs", "frontend-err.log"),
            merge_logs: true,
            log_date_format: "YYYY-MM-DD HH:mm:ss Z",

            env: {
                NODE_ENV: "production",
                PORT: 3000,
            },
            env_dev: {
                NODE_ENV: "development",
                PORT: 3000,
            },
        },
    ],
};
