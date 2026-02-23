/**
 * Content moderation utility for SparkHub LMS
 * Tier 1: Fast keyword/pattern-based filtering (always active, no external API needed)
 * Tier 2: Claude AI moderation if ANTHROPIC_API_KEY is configured (more nuanced)
 *
 * Philosophy: permissive by default — flag only clear violations to avoid
 * blocking legitimate educational discussion. Edge cases default to ALLOW.
 */

// ── Tier 1 —— Keyword / pattern lists ─────────────────────────────────────────

// Severe terms that should block the message outright (very short list to avoid false positives)
const BLOCK_PATTERNS = [
    /\b(kys|kill\s*your\s*self|end\s+your\s+life)\b/i,
    /\b(doxx(ing)?|dox\b)\b/i,
    /\b(n[i1]gg[ae3]r|ch[i1]nk|sp[i1]ck|r[a4]c[i1]st\s+slur)\b/i,
    /\b(suicide\s+method|how\s+to\s+harm|self[\s-]harm\s+tip)\b/i,
    // Spam patterns
    /(.)\1{12,}/,  // 12+ repeated characters — almost always spam
]

// Terms that get cleaned (replaced with ***) but message is not blocked
const CLEAN_PATTERNS = [
    /\b(shit|fuck|bitch|damn|crap|ass|bastard|piss|dick|cock|pussy|cunt|whore|slut)\b/gi,
]

// Spam signals (excessive caps, all emoji, etc.)
function isSpam(text = '') {
    if (!text) return false
    if (text.length < 5) return false

    // More than 80% uppercase letters (after stripping non-alpha)
    const letters = text.replace(/[^a-zA-Z]/g, '')
    if (letters.length > 8) {
        const upperRatio = (letters.match(/[A-Z]/g) || []).length / letters.length
        if (upperRatio > 0.80) return true
    }

    // Repeated short string (e.g. "lol" 10+ times)
    if (/^(.{2,6})\1{9,}$/.test(text.trim())) return true

    return false
}

/**
 * Tier-1 moderation — synchronous, no external calls
 * @param {string} text
 * @returns {{ allowed: boolean, cleaned: string, reason?: string, flagged?: boolean }}
 */
function tier1Moderate(text = '') {
    if (!text || typeof text !== 'string') return { allowed: true, cleaned: text || '' }

    const trimmed = text.trim()

    // Block check
    for (const pattern of BLOCK_PATTERNS) {
        if (pattern.test(trimmed)) {
            return {
                allowed: false,
                cleaned: trimmed,
                reason: 'Message contains content that violates community guidelines.',
            }
        }
    }

    // Spam check
    if (isSpam(trimmed)) {
        return {
            allowed: false,
            cleaned: trimmed,
            reason: 'Message appears to be spam. Please keep the channel relevant.',
        }
    }

    // Clean mild profanity
    let cleaned = trimmed
    for (const pattern of CLEAN_PATTERNS) {
        cleaned = cleaned.replace(pattern, (match) => '*'.repeat(match.length))
    }

    const wasCleaned = cleaned !== trimmed
    return {
        allowed: true,
        cleaned,
        flagged: wasCleaned,
    }
}

/**
 * Tier-2 moderation — uses Claude API if available.
 * Only called when ANTHROPIC_API_KEY is set in environment.
 * @param {string} text
 * @returns {Promise<{ allowed: boolean, reason?: string } | null>} null = skip (use tier-1 result)
 */
async function tier2Moderate(text = '') {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return null

    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 64,
                system: `You are a content moderator for an educational LMS platform (SparkHub).
Your job is to decide if a message is appropriate for a K-12/university learning environment.
Be PERMISSIVE — only block content that clearly violates safety: hate speech, harassment, doxxing, sexual content, or instructions for self-harm.
Normal educational discussion, mild frustration, debate, and criticism of ideas are all OK.
Reply with ONLY: ALLOW or BLOCK:<short reason under 80 chars>`,
                messages: [{ role: 'user', content: `Moderate this message: "${text.slice(0, 500)}"` }],
            }),
            signal: AbortSignal.timeout(5000), // 5s timeout — don't block the request
        })

        if (!response.ok) return null
        const json = await response.json()
        const decision = (json?.content?.[0]?.text || 'ALLOW').trim()

        if (decision.startsWith('BLOCK:')) {
            return { allowed: false, reason: decision.slice(6).trim() || 'Content moderated.' }
        }
        return { allowed: true }
    } catch {
        // If the AI call fails for any reason, fall back to tier-1 result (permissive)
        return null
    }
}

/**
 * Moderate a message. Applies tier-1 always; tier-2 if API key is configured.
 * @param {string} text
 * @returns {Promise<{ allowed: boolean, cleaned: string, reason?: string, flagged?: boolean }>}
 */
async function moderate(text = '') {
    const t1 = tier1Moderate(text)

    // If tier-1 already blocks it, no need for AI call
    if (!t1.allowed) return t1

    // Try AI moderation (non-blocking — failure falls back to tier-1 allow)
    const t2 = await tier2Moderate(t1.cleaned)
    if (t2 && !t2.allowed) {
        return { allowed: false, cleaned: t1.cleaned, reason: t2.reason }
    }

    return t1
}

module.exports = { moderate, tier1Moderate }
