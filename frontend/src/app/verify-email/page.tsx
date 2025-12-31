"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { MailCheck, RefreshCw, ShieldCheck } from "lucide-react";

import { api } from "@/lib/api";
import { EASE, FADES, SURFACES } from "@/lib/motion-presets";

async function safeJson(res: Response) {
    try {
        return await res.json();
    } catch {
        return null;
    }
}

function VerifyEmailLoading() {
    return (
        <main className="min-h-dvh flex items-center justify-center px-4 bg-[#F4F7FB]">
            <div className="w-full max-w-md rounded-[32px] bg-white p-8 shadow-lg text-center">
                <div className="animate-pulse space-y-4">
                    <div className="h-12 w-12 bg-slate-200 rounded-full mx-auto" />
                    <div className="h-6 bg-slate-200 rounded w-3/4 mx-auto" />
                    <div className="h-4 bg-slate-100 rounded w-1/2 mx-auto" />
                    <div className="h-32 bg-slate-100 rounded-2xl" />
                </div>
            </div>
        </main>
    );
}

export default function VerifyEmailPage() {
    return (
        <Suspense fallback={<VerifyEmailLoading />}>
            <VerifyEmailContent />
        </Suspense>
    );
}

function VerifyEmailContent() {
    const params = useSearchParams();
    const router = useRouter();
    const token = params.get("token");
    const initialEmail = useMemo(() => params.get("email") || "", [params]);
    const alertMessage = params.get("alert");

    const [email, setEmail] = useState(initialEmail);
    const [code, setCode] = useState("");
    const [status, setStatus] = useState<string | null>(alertMessage);
    const [linkState, setLinkState] = useState<"idle" | "pending" | "success">("idle");
    const [codeState, setCodeState] = useState<"idle" | "pending" | "success">("idle");
    const [resendStatus, setResendStatus] = useState<string | null>(null);
    const [verifiedDetails, setVerifiedDetails] = useState<{ code?: string; email?: string; verifiedAt?: string | Date } | null>(null);
    const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);

    useEffect(() => {
        if (token) {
            verifyWithToken(token);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    async function verifyWithToken(nextToken: string) {
        setLinkState("pending");
        setStatus("Verifying your link…");
        try {
            const res = await api("/auth/verify-email/confirm", {
                method: "POST",
                body: JSON.stringify({ token: nextToken }),
            });
            const json = await safeJson(res);
            if (!res.ok || json?.ok === false) throw new Error(json?.msg || "Link is invalid or expired.");
            setLinkState("success");
            setStatus("Email verified! You can log in now.");
            setVerifiedDetails({ code: json?.code, email: json?.user?.email ?? email, verifiedAt: json?.verifiedAt });
            if (!redirectCountdown) setRedirectCountdown(6);
        } catch (err) {
            setLinkState("idle");
            setStatus(err instanceof Error ? err.message : "Unable to verify link.");
        }
    }

    async function handleCodeSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setCodeState("pending");
        setStatus(null);
        try {
            const res = await api("/auth/verify-email/confirm", {
                method: "POST",
                body: JSON.stringify({ email, code }),
            });
            const json = await safeJson(res);
            if (!res.ok || json?.ok === false) throw new Error(json?.msg || "Verification failed.");
            setCodeState("success");
            setStatus("Email verified! You can log in now.");
            setVerifiedDetails({ code: json?.code ?? code, email, verifiedAt: json?.verifiedAt });
            if (!redirectCountdown) setRedirectCountdown(6);
        } catch (err) {
            setCodeState("idle");
            setStatus(err instanceof Error ? err.message : "Unable to verify.");
        }
    }

    async function handleResend(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setResendStatus(null);
        setStatus(null);
        try {
            const res = await api("/auth/verify-email/resend", {
                method: "POST",
                body: JSON.stringify({ email }),
            });
            const json = await safeJson(res);
            if (!res.ok || json?.ok === false) throw new Error(json?.msg || "Unable to send verification email.");
            setResendStatus("Verification email sent. Check your inbox for the latest link and code.");
        } catch (err) {
            setResendStatus(err instanceof Error ? err.message : "Unable to send verification email.");
        }
    }

    useEffect(() => {
        if (verifiedDetails && redirectCountdown === null) {
            setRedirectCountdown(6);
        }
    }, [verifiedDetails, redirectCountdown]);

    useEffect(() => {
        if (redirectCountdown === null) return;
        if (redirectCountdown <= 0) {
            router.push("/login");
            return;
        }
        const timer = setTimeout(() => setRedirectCountdown((prev) => (prev ?? 1) - 1), 1000);
        return () => clearTimeout(timer);
    }, [redirectCountdown, router]);

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
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#2D8F80]">Account security</p>
                        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Verify your SparkHub email</h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Confirm your email address to activate your account and receive weekly updates.
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
                                <MailCheck className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-[#2D8F80]">Email link</p>
                                <h2 className="text-lg font-semibold text-slate-900">Verify from your inbox</h2>
                            </div>
                        </div>
                        <p className="mt-3 text-sm text-slate-600">
                            Click the button in the email we sent you. If you opened this page from that message, we will confirm automatically.
                        </p>
                        <div className="mt-4 rounded-2xl border border-dashed border-[#CFE3E0] bg-white/70 p-4 text-sm text-slate-700">
                            <p className="font-semibold text-slate-900">Status</p>
                            <p className="mt-1 text-slate-600">{status || "Waiting for verification."}</p>
                        </div>
                        {verifiedDetails && (
                            <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 text-sm text-emerald-900">
                                <p className="font-semibold text-emerald-900">Verification succeeded</p>
                                <p className="mt-1 text-emerald-800">
                                    You are verified{verifiedDetails.email ? ` as ${verifiedDetails.email}` : ""}. If you are not redirected automatically, use the code below to finish on another device.
                                </p>
                                {verifiedDetails.code && (
                                    <div className="mt-3 flex items-center justify-between rounded-xl bg-white px-4 py-3 font-mono text-lg font-semibold text-emerald-800 shadow-inner">
                                        <span>{verifiedDetails.code}</span>
                                        {redirectCountdown !== null && redirectCountdown > 0 && (
                                            <span className="text-xs font-semibold text-emerald-700">Redirecting in {redirectCountdown}s…</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                        <motion.button
                            type="button"
                            onClick={() => token && verifyWithToken(token)}
                            disabled={!token || linkState === "pending"}
                            className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#63C0B9] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                            whileHover={{ y: -1, scale: 1.01 }}
                            whileTap={{ scale: 0.98 }}
                            transition={{ duration: 0.25, ease: EASE.swift }}
                        >
                            {linkState === "pending" && <RefreshCw className="h-4 w-4 animate-spin" />}
                            {token ? "Retry verification" : "Waiting for link"}
                        </motion.button>
                    </motion.section>

                    <motion.section
                        className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm"
                        initial={SURFACES.lift.initial}
                        whileInView={SURFACES.lift.animate(0.12)}
                        viewport={{ once: true, amount: 0.4 }}
                    >
                        <div className="flex items-center gap-3">
                            <div className="rounded-2xl bg-[#EEF2FF] p-3 text-[#2B2E83]">
                                <ShieldCheck className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-[#2B2E83]">Code option</p>
                                <h2 className="text-lg font-semibold text-slate-900">Enter your 6-digit code</h2>
                            </div>
                        </div>
                        <form onSubmit={handleCodeSubmit} className="mt-4 space-y-4 text-sm">
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
                            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Verification code
                                <input
                                    type="text"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    minLength={6}
                                    maxLength={6}
                                    required
                                    className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 font-mono"
                                    placeholder="Enter the 6-digit code"
                                />
                            </label>
                            <motion.button
                                type="submit"
                                disabled={codeState === "pending"}
                                className="w-full rounded-full bg-[#2B2E83] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                                whileHover={{ y: -1, scale: 1.01 }}
                                whileTap={{ scale: 0.98 }}
                                transition={{ duration: 0.25, ease: EASE.swift }}
                            >
                                {codeState === "pending" ? "Verifying…" : "Verify code"}
                            </motion.button>
                        </form>
                        <form onSubmit={handleResend} className="mt-4 space-y-3 text-sm border-t border-slate-100 pt-4">
                            <div className="flex items-center gap-2 text-slate-600">
                                <RefreshCw className="h-4 w-4" />
                                <p>Need a new email? Send another link and code.</p>
                            </div>
                            <motion.button
                                type="submit"
                                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:text-slate-900"
                                whileHover={{ y: -1, scale: 1.01 }}
                                whileTap={{ scale: 0.98 }}
                                transition={{ duration: 0.25, ease: EASE.swift }}
                            >
                                Send verification email
                            </motion.button>
                            {resendStatus && (
                                <p className="rounded-2xl border border-[#CFE3E0] bg-white/80 px-4 py-3 text-xs text-slate-700">
                                    {resendStatus}
                                </p>
                            )}
                        </form>
                    </motion.section>
                </div>
            </motion.div>
        </main>
    );
}
