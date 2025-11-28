"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, RefreshCw, ShieldCheck } from "lucide-react";

import { api } from "@/lib/api";
import { setToken } from "@/lib/auth";
import { refreshCurrentUserStore } from "@/hooks/use-current-user";
import { EASE, FADES, SURFACES } from "@/lib/motion-presets";

async function safeJson(res: Response) {
    try {
        return await res.json();
    } catch {
        return null;
    }
}

export default function ForgotPasswordPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [requestStatus, setRequestStatus] = useState<string | null>(null);
    const [requestToken, setRequestToken] = useState<string | null>(null);
    const [requesting, setRequesting] = useState(false);

    const [resetToken, setResetToken] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [resetStatus, setResetStatus] = useState<string | null>(null);
    const [resetting, setResetting] = useState(false);

    async function handleRequest(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setRequestStatus(null);
        setRequesting(true);
        try {
            const res = await api("/auth/forgot", {
                method: "POST",
                body: JSON.stringify({ email }),
            });
            const json = await safeJson(res);
            if (!res.ok || json?.ok === false) throw new Error(json?.msg || "Unable to submit reset request.");
            setRequestStatus("If the account exists you'll receive a reset link shortly.");
            if (json?.token) {
                setRequestToken(json.token as string);
                setResetToken(json.token as string);
            }
        } catch (err) {
            setRequestStatus(err instanceof Error ? err.message : "Unable to submit reset request.");
        } finally {
            setRequesting(false);
        }
    }

    async function handleReset(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setResetStatus(null);
        setResetting(true);
        try {
            const res = await api("/auth/reset-password", {
                method: "POST",
                body: JSON.stringify({ token: resetToken, password: newPassword }),
            });
            const json = await safeJson(res);
            if (!res.ok || json?.ok === false) throw new Error(json?.msg || "Unable to reset password.");
            if (json?.token) {
                setToken(json.token as string);
                await refreshCurrentUserStore();
                router.push("/dashboard");
                return;
            }
            setResetStatus("Password updated. You can log in now.");
        } catch (err) {
            setResetStatus(err instanceof Error ? err.message : "Unable to reset password.");
        } finally {
            setResetting(false);
        }
    }

    return (
        <main className="min-h-dvh flex items-start lg:items-center justify-center px-4 sm:px-6 lg:px-8 py-8 bg-[#F4F7FB]">
            <motion.div
                variants={FADES.floatUp}
                initial="initial"
                animate="animate"
                className="w-full max-w-5xl rounded-[32px] bg-white shadow-[0_2px_24px_rgba(0,0,0,0.06)] px-6 sm:px-8 lg:px-12 py-8"
            >
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#2D8F80]">Account recovery</p>
                        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Reset your SparkHub password</h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Submit the email associated with your account and use the secure reset code to choose a new password.
                        </p>
                    </div>
                    <Link href="/login" className="rounded-full border border-[#CFE3E0] px-4 py-2 text-sm font-semibold text-[#2B2B2B]">
                        Back to login
                    </Link>
                </div>

                <div className="mt-8 grid gap-6 lg:grid-cols-2">
                    <motion.section
                        className="rounded-[28px] border border-slate-100 bg-[#F9FBFF] p-6"
                        initial={SURFACES.lift.initial}
                        whileInView={SURFACES.lift.animate(0.05)}
                        viewport={{ once: true, amount: 0.4 }}
                    >
                        <div className="flex items-center gap-3">
                            <div className="rounded-2xl bg-[#E7F6F3] p-3 text-[#2D8F80]">
                                <Mail className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-[#2D8F80]">Step 1</p>
                                <h2 className="text-lg font-semibold text-slate-900">Request reset link</h2>
                            </div>
                        </div>
                        <form onSubmit={handleRequest} className="mt-4 space-y-4 text-sm">
                            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Email address
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2"
                                    placeholder="you@email.com"
                                />
                            </label>
                            <motion.button
                                type="submit"
                                disabled={requesting}
                                className="w-full rounded-full bg-[#63C0B9] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                                whileHover={{ y: -1, scale: 1.01 }}
                                whileTap={{ scale: 0.98 }}
                                transition={{ duration: 0.25, ease: EASE.swift }}
                            >
                                {requesting ? "Sending…" : "Send reset link"}
                            </motion.button>
                            {requestStatus && (
                                <p className="rounded-2xl border border-[#CFE3E0] bg-white/80 px-4 py-3 text-sm text-slate-700">
                                    {requestStatus}
                                </p>
                            )}
                            {requestToken && (
                                <div className="rounded-2xl border border-dashed border-[#CFE3E0] bg-white/80 px-4 py-3 text-xs text-slate-600">
                                    <p className="font-semibold text-[#2B2B2B]">Temporary reset code</p>
                                    <p className="mt-1 break-all font-mono text-sm">{requestToken}</p>
                                    <p className="mt-1 text-[11px] text-slate-500">Use this code below if you do not receive the email.</p>
                                </div>
                            )}
                        </form>
                    </motion.section>

                    <motion.section
                        className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm"
                        initial={SURFACES.lift.initial}
                        whileInView={SURFACES.lift.animate(0.12)}
                        viewport={{ once: true, amount: 0.4 }}
                    >
                        <div className="flex items-center gap-3">
                            <div className="rounded-2xl bg-[#E7F6F3] p-3 text-[#2D8F80]">
                                <ShieldCheck className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-[#2D8F80]">Step 2</p>
                                <h2 className="text-lg font-semibold text-slate-900">Confirm new password</h2>
                            </div>
                        </div>
                        <form onSubmit={handleReset} className="mt-4 space-y-4 text-sm">
                            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Reset code
                                <input
                                    type="text"
                                    value={resetToken}
                                    onChange={(e) => setResetToken(e.target.value)}
                                    required
                                    className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2"
                                    placeholder="Paste the reset code"
                                />
                            </label>
                            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                New password
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    minLength={6}
                                    required
                                    className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2"
                                    placeholder="At least 6 characters"
                                />
                            </label>
                            <motion.button
                                type="submit"
                                disabled={resetting}
                                className="w-full rounded-full bg-[#2B2E83] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                                whileHover={{ y: -1, scale: 1.01 }}
                                whileTap={{ scale: 0.98 }}
                                transition={{ duration: 0.25, ease: EASE.swift }}
                            >
                                {resetting ? "Updating…" : "Reset password"}
                            </motion.button>
                            {resetStatus && (
                                <p className="rounded-2xl border border-[#CFE3E0] bg-[#E9F7F5] px-4 py-3 text-sm text-slate-700">
                                    {resetStatus}
                                </p>
                            )}
                        </form>
                        <p className="mt-4 text-xs text-slate-500">
                            Need help? <Link href="/contact" className="font-semibold text-[#2D8F80]">Contact the admin team</Link>.
                        </p>
                    </motion.section>
                </div>

                <div className="mt-8 grid gap-4 md:grid-cols-3 text-sm">
                    {["Verified admins review every request", "Tokens expire after one hour", "Resetting logs you in automatically"].map((item) => (
                        <div key={item} className="rounded-2xl border border-slate-100 bg-[#F9FBFF] p-4">
                            <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#E7F6F3] text-[#2D8F80]">
                                <RefreshCw className="h-4 w-4" />
                            </div>
                            <p className="mt-2 font-semibold text-slate-800">{item}</p>
                        </div>
                    ))}
                </div>
            </motion.div>
        </main>
    );
}
