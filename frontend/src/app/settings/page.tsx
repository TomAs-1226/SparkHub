"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
    CheckCircle2,
    Shield,
    UploadCloud,
    Moon,
    Sun,
    Monitor,
    Bell,
    Palette,
    Sparkles,
} from "lucide-react";

import SiteNav from "@/components/site-nav";
import AIAssistant from "@/components/ai-assistant";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useTheme } from "@/contexts/theme-context";
import { api } from "@/lib/api";
import { uploadAsset } from "@/lib/upload";
import { EASE, FADES, SURFACES } from "@/lib/motion-presets";

async function safeJson(res: Response) {
    try {
        return await res.json();
    } catch {
        return null;
    }
}

type Theme = "light" | "dark" | "system";

export default function SettingsPage() {
    const router = useRouter();
    const { user, loading, setUser, refresh } = useCurrentUser();
    const { theme, setTheme: setGlobalTheme } = useTheme();
    const [name, setName] = useState("");
    const [avatarUrl, setAvatarUrl] = useState("");
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState<string | null>(null);
    const [prefLoading, setPrefLoading] = useState(false);
    const [weeklyOptIn, setWeeklyOptIn] = useState(true);
    const [productUpdates, setProductUpdates] = useState(true);
    const [marketing, setMarketing] = useState(false);

    useEffect(() => {
        if (!loading && !user) {
            router.push("/login?from=/settings");
        }
    }, [loading, user, router]);

    useEffect(() => {
        setName(user?.name || "");
        setAvatarUrl(user?.avatarUrl || "");
    }, [user]);

    useEffect(() => {
        if (!user) return;
        setPrefLoading(true);
        api("/emails/preferences")
            .then((res) => res.json().catch(() => null))
            .then((json) => {
                if (json?.preferences) {
                    setWeeklyOptIn(Boolean(json.preferences.weeklyUpdates));
                    setProductUpdates(Boolean(json.preferences.productUpdates));
                    setMarketing(Boolean(json.preferences.marketing));
                }
            })
            .catch(() => {})
            .finally(() => setPrefLoading(false));
    }, [user]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        setStatus(null);
        try {
            const res = await api("/auth/me", {
                method: "PATCH",
                body: JSON.stringify({ name, avatarUrl }),
            });
            const json = await safeJson(res);
            if (!res.ok || json?.ok === false) throw new Error(json?.msg || "Unable to update profile");
            if (json?.user) {
                setUser(json.user);
            }
            await refresh();
            setStatus("Profile updated successfully.");
        } catch (err) {
            setStatus(err instanceof Error ? err.message : "Unable to update profile.");
        } finally {
            setSaving(false);
        }
    }

    async function handleEmailPrefUpdate(key: string, value: boolean) {
        setStatus(null);
        const updates: Record<string, boolean> = {};
        updates[key] = value;

        // Optimistic update
        if (key === "weeklyUpdates") setWeeklyOptIn(value);
        if (key === "productUpdates") setProductUpdates(value);
        if (key === "marketing") setMarketing(value);

        try {
            const res = await api("/emails/preferences", {
                method: "PATCH",
                body: JSON.stringify(updates),
            });
            const json = await safeJson(res);
            if (!res.ok || json?.ok === false) throw new Error(json?.msg || "Unable to update preferences.");
            setStatus("Email preferences updated.");
        } catch (err) {
            // Revert on error
            if (key === "weeklyUpdates") setWeeklyOptIn(!value);
            if (key === "productUpdates") setProductUpdates(!value);
            if (key === "marketing") setMarketing(!value);
            setStatus(err instanceof Error ? err.message : "Unable to update preferences.");
        }
    }

    function handleThemeChange(newTheme: Theme) {
        setGlobalTheme(newTheme);
        setStatus(`Theme set to ${newTheme === "system" ? "system default" : newTheme}.`);
    }

    if (loading || !user) {
        return (
            <div className="min-h-dvh bg-[#F4F7FB] dark:bg-slate-900 text-slate-800 dark:text-slate-100">
                <SiteNav />
                <main className="mx-auto w-full max-w-4xl px-4 pb-16 pt-10">
                    <div className="h-[360px] animate-pulse rounded-[32px] bg-white dark:bg-slate-800" />
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-dvh bg-[#F4F7FB] dark:bg-slate-900 text-slate-800 dark:text-slate-100">
            <SiteNav />
            <main className="mx-auto w-full max-w-4xl px-4 pb-16 pt-10">
                <motion.section
                    variants={FADES.floatUp}
                    initial="initial"
                    animate="animate"
                    className="rounded-[32px] border border-white/60 dark:border-slate-700/60 bg-white/95 dark:bg-slate-800/95 p-6 shadow-2xl md:p-10"
                >
                    <div className="flex items-center gap-3 text-sm font-semibold uppercase tracking-wide text-[#2D8F80]">
                        <CheckCircle2 className="h-5 w-5" /> Profile settings
                    </div>
                    <h1 className="mt-2 text-2xl font-semibold">Fine tune your SparkHub identity</h1>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Update your profile photo, display name, and customize your SparkHub experience.
                    </p>

                    {status && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-4 rounded-2xl border border-[#CFE3E0] dark:border-slate-600 bg-[#E9F7F5] dark:bg-slate-700 px-4 py-3 text-sm text-slate-700 dark:text-slate-200"
                        >
                            {status}
                        </motion.div>
                    )}

                    <form onSubmit={handleSubmit} className="mt-6 space-y-5 text-sm">
                        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            Display name
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2 text-slate-800 dark:text-slate-100"
                                required
                            />
                        </label>
                        <div className="rounded-3xl border border-dashed border-slate-200 dark:border-slate-600 bg-[#F9FBFF] dark:bg-slate-700/50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Avatar</p>
                            <div className="mt-3 flex items-center gap-4">
                                <div
                                    className="h-16 w-16 rounded-full border border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-600"
                                    style={{ backgroundImage: `url(${avatarUrl || "https://api.dicebear.com/7.x/initials/png?seed=" + encodeURIComponent(name || "SparkHub")})`, backgroundSize: "cover" }}
                                />
                                <div className="flex flex-col gap-2 text-xs text-slate-500 dark:text-slate-400">
                                    <motion.button
                                        type="button"
                                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-600 px-3 py-1 font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={async () => {
                                            const input = document.createElement("input");
                                            input.type = "file";
                                            input.accept = "image/*";
                                            input.onchange = async () => {
                                                if (input.files && input.files[0]) {
                                                    const url = await uploadAsset(input.files[0]);
                                                    setAvatarUrl(url);
                                                }
                                            };
                                            input.click();
                                        }}
                                    >
                                        <UploadCloud className="h-4 w-4" /> Upload photo
                                    </motion.button>
                                    {avatarUrl && (
                                        <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[200px]">{avatarUrl}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <motion.button
                            type="submit"
                            disabled={saving}
                            className="w-full rounded-full bg-[#63C0B9] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                            whileHover={{ scale: 1.01, y: -1 }}
                            whileTap={{ scale: 0.99 }}
                            transition={{ duration: 0.2, ease: EASE.swift }}
                        >
                            {saving ? "Saving..." : "Save profile"}
                        </motion.button>
                    </form>

                    {/* Theme Preferences */}
                    <motion.div
                        className="mt-8 rounded-3xl border border-slate-100 dark:border-slate-700 bg-[#F9FBFF] dark:bg-slate-800/50 p-5"
                        initial={SURFACES.lift.initial}
                        whileInView={SURFACES.lift.animate(0.05)}
                        viewport={{ once: true }}
                    >
                        <div className="flex items-center gap-3">
                            <div className="rounded-full bg-[#E7F6F3] dark:bg-slate-700 p-3 text-[#2D8F80]">
                                <Palette className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold uppercase tracking-wide text-[#2D8F80]">Appearance</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Choose your preferred color theme.</p>
                            </div>
                        </div>
                        <div className="mt-4 grid grid-cols-3 gap-3">
                            {([
                                { value: "light" as Theme, icon: <Sun className="h-5 w-5" />, label: "Light" },
                                { value: "dark" as Theme, icon: <Moon className="h-5 w-5" />, label: "Dark" },
                                { value: "system" as Theme, icon: <Monitor className="h-5 w-5" />, label: "System" },
                            ]).map((option) => (
                                <motion.button
                                    key={option.value}
                                    type="button"
                                    onClick={() => handleThemeChange(option.value)}
                                    className={`flex flex-col items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium transition-colors ${
                                        theme === option.value
                                            ? "border-[#63C0B9] bg-[#E9F7F5] dark:bg-slate-700 text-[#2D8F80]"
                                            : "border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 hover:border-[#CFE3E0] hover:bg-slate-50 dark:hover:bg-slate-600"
                                    }`}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    {option.icon}
                                    <span>{option.label}</span>
                                </motion.button>
                            ))}
                        </div>
                    </motion.div>

                    {/* Email Updates */}
                    <motion.div
                        className="mt-6 rounded-3xl border border-slate-100 dark:border-slate-700 bg-[#F9FBFF] dark:bg-slate-800/50 p-5"
                        initial={SURFACES.lift.initial}
                        whileInView={SURFACES.lift.animate(0.1)}
                        viewport={{ once: true }}
                    >
                        <div className="flex items-center gap-3">
                            <div className="rounded-full bg-[#E7F6F3] dark:bg-slate-700 p-3 text-[#2D8F80]">
                                <Bell className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold uppercase tracking-wide text-[#2D8F80]">Email notifications</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Control which emails you receive from SparkHub.</p>
                            </div>
                        </div>
                        <div className="mt-4 space-y-3">
                            <label className="flex items-start gap-3 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-sm text-slate-700 dark:text-slate-200 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">
                                <input
                                    type="checkbox"
                                    className="mt-1 h-4 w-4 rounded border-slate-300 dark:border-slate-500 text-[#63C0B9] focus:ring-[#63C0B9]"
                                    checked={weeklyOptIn}
                                    disabled={prefLoading}
                                    onChange={(e) => handleEmailPrefUpdate("weeklyUpdates", e.target.checked)}
                                />
                                <div>
                                    <span className="font-medium">Weekly digest</span>
                                    <span className="block text-xs text-slate-500 dark:text-slate-400">Receive a weekly summary of new courses, events, and opportunities.</span>
                                </div>
                            </label>
                            <label className="flex items-start gap-3 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-sm text-slate-700 dark:text-slate-200 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">
                                <input
                                    type="checkbox"
                                    className="mt-1 h-4 w-4 rounded border-slate-300 dark:border-slate-500 text-[#63C0B9] focus:ring-[#63C0B9]"
                                    checked={productUpdates}
                                    disabled={prefLoading}
                                    onChange={(e) => handleEmailPrefUpdate("productUpdates", e.target.checked)}
                                />
                                <div>
                                    <span className="font-medium">Product updates</span>
                                    <span className="block text-xs text-slate-500 dark:text-slate-400">Be notified about new features and improvements to SparkHub.</span>
                                </div>
                            </label>
                            <label className="flex items-start gap-3 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-sm text-slate-700 dark:text-slate-200 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">
                                <input
                                    type="checkbox"
                                    className="mt-1 h-4 w-4 rounded border-slate-300 dark:border-slate-500 text-[#63C0B9] focus:ring-[#63C0B9]"
                                    checked={marketing}
                                    disabled={prefLoading}
                                    onChange={(e) => handleEmailPrefUpdate("marketing", e.target.checked)}
                                />
                                <div>
                                    <span className="font-medium">Promotional emails</span>
                                    <span className="block text-xs text-slate-500 dark:text-slate-400">Receive special offers, tips, and partner content.</span>
                                </div>
                            </label>
                        </div>
                    </motion.div>

                    {/* AI Features */}
                    <motion.div
                        className="mt-6 rounded-3xl border border-slate-100 dark:border-slate-700 bg-[#F9FBFF] dark:bg-slate-800/50 p-5"
                        initial={SURFACES.lift.initial}
                        whileInView={SURFACES.lift.animate(0.15)}
                        viewport={{ once: true }}
                    >
                        <div className="flex items-center gap-3">
                            <div className="rounded-full bg-gradient-to-br from-[#E7F6F3] to-[#F0F9FF] dark:from-slate-700 dark:to-slate-600 p-3 text-[#2D8F80]">
                                <Sparkles className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold uppercase tracking-wide text-[#2D8F80]">AI Assistant</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Your personal learning companion is ready to help.</p>
                            </div>
                        </div>
                        <div className="mt-4 rounded-2xl border border-dashed border-[#CFE3E0] dark:border-slate-600 bg-white/80 dark:bg-slate-700/50 px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                            <p>Click the <span className="inline-flex items-center gap-1 font-semibold text-[#2D8F80]"><Sparkles className="h-4 w-4" /> sparkle button</span> in the bottom right corner of any page to chat with SparkHub AI. Get help with:</p>
                            <ul className="mt-2 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                                <li>• Study tips and learning strategies</li>
                                <li>• Course recommendations</li>
                                <li>• Career guidance and job preparation</li>
                                <li>• Finding tutors and resources</li>
                            </ul>
                        </div>
                    </motion.div>

                    {/* Role Shortcuts */}
                    <motion.div
                        className="mt-6 rounded-3xl border border-slate-100 dark:border-slate-700 bg-[#F9FBFF] dark:bg-slate-800/50 p-5"
                        initial={SURFACES.lift.initial}
                        whileInView={SURFACES.lift.animate(0.2)}
                        viewport={{ once: true }}
                    >
                        <div className="flex items-center gap-3">
                            <div className="rounded-full bg-[#E7F6F3] dark:bg-slate-700 p-3 text-[#2D8F80]">
                                <Shield className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold uppercase tracking-wide text-[#2D8F80]">Role shortcuts</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Hop directly into admin or tutor workspaces.</p>
                            </div>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold">
                            <Link
                                href="/dashboard"
                                className="rounded-full border border-slate-200 dark:border-slate-600 px-4 py-1 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-600"
                            >
                                Dashboard
                            </Link>
                            {user.role === "ADMIN" && (
                                <Link
                                    href="/admin"
                                    className="rounded-full border border-slate-200 dark:border-slate-600 px-4 py-1 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-600"
                                >
                                    Admin control panel
                                </Link>
                            )}
                            {(user.role === "TUTOR" || user.role === "ADMIN") && (
                                <Link
                                    href="/tutors/dashboard"
                                    className="rounded-full border border-slate-200 dark:border-slate-600 px-4 py-1 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-600"
                                >
                                    Tutor workspace
                                </Link>
                            )}
                        </div>
                    </motion.div>
                </motion.section>
            </main>
            <AIAssistant />
        </div>
    );
}
