# SparkHub — Scaling & Multi-Node Deployment

## Single server (default)

Run `bash deploy.sh` on one machine. PM2 manages both processes and restarts them automatically after any crash or reboot.

```
[Users] → nginx :80 → frontend :3000
                     → backend  :4000
```

---

## Multi-core scaling (same machine)

Run multiple backend workers on one machine using Node.js cluster mode:

```bash
# In backend/.env
BACKEND_INSTANCES=4     # or "max" for one per CPU core
ENABLE_CLUSTER=true
```

Then `pm2 start ecosystem.config.js --update-env` or re-run `deploy.sh`.

---

## Multi-server / multi-datacenter

### Step 1 — Shared database

SQLite is file-based and **cannot be shared across machines**. Choose one:

| Option | Effort | Notes |
|---|---|---|
| **NFS shared volume** | Low | Mount same `dev.db` on all nodes via NFS/SMB. Degrades under write load. |
| **PostgreSQL** | Medium | Best for production. Change `DATABASE_URL` to `postgresql://...` and run `prisma migrate`. |
| **Turso (distributed SQLite)** | Low | Change `DATABASE_URL` to `libsql://your-db.turso.io` and swap `@prisma/client` for `@prisma/adapter-libsql`. |

#### Migrate to PostgreSQL

```bash
# 1. Install postgres adapter
cd backend && npm install pg

# 2. Update backend/prisma/schema.prisma
#    Change:  provider = "sqlite"
#    To:      provider = "postgresql"

# 3. Update DATABASE_URL in backend/.env
DATABASE_URL="postgresql://user:password@db-host:5432/sparkhub"

# 4. Apply schema
npx prisma migrate deploy
```

---

### Step 2 — Shared uploads

All nodes must serve the same uploaded files. Options:

- **NFS**: Mount a shared network drive at `UPLOAD_DIR` on each node.
- **Cloudflare R2 / S3**: Modify `backend/src/routes/upload.js` to store to object storage instead of disk. (Return the public CDN URL as the file URL — the frontend already stores URLs, not files.)

---

### Step 3 — Deploy each node

On each server, clone the repo and run:

```bash
git clone https://github.com/TomAs-1226/SparkHub.git
cd SparkHub
# Edit backend/.env with shared DATABASE_URL, shared UPLOAD_DIR mount, same JWT_SECRET
bash deploy.sh
```

All nodes must share the same `JWT_SECRET` so tokens issued on one node are valid on others.

---

### Step 4 — Load balancer

Use `deploy/nginx-multi-node.conf` as your nginx config on a separate load balancer node. Replace `node-1-ip` / `node-2-ip` with your actual server IPs.

```
[Users] → nginx LB :80
             ├── frontend node-1 :3000
             ├── frontend node-2 :3000
             ├── backend  node-1 :4000
             └── backend  node-2 :4000
                              ↓
                     [Shared PostgreSQL]
                     [Shared NFS/S3 uploads]
```

PM2 on each node provides:
- **Auto-restart** on process crash
- **Exponential backoff** (prevents restart storm)
- **Memory limit** (restarts if RSS > 512 MB backend / 1 GB frontend)
- **Boot persistence** via `pm2 startup` / `pm2 save`

nginx provides:
- **Health-check failover** — dead nodes are removed from rotation automatically
- **Zero-downtime deploys** — `pm2 reload ecosystem.config.js` drains connections before restarting

---

## Health endpoints

| Endpoint | Purpose |
|---|---|
| `GET /api/healthz` | Liveness — returns `{ ok, status, database, uptime }` |
| `GET /api/readyz` | Readiness — 503 if DB is unavailable |

Use `/healthz` as your load balancer health check URL.

---

## Log management

Logs are written to `./logs/` and rotated automatically by `pm2-logrotate`.

```bash
pm2 logs                    # tail all logs
pm2 logs sparkhub-backend   # backend only
pm2 flush                   # clear all logs
```
