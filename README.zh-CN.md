# SparkHub 部署指南

欢迎使用 SparkHub！这是一个完整的在线教育平台，包含课程管理、导师配对、活动组织、机会发布等功能。

---

## 目录

1. [系统要求](#系统要求)
2. [快速开始](#快速开始)
3. [项目结构](#项目结构)
4. [后端配置](#后端配置)
5. [前端配置](#前端配置)
6. [环境变量详解](#环境变量详解)
7. [数据库设置](#数据库设置)
8. [启动应用](#启动应用)
9. [生产部署](#生产部署)
10. [常见问题](#常见问题)

---

## 系统要求

在开始之前，请确保您的系统已安装以下软件：

| 软件 | 最低版本 | 说明 |
|------|----------|------|
| Node.js | 18.18+ | JavaScript 运行环境 |
| npm | 9.0+ | 包管理器（随 Node.js 安装） |
| Git | 2.0+ | 版本控制工具 |

### 验证安装

```bash
# 检查 Node.js 版本
node --version

# 检查 npm 版本
npm --version

# 检查 Git 版本
git --version
```

---

## 快速开始

### 1. 克隆仓库

```bash
git clone https://github.com/TomAs-1226/SparkHub.git
cd SparkHub
```

### 2. 安装依赖

```bash
# 安装后端依赖
cd backend
npm install

# 安装前端依赖
cd ../frontend
npm install
```

### 3. 配置环境变量

```bash
# 返回后端目录，创建环境配置文件
cd ../backend

# 创建 .env 文件（详见下方配置说明）
cp .env.example .env  # 如果有示例文件
# 或手动创建
touch .env
```

### 4. 初始化数据库

```bash
# 在 backend 目录下运行
npx prisma generate
npx prisma db push
```

### 5. 启动应用

打开**两个终端窗口**：

**终端 1 - 启动后端：**
```bash
cd backend
npm run dev
```

**终端 2 - 启动前端：**
```bash
cd frontend
npm run dev
```

### 6. 访问应用

- 前端界面：http://localhost:3000
- 后端 API：http://localhost:4000
- API 健康检查：http://localhost:4000/healthz

---

## 项目结构

```
SparkHub/
├── backend/                 # 后端服务 (Express.js)
│   ├── prisma/             # 数据库配置
│   │   ├── schema.prisma   # 数据库模型定义
│   │   ├── migrations/     # 数据库迁移文件
│   │   └── dev.db          # SQLite 数据库文件
│   ├── src/
│   │   ├── routes/         # API 路由
│   │   ├── middleware/     # 中间件（认证等）
│   │   ├── utils/          # 工具函数
│   │   └── server.js       # 主入口文件
│   ├── uploads/            # 上传文件存储目录
│   ├── .env                # 环境变量配置 ⚠️ 需要创建
│   └── package.json
│
├── frontend/               # 前端应用 (Next.js 15)
│   ├── src/
│   │   ├── app/           # 页面路由
│   │   ├── components/    # React 组件
│   │   ├── lib/           # 工具库
│   │   └── contexts/      # React 上下文
│   ├── next.config.ts     # Next.js 配置
│   └── package.json
│
└── README.zh-CN.md        # 本文档
```

---

## 后端配置

### 创建 `.env` 文件

在 `backend/` 目录下创建 `.env` 文件：

```bash
cd backend
nano .env  # 或使用您喜欢的编辑器
```

### 必需的环境变量

```ini
# ==========================================
# 数据库配置（必需）
# ==========================================
DATABASE_URL="file:./dev.db"

# ==========================================
# JWT 密钥（必需 - 生产环境必须修改）
# ==========================================
# 用于用户认证的密钥，请使用随机生成的长字符串
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

# ==========================================
# 服务器配置
# ==========================================
PORT=4000
NODE_ENV=development

# 前端地址（用于 CORS 配置）
FRONTEND_URL=http://localhost:3000
# 多个前端地址用逗号分隔
# FRONTEND_ORIGINS=http://localhost:3000,https://yourdomain.com
```

### 可选的环境变量

```ini
# ==========================================
# 邮件服务配置（可选 - 启用邮件通知）
# ==========================================
# SMTP 服务器设置
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_SECURE=false                    # 端口 465 设为 true
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password
MAIL_FROM="SparkHub <noreply@sparkhub.dev>"

# 邮件中的 Logo 图片（可选）
# EMAIL_LOGO_URL=https://yourcdn.com/logo.png

# ==========================================
# 管理员配置（可选）
# ==========================================
# 管理员注册密钥（用于创建管理员账户）
ADMIN_REG_SECRET=choose-a-long-random-string

# ==========================================
# 性能与安全配置（可选）
# ==========================================
# 请求超时时间（毫秒）
REQUEST_TIMEOUT_MS=30000

# 速率限制（每时间窗口最大请求数）
RATE_LIMIT_MAX_REQUESTS=1800

# 上传文件目录
UPLOAD_DIR=./uploads

# ==========================================
# 高级配置（可选）
# ==========================================
# 启用集群模式（多核 CPU 利用）
# ENABLE_CLUSTER=true
# WEB_CONCURRENCY=4

# 启用负载限制（防止服务器过载）
# ENABLE_LOAD_SHED=true
# TOOBUSY_MAX_LAG_MS=120

# 视频会议服务地址
MEET_BASE=https://meet.jit.si
```

---

## 前端配置

前端通过 Next.js 的 rewrites 功能代理 API 请求，**默认情况下无需额外配置**。

### 可选的前端环境变量

如果后端不在默认地址运行，可在 `frontend/` 目录创建 `.env.local` 文件：

```ini
# 后端 API 地址（仅在后端不是 localhost:4000 时需要）
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000

# 网站 URL（用于生成分享链接等）
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

---

## 环境变量详解

### 核心变量说明

| 变量名 | 必需 | 默认值 | 说明 |
|--------|------|--------|------|
| `DATABASE_URL` | ✅ | `file:./dev.db` | 数据库连接字符串 |
| `JWT_SECRET` | ✅ | 开发用默认值 | JWT 签名密钥，**生产环境必须修改** |
| `PORT` | ❌ | `4000` | 后端服务端口 |
| `FRONTEND_URL` | ❌ | - | 前端地址，用于 CORS 和邮件链接 |

### 邮件服务说明

SparkHub 支持以下邮件功能：
- 用户注册验证邮件
- 密码重置邮件
- 每周学习摘要

**推荐的 SMTP 服务提供商：**

| 提供商 | 适用场景 | 配置示例 |
|--------|----------|----------|
| [Mailtrap](https://mailtrap.io) | 开发测试 | 提供测试收件箱 |
| [SendGrid](https://sendgrid.com) | 生产环境 | 免费额度较大 |
| [阿里云邮件推送](https://www.aliyun.com/product/directmail) | 国内用户 | 需实名认证 |
| [腾讯企业邮箱](https://exmail.qq.com) | 国内用户 | 需企业认证 |

**Gmail SMTP 配置示例：**
```ini
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password  # 需要使用应用专用密码
```

> ⚠️ **注意**：Gmail 需要开启"低安全性应用访问"或使用应用专用密码

---

## 数据库设置

SparkHub 使用 **Prisma ORM** 和 **SQLite** 数据库（开发环境）。

### 初始化数据库

```bash
cd backend

# 生成 Prisma 客户端
npx prisma generate

# 推送数据库结构（创建表）
npx prisma db push
```

### 查看数据库

```bash
# 打开 Prisma Studio（可视化数据库管理）
npx prisma studio
```

浏览器访问 http://localhost:5555 查看和编辑数据。

### 重置数据库

```bash
# 删除所有数据并重新创建表
npx prisma db push --force-reset
```

### 生产环境数据库

对于生产环境，建议使用 PostgreSQL 或 MySQL：

1. 修改 `prisma/schema.prisma`：
```prisma
datasource db {
  provider = "postgresql"  // 或 "mysql"
  url      = env("DATABASE_URL")
}
```

2. 更新 `.env`：
```ini
# PostgreSQL 示例
DATABASE_URL="postgresql://user:password@localhost:5432/sparkhub?schema=public"

# MySQL 示例
DATABASE_URL="mysql://user:password@localhost:3306/sparkhub"
```

3. 重新生成并迁移：
```bash
npx prisma generate
npx prisma db push
```

---

## 启动应用

### 开发模式

**方式 1：分别启动（推荐用于开发调试）**

```bash
# 终端 1 - 后端
cd backend
npm run dev

# 终端 2 - 前端
cd frontend
npm run dev
```

**方式 2：使用脚本同时启动**

在项目根目录创建 `start-dev.sh`：

```bash
#!/bin/bash
# 同时启动前后端
cd backend && npm run dev &
cd frontend && npm run dev &
wait
```

运行：
```bash
chmod +x start-dev.sh
./start-dev.sh
```

### 生产模式

```bash
# 后端
cd backend
npm start

# 前端（需先构建）
cd frontend
npm run build
npm start
```

---

## 生产部署

### 使用 PM2 管理进程

```bash
# 安装 PM2
npm install -g pm2

# 启动后端
cd backend
pm2 start src/server.js --name sparkhub-api

# 构建并启动前端
cd frontend
npm run build
pm2 start npm --name sparkhub-web -- start

# 保存进程列表（开机自启）
pm2 save
pm2 startup
```

### Docker 部署（可选）

创建 `docker-compose.yml`：

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "4000:4000"
    environment:
      - DATABASE_URL=file:./dev.db
      - JWT_SECRET=${JWT_SECRET}
      - NODE_ENV=production
    volumes:
      - ./backend/uploads:/app/uploads
      - ./backend/prisma/dev.db:/app/prisma/dev.db

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_BASE_URL=http://backend:4000
    depends_on:
      - backend
```

### Nginx 反向代理配置

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # 前端
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # API 代理
    location /api/ {
        proxy_pass http://localhost:4000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # 上传文件
    location /uploads/ {
        proxy_pass http://localhost:4000/uploads/;
    }
}
```

---

## 常见问题

### Q1: 启动后端时提示 "EADDRINUSE: address already in use"

端口被占用，解决方法：

```bash
# 查找占用端口的进程
lsof -i :4000

# 结束该进程
kill -9 <PID>

# 或更改端口
PORT=4001 npm run dev
```

### Q2: 前端无法连接后端 API

1. 确认后端已启动并运行在 http://localhost:4000
2. 检查 CORS 配置：
   ```ini
   # backend/.env
   FRONTEND_URL=http://localhost:3000
   ```
3. 查看浏览器控制台错误信息

### Q3: 数据库错误 "table does not exist"

运行数据库迁移：
```bash
cd backend
npx prisma db push
```

### Q4: 邮件发送失败

1. 确认 SMTP 配置正确
2. 检查服务器日志中的错误信息
3. 测试 SMTP 连接：
   ```bash
   # 使用 telnet 测试
   telnet smtp.yourprovider.com 587
   ```

### Q5: 如何创建管理员账户？

1. 设置管理员密钥：
   ```ini
   # backend/.env
   ADMIN_REG_SECRET=your-secret-key
   ```

2. 注册时使用该密钥创建管理员账户

### Q6: 上传文件失败

1. 确认 `uploads` 目录存在且有写入权限：
   ```bash
   cd backend
   mkdir -p uploads
   chmod 755 uploads
   ```

2. 检查文件大小限制（默认 1MB）

### Q7: 如何备份数据？

```bash
# SQLite 数据库备份
cp backend/prisma/dev.db backend/prisma/dev.db.backup

# 上传文件备份
tar -czf uploads-backup.tar.gz backend/uploads/
```

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | Next.js 15 + React 19 |
| 样式 | Tailwind CSS v4 |
| 动画 | Framer Motion |
| 图标 | Lucide React |
| 后端框架 | Express.js 5 |
| 数据库 ORM | Prisma |
| 数据库 | SQLite (开发) / PostgreSQL (生产) |
| 认证 | JWT (JSON Web Tokens) |
| 邮件 | Nodemailer |

---

## 获取帮助

如果您在部署过程中遇到问题：

1. 查看 [GitHub Issues](https://github.com/TomAs-1226/SparkHub/issues)
2. 提交新的 Issue 描述您的问题
3. 确保提供：
   - 操作系统和 Node.js 版本
   - 完整的错误信息
   - 您尝试过的解决方法

---

**祝您使用愉快！** 🚀
