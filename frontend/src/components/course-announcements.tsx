"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Megaphone, Pin, Plus, Trash2, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { api } from "@/lib/api";
import { FADES } from "@/lib/motion-presets";

interface Announcement {
    id: string;
    title: string;
    body: string;
    isPinned: boolean;
    createdAt: string;
    author?: { id: string; name: string; avatarUrl?: string | null; role: string } | null;
}

interface Props {
    courseId: string;
    canManage: boolean;
}

function formatRelative(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
}

export default function CourseAnnouncements({ courseId, canManage }: Props) {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ title: "", body: "", isPinned: false });
    const [posting, setPosting] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            const res = await api(`/announcements/${courseId}`);
            const json = await res.json().catch(() => null);
            if (json?.ok) setAnnouncements(json.announcements || []);
        } catch {
            // silently keep previous state
        } finally {
            setLoading(false);
        }
    }, [courseId]);

    useEffect(() => { load(); }, [load]);

    async function handlePost(e: React.FormEvent) {
        e.preventDefault();
        if (!form.title.trim() || !form.body.trim()) return;
        setPosting(true);
        setMsg(null);
        try {
            const res = await api(`/announcements/${courseId}`, {
                method: "POST",
                body: JSON.stringify(form),
            });
            const json = await res.json().catch(() => null);
            if (!res.ok || json?.ok === false) throw new Error(json?.msg || "Failed to post");
            setAnnouncements((prev) => [json.announcement, ...prev]);
            setForm({ title: "", body: "", isPinned: false });
            setShowForm(false);
        } catch (err) {
            setMsg(err instanceof Error ? err.message : "Unable to post announcement");
        } finally {
            setPosting(false);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("Delete this announcement?")) return;
        await api(`/announcements/${courseId}/${id}`, { method: "DELETE" });
        setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    }

    async function handleTogglePin(ann: Announcement) {
        await api(`/announcements/${courseId}/${ann.id}`, {
            method: "PATCH",
            body: JSON.stringify({ isPinned: !ann.isPinned }),
        });
        setAnnouncements((prev) => prev.map((a) => a.id === ann.id ? { ...a, isPinned: !a.isPinned } : a));
    }

    if (loading) {
        return (
            <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-slate-500 py-6">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading announcements…
            </div>
        );
    }

    return (
        <section id="announcements" className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Megaphone className="h-5 w-5 text-[#2D8F80]" />
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Announcements</h3>
                    {announcements.length > 0 && (
                        <span className="rounded-full bg-[#E9F7F5] dark:bg-slate-700 px-2 py-0.5 text-xs font-semibold text-[#2D8F80] dark:text-[#63C0B9]">
                            {announcements.length}
                        </span>
                    )}
                </div>
                {canManage && (
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="inline-flex items-center gap-1.5 rounded-full bg-[#2D8F80] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1F6C62] transition-colors"
                    >
                        <Plus className="h-3.5 w-3.5" /> New
                    </button>
                )}
            </div>

            {/* Post form */}
            <AnimatePresence>
                {showForm && canManage && (
                    <motion.form
                        variants={FADES.floatUp}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        onSubmit={handlePost}
                        className="rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-4 space-y-3 shadow-sm"
                    >
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">New Announcement</p>
                        <input
                            value={form.title}
                            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                            placeholder="Title"
                            maxLength={200}
                            required
                            className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#63C0B9]"
                        />
                        <textarea
                            value={form.body}
                            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                            placeholder="Announcement body…"
                            rows={4}
                            maxLength={5000}
                            required
                            className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#63C0B9] resize-none"
                        />
                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={form.isPinned}
                                    onChange={(e) => setForm((f) => ({ ...f, isPinned: e.target.checked }))}
                                    className="rounded border-slate-300"
                                />
                                Pin to top
                            </label>
                            <div className="flex items-center gap-2">
                                <button type="button" onClick={() => setShowForm(false)} className="rounded-full px-3 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={posting}
                                    className="rounded-full bg-[#2D8F80] px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                                >
                                    {posting ? "Posting…" : "Post"}
                                </button>
                            </div>
                        </div>
                        {msg && <p className="text-xs text-red-500">{msg}</p>}
                    </motion.form>
                )}
            </AnimatePresence>

            {announcements.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">No announcements yet. Check back later.</p>
            ) : (
                <div className="space-y-3">
                    {announcements.map((ann) => (
                        <motion.div
                            key={ann.id}
                            layout
                            className={`rounded-2xl border p-4 transition-colors ${
                                ann.isPinned
                                    ? "border-[#63C0B9]/40 bg-[#E9F7F5] dark:bg-slate-800/70 dark:border-[#63C0B9]/30"
                                    : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                            }`}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {ann.isPinned && <Pin className="h-3.5 w-3.5 text-[#2D8F80] flex-shrink-0" />}
                                        <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm leading-snug">{ann.title}</p>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        {ann.author?.name || "Instructor"} · {formatRelative(ann.createdAt)}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                    {canManage && (
                                        <>
                                            <button
                                                onClick={() => handleTogglePin(ann)}
                                                title={ann.isPinned ? "Unpin" : "Pin"}
                                                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-[#2D8F80]"
                                            >
                                                <Pin className="h-3.5 w-3.5" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(ann.id)}
                                                className="rounded-full p-1.5 text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </>
                                    )}
                                    <button
                                        onClick={() => setExpanded(expanded === ann.id ? null : ann.id)}
                                        className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                                    >
                                        {expanded === ann.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                    </button>
                                </div>
                            </div>

                            <AnimatePresence>
                                {expanded === ann.id && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-600 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                                            {ann.body}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    ))}
                </div>
            )}
        </section>
    );
}
