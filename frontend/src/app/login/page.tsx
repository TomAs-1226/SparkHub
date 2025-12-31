"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Eye, EyeOff, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { setToken } from "@/lib/auth";
import { refreshCurrentUserStore } from "@/hooks/use-current-user";

export default function LoginPage() {
    const router = useRouter();
    const [identity, setIdentity] = useState("");
    const [password, setPassword] = useState("");
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setErr(null);
        setLoading(true);
        try {
            const res = await api("/auth/login", {
                method: "POST",
                body: JSON.stringify({ email: identity, username: identity, password }),
            });
            const data = await safeJson(res);
            if (!res.ok || !data?.ok) {
                if (data?.requiresVerification) {
                    router.push(
                        `/verify-email?email=${encodeURIComponent(data?.email || identity)}&alert=${encodeURIComponent(
                            data?.msg || "Please verify your email first."
                        )}`
                    );
                    return;
                }
                throw new Error(data?.msg || `Login failed (${res.status})`);
            }
            setToken(data.token);
            await refreshCurrentUserStore();
            router.push("/dashboard");
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Unable to login.";
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
                            <Image src="/auth/login-hero.jpg" alt="SparkHub classroom" fill priority className="object-cover" />
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
                                Learn. Build. Share.
                            </h2>
                            <p className="text-white/90 text-[16px] drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)]">
                                Your journey to knowledge starts here.
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
                            <p className="text-[16px] font-semibold text-slate-800 dark:text-slate-100">Welcome back!</p>

                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1, duration: 0.3 }}
                                className="mx-auto mt-5 w-[320px] rounded-full bg-[#CBE7E4] dark:bg-slate-700 p-1 shadow-inner flex"
                            >
                                <span className="flex-1">
                                    <span
                                        aria-current="page"
                                        className="block rounded-full bg-[#69BFBA] text-white text-[14px] font-semibold py-2 text-center"
                                    >
                                        Login
                                    </span>
                                </span>
                                <Link
                                    href="/register"
                                    prefetch={false}
                                    className="flex-1 rounded-full text-[14px] font-semibold py-2 text-center text-[#5D6B6B] dark:text-slate-300 hover:text-[#2B2B2B] dark:hover:text-white transition-colors"
                                >
                                    Register
                                </Link>
                            </motion.div>

                            <p className="mt-6 text-[14px] leading-6 text-[#6C6C6C] dark:text-slate-400 max-w-[520px] mx-auto">
                                SparkHub connects learners and creators. Track progress, share work, and join
                                projects with your school or community.
                            </p>
                        </div>

                        <form onSubmit={onSubmit} className="mt-8 space-y-5 max-w-[360px] lg:max-w-none mx-auto">
                            <div>
                                <label className="mb-2 block text-[13px] font-semibold text-[#3A3A3A] dark:text-slate-200">Email or Username</label>
                                <input
                                    type="text"
                                    placeholder="Enter your email or username"
                                    value={identity}
                                    onChange={(e) => setIdentity(e.target.value)}
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
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="h-[48px] w-full rounded-full border border-[#CFE3E0] dark:border-slate-600 bg-white dark:bg-slate-700 px-5 pr-12 text-[14px] text-[#2B2B2B] dark:text-slate-100
                                            placeholder:text-[#A0A7A7] dark:placeholder:text-slate-500 focus:border-[#69BFBA] focus:ring-2 focus:ring-[#69BFBA]/20 transition-colors"
                                        autoComplete="current-password"
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
                            </div>

                            <div className="flex items-center justify-between text-[12px] text-[#6C6C6C] dark:text-slate-400">
                                <label className="inline-flex items-center gap-2 select-none cursor-pointer">
                                    <input type="checkbox" className="h-[16px] w-[16px] rounded-[4px] border-[#CFE3E0] dark:border-slate-600 bg-white dark:bg-slate-700" />
                                    <span>Remember me</span>
                                </label>
                                <Link href="/forgot-password" className="hover:text-[#2B2B2B] dark:hover:text-slate-200 transition-colors">Forgot Password?</Link>
                            </div>

                            {err && (
                                <motion.p
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="rounded-[10px] bg-red-50 dark:bg-red-900/30 px-4 py-3 text-[12px] text-red-700 dark:text-red-400"
                                >
                                    {err}
                                </motion.p>
                            )}

                            <div className="pt-2 flex justify-center lg:justify-end">
                                <motion.button
                                    whileTap={{ scale: 0.98 }}
                                    whileHover={{ scale: 1.02 }}
                                    type="submit"
                                    disabled={loading}
                                    className="w-full sm:w-[260px] h-[48px] rounded-full bg-gradient-to-r from-[#63C0B9] to-[#2D8F80] text-white text-[15px] font-semibold
                                        hover:opacity-90 disabled:opacity-60 transition-all shadow-lg shadow-[#63C0B9]/25"
                                >
                                    {loading ? "Signing in..." : "Sign In"}
                                </motion.button>
                            </div>
                        </form>

                        <p className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
                            By signing in, you agree to our{" "}
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