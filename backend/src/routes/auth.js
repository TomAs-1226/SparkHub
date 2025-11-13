// backend/src/routes/auth.js
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const { requireAuth } = require("../middleware/auth");

const prisma = new PrismaClient();
const router = express.Router();

// Helpers
function normalizeEmail(v) {
    return (v || "").trim().toLowerCase();
}
function signToken(user) {
    return jwt.sign(
        { id: user.id, role: user.role, name: user.name },
        process.env.JWT_SECRET,
        { expiresIn: "7d" },
    );
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

        const user = await prisma.user.create({
            data: { email, password: hash, name, role },
            select: { id: true, email: true, name: true, role: true, avatarUrl: true },
        });

        const token = signToken(user);
        return res.json({ ok: true, token, user });
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

        const token = signToken(user);
        const { id, email, name, role, avatarUrl } = user;
        return res.json({ ok: true, token, user: { id, email, name, role, avatarUrl } });
    } catch (err) {
        console.error("LOGIN ERROR:", err);
        return res.status(500).json({ ok: false, msg: "Server error." });
    }
});

/** GET /auth/me  (Authorization: Bearer <token>) */
router.get("/me", async (req, res) => {
    try {
        const hdr = req.headers.authorization || "";
        const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : null;
        if (!token) return res.status(401).json({ ok: false, msg: "No token." });

        const payload = jwt.verify(token, process.env.JWT_SECRET);
        const user = await prisma.user.findUnique({
            where: { id: payload.id || payload.uid },
            select: { id: true, email: true, name: true, role: true, avatarUrl: true },
        });
        if (!user) return res.status(404).json({ ok: false, msg: "User not found." });

        return res.json({ ok: true, user });
    } catch (err) {
        return res.status(401).json({ ok: false, msg: "Invalid token." });
    }
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
        const user = await prisma.user.update({
            where: { id: req.user.id },
            data: next,
            select: { id: true, email: true, name: true, role: true, avatarUrl: true },
        });
        return res.json({ ok: true, user });
    } catch (err) {
        console.error("UPDATE PROFILE ERROR:", err);
        return res.status(500).json({ ok: false, msg: "Server error." });
    }
});

module.exports = router;