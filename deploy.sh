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

echo -e "\n${TEAL}Starting servers with PM2…${NC}"
pm2 delete sparkhub-backend sparkhub-frontend 2>/dev/null || true

NODE_ENV=production pm2 start backend/src/server.js --name sparkhub-backend --node-args="--max-old-space-size=512"

if [[ "$DEV_MODE" == "true" ]]; then
  pm2 start "npm run dev" --name sparkhub-frontend --cwd "$SCRIPT_DIR/frontend"
  echo -e "\n${GREEN}✓ SparkHub v0.3.0 running in dev mode${NC}"
else
  echo -e "\n${TEAL}Building frontend for production…${NC}"
  cd frontend && npm run build && cd "$SCRIPT_DIR"
  pm2 start "npm start" --name sparkhub-frontend --cwd "$SCRIPT_DIR/frontend"
  echo -e "\n${GREEN}✓ SparkHub v0.3.0 running in production mode${NC}"
fi

pm2 save
pm2 startup 2>/dev/null | tail -1 | grep -E "sudo" | bash 2>/dev/null || true

echo -e "\n${TEAL}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  SparkHub v0.3.0 (build 20260225.A)"
echo -e "  Backend:  http://localhost:4000"
echo -e "  Frontend: http://localhost:3000"
echo -e "  Admin:    http://localhost:3000/admin"
echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
pm2 list
