"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { AlertCircle, ShieldCheck, Timer } from "lucide-react";

import { api } from "@/lib/api";
import { setToken } from "@/lib/auth";
import { refreshCurrentUserStore } from "@/hooks/use-current-user";
import { EASE, FADES, SURFACES } from "@/lib/motion-presets";

interface ResetDescriptor {
    status: string;
    message?: string;
    expiresAt?: string | null;
    neverExpires?: boolean;
    requiresEmail?: boolean;
    testToken?: boolean;
}

async function safeJson(res: Response) {
    try {
        return await res.json();
    } catch {
        return null;
    }
}

export default function ResetPasswordPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const tokenFromLink = searchParams.get("token") || "";
    const [token, setTokenValue] = useState(tokenFromLink);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [descriptor, setDescriptor] = useState<ResetDescriptor | null>(null);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [statusMsg, setStatusMsg] = useState<string | null>(null);

    useEffect(() => {
        setTokenValue(tokenFromLink);
    }, [tokenFromLink]);

    useEffect(() => {
        if (!tokenFromLink) {
            setDescriptor({ status: "invalid", message: "Reset link is missing the token." });
            return;
        }
        let active = true;
        (async () => {
            setLoading(true);
            setStatusMsg(null);
            try {
                const res = await api(`/auth/reset-password/${encodeURIComponent(tokenFromLink)}`);
                const json = await safeJson(res);
                if (!res.ok || json?.ok === false) {
                    if (!active) return;
                    setDescriptor({ status: json?.status || "invalid", message: json?.msg || "Reset link is invalid." });
                    return;
                }
                if (!active) return;
                const { status, message, expiresAt, neverExpires, requiresEmail, testToken: isTestToken } = json as ResetDescriptor;
                setDescriptor({ status, message, expiresAt: expiresAt ?? null, neverExpires, requiresEmail, testToken: isTestToken });
            } catch (err) {
                if (!active) return;
                setDescriptor({ status: "invalid", message: err instanceof Error ? err.message : "Unable to inspect reset link." });
            } finally {
                if (active) setLoading(false);
            }
        })();
        return () => {
            active = false;
        };
    }, [tokenFromLink]);

    function formatExpires(expiresAt?: string | null, neverExpires?: boolean) {
        if (neverExpires) return "Never expires (test link)";
        if (!expiresAt) return "Expires soon";
        const date = new Date(expiresAt);
        if (Number.isNaN(date.getTime())) return "Expires soon";
        return `Expires ${date.toLocaleString()}`;
    }

    async function handleReset(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setStatusMsg(null);
        setSubmitting(true);
        try {
            const res = await api("/auth/reset-password", {
                method: "POST",
                body: JSON.stringify({ token, password, email: email || undefined }),
            });
            const json = await safeJson(res);
            if (!res.ok || json?.ok === false) throw new Error(json?.msg || "Unable to reset password.");
            if (json?.token) {
                setToken(json.token as string);
                await refreshCurrentUserStore();
                router.push("/dashboard");
                return;
            }
            setStatusMsg("Password updated. You can log in now.");
        } catch (err) {
            setStatusMsg(err instanceof Error ? err.message : "Unable to reset password.");
        } finally {
            setSubmitting(false);
        }
    }

    const expired = descriptor?.status === "expired" || descriptor?.status === "used" || descriptor?.status === "invalid";

    return (
        <main className="min-h-dvh flex items-start lg:items-center justify-center px-4 sm:px-6 lg:px-8 py-8 bg-[#F4F7FB]">
            <motion.div
                variants={FADES.floatUp}
                initial="initial"
                animate="animate"
                className="w-full max-w-4xl rounded-[32px] bg-white shadow-[0_2px_24px_rgba(0,0,0,0.06)] px-6 sm:px-8 lg:px-12 py-8"
            >
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#2D8F80]">Secure recovery</p>
                        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Use your reset link</h1>
                        <p className="mt-1 text-sm text-slate-500">Paste the link or token from your email to set a new password.</p>
                    </div>
                    <Link href="/forgot-password" className="rounded-full border border-[#CFE3E0] px-4 py-2 text-sm font-semibold text-[#2B2B2B]">
                        Request another link
                    </Link>
                </div>

                <div className="mt-6 grid gap-6 md:grid-cols-2">
                    <motion.section
                        className="rounded-[28px] border border-slate-100 bg-[#F9FBFF] p-6"
                        initial={SURFACES.lift.initial}
                        whileInView={SURFACES.lift.animate(0.05)}
                        viewport={{ once: true, amount: 0.4 }}
                    >
                        <div className="flex items-center gap-3">
                            <div className="rounded-2xl bg-[#E7F6F3] p-3 text-[#2D8F80]">
                                <ShieldCheck className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-[#2D8F80]">Link status</p>
                                <h2 className="text-lg font-semibold text-slate-900">{loading ? "Checking…" : "Security review"}</h2>
                            </div>
                        </div>
                        <div className="mt-3 space-y-2 text-sm text-slate-700">
                            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                <Timer className="h-4 w-4 text-[#2B2E83]" /> {formatExpires(descriptor?.expiresAt, descriptor?.neverExpires)}
                            </p>
                            {descriptor?.requiresEmail && (
                                <p className="rounded-2xl border border-dashed border-[#CFE3E0] bg-white/80 px-3 py-2 text-xs text-slate-600">
                                    This is the always-on test link. Confirm the account email below to reset a profile.
                                </p>
                            )}
                            {descriptor?.message && <p className="rounded-2xl bg-white/70 px-3 py-2 text-xs text-slate-600">{descriptor.message}</p>}
                            {expired && (
                                <p className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                                    <AlertCircle className="h-4 w-4" /> This link is no longer valid.
                                </p>
                            )}
                        </div>
                    </motion.section>

                    <motion.section
                        className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm"
                        initial={SURFACES.lift.initial}
                        whileInView={SURFACES.lift.animate(0.12)}
                        viewport={{ once: true, amount: 0.4 }}
                    >
                        <form onSubmit={handleReset} className="space-y-4 text-sm">
                            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Reset token
                                <input
                                    type="text"
                                    value={token}
                                    onChange={(e) => setTokenValue(e.target.value)}
                                    required
                                    className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2"
                                    placeholder="Paste the reset link token"
                                />
                            </label>
                            {descriptor?.requiresEmail && (
                                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Account email for this link
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2"
                                        placeholder="you@email.com"
                                    />
                                </label>
                            )}
                            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                New password
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    minLength={6}
                                    required
                                    className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2"
                                    placeholder="At least 6 characters"
                                />
                            </label>
                            <motion.button
                                type="submit"
                                disabled={submitting || expired}
                                className="w-full rounded-full bg-[#2B2E83] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                                whileHover={{ y: -1, scale: 1.01 }}
                                whileTap={{ scale: 0.98 }}
                                transition={{ duration: 0.25, ease: EASE.swift }}
                            >
                                {submitting ? "Updating…" : "Reset password"}
                            </motion.button>
                            {statusMsg && (
                                <p className="rounded-2xl border border-[#CFE3E0] bg-[#E9F7F5] px-4 py-3 text-sm text-slate-700">{statusMsg}</p>
                            )}
                        </form>
                        <p className="mt-4 text-xs text-slate-500">
                            Need help? <Link href="/contact" className="font-semibold text-[#2D8F80]">Contact the admin team</Link>.
                        </p>
                    </motion.section>
                </div>
            </motion.div>
        </main>
    );
}
