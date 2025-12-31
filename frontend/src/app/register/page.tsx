"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { api } from "@/lib/api";
import PasswordStrength from "@/components/password-strength";

type AccountType = "learner" | "creator" | "tutor" | "admin";

const ACCOUNT_OPTIONS: { label: string; value: AccountType; helper: string }[] = [
    { label: "Learner", value: "learner", helper: "Access mentoring, resources, and courses" },
    { label: "Creator", value: "creator", helper: "Publish learning experiences and content" },
    { label: "Tutor", value: "tutor", helper: "Host sessions and manage events" },
    { label: "Admin", value: "admin", helper: "Manage events, resources, and opportunities" },
];

export default function RegisterPage() {
    const router = useRouter();
    const [accountType, setAccountType] = useState<AccountType>("learner");
    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const [password, setPassword] = useState("");
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [adminSecret, setAdminSecret] = useState("");
    const [weeklyUpdates, setWeeklyUpdates] = useState(true);

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
                    weeklyUpdates,
                }),
            });
            const data = await safeJson(res);
            if (!res.ok || data?.ok === false) throw new Error(data?.msg || `Register failed (${res.status})`);
            if (data?.requiresVerification) {
                setNotice(data?.msg || "Check your email for a verification link.");
                router.push(`/verify-email?email=${encodeURIComponent(email)}`);
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
        <main className="min-h-dvh flex items-start lg:items-center justify-center px-4 sm:px-6 lg:px-8 py-8">
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="w-full max-w-[1280px] rounded-[24px] bg-white shadow-[0_2px_24px_rgba(0,0,0,0.06)] px-6 sm:px-8 lg:px-10 py-8"
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
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.15, duration: 0.35 }}
                            className="pointer-events-none absolute left-6 bottom-6 sm:left-8 sm:bottom-8"
                        >
                            <h2 className="text-white text-[28px] sm:text-[32px] font-extrabold drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]">
                                Create. Collaborate. Shine.
                            </h2>
                            <p className="text-white/90 text-[16px] drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)]">
                                Join classes and publish your projects.
                            </p>
                        </motion.div>
                    </section>

                    {/* RIGHT: form */}
                    <section className="w-full max-w-[560px] lg:max-w-[600px] lg:ml-auto mx-auto">
                        <div className="text-center">
                            <p className="text-[16px] font-semibold">Welcome to SparkHub!</p>

                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1, duration: 0.3 }}
                                className="mx-auto mt-5 w-[320px] rounded-full bg-[#CBE7E4] p-1 shadow-inner flex"
                            >
                                <Link
                                    href="/login"
                                    prefetch={false}
                                    className="flex-1 rounded-full text-[14px] font-semibold py-2 text-center text-[#5D6B6B] hover:text-[#2B2B2B] transition-colors"
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

                            <p className="mt-6 text-[14px] leading-6 text-[#6C6C6C] max-w-[520px] mx-auto">
                                Create your account to join classes, publish projects, and track your progress
                                with teammates and mentors.
                            </p>
                        </div>

                        {/* Account type toggle */}
                        <div className="mx-auto mt-6 flex w-full max-w-[520px] flex-wrap gap-2">
                            {ACCOUNT_OPTIONS.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => setAccountType(option.value)}
                                    className={`flex-1 min-w-[150px] rounded-full border px-4 py-2 text-center text-[14px] font-semibold transition
                    ${
                        accountType === option.value
                            ? "border-[#69BFBA] bg-[#69BFBA] text-white"
                            : "border-[#CFE3E0] bg-white text-[#5D6B6B] hover:text-[#2B2B2B]"
                    }
                `}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                        <p className="mt-2 text-center text-[12px] text-[#6C6C6C]">
                            {ACCOUNT_OPTIONS.find((opt) => opt.value === accountType)?.helper}
                        </p>

                        <form onSubmit={onSubmit} className="mt-6 space-y-5 max-w-[360px] lg:max-w-none mx-auto">
                            <div>
                                <label className="mb-2 block text-[13px] font-semibold text-[#3A3A3A]">Email Address</label>
                                <input
                                    type="email"
                                    placeholder="Enter your Email Address"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="h-[48px] w-full rounded-full border border-[#CFE3E0] bg-white px-5 text-[14px] text-[#2B2B2B]
                             placeholder:text-[#A0A7A7] focus:border-[#69BFBA] focus:ring-0 transition-colors"
                                    autoComplete="email"
                                    required
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-[13px] font-semibold text-[#3A3A3A]">User name</label>
                                <input
                                    type="text"
                                    placeholder="Enter your User name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="h-[48px] w-full rounded-full border border-[#CFE3E0] bg-white px-5 text-[14px] text-[#2B2B2B]
                             placeholder:text-[#A0A7A7] focus:border-[#69BFBA] focus:ring-0 transition-colors"
                                    autoComplete="username"
                                    required
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-[13px] font-semibold text-[#3A3A3A]">Password</label>
                                <div className="relative">
                                    <input
                                        type={showPw ? "text" : "password"}
                                        placeholder="Enter your Password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="h-[48px] w-full rounded-full border border-[#CFE3E0] bg-white px-5 pr-12 text-[14px] text-[#2B2B2B]
                               placeholder:text-[#A0A7A7] focus:border-[#69BFBA] focus:ring-0 transition-colors"
                                        autoComplete="new-password"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPw((s) => !s)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6C6C6C] hover:text-[#2B2B2B] transition-colors"
                                        aria-label={showPw ? "Hide password" : "Show password"}
                                    >
                                        {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                {/* Strength meter (appears only after typing) */}
                                <PasswordStrength password={password} email={email} name={name} />
                            </div>

                            {accountType === "admin" && (
                                <div>
                                    <label className="mb-2 block text-[13px] font-semibold text-[#3A3A3A]">Admin invite key</label>
                                    <input
                                        type="text"
                                        placeholder="Enter the secret your team provided"
                                        value={adminSecret}
                                        onChange={(e) => setAdminSecret(e.target.value)}
                                        className="h-[48px] w-full rounded-full border border-[#CFE3E0] bg-white px-5 text-[14px] text-[#2B2B2B] placeholder:text-[#A0A7A7] focus:border-[#69BFBA] focus:ring-0 transition-colors"
                                        required
                                    />
                                    <p className="mt-2 text-[12px] text-[#6C6C6C]">
                                        This keeps admin access private. Ask the site owner for the invite key before continuing.
                                    </p>
                                </div>
                            )}

                            <label className="flex items-start gap-3 rounded-2xl border border-[#E4EFED] bg-[#F8FBFA] px-4 py-3 text-[13px] text-[#3A3A3A]">
                                <input
                                    type="checkbox"
                                    className="mt-1 h-4 w-4 rounded border-[#94C7C2] text-[#69BFBA] focus:ring-[#69BFBA]"
                                    checked={weeklyUpdates}
                                    onChange={(e) => setWeeklyUpdates(e.target.checked)}
                                />
                                <span>
                                    Keep me posted with SparkHub weekly updates, highlights, and new resources.
                                    <span className="block text-[12px] text-[#6C6C6C]">You can change this anytime from your settings.</span>
                                </span>
                            </label>

                            {err && (
                                <motion.p
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="rounded-[10px] bg-red-50 px-4 py-3 text-[12px] text-red-700"
                                >
                                    {err}
                                </motion.p>
                            )}

                            {notice && !err && (
                                <motion.p
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="rounded-[10px] bg-emerald-50 px-4 py-3 text-[12px] text-emerald-700"
                                >
                                    {notice}
                                </motion.p>
                            )}

                            <div className="pt-2">
                                <motion.button
                                    whileTap={{ scale: 0.98 }}
                                    type="submit"
                                    disabled={loading}
                                    className="ml-auto block w-[260px] h-[48px] rounded-full bg-[#69BFBA] text-white text-[15px] font-semibold
                             hover:bg-[#5bb2ad] disabled:opacity-60 transition-colors"
                                >
                                    {loading ? "Creating account…" : "Register"}
                                </motion.button>
                            </div>
                        </form>
                    </section>
                </div>
            </motion.div>
        </main>
    );
}

async function safeJson(res: Response) {
    try { return await res.json(); } catch { return null; }
}