"use client";

import { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";

type Props = {
    password: string;
    email?: string;
    name?: string;
};

function clamp(n: number, min = 0, max = 4) {
    return Math.max(min, Math.min(max, n));
}
function colorFor(score: number) {
    if (score <= 1) return { bar: "bg-red-500", text: "text-red-600" };
    if (score === 2) return { bar: "bg-amber-500", text: "text-amber-600" };
    if (score === 3) return { bar: "bg-lime-500", text: "text-lime-700" };
    return { bar: "bg-emerald-500", text: "text-emerald-700" };
}
function labelFor(score: number) {
    if (score <= 1) return "Weak";
    if (score === 2) return "Fair";
    if (score === 3) return "Strong";
    return "Excellent";
}

export default function PasswordStrength({ password, email, name }: Props) {
    const { score, tips } = useMemo(() => {
        const p = (password || "").trim();
        if (!p) return { score: 0, tips: [] as string[] };

        const lower = /[a-z]/.test(p);
        const upper = /[A-Z]/.test(p);
        const digit = /\d/.test(p);
        const special = /[^A-Za-z0-9]/.test(p);
        const len = p.length;

        let s = 0;
        if (len >= 8) s += 1;
        if (len >= 12) s += 1;
        const kinds = [lower, upper, digit, special].filter(Boolean).length;
        if (kinds >= 3) s += 1;
        if (kinds >= 4) s += 1;

        const common = ["1234", "abcd", "qwer", "password", "letmein", "1111", "0000"];
        if (common.some((c) => p.toLowerCase().includes(c))) s -= 1;

        const emailLocal = (email || "").toLowerCase().split("@")[0] || "";
        if (emailLocal && p.toLowerCase().includes(emailLocal)) s -= 1;
        if (name && p.toLowerCase().includes(name.toLowerCase())) s -= 1;

        s = clamp(s);

        const tips: string[] = [];
        if (len < 12) tips.push("Use at least 12 characters.");
        if (kinds < 3) tips.push("Mix upper/lowercase, numbers, and a symbol.");
        if (common.some((c) => p.toLowerCase().includes(c))) tips.push("Avoid common words or sequences.");
        if (emailLocal && p.toLowerCase().includes(emailLocal)) tips.push("Don’t include your email/username.");

        return { score: s, tips };
    }, [password, email, name]);

    // Only show after the user starts typing
    const show = password.trim().length > 0;
    const colors = colorFor(score);

    return (
        <AnimatePresence initial={false}>
            {show && (
                <motion.div
                    key="pw-meter"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.25 }}
                    className="mt-2"
                    aria-live="polite"
                >
                    {/* Bars */}
                    <div className="flex gap-1" role="progressbar" aria-valuemin={0} aria-valuemax={4} aria-valuenow={score}>
                        {Array.from({ length: 4 }).map((_, i) => (
                            <motion.div
                                key={i}
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: i < score ? 1 : 1 }}
                                transition={{ duration: 0.35, delay: i * 0.05 }}
                                className={[
                                    "h-1.5 flex-1 origin-left rounded-full",
                                    i < score ? colors.bar : "bg-neutral-200",
                                ].join(" ")}
                            />
                        ))}
                    </div>
                    {/* Label + small tip */}
                    <div className="mt-1.5 flex items-center justify-between">
                        <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className={["text-xs font-semibold", colors.text].join(" ")}
                        >
                            {labelFor(score)}
                        </motion.span>
                        {tips.length > 0 && (
                            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[11px] text-neutral-500">
                                {tips[0]}
                            </motion.span>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}