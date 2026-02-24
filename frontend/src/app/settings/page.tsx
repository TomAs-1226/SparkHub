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
    BellOff,
    Palette,
    Sparkles,
    Info,
    FileText,
    ChevronDown,
    History,
    Zap,
    BookOpen,
    MessageCircle,
    BarChart2,
    Star,
    Megaphone,
    Server,
    SlidersHorizontal,
    Settings2,
    RefreshCw,
    Trash2,
    Terminal,
    Play,
    X,
    AlertTriangle,
    Activity,
    Inbox,
} from "lucide-react";

import SiteNav from "@/components/site-nav";
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
    const [weeklyDigest, setWeeklyDigest] = useState(true);
    const [platformAlerts, setPlatformAlerts] = useState(true);
    const [tosExpanded, setTosExpanded] = useState(false);
    const [changelogExpanded, setChangelogExpanded] = useState(false);
    // Hidden setup menu — unlocked by clicking version badge 5× within 3s
    const [versionClicks, setVersionClicks] = useState(0);
    const [lastClickTime, setLastClickTime] = useState(0);
    const [devMenuOpen, setDevMenuOpen] = useState(false);
    const [devStatus, setDevStatus] = useState<string | null>(null);
    const [apiHealth, setApiHealth] = useState<string | null>(null);

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
                    setWeeklyDigest(Boolean(json.preferences.weeklyUpdates ?? true));
                    setPlatformAlerts(Boolean(json.preferences.productUpdates ?? true));
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

    async function handleNotifPrefUpdate(key: string, value: boolean) {
        setStatus(null);
        const backendKey = key === "weeklyDigest" ? "weeklyUpdates" : "productUpdates";
        if (key === "weeklyDigest") setWeeklyDigest(value);
        if (key === "platformAlerts") setPlatformAlerts(value);

        try {
            const res = await api("/emails/preferences", {
                method: "PATCH",
                body: JSON.stringify({ [backendKey]: value }),
            });
            const json = await safeJson(res);
            if (!res.ok || json?.ok === false) throw new Error(json?.msg || "Unable to update preferences.");
            setStatus("Notification preferences saved.");
        } catch (err) {
            // Revert on error
            if (key === "weeklyDigest") setWeeklyDigest(!value);
            if (key === "platformAlerts") setPlatformAlerts(!value);
            setStatus(err instanceof Error ? err.message : "Unable to update preferences.");
        }
    }

    function handleVersionClick() {
        const now = Date.now();
        const newCount = now - lastClickTime < 3000 ? versionClicks + 1 : 1;
        setLastClickTime(now);
        setVersionClicks(newCount);
        if (newCount >= 5) {
            setVersionClicks(0);
            setDevMenuOpen(true);
        }
    }

    async function checkApiHealth() {
        setApiHealth("Checking…");
        try {
            const res = await fetch("/api/healthz");
            const data = await res.json().catch(() => ({}));
            setApiHealth(data.status === "healthy" ? "✓ Backend healthy" : `⚠ ${data.status || "Unknown"}`);
        } catch {
            setApiHealth("✗ Cannot reach backend");
        }
    }

    async function triggerTestDigest() {
        setDevStatus("Sending digest…");
        try {
            const res = await api("/inbox/digest", { method: "POST" });
            const data = await safeJson(res);
            setDevStatus(data?.ok ? `✓ Digest sent to ${data.sent} users` : `✗ ${data?.msg || "Failed"}`);
        } catch {
            setDevStatus("✗ Failed to trigger digest");
        }
    }

    function replayOnboarding() {
        setDevMenuOpen(false);
        try { localStorage.removeItem("sparkhub:onboarded"); } catch { /* noop */ }
        router.push("/dashboard?welcome=1");
    }

    function clearAllPrefs() {
        try {
            ["sparkhub:onboarded", "sparkhub:interests", "sparkhub:goal",
             "sparkhub:pref:weeklyDigest", "sparkhub:pref:notifications"].forEach((k) => {
                try { localStorage.removeItem(k); } catch { /* noop */ }
            });
        } catch { /* noop */ }
        setDevStatus("✓ All app preferences cleared");
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

                    {/* Notification Preferences */}
                    <motion.div
                        className="mt-6 rounded-3xl border border-slate-100 dark:border-slate-700 bg-[#F9FBFF] dark:bg-slate-800/50 p-5"
                        initial={SURFACES.lift.initial}
                        whileInView={SURFACES.lift.animate(0.1)}
                        viewport={{ once: true }}
                    >
                        <div className="flex items-center gap-3">
                            <div className="rounded-full bg-[#E7F6F3] dark:bg-slate-700 p-3 text-[#2D8F80]">
                                <Inbox className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold uppercase tracking-wide text-[#2D8F80]">Notification preferences</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Control what SparkHub delivers to your inbox.</p>
                            </div>
                        </div>
                        <div className="mt-4 space-y-3">
                            {/* Weekly digest toggle */}
                            <div className="flex items-start gap-3 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        {weeklyDigest
                                            ? <Bell className="h-4 w-4 text-[#63C0B9]" />
                                            : <BellOff className="h-4 w-4 text-slate-400" />}
                                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Weekly digest</span>
                                    </div>
                                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 ml-6">
                                        AI-generated summary of new courses, events, and opportunities — delivered to your inbox every Monday.
                                    </p>
                                </div>
                                <button
                                    disabled={prefLoading}
                                    onClick={() => handleNotifPrefUpdate("weeklyDigest", !weeklyDigest)}
                                    className={`relative mt-0.5 h-6 w-11 flex-shrink-0 rounded-full transition-colors disabled:opacity-50 ${weeklyDigest ? "bg-[#63C0B9]" : "bg-slate-200 dark:bg-slate-600"}`}
                                >
                                    <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${weeklyDigest ? "translate-x-5" : "translate-x-0"}`} />
                                </button>
                            </div>
                            {/* Platform alerts toggle */}
                            <div className="flex items-start gap-3 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        {platformAlerts
                                            ? <Bell className="h-4 w-4 text-[#63C0B9]" />
                                            : <BellOff className="h-4 w-4 text-slate-400" />}
                                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Platform updates</span>
                                    </div>
                                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 ml-6">
                                        Important announcements and new feature notifications from the SparkHub team.
                                    </p>
                                </div>
                                <button
                                    disabled={prefLoading}
                                    onClick={() => handleNotifPrefUpdate("platformAlerts", !platformAlerts)}
                                    className={`relative mt-0.5 h-6 w-11 flex-shrink-0 rounded-full transition-colors disabled:opacity-50 ${platformAlerts ? "bg-[#63C0B9]" : "bg-slate-200 dark:bg-slate-600"}`}
                                >
                                    <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${platformAlerts ? "translate-x-5" : "translate-x-0"}`} />
                                </button>
                            </div>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 px-1">
                                All notifications are delivered to your <Link href="/inbox" className="font-semibold text-[#63C0B9] hover:underline">in-app inbox</Link> — no email required.
                            </p>
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

                    {/* About SparkHub */}
                    <motion.div
                        className="mt-6 rounded-3xl border border-slate-100 dark:border-slate-700 bg-[#F9FBFF] dark:bg-slate-800/50 p-5"
                        initial={SURFACES.lift.initial}
                        whileInView={SURFACES.lift.animate(0.25)}
                        viewport={{ once: true }}
                    >
                        <div className="flex items-center gap-3">
                            <div className="rounded-full bg-[#E7F6F3] dark:bg-slate-700 p-3 text-[#2D8F80]">
                                <Info className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold uppercase tracking-wide text-[#2D8F80]">About SparkHub</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Version 2.2.0 • Production Release</p>
                            </div>
                        </div>
                        <div className="mt-4 space-y-4">
                            <div className="rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3">
                                <p className="text-sm text-slate-700 dark:text-slate-200">
                                    <span className="font-semibold">SparkHub</span> is a comprehensive learning platform designed to connect students, mentors, tutors, and creators. Our mission is to make quality education accessible and collaborative.
                                </p>
                                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                                    {["Courses", "Tutoring", "Events", "Jobs", "AI Assistant", "Discussions", "Progress Tracking", "Slide Viewer", "Ratings", "Announcements", "Inbox", "Matching", "Weekly Digest"].map((tag) => (
                                        <span key={tag} className="rounded-full bg-[#E9F7F5] dark:bg-slate-600 px-2 py-0.5 text-[#2D8F80] dark:text-[#63C0B9]">{tag}</span>
                                    ))}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2">
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Platform</p>
                                    <p className="font-medium text-slate-700 dark:text-slate-200">SparkHub Web</p>
                                </div>
                                <div className="rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2">
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Build</p>
                                    <p className="font-medium text-slate-700 dark:text-slate-200">2026.02.23</p>
                                </div>
                                {/* Version badge — click 5× to open setup menu */}
                                <button
                                    onClick={handleVersionClick}
                                    className="rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-left hover:border-[#63C0B9]/40 transition-colors group"
                                >
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Version</p>
                                    <p className="font-medium text-slate-700 dark:text-slate-200 group-hover:text-[#2D8F80] transition-colors">
                                        2.2.0 Production
                                        {versionClicks > 1 && (
                                            <span className="ml-1.5 text-[10px] text-[#63C0B9]">
                                                {5 - versionClicks}…
                                            </span>
                                        )}
                                    </p>
                                </button>
                                <div className="rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2">
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Capacity</p>
                                    <p className="font-medium text-slate-700 dark:text-slate-200">1,000+ users</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Hidden Setup Menu — rendered inline below About, animated slide-down */}
                    {devMenuOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: -16, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -12, scale: 0.97 }}
                            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                            className="mt-4 rounded-3xl border-2 border-[#63C0B9]/40 bg-gradient-to-br from-[#E9F7F5] to-white dark:from-teal-900/20 dark:to-slate-800 p-5 shadow-xl"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2.5">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#63C0B9] text-white shadow-sm">
                                        <Settings2 className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Setup &amp; Developer Menu</p>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400">SparkHub v2.2.0 · Hidden access</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => { setDevMenuOpen(false); setDevStatus(null); setApiHealth(null); }}
                                    className="rounded-full p-1.5 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-600 transition-colors"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            {/* Status feedback */}
                            {(devStatus || apiHealth) && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="mb-3 rounded-xl bg-white/80 dark:bg-slate-700/60 border border-[#63C0B9]/30 px-3 py-2 text-[12px] font-medium text-slate-700 dark:text-slate-200"
                                >
                                    {devStatus || apiHealth}
                                </motion.div>
                            )}

                            {/* Action grid */}
                            <div className="grid grid-cols-2 gap-2.5">
                                {/* Replay Onboarding */}
                                <button
                                    onClick={replayOnboarding}
                                    className="flex items-center gap-2.5 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-left hover:border-[#63C0B9]/50 hover:bg-[#E9F7F5] dark:hover:bg-teal-900/20 transition-all group"
                                >
                                    <Play className="h-4 w-4 text-[#63C0B9] group-hover:scale-110 transition-transform flex-shrink-0" />
                                    <div>
                                        <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">Replay Onboarding</p>
                                        <p className="text-[11px] text-slate-400">Re-run the setup wizard</p>
                                    </div>
                                </button>

                                {/* Check API Health */}
                                <button
                                    onClick={checkApiHealth}
                                    className="flex items-center gap-2.5 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-left hover:border-[#63C0B9]/50 hover:bg-[#E9F7F5] dark:hover:bg-teal-900/20 transition-all group"
                                >
                                    <Activity className="h-4 w-4 text-[#63C0B9] group-hover:scale-110 transition-transform flex-shrink-0" />
                                    <div>
                                        <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">System Status</p>
                                        <p className="text-[11px] text-slate-400">Check backend health</p>
                                    </div>
                                </button>

                                {/* Trigger Test Digest (admin) */}
                                {user?.role === "ADMIN" && (
                                    <button
                                        onClick={triggerTestDigest}
                                        className="flex items-center gap-2.5 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-left hover:border-[#63C0B9]/50 hover:bg-[#E9F7F5] dark:hover:bg-teal-900/20 transition-all group"
                                    >
                                        <RefreshCw className="h-4 w-4 text-[#63C0B9] group-hover:scale-110 transition-transform flex-shrink-0" />
                                        <div>
                                            <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">Send Test Digest</p>
                                            <p className="text-[11px] text-slate-400">Trigger weekly digest now</p>
                                        </div>
                                    </button>
                                )}

                                {/* Clear preferences */}
                                <button
                                    onClick={clearAllPrefs}
                                    className="flex items-center gap-2.5 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-left hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all group"
                                >
                                    <Trash2 className="h-4 w-4 text-red-400 group-hover:scale-110 transition-transform flex-shrink-0" />
                                    <div>
                                        <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">Clear Preferences</p>
                                        <p className="text-[11px] text-slate-400">Reset all local settings</p>
                                    </div>
                                </button>
                            </div>

                            {/* Debug info */}
                            <div className="mt-3 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white/60 dark:bg-slate-700/40 px-4 py-3">
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 flex items-center gap-1.5">
                                    <Terminal className="h-3 w-3" /> Session info
                                </p>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] font-mono text-slate-600 dark:text-slate-300">
                                    <span className="text-slate-400">user.id</span>
                                    <span className="truncate">{user?.id?.slice(0, 14)}…</span>
                                    <span className="text-slate-400">user.role</span>
                                    <span>{user?.role}</span>
                                    <span className="text-slate-400">onboarded</span>
                                    <span>{typeof window !== "undefined" ? (localStorage.getItem("sparkhub:onboarded") ? "yes" : "no") : "—"}</span>
                                    <span className="text-slate-400">interests</span>
                                    <span className="truncate">
                                        {typeof window !== "undefined"
                                            ? (() => { try { const i = JSON.parse(localStorage.getItem("sparkhub:interests") || "[]"); return i.length ? `${i.length} topics` : "none"; } catch { return "none"; } })()
                                            : "—"}
                                    </span>
                                </div>
                            </div>

                            <p className="mt-3 text-center text-[11px] text-slate-400 dark:text-slate-500">
                                Hidden menu — accessible via 5× rapid tap on version badge
                            </p>
                        </motion.div>
                    )}

                    {/* Update Logs / Changelog */}
                    <motion.div
                        className="mt-6 rounded-3xl border border-slate-100 dark:border-slate-700 bg-[#F9FBFF] dark:bg-slate-800/50 p-5"
                        initial={SURFACES.lift.initial}
                        whileInView={SURFACES.lift.animate(0.27)}
                        viewport={{ once: true }}
                    >
                        <button
                            onClick={() => setChangelogExpanded(!changelogExpanded)}
                            className="flex w-full items-center justify-between gap-3"
                        >
                            <div className="flex items-center gap-3">
                                <div className="rounded-full bg-[#E7F6F3] dark:bg-slate-700 p-3 text-[#2D8F80]">
                                    <History className="h-5 w-5" />
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-semibold uppercase tracking-wide text-[#2D8F80]">Update Logs</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">See what&apos;s new in SparkHub</p>
                                </div>
                            </div>
                            <motion.div
                                animate={{ rotate: changelogExpanded ? 180 : 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                <ChevronDown className="h-5 w-5 text-slate-400" />
                            </motion.div>
                        </button>

                        <motion.div
                            initial={false}
                            animate={{ height: changelogExpanded ? "auto" : 0, opacity: changelogExpanded ? 1 : 0 }}
                            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                            className="overflow-hidden"
                        >
                            <div className="mt-4 space-y-6 text-sm">
                                {/* v2.2.0 */}
                                <div className="rounded-2xl border border-[#63C0B9]/40 bg-white dark:bg-slate-700 px-5 py-4">
                                    <div className="flex items-center gap-3 mb-3">
                                        <span className="rounded-full bg-[#2D8F80] px-3 py-1 text-xs font-bold text-white">v2.2.0</span>
                                        <span className="text-xs text-slate-500 dark:text-slate-400">February 23, 2026</span>
                                        <span className="rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-xs font-semibold text-green-700 dark:text-green-400">Latest</span>
                                    </div>
                                    <p className="font-semibold text-slate-800 dark:text-slate-100 mb-3">Production Release — Inbox, Onboarding &amp; More</p>
                                    <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
                                        <div>
                                            <div className="flex items-center gap-1.5 mb-1 font-semibold text-slate-700 dark:text-slate-200">
                                                <Bell className="h-3.5 w-3.5 text-[#2D8F80]" /> In-App Inbox &amp; Messaging
                                            </div>
                                            <ul className="list-disc ml-4 space-y-0.5">
                                                <li>Full in-app inbox replaces email digest delivery</li>
                                                <li>Three tabs: All · Unread · Digests with live unread badge in the nav</li>
                                                <li>AI-generated weekly digest powered by OpenAI gpt-4o-mini</li>
                                                <li>Admin broadcast: send platform-wide or targeted messages instantly</li>
                                                <li>Mark all read, per-message delete, expand-to-read UX</li>
                                            </ul>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-1.5 mb-1 font-semibold text-slate-700 dark:text-slate-200">
                                                <Sparkles className="h-3.5 w-3.5 text-[#2D8F80]" /> Enhanced Onboarding (OOBE)
                                            </div>
                                            <ul className="list-disc ml-4 space-y-0.5">
                                                <li>4-step onboarding modal on first login — Welcome · Features · Quick Start · Done</li>
                                                <li>Role-aware quick-start cards (Student, Creator, Tutor, Admin)</li>
                                                <li>Confetti finish animation, spring-physics throughout</li>
                                                <li>Triggered on first visit or via <code className="bg-slate-100 dark:bg-slate-600 px-1 rounded">?welcome=1</code></li>
                                            </ul>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-1.5 mb-1 font-semibold text-slate-700 dark:text-slate-200">
                                                <Shield className="h-3.5 w-3.5 text-[#2D8F80]" /> Instant Registration (No Email)
                                            </div>
                                            <ul className="list-disc ml-4 space-y-0.5">
                                                <li>Registration completes in-browser — no email verification step</li>
                                                <li>Browser-token verification proves real session without sending email</li>
                                                <li>5-minute one-time token consumed automatically in same JS context</li>
                                                <li>Shows "Securing your account…" spinner during verification</li>
                                            </ul>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-1.5 mb-1 font-semibold text-slate-700 dark:text-slate-200">
                                                <UploadCloud className="h-3.5 w-3.5 text-[#2D8F80]" /> Upload Fix (50 MB)
                                            </div>
                                            <ul className="list-disc ml-4 space-y-0.5">
                                                <li>Fixed "Failed to fetch" and "File too large" upload errors</li>
                                                <li>Uploads now go directly to backend — bypasses Next.js Turbopack entirely</li>
                                                <li>File size limit raised from 15 MB → 50 MB</li>
                                            </ul>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-1.5 mb-1 font-semibold text-slate-700 dark:text-slate-200">
                                                <BookOpen className="h-3.5 w-3.5 text-[#2D8F80]" /> Tutor Publishing &amp; Matching
                                            </div>
                                            <ul className="list-disc ml-4 space-y-0.5">
                                                <li>Tutors can now save bio, subjects, rate info and publish their public profile</li>
                                                <li>One-click publish/unpublish toggle with live status indicator</li>
                                                <li>Matching engine uses word-level subject tokenization (Java no longer matches JavaScript)</li>
                                                <li>New <code className="bg-slate-100 dark:bg-slate-600 px-1 rounded">matchPercent</code> score field returned on all match results</li>
                                            </ul>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-1.5 mb-1 font-semibold text-slate-700 dark:text-slate-200">
                                                <Server className="h-3.5 w-3.5 text-[#2D8F80]" /> One-Command Deployment
                                            </div>
                                            <ul className="list-disc ml-4 space-y-0.5">
                                                <li><code className="bg-slate-100 dark:bg-slate-600 px-1 rounded">bash deploy.sh</code> — one-command setup for macOS &amp; Linux</li>
                                                <li><code className="bg-slate-100 dark:bg-slate-600 px-1 rounded">deploy.ps1</code> — PowerShell equivalent for Windows</li>
                                                <li>Auto-installs PM2, runs prisma db push, builds frontend, starts both servers</li>
                                                <li><code className="bg-slate-100 dark:bg-slate-600 px-1 rounded">--dev</code> flag for development mode with hot reload</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>

                                {/* v2.1.0 */}
                                <div className="rounded-2xl border border-[#63C0B9]/40 bg-white dark:bg-slate-700 px-5 py-4">
                                    <div className="flex items-center gap-3 mb-3">
                                        <span className="rounded-full bg-[#2D8F80] px-3 py-1 text-xs font-bold text-white">v2.1.0</span>
                                        <span className="text-xs text-slate-500 dark:text-slate-400">February 22, 2026</span>
                                    </div>
                                    <p className="font-semibold text-slate-800 dark:text-slate-100 mb-3">Platform Hardening &amp; AI Safety</p>
                                    <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
                                        <div>
                                            <div className="flex items-center gap-1.5 mb-1 font-semibold text-slate-700 dark:text-slate-200">
                                                <Shield className="h-3.5 w-3.5 text-[#2D8F80]" /> AI Content Moderation
                                            </div>
                                            <ul className="list-disc ml-4 space-y-0.5">
                                                <li>Two-tier moderation system for all user-generated content</li>
                                                <li>Tier 1: Instant keyword &amp; pattern filtering — blocks hate speech, doxxing, self-harm content, and spam</li>
                                                <li>Mild profanity is auto-cleaned (replaced with ***) rather than blocked</li>
                                                <li>Tier 2: Optional Claude AI moderation for nuanced context — only active when <code className="bg-slate-100 dark:bg-slate-600 px-1 rounded">ANTHROPIC_API_KEY</code> is set</li>
                                                <li>Permissive by design — educational debate, mild frustration, and idea criticism are always allowed</li>
                                                <li>5-second AI timeout with automatic fallback to tier-1 to never block requests</li>
                                                <li>Moderation applied to: course chat messages, discussion posts &amp; replies, course reviews</li>
                                            </ul>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-1.5 mb-1 font-semibold text-slate-700 dark:text-slate-200">
                                                <UploadCloud className="h-3.5 w-3.5 text-[#2D8F80]" /> File Upload Fix
                                            </div>
                                            <ul className="list-disc ml-4 space-y-0.5">
                                                <li>Fixed upload failures for files larger than 10 MB</li>
                                                <li>Dedicated streaming upload route bypasses Next.js proxy buffer entirely</li>
                                                <li>Upload size limit raised to 20 MB end-to-end</li>
                                                <li>Eliminates ECONNRESET errors on large PPTX, PDF, and image uploads</li>
                                            </ul>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-1.5 mb-1 font-semibold text-slate-700 dark:text-slate-200">
                                                <CheckCircle2 className="h-3.5 w-3.5 text-[#2D8F80]" /> Enrollment Approval
                                            </div>
                                            <ul className="list-disc ml-4 space-y-0.5">
                                                <li>Instructors can now approve or reject enrollment requests directly from the course panel</li>
                                                <li>Approve / Reject buttons appear in the pending enrollment queue</li>
                                                <li>Status updates immediately — approved students gain full course access instantly</li>
                                            </ul>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-1.5 mb-1 font-semibold text-slate-700 dark:text-slate-200">
                                                <SlidersHorizontal className="h-3.5 w-3.5 text-[#2D8F80]" /> Slide &amp; Deck Viewer Improvements
                                            </div>
                                            <ul className="list-disc ml-4 space-y-0.5">
                                                <li>PDF files now render reliably in the browser with an absolute-URL iframe</li>
                                                <li>PPTX files on localhost show a clear download fallback (Office Online requires a public URL)</li>
                                                <li>Relative upload URLs are automatically resolved to absolute before embedding</li>
                                                <li>Graceful error states with Google Docs Viewer alternative link</li>
                                            </ul>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-1.5 mb-1 font-semibold text-slate-700 dark:text-slate-200">
                                                <Zap className="h-3.5 w-3.5 text-[#2D8F80]" /> Opportunity Posting Fix
                                            </div>
                                            <ul className="list-disc ml-4 space-y-0.5">
                                                <li>Fixed "bad request" error when publishing job/opportunity postings</li>
                                                <li>Removed invalid RECRUITER role from the posting permission check</li>
                                                <li>Contact field is now correctly optional — defaults to poster&apos;s email if left blank</li>
                                                <li>Clearer per-field validation error messages in the post form</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>

                                {/* v2.0.0 */}
                                <div className="rounded-2xl border border-[#63C0B9]/30 bg-white dark:bg-slate-700 px-5 py-4">
                                    <div className="flex items-center gap-3 mb-3">
                                        <span className="rounded-full bg-[#2D8F80] px-3 py-1 text-xs font-bold text-white">v2.0.0</span>
                                        <span className="text-xs text-slate-500 dark:text-slate-400">February 22, 2026</span>
                                        <span className="rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400">Major Release</span>
                                    </div>
                                    <p className="font-semibold text-slate-800 dark:text-slate-100 mb-3">LMS Edition — Full Platform Upgrade</p>
                                    <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
                                        <div>
                                            <div className="flex items-center gap-1.5 mb-1 font-semibold text-slate-700 dark:text-slate-200">
                                                <SlidersHorizontal className="h-3.5 w-3.5 text-[#2D8F80]" /> Slide &amp; Presentation Viewer
                                            </div>
                                            <ul className="list-disc ml-4 space-y-0.5">
                                                <li>Embedded slide player for PDF, PPTX, and Office files directly in the browser</li>
                                                <li>Google Docs viewer integration for PowerPoint presentations</li>
                                                <li>Fullscreen mode with keyboard shortcut (Escape to exit)</li>
                                                <li>Loading states, error recovery, and external open/download buttons</li>
                                            </ul>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-1.5 mb-1 font-semibold text-slate-700 dark:text-slate-200">
                                                <BarChart2 className="h-3.5 w-3.5 text-[#2D8F80]" /> Course Progress Tracking
                                            </div>
                                            <ul className="list-disc ml-4 space-y-0.5">
                                                <li>Per-lesson completion checkboxes — mark lessons done as you learn</li>
                                                <li>Visual progress bar showing % completion for each course</li>
                                                <li>Time-spent tracking per lesson</li>
                                                <li>My Progress overview across all enrolled courses</li>
                                            </ul>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-1.5 mb-1 font-semibold text-slate-700 dark:text-slate-200">
                                                <Megaphone className="h-3.5 w-3.5 text-[#2D8F80]" /> Course Announcements
                                            </div>
                                            <ul className="list-disc ml-4 space-y-0.5">
                                                <li>Instructors can post pinned or regular announcements to enrolled students</li>
                                                <li>Expandable announcement cards with formatted body text</li>
                                                <li>Manage (edit, pin, delete) from the course workspace</li>
                                            </ul>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-1.5 mb-1 font-semibold text-slate-700 dark:text-slate-200">
                                                <MessageCircle className="h-3.5 w-3.5 text-[#2D8F80]" /> Discussion Forums
                                            </div>
                                            <ul className="list-disc ml-4 space-y-0.5">
                                                <li>Threaded discussion boards per course and per lesson</li>
                                                <li>Students and instructors can post and reply</li>
                                                <li>Instructor replies are highlighted for easy identification</li>
                                                <li>Mark discussions as resolved; pin important threads</li>
                                            </ul>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-1.5 mb-1 font-semibold text-slate-700 dark:text-slate-200">
                                                <Star className="h-3.5 w-3.5 text-[#2D8F80]" /> Course Ratings &amp; Reviews
                                            </div>
                                            <ul className="list-disc ml-4 space-y-0.5">
                                                <li>Enrolled students can rate courses 1–5 stars and write reviews</li>
                                                <li>Rating distribution chart and average score displayed</li>
                                                <li>All reviews shown publicly on the course workspace</li>
                                            </ul>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-1.5 mb-1 font-semibold text-slate-700 dark:text-slate-200">
                                                <BookOpen className="h-3.5 w-3.5 text-[#2D8F80]" /> Student Notes &amp; Bookmarks
                                            </div>
                                            <ul className="list-disc ml-4 space-y-0.5">
                                                <li>Quick note widget in the course sidebar (auto-saved locally)</li>
                                                <li>Per-course and per-lesson notes API (backend)</li>
                                                <li>Course bookmark system — save courses for later</li>
                                            </ul>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-1.5 mb-1 font-semibold text-slate-700 dark:text-slate-200">
                                                <Server className="h-3.5 w-3.5 text-[#2D8F80]" /> Backend Scalability (1,000+ Users)
                                            </div>
                                            <ul className="list-disc ml-4 space-y-0.5">
                                                <li>SQLite WAL (Write-Ahead Logging) mode for high-concurrency reads</li>
                                                <li>64 MB page cache + 256 MB memory-mapped I/O for SQLite</li>
                                                <li>Rate limiting tuned: 3,000 req/IP/15min globally; separate upload &amp; auth limiters</li>
                                                <li>CORS pre-flight cached 24 h to reduce OPTIONS overhead</li>
                                                <li>Body size limit increased to 2 MB to support richer content payloads</li>
                                                <li>Cluster mode support (multi-CPU) via ENABLE_CLUSTER env flag</li>
                                            </ul>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-1.5 mb-1 font-semibold text-slate-700 dark:text-slate-200">
                                                <Zap className="h-3.5 w-3.5 text-[#2D8F80]" /> CSP &amp; Security Improvements
                                            </div>
                                            <ul className="list-disc ml-4 space-y-0.5">
                                                <li>Content Security Policy updated to allow Google Docs Viewer and Office Online embeds</li>
                                                <li>YouTube and Vimeo iframes now permitted for video lessons</li>
                                                <li>Upload rate limiter added (30 uploads/min per IP)</li>
                                                <li>Referrer policy tightened to strict-origin-when-cross-origin</li>
                                            </ul>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-1.5 mb-1 font-semibold text-slate-700 dark:text-slate-200">
                                                <Info className="h-3.5 w-3.5 text-[#2D8F80]" /> New Database Models
                                            </div>
                                            <ul className="list-disc ml-4 space-y-0.5">
                                                <li>LessonProgress — tracks completion per student per lesson</li>
                                                <li>CourseAnnouncement — instructor announcements with pin support</li>
                                                <li>CourseRating — 1–5 star ratings with optional text review</li>
                                                <li>CourseDiscussion + DiscussionReply — threaded Q&amp;A</li>
                                                <li>CourseBookmark — save courses to revisit</li>
                                                <li>StudentNote — per-lesson notes stored server-side</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>

                                {/* v1.0.0 */}
                                <div className="rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-5 py-4">
                                    <div className="flex items-center gap-3 mb-3">
                                        <span className="rounded-full bg-slate-600 px-3 py-1 text-xs font-bold text-white">v1.0.0</span>
                                        <span className="text-xs text-slate-500 dark:text-slate-400">December 31, 2024</span>
                                        <span className="rounded-full bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:text-blue-400">Initial Release</span>
                                    </div>
                                    <p className="font-semibold text-slate-800 dark:text-slate-100 mb-2">Initial Platform Launch</p>
                                    <ul className="list-disc ml-4 space-y-0.5 text-xs text-slate-600 dark:text-slate-300">
                                        <li>Course creation, enrollment workflow, and lesson management</li>
                                        <li>Quiz system with auto-grading and certificate generation</li>
                                        <li>Tutor matching, session scheduling, and mentoring</li>
                                        <li>Job opportunities board with application system</li>
                                        <li>Events management with calendar export (ICS)</li>
                                        <li>AI assistant (Sparky) for learning guidance</li>
                                        <li>Resource library with inline PDF/image viewer</li>
                                        <li>Study tools: Pomodoro timer, flashcards, grade calculator</li>
                                        <li>Role-based access control (STUDENT, CREATOR, TUTOR, ADMIN)</li>
                                        <li>Dark/light mode with system preference detection</li>
                                    </ul>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>

                    {/* Terms of Service */}
                    <motion.div
                        className="mt-6 rounded-3xl border border-slate-100 dark:border-slate-700 bg-[#F9FBFF] dark:bg-slate-800/50 p-5"
                        initial={SURFACES.lift.initial}
                        whileInView={SURFACES.lift.animate(0.3)}
                        viewport={{ once: true }}
                    >
                        <button
                            onClick={() => setTosExpanded(!tosExpanded)}
                            className="flex w-full items-center justify-between gap-3"
                        >
                            <div className="flex items-center gap-3">
                                <div className="rounded-full bg-[#E7F6F3] dark:bg-slate-700 p-3 text-[#2D8F80]">
                                    <FileText className="h-5 w-5" />
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-semibold uppercase tracking-wide text-[#2D8F80]">Terms of Service</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Legal terms and conditions for using SparkHub</p>
                                </div>
                            </div>
                            <motion.div
                                animate={{ rotate: tosExpanded ? 180 : 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                <ChevronDown className="h-5 w-5 text-slate-400" />
                            </motion.div>
                        </button>

                        <motion.div
                            initial={false}
                            animate={{
                                height: tosExpanded ? "auto" : 0,
                                opacity: tosExpanded ? 1 : 0,
                            }}
                            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                            className="overflow-hidden"
                        >
                            <div className="mt-4 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-5 py-4 text-sm text-slate-700 dark:text-slate-200 max-h-[400px] overflow-y-auto">
                                <h3 className="font-bold text-base mb-3">SparkHub Terms of Service</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Last updated: December 31, 2024</p>

                                <div className="space-y-4 text-xs leading-relaxed">
                                    <section>
                                        <h4 className="font-semibold text-sm mb-1">1. Acceptance of Terms</h4>
                                        <p>By accessing or using SparkHub (&quot;the Platform&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you disagree with any part of these terms, you may not access the Platform. These Terms apply to all visitors, users, students, tutors, creators, and others who access or use the Platform.</p>
                                    </section>

                                    <section>
                                        <h4 className="font-semibold text-sm mb-1">2. Description of Service</h4>
                                        <p>SparkHub is an educational platform that provides:</p>
                                        <ul className="list-disc ml-4 mt-1 space-y-0.5">
                                            <li>Online courses and learning materials</li>
                                            <li>Tutor and mentor matching services</li>
                                            <li>Educational events and workshops</li>
                                            <li>Job and opportunity postings</li>
                                            <li>AI-powered learning assistance</li>
                                            <li>Resource sharing and collaboration tools</li>
                                        </ul>
                                    </section>

                                    <section>
                                        <h4 className="font-semibold text-sm mb-1">3. User Accounts</h4>
                                        <p>3.1. <strong>Registration:</strong> You must provide accurate, complete, and current information during registration. You are responsible for maintaining the confidentiality of your account credentials.</p>
                                        <p className="mt-1">3.2. <strong>Account Security:</strong> You are responsible for all activities that occur under your account. Notify us immediately of any unauthorized use or security breach.</p>
                                        <p className="mt-1">3.3. <strong>Age Requirements:</strong> You must be at least 13 years old to use SparkHub. Users under 18 must have parental or guardian consent.</p>
                                        <p className="mt-1">3.4. <strong>One Account Per Person:</strong> Each individual may only maintain one active account. Creating multiple accounts may result in suspension.</p>
                                    </section>

                                    <section>
                                        <h4 className="font-semibold text-sm mb-1">4. User Conduct</h4>
                                        <p>You agree NOT to:</p>
                                        <ul className="list-disc ml-4 mt-1 space-y-0.5">
                                            <li>Post false, misleading, defamatory, or offensive content</li>
                                            <li>Harass, bully, or intimidate other users</li>
                                            <li>Share copyrighted material without authorization</li>
                                            <li>Attempt to gain unauthorized access to other accounts or systems</li>
                                            <li>Use the Platform for any illegal or unauthorized purpose</li>
                                            <li>Interfere with or disrupt the Platform&apos;s operation</li>
                                            <li>Collect user information without consent</li>
                                            <li>Impersonate any person or entity</li>
                                            <li>Use automated systems to access the Platform without permission</li>
                                        </ul>
                                    </section>

                                    <section>
                                        <h4 className="font-semibold text-sm mb-1">5. Content and Intellectual Property</h4>
                                        <p>5.1. <strong>Your Content:</strong> You retain ownership of content you create on SparkHub. By posting content, you grant SparkHub a non-exclusive, worldwide, royalty-free license to use, display, and distribute your content within the Platform.</p>
                                        <p className="mt-1">5.2. <strong>Platform Content:</strong> SparkHub and its licensors own all content, features, and functionality of the Platform. This includes but is not limited to software, text, graphics, logos, and course materials.</p>
                                        <p className="mt-1">5.3. <strong>Copyright Policy:</strong> We respect intellectual property rights and expect users to do the same. Content that infringes copyrights will be removed and may result in account termination.</p>
                                    </section>

                                    <section>
                                        <h4 className="font-semibold text-sm mb-1">6. Tutoring and Educational Services</h4>
                                        <p>6.1. <strong>Tutor Verification:</strong> While we work to verify tutor qualifications, we cannot guarantee the accuracy of all tutor profiles. Users should exercise judgment when selecting tutors.</p>
                                        <p className="mt-1">6.2. <strong>Session Conduct:</strong> Both tutors and students must conduct sessions professionally and respectfully. Recording sessions without consent is prohibited.</p>
                                        <p className="mt-1">6.3. <strong>No Academic Dishonesty:</strong> Using SparkHub to complete assignments on behalf of students, share exam answers, or facilitate academic dishonesty is strictly prohibited.</p>
                                    </section>

                                    <section>
                                        <h4 className="font-semibold text-sm mb-1">7. AI Assistant Usage</h4>
                                        <p>7.1. <strong>Educational Purpose:</strong> The AI Assistant is designed to support learning, not replace it. It provides guidance and explanations rather than direct answers to assignments.</p>
                                        <p className="mt-1">7.2. <strong>Accuracy:</strong> While we strive for accuracy, AI responses may contain errors. Users should verify important information from authoritative sources.</p>
                                        <p className="mt-1">7.3. <strong>Appropriate Use:</strong> Do not use the AI Assistant to generate harmful, illegal, or inappropriate content.</p>
                                    </section>

                                    <section>
                                        <h4 className="font-semibold text-sm mb-1">8. Privacy and Data</h4>
                                        <p>Your use of SparkHub is also governed by our Privacy Policy. By using the Platform, you consent to our collection and use of data as described in that policy. We collect only necessary information and implement appropriate security measures to protect your data.</p>
                                    </section>

                                    <section>
                                        <h4 className="font-semibold text-sm mb-1">9. Fees and Payments</h4>
                                        <p>9.1. Certain features or services may require payment. All fees are stated in your local currency where available.</p>
                                        <p className="mt-1">9.2. Payments are processed through secure third-party providers. SparkHub does not store complete payment information.</p>
                                        <p className="mt-1">9.3. Refund policies vary by service type and are detailed at the time of purchase.</p>
                                    </section>

                                    <section>
                                        <h4 className="font-semibold text-sm mb-1">10. Termination</h4>
                                        <p>10.1. You may terminate your account at any time through the settings page or by contacting support.</p>
                                        <p className="mt-1">10.2. We may suspend or terminate accounts that violate these Terms, without prior notice.</p>
                                        <p className="mt-1">10.3. Upon termination, your right to use the Platform ceases immediately. Some provisions of these Terms survive termination.</p>
                                    </section>

                                    <section>
                                        <h4 className="font-semibold text-sm mb-1">11. Disclaimers</h4>
                                        <p>11.1. THE PLATFORM IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED.</p>
                                        <p className="mt-1">11.2. We do not guarantee that the Platform will be uninterrupted, secure, or error-free.</p>
                                        <p className="mt-1">11.3. Educational content is for informational purposes and should not replace professional advice.</p>
                                    </section>

                                    <section>
                                        <h4 className="font-semibold text-sm mb-1">12. Limitation of Liability</h4>
                                        <p>To the maximum extent permitted by law, SparkHub shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Platform, even if we have been advised of the possibility of such damages.</p>
                                    </section>

                                    <section>
                                        <h4 className="font-semibold text-sm mb-1">13. Indemnification</h4>
                                        <p>You agree to indemnify and hold harmless SparkHub, its officers, directors, employees, and agents from any claims, damages, losses, or expenses arising from your use of the Platform or violation of these Terms.</p>
                                    </section>

                                    <section>
                                        <h4 className="font-semibold text-sm mb-1">14. Changes to Terms</h4>
                                        <p>We reserve the right to modify these Terms at any time. We will notify users of significant changes through the Platform or email. Continued use after changes constitutes acceptance of the new Terms.</p>
                                    </section>

                                    <section>
                                        <h4 className="font-semibold text-sm mb-1">15. Governing Law</h4>
                                        <p>These Terms are governed by the laws of the jurisdiction where SparkHub is operated. Any disputes shall be resolved in the courts of that jurisdiction.</p>
                                    </section>

                                    <section>
                                        <h4 className="font-semibold text-sm mb-1">16. Contact Information</h4>
                                        <p>For questions about these Terms of Service, please contact us through the Contact page on our Platform or email us at support@sparkhub.com.</p>
                                    </section>

                                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-600">
                                        <p className="text-slate-500 dark:text-slate-400">By using SparkHub, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                </motion.section>
            </main>
        </div>
    );
}