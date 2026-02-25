#!/usr/bin/env bash
# SparkHub One-Command Deployment Script  v0.3.0
# Usage: bash deploy.sh [--dev]
set -e

# Colors
GREEN='\033[0;32m'; TEAL='\033[0;36m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'

DEV_MODE=false
for arg in "$@"; do [[ "$arg" == "--dev" ]] && DEV_MODE=true; done

echo -e "${TEAL}"
echo "  ╔═══════════════════════════════════════╗"
echo "  ║    SparkHub Deployment Script         ║"
echo "  ║    v0.3.0 (build 20260225.A)          ║"
echo "  ║    macOS / Linux                      ║"
echo "  ╚═══════════════════════════════════════╝"
echo -e "${NC}"

# Check Node.js >= 18
NODE_VER=$(node -e "process.exit(parseInt(process.version.slice(1)) >= 18 ? 0 : 1)" 2>/dev/null && echo "ok" || echo "fail")
if [[ "$NODE_VER" == "fail" ]]; then
  echo -e "${RED}Error: Node.js 18 or later is required. Install from https://nodejs.org${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Node.js $(node --version)${NC}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Copy .env files if they don't exist
[[ -f "backend/.env.example" && ! -f "backend/.env" ]] && cp backend/.env.example backend/.env && echo -e "${YELLOW}Created backend/.env from example — please edit it.${NC}"
[[ -f "frontend/.env.local.example" && ! -f "frontend/.env.local" ]] && cp frontend/.env.local.example frontend/.env.local && echo -e "${YELLOW}Created frontend/.env.local from example.${NC}"

# Ensure NODE_ENV=production in backend/.env (production mode disables test routes)
if [[ -f "backend/.env" ]]; then
  if ! grep -q "^NODE_ENV=" backend/.env; then
    echo "NODE_ENV=production" >> backend/.env
    echo -e "${GREEN}✓ Added NODE_ENV=production to backend/.env${NC}"
  fi
fi

# Auto-generate ADMIN_PIN if not set
if [[ -f "backend/.env" ]]; then
  if ! grep -q "^ADMIN_PIN=" backend/.env; then
    GENERATED_PIN=$((RANDOM % 900000 + 100000))
    echo "ADMIN_PIN=${GENERATED_PIN}" >> backend/.env
    echo -e "${YELLOW}"
    echo "  ┌─────────────────────────────────────────┐"
    echo "  │  ADMIN PIN generated: ${GENERATED_PIN}            │"
    echo "  │  Save this — you need it to access /admin │"
    echo "  └─────────────────────────────────────────┘"
    echo -e "${NC}"
  fi
fi

# Remind about optional GEMINI_API_KEY
if [[ -f "backend/.env" ]] && ! grep -q "^GEMINI_API_KEY=" backend/.env; then
  echo -e "${YELLOW}Tip: Add GEMINI_API_KEY to backend/.env for real AI responses.${NC}"
  echo -e "${YELLOW}     Free key at: https://aistudio.google.com/app/apikey${NC}"
fi

echo -e "\n${TEAL}Installing dependencies…${NC}"
npm install --prefix backend --legacy-peer-deps &
npm install --prefix frontend --legacy-peer-deps &
wait
echo -e "${GREEN}✓ Dependencies installed${NC}"

echo -e "\n${TEAL}Syncing database…${NC}"
cd backend
npx prisma db push --skip-generate
cd "$SCRIPT_DIR"
echo -e "${GREEN}✓ Database ready${NC}"

# Install PM2 if missing
if ! command -v pm2 &>/dev/null; then
  echo -e "${YELLOW}Installing PM2…${NC}"
  npm install -g pm2
fi

# Install pm2-logrotate for automatic log rotation if not already installed
pm2 install pm2-logrotate 2>/dev/null || true

# Ensure logs directory exists
mkdir -p "$SCRIPT_DIR/logs"

if [[ "$DEV_MODE" == "false" ]]; then
  echo -e "\n${TEAL}Building frontend for production…${NC}"
  cd frontend && npm run build && cd "$SCRIPT_DIR"
fi

echo -e "\n${TEAL}Starting servers with PM2 ecosystem…${NC}"

# Stop existing instances gracefully
pm2 delete sparkhub-backend sparkhub-frontend 2>/dev/null || true

if [[ "$DEV_MODE" == "true" ]]; then
  pm2 start ecosystem.config.js --env dev
  echo -e "\n${GREEN}✓ SparkHub v0.3.0 running in dev mode${NC}"
else
  pm2 start ecosystem.config.js
  echo -e "\n${GREEN}✓ SparkHub v0.3.0 running in production mode${NC}"
fi

# Save process list so PM2 restarts everything on reboot
pm2 save

# Register PM2 as a system service (auto-restart after machine reboot/crash)
echo -e "\n${TEAL}Registering PM2 system service…${NC}"
PM2_STARTUP=$(pm2 startup 2>&1 | grep -E "sudo|systemctl" | tail -1)
if [[ -n "$PM2_STARTUP" ]]; then
  eval "$PM2_STARTUP" 2>/dev/null || echo -e "${YELLOW}Run this manually to enable boot persistence:${NC}\n  $PM2_STARTUP${NC}"
fi

echo -e "\n${TEAL}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  SparkHub v0.3.0 (build 20260225.A)"
echo -e "  Backend:  http://localhost:4000"
echo -e "  Frontend: http://localhost:3000"
echo -e "  Admin:    http://localhost:3000/admin"
echo -e "  Health:   http://localhost:4000/healthz"
echo -e "  Logs:     pm2 logs  |  ./logs/"
echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
pm2 list
