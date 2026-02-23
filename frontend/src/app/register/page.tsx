"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Eye, EyeOff, Sparkles, GraduationCap, Palette, Users, Shield } from "lucide-react";
import { api } from "@/lib/api";
import PasswordStrength from "@/components/password-strength";

type AccountType = "learner" | "creator" | "tutor" | "admin";

const ACCOUNT_OPTIONS: { label: string; value: AccountType; helper: string; icon: React.ReactNode }[] = [
    { label: "Learner", value: "learner", helper: "Access courses, mentoring, and resources", icon: <GraduationCap className="h-4 w-4" /> },
    { label: "Creator", value: "creator", helper: "Publish courses and educational content", icon: <Palette className="h-4 w-4" /> },
    { label: "Tutor", value: "tutor", helper: "Host tutoring sessions and events", icon: <Users className="h-4 w-4" /> },
    { label: "Admin", value: "admin", helper: "Manage platform content and users", icon: <Shield className="h-4 w-4" /> },
];

export default function RegisterPage() {
    const router = useRouter();
    const [accountType, setAccountType] = useState<AccountType>("learner");
    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const [password, setPassword] = useState("");
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [securing, setSecuring] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [adminSecret, setAdminSecret] = useState("");

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setErr(null);
        setLoading(true);
        try {
            const res = await api("/auth/register", {
                method: "POST",
                body: JSON.stringify({
                    email,
                    name,
                    password,
                    role: accountType,
                    adminSecret: accountType === "admin" ? adminSecret : undefined,
                }),
            });
            const data = await safeJson(res);
            if (!res.ok || data?.ok === false) throw new Error(data?.msg || `Register failed (${res.status})`);

            if (data?.requiresBrowserVerification && data?.verifyToken) {
                setLoading(false);
                setSecuring(true);
                try {
                    const verifyRes = await fetch("/api/auth/verify-browser", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ token: data.verifyToken }),
                    });
                    const verifyData = await safeJson(verifyRes);
                    if (!verifyRes.ok || !verifyData?.token)
                        throw new Error(verifyData?.msg || "Browser verification failed.");
                    localStorage.setItem("sparkhub:token", verifyData.token);
                    if (verifyData.user) {
                        localStorage.setItem("sparkhub:user", JSON.stringify(verifyData.user));
                    }
                    router.push("/dashboard?welcome=1");
                } catch (verifyErr: unknown) {
                    const message = verifyErr instanceof Error ? verifyErr.message : "Unable to verify browser.";
                    setErr(message);
                } finally {
                    setSecuring(false);
                }
                return;
            }

            router.push("/login");
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Unable to register.";
            setErr(message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="min-h-dvh flex items-start lg:items-center justify-center px-4 sm:px-6 lg:px-8 py-8 bg-gradient-to-br from-[#F4F7FB] via-[#F0F9F8] to-[#EEF5FA] dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="w-full max-w-[1280px] rounded-[24px] bg-white dark:bg-slate-800 shadow-[0_2px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_24px_rgba(0,0,0,0.3)] px-6 sm:px-8 lg:px-10 py-8"
            >
                <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] items-start">
                    {/* LEFT hero: desktop only */}
                    <section className="relative hidden lg:block">
                        <motion.div
                            initial={{ scale: 1.035 }}
                            animate={{ scale: 1 }}
                            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                            className="relative h-[560px] overflow-hidden rounded-[28px]"
                        >
                            <Image src="/auth/register-hero.jpg" alt="SparkHub community" fill priority className="object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.15, duration: 0.35 }}
                            className="pointer-events-none absolute left-6 bottom-6 sm:left-8 sm:bottom-8"
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <Sparkles className="h-6 w-6 text-[#63C0B9]" />
                                <span className="text-[#63C0B9] font-semibold text-sm">SparkHub</span>
                            </div>
                            <h2 className="text-white text-[28px] sm:text-[32px] font-extrabold drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]">
                                Create. Collaborate. Shine.
                            </h2>
                            <p className="text-white/90 text-[16px] drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)]">
                                Join a community of learners and creators.
                            </p>
                        </motion.div>
                    </section>

                    {/* RIGHT: form */}
                    <section className="w-full max-w-[560px] lg:max-w-[600px] lg:ml-auto mx-auto">
                        <div className="text-center">
                            <div className="flex items-center justify-center gap-2 mb-2 lg:hidden">
                                <Sparkles className="h-6 w-6 text-[#63C0B9]" />
                                <span className="text-[#63C0B9] font-bold text-lg">SparkHub</span>
                            </div>
                            <p className="text-[16px] font-semibold text-slate-800 dark:text-slate-100">Create your account</p>

                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1, duration: 0.3 }}
                                className="mx-auto mt-5 w-[320px] rounded-full bg-[#CBE7E4] dark:bg-slate-700 p-1 shadow-inner flex"
                            >
                                <Link
                                    href="/login"
                                    prefetch={false}
                                    className="flex-1 rounded-full text-[14px] font-semibold py-2 text-center text-[#5D6B6B] dark:text-slate-300 hover:text-[#2B2B2B] dark:hover:text-white transition-colors"
                                >
                                    Login
                                </Link>
                                <span className="flex-1">
                                    <span
                                        aria-current="page"
                                        className="block rounded-full bg-[#69BFBA] text-white text-[14px] font-semibold py-2 text-center"
                                    >
                                        Register
                                    </span>
                                </span>
                            </motion.div>

                            <p className="mt-6 text-[14px] leading-6 text-[#6C6C6C] dark:text-slate-400 max-w-[520px] mx-auto">
                                Join SparkHub to access courses, connect with tutors, and track your learning journey.
                            </p>
                        </div>

                        {/* Account type toggle */}
                        <div className="mx-auto mt-6 grid grid-cols-2 gap-2 w-full max-w-[520px]">
                            {ACCOUNT_OPTIONS.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => setAccountType(option.value)}
                                    className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-center text-[13px] font-semibold transition
                                        ${
                                        accountType === option.value
                                            ? "border-[#69BFBA] bg-[#69BFBA] text-white"
                                            : "border-[#CFE3E0] dark:border-slate-600 bg-white dark:bg-slate-700 text-[#5D6B6B] dark:text-slate-300 hover:text-[#2B2B2B] dark:hover:text-white hover:border-[#69BFBA]/50"
                                    }
                                    `}
                                >
                                    {option.icon}
                                    {option.label}
                                </button>
                            ))}
                        </div>
                        <p className="mt-2 text-center text-[12px] text-[#6C6C6C] dark:text-slate-400">
                            {ACCOUNT_OPTIONS.find((opt) => opt.value === accountType)?.helper}
                        </p>

                        <form onSubmit={onSubmit} className="mt-6 space-y-4 max-w-[360px] lg:max-w-none mx-auto">
                            <div>
                                <label className="mb-2 block text-[13px] font-semibold text-[#3A3A3A] dark:text-slate-200">Email Address</label>
                                <input
                                    type="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="h-[48px] w-full rounded-full border border-[#CFE3E0] dark:border-slate-600 bg-white dark:bg-slate-700 px-5 text-[14px] text-[#2B2B2B] dark:text-slate-100
                                        placeholder:text-[#A0A7A7] dark:placeholder:text-slate-500 focus:border-[#69BFBA] focus:ring-2 focus:ring-[#69BFBA]/20 transition-colors"
                                    autoComplete="email"
                                    required
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-[13px] font-semibold text-[#3A3A3A] dark:text-slate-200">Display Name</label>
                                <input
                                    type="text"
                                    placeholder="Your name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="h-[48px] w-full rounded-full border border-[#CFE3E0] dark:border-slate-600 bg-white dark:bg-slate-700 px-5 text-[14px] text-[#2B2B2B] dark:text-slate-100
                                        placeholder:text-[#A0A7A7] dark:placeholder:text-slate-500 focus:border-[#69BFBA] focus:ring-2 focus:ring-[#69BFBA]/20 transition-colors"
                                    autoComplete="username"
                                    required
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-[13px] font-semibold text-[#3A3A3A] dark:text-slate-200">Password</label>
                                <div className="relative">
                                    <input
                                        type={showPw ? "text" : "password"}
                                        placeholder="Create a strong password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="h-[48px] w-full rounded-full border border-[#CFE3E0] dark:border-slate-600 bg-white dark:bg-slate-700 px-5 pr-12 text-[14px] text-[#2B2B2B] dark:text-slate-100
                                            placeholder:text-[#A0A7A7] dark:placeholder:text-slate-500 focus:border-[#69BFBA] focus:ring-2 focus:ring-[#69BFBA]/20 transition-colors"
                                        autoComplete="new-password"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPw((s) => !s)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6C6C6C] dark:text-slate-400 hover:text-[#2B2B2B] dark:hover:text-slate-200 transition-colors"
                                        aria-label={showPw ? "Hide password" : "Show password"}
                                    >
                                        {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                <PasswordStrength password={password} email={email} name={name} />
                            </div>

                            {accountType === "admin" && (
                                <div>
                                    <label className="mb-2 block text-[13px] font-semibold text-[#3A3A3A] dark:text-slate-200">Admin Invite Key</label>
                                    <input
                                        type="text"
                                        placeholder="Enter admin invite key"
                                        value={adminSecret}
                                        onChange={(e) => setAdminSecret(e.target.value)}
                                        className="h-[48px] w-full rounded-full border border-[#CFE3E0] dark:border-slate-600 bg-white dark:bg-slate-700 px-5 text-[14px] text-[#2B2B2B] dark:text-slate-100
                                            placeholder:text-[#A0A7A7] dark:placeholder:text-slate-500 focus:border-[#69BFBA] focus:ring-2 focus:ring-[#69BFBA]/20 transition-colors"
                                        required
                                    />
                                    <p className="mt-2 text-[12px] text-[#6C6C6C] dark:text-slate-400">
                                        Contact your organization administrator for the invite key.
                                    </p>
                                </div>
                            )}

                            {err && (
                                <motion.p
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="rounded-[10px] bg-red-50 dark:bg-red-900/30 px-4 py-3 text-[12px] text-red-700 dark:text-red-400"
                                >
                                    {err}
                                </motion.p>
                            )}

                            {notice && !err && (
                                <motion.p
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="rounded-[10px] bg-emerald-50 dark:bg-emerald-900/30 px-4 py-3 text-[12px] text-emerald-700 dark:text-emerald-400"
                                >
                                    {notice}
                                </motion.p>
                            )}

                            {securing && (
                                <motion.div
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex items-center justify-center gap-3 rounded-2xl bg-[#E9F7F5] dark:bg-teal-900/20 border border-[#63C0B9]/20 px-4 py-3"
                                >
                                    <svg
                                        className="h-4 w-4 animate-spin text-[#63C0B9]"
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                    >
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                                    </svg>
                                    <span className="text-[13px] font-semibold text-[#2D8F80] dark:text-teal-300">
                                        Securing your account…
                                    </span>
                                </motion.div>
                            )}

                            <div className="pt-2 flex justify-center lg:justify-end">
                                <motion.button
                                    whileTap={{ scale: 0.98 }}
                                    whileHover={{ scale: 1.02 }}
                                    type="submit"
                                    disabled={loading || securing}
                                    className="w-full sm:w-[260px] h-[48px] rounded-full bg-gradient-to-r from-[#63C0B9] to-[#2D8F80] text-white text-[15px] font-semibold
                                        hover:opacity-90 disabled:opacity-60 transition-all shadow-lg shadow-[#63C0B9]/25"
                                >
                                    {loading ? "Creating account..." : "Create Account"}
                                </motion.button>
                            </div>
                        </form>

                        <p className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
                            By registering, you agree to our{" "}
                            <Link href="/settings" className="text-[#63C0B9] hover:underline">Terms of Service</Link>
                        </p>
                    </section>
                </div>
            </motion.div>
        </main>
    );
}

async function safeJson(res: Response) {
    try { return await res.json(); } catch { return null; }
}