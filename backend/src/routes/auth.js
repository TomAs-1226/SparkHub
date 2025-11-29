// backend/src/routes/auth.js
const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { requireAuth, signToken } = require("../middleware/auth");
const { sendPasswordResetEmail, sendVerificationEmail } = require("../utils/email");
const { isUnknownFieldError, cloneArgs } = require("../utils/prisma-compat");
const { prisma } = require("../prisma");
const { startExclusiveSession } = require("../utils/sessions");
const baseUserSelect = { id: true, email: true, name: true, role: true, avatarUrl: true, emailVerified: true };
const legacyUserSelect = (({ avatarUrl, ...rest }) => rest)(baseUserSelect);

async function runUserQuery(method, args, allowAvatar = true) {
    const baseArgs = cloneArgs(args);
    const select = allowAvatar ? baseUserSelect : legacyUserSelect;
    const finalArgs = { ...baseArgs, select };
    try {
        return await prisma.user[method](finalArgs);
    } catch (error) {
        if (allowAvatar && isUnknownFieldError(error)) {
            return runUserQuery(method, args, false);
        }
        throw error;
    }
}
const router = express.Router();

// Helpers
function normalizeEmail(v) {
    return (v || "").trim().toLowerCase();
}
async function issueExclusiveSession(user, req) {
    const session = await startExclusiveSession(user.id, {
        userAgent: req.get("user-agent"),
        ipAddress: req.ip,
    });
    const token = signToken(user, session.id);
    return { session, token };
}

function generateResetToken() {
    return crypto.randomBytes(32).toString("hex");
}

const RESET_EXPIRATION_MS = 1000 * 60 * 60; // 1 hour
const STATIC_RESET_TOKEN = process.env.RESET_TEST_TOKEN || "always-on-reset-link";
const STATIC_RESET_ENABLED = String(process.env.RESET_TEST_TOKEN_DISABLED || "").toLowerCase() !== "true";
const VERIFY_EXPIRATION_MS = 1000 * 60 * 60 * 24; // 24 hours

function generateVerificationToken() {
    return crypto.randomBytes(24).toString("hex");
}

function generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

const ROLE_MAP = {
    learner: "STUDENT",
    student: "STUDENT",
    creator: "CREATOR",
    tutor: "TUTOR",
    mentor: "TUTOR",
    recruiter: "RECRUITER",
    admin: "ADMIN",
};

function normalizeRole(input) {
    if (!input) return "STUDENT";
    const key = String(input).trim().toLowerCase();
    return ROLE_MAP[key] || "STUDENT";
}

async function describeResetToken(token, emailHint) {
    if (!token) return { status: "invalid", message: "Token is required." };
    const record = await prisma.passwordResetToken.findUnique({ where: { token } });
    if (record) {
        if (record.usedAt) return { status: "used", message: "Reset link has already been used." };
        const expired = record.expiresAt.getTime() < Date.now();
        if (expired) return { status: "expired", message: "Reset link has expired.", expiresAt: record.expiresAt };
        const user = await runUserQuery("findUnique", { where: { id: record.userId } });
        return {
            status: "valid",
            expiresAt: record.expiresAt,
            user,
            token,
            testToken: false,
            requiresEmail: false,
        };
    }
    const normalizedEmail = emailHint ? normalizeEmail(emailHint) : "";
    const testEmail = normalizedEmail || normalizeEmail(process.env.RESET_TEST_EMAIL || "");
    if (STATIC_RESET_ENABLED && token === STATIC_RESET_TOKEN) {
        if (testEmail) {
            const user = await prisma.user.findUnique({ where: { email: testEmail } });
            if (user) {
                return { status: "valid", expiresAt: null, neverExpires: true, user, token, testToken: true, requiresEmail: false };
            }
        }
        return {
            status: "valid",
            expiresAt: null,
            neverExpires: true,
            user: null,
            token,
            testToken: true,
            requiresEmail: true,
            message: "Provide a user email with this link to reset their passcode.",
        };
    }
    return { status: "invalid", message: "Invalid reset link." };
}

async function issueVerificationForUser(user) {
    await prisma.emailVerificationToken.deleteMany({ where: { userId: user.id, usedAt: null } });
    const record = await prisma.emailVerificationToken.create({
        data: {
            userId: user.id,
            token: generateVerificationToken(),
            code: generateVerificationCode(),
            expiresAt: new Date(Date.now() + VERIFY_EXPIRATION_MS),
        },
    });
    await sendVerificationEmail(user, record.token, record.code);
    return record;
}

async function describeVerificationToken(token) {
    if (!token) return { status: "invalid", message: "Token is required." };
    const record = await prisma.emailVerificationToken.findUnique({
        where: { token },
        include: { user: { select: baseUserSelect } },
    });
    if (!record) return { status: "invalid", message: "Invalid verification link." };
    if (record.usedAt) return { status: "used", message: "This link has already been used." };
    const expired = record.expiresAt.getTime() < Date.now();
    if (expired) return { status: "expired", message: "Verification link has expired.", expiresAt: record.expiresAt, user: record.user };
    return { status: "valid", token, code: record.code, expiresAt: record.expiresAt, user: record.user };
}

async function completeVerification(record) {
    await prisma.$transaction([
        prisma.user.update({ where: { id: record.userId }, data: { emailVerified: true } }),
        prisma.emailVerificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
        prisma.emailVerificationToken.deleteMany({ where: { userId: record.userId, usedAt: null, NOT: { id: record.id } } }),
    ]);
    const user = await runUserQuery("findUnique", { where: { id: record.userId } });
    return user;
}

/**
 * POST /auth/register
 * Accepts: { email, name | username, password, role? }
 * Returns: { ok, token, user }
 */
router.post("/register", async (req, res) => {
    try {
        const email = normalizeEmail(req.body.email);
        const name =
            (req.body.name && String(req.body.name).trim()) ||
            (req.body.username && String(req.body.username).trim()) ||
            (email ? email.split("@")[0] : "");
        const password = String(req.body.password || "");
        const role = normalizeRole(req.body.role);

        if (!email || !password || !name) {
            return res.status(400).json({ ok: false, msg: "Missing email, password, or name." });
        }

        const exists = await prisma.user.findUnique({ where: { email } });
        if (exists) return res.status(400).json({ ok: false, msg: "Email already exists." });

        const hash = await bcrypt.hash(password, 10);

        const user = await runUserQuery("create", { data: { email, password: hash, name, role } });
        await prisma.emailPreference.create({ data: { userId: user.id } }).catch((err) => {
            console.warn("Failed to seed email preferences", err?.message);
        });
        const verification = await issueVerificationForUser(user).catch((err) => {
            console.warn("Failed to send verification email", err?.message);
            return null;
        });
        return res.status(201).json({
            ok: true,
            requiresVerification: true,
            email: user.email,
            expiresAt: verification?.expiresAt || null,
            msg: "Check your email for a verification link and code.",
        });
    } catch (err) {
        console.error("REGISTER ERROR:", err);
        return res.status(500).json({ ok: false, msg: "Server error." });
    }
});

/**
 * POST /auth/login
 * Accepts: { email? | username? | identity?, password }
 * - If identity contains '@' → treat as email
 * - Else try name (your “username” in the UI)
 * Returns: { ok, token, user }
 */
router.post("/login", async (req, res) => {
    try {
        const identity =
            (req.body.identity && String(req.body.identity).trim()) ||
            (req.body.email && String(req.body.email).trim()) ||
            (req.body.username && String(req.body.username).trim()) ||
            "";

        const password = String(req.body.password || "");
        if (!identity || !password) {
            return res.status(400).json({ ok: false, msg: "Missing identity or password." });
        }

        let user = null;
        if (identity.includes("@")) {
            user = await prisma.user.findUnique({
                where: { email: normalizeEmail(identity) },
            });
        }
        if (!user) {
            // If "name" is not unique in your schema, this picks the first match.
            user = await prisma.user.findFirst({
                where: { name: identity },
            });
        }

        if (!user) return res.status(404).json({ ok: false, msg: "User not found." });

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return res.status(401).json({ ok: false, msg: "Invalid credentials." });

        if (!user.emailVerified) {
            await issueVerificationForUser(user).catch((err) => console.warn("Failed to re-send verification", err?.message));
            return res.status(403).json({
                ok: false,
                msg: "Please verify your email to continue.",
                requiresVerification: true,
                email: user.email,
            });
        }

        const { token } = await issueExclusiveSession(user, req);
        const { id, email, name, role, avatarUrl } = user;
        return res.json({ ok: true, token, user: { id, email, name, role, avatarUrl } });
    } catch (err) {
        console.error("LOGIN ERROR:", err);
        return res.status(500).json({ ok: false, msg: "Server error." });
    }
});

router.post("/forgot", async (req, res) => {
    try {
        const email = normalizeEmail(req.body.email);
        if (!email) {
            return res.status(400).json({ ok: false, msg: "Email is required." });
        }
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.json({ ok: true, msg: "If the email exists we sent reset instructions." });
        }
        await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
        const token = generateResetToken();
        const expiresAt = new Date(Date.now() + RESET_EXPIRATION_MS);
        const record = await prisma.passwordResetToken.create({
            data: { userId: user.id, token, expiresAt },
        });
        await sendPasswordResetEmail(user, record.token);
        return res.json({
            ok: true,
            msg: "If the email exists we sent reset instructions.",
            expiresAt: record.expiresAt,
        });
    } catch (err) {
        console.error("FORGOT PASSWORD ERROR:", err);
        return res.status(500).json({ ok: false, msg: "Server error." });
    }
});

router.get("/reset-password/:token", async (req, res) => {
    const token = (req.params.token || "").trim();
    if (!token) return res.status(400).json({ ok: false, msg: "Token is required." });
    try {
        const description = await describeResetToken(token, req.query.email);
        if (description.status !== "valid") {
            return res.status(400).json({ ok: false, msg: description.message || "Invalid reset link.", ...description });
        }
        return res.json({ ok: true, ...description });
    } catch (err) {
        console.error("INSPECT RESET TOKEN ERROR:", err);
        return res.status(500).json({ ok: false, msg: "Server error." });
    }
});

router.post("/reset-password", async (req, res) => {
    const token = typeof req.body.token === "string" ? req.body.token.trim() : "";
    const email = typeof req.body.email === "string" ? req.body.email : "";
    const nextPassword = typeof req.body.password === "string" ? req.body.password : "";
    if (!token || nextPassword.length < 6) {
        return res.status(400).json({ ok: false, msg: "Token and 6+ character password are required." });
    }
    try {
        const record = await prisma.passwordResetToken.findUnique({ where: { token } });
        let targetUser = null;
        let skipTokenUpdate = false;
        if (record) {
            if (record.usedAt) {
                return res.status(400).json({ ok: false, msg: "Invalid or expired reset code." });
            }
            if (record.expiresAt.getTime() < Date.now()) {
                return res.status(400).json({ ok: false, msg: "Reset code has expired." });
            }
            targetUser = await runUserQuery("findUnique", { where: { id: record.userId } });
        } else if (STATIC_RESET_ENABLED && token === STATIC_RESET_TOKEN) {
            const resolvedEmail = normalizeEmail(email) || normalizeEmail(process.env.RESET_TEST_EMAIL || "");
            if (!resolvedEmail) {
                return res.status(400).json({ ok: false, msg: "Email is required when using the always-on test link." });
            }
            const user = await prisma.user.findUnique({ where: { email: resolvedEmail } });
            if (!user) return res.status(404).json({ ok: false, msg: "User not found for this reset link." });
            targetUser = user;
            skipTokenUpdate = true;
        } else {
            return res.status(400).json({ ok: false, msg: "Invalid or expired reset code." });
        }

        const hash = await bcrypt.hash(nextPassword, 10);
        if (skipTokenUpdate) {
            await prisma.user.update({ where: { id: targetUser.id }, data: { password: hash } });
        } else {
            await prisma.$transaction([
                prisma.user.update({ where: { id: targetUser.id }, data: { password: hash } }),
                prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
            ]);
        }
        const user = await runUserQuery("findUnique", { where: { id: targetUser.id } });
        const { token } = await issueExclusiveSession(user, req);
        return res.json({ ok: true, token, user });
    } catch (err) {
        console.error("RESET PASSWORD ERROR:", err);
        return res.status(500).json({ ok: false, msg: "Server error." });
    }
});

router.post("/verify-email/resend", async (req, res) => {
    const email = normalizeEmail(req.body.email || "");
    if (!email) return res.status(400).json({ ok: false, msg: "Email is required." });
    try {
        const user = await runUserQuery("findUnique", { where: { email } });
        if (!user) return res.json({ ok: true, msg: "If the account exists we re-sent verification." });
        if (user.emailVerified) {
            return res.json({ ok: true, alreadyVerified: true, email });
        }
        const verification = await issueVerificationForUser(user);
        return res.json({ ok: true, email, expiresAt: verification.expiresAt });
    } catch (err) {
        console.error("RESEND VERIFY ERROR:", err);
        return res.status(500).json({ ok: false, msg: "Server error." });
    }
});

router.get("/verify-email/:token", async (req, res) => {
    const token = (req.params.token || "").trim();
    if (!token) return res.status(400).json({ ok: false, msg: "Token is required." });
    try {
        const description = await describeVerificationToken(token);
        if (description.status !== "valid") {
            return res.status(400).json({ ok: false, msg: description.message || "Invalid verification link.", ...description });
        }
        return res.json({ ok: true, ...description });
    } catch (err) {
        console.error("INSPECT VERIFY TOKEN ERROR:", err);
        return res.status(500).json({ ok: false, msg: "Server error." });
    }
});

router.post("/verify-email/confirm", async (req, res) => {
    const token = typeof req.body.token === "string" ? req.body.token.trim() : "";
    const code = typeof req.body.code === "string" ? req.body.code.trim() : "";
    const email = typeof req.body.email === "string" ? normalizeEmail(req.body.email) : "";
    if (!token && (!code || !email)) {
        return res.status(400).json({ ok: false, msg: "Token or email+code is required." });
    }
    try {
        let record = null;
        if (token) {
            record = await prisma.emailVerificationToken.findUnique({ where: { token } });
        }
        if (!record && code && email) {
            record = await prisma.emailVerificationToken.findFirst({
                where: { code, user: { email } },
                orderBy: { createdAt: "desc" },
            });
        }
        if (!record) return res.status(400).json({ ok: false, msg: "Invalid or expired verification code." });
        if (record.usedAt) return res.status(400).json({ ok: false, msg: "This code has already been used." });
        if (record.expiresAt.getTime() < Date.now()) return res.status(400).json({ ok: false, msg: "Verification code has expired." });

        const user = await completeVerification(record);
        return res.json({ ok: true, verified: true, user });
    } catch (err) {
        console.error("CONFIRM VERIFY ERROR:", err);
        return res.status(500).json({ ok: false, msg: "Server error." });
    }
});

/** GET /auth/me  (Authorization: Bearer <token>) */
router.get("/me", requireAuth, async (req, res) => {
    const user = await runUserQuery("findUnique", { where: { id: req.user.id } });
    if (!user) return res.status(404).json({ ok: false, msg: "User not found." });
    return res.json({ ok: true, user });
});


router.patch("/me", requireAuth, async (req, res) => {
    try {
        const next = {};
        if (typeof req.body.name === "string" && req.body.name.trim()) {
            next.name = req.body.name.trim();
        }
        if (typeof req.body.avatarUrl === "string") {
            next.avatarUrl = req.body.avatarUrl.trim() || null;
        }
        if (Object.keys(next).length === 0) {
            return res.status(400).json({ ok: false, msg: "No updates provided." });
        }
        const user = await runUserQuery("update", { where: { id: req.user.id }, data: next });
        return res.json({ ok: true, user });
    } catch (err) {
        console.error("UPDATE PROFILE ERROR:", err);
        return res.status(500).json({ ok: false, msg: "Server error." });
    }
});

module.exports = router;