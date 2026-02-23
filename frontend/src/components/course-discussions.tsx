"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    MessageCircle,
    Plus,
    Send,
    CheckCircle2,
    Pin,
    ChevronDown,
    ChevronUp,
    Loader2,
    Trash2,
    BookOpen,
} from "lucide-react";
import { api } from "@/lib/api";
import { FADES } from "@/lib/motion-presets";

interface Reply {
    id: string;
    body: string;
    isInstructorReply: boolean;
    createdAt: string;
    author?: { id: string; name: string; avatarUrl?: string | null; role: string } | null;
}

interface Discussion {
    id: string;
    title: string;
    body: string;
    isPinned: boolean;
    isResolved: boolean;
    lessonId?: string | null;
    createdAt: string;
    author?: { id: string; name: string; avatarUrl?: string | null; role: string } | null;
    replies: Reply[];
    _count?: { replies: number };
}

interface CourseLesson {
    id: string;
    title: string;
    order: number;
}

interface Props {
    courseId: string;
    canManage: boolean;
    userId?: string;
    lessons?: CourseLesson[];
}

function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}

export default function CourseDiscussions({ courseId, canManage, userId, lessons = [] }: Props) {
    const [discussions, setDiscussions] = useState<Discussion[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState<string | null>(null);
    const [showNew, setShowNew] = useState(false);
    const [newForm, setNewForm] = useState({ title: "", body: "", lessonId: "" });
    const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [msg, setMsg] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            const res = await api(`/discussions/${courseId}`);
            const json = await res.json().catch(() => null);
            if (json?.ok) setDiscussions(json.discussions || []);
        } catch {
            // keep previous state
        } finally {
            setLoading(false);
        }
    }, [courseId]);

    useEffect(() => { load(); }, [load]);

    async function handleNewDiscussion(e: React.FormEvent) {
        e.preventDefault();
        if (!newForm.title.trim() || !newForm.body.trim()) return;
        setSubmitting(true);
        setMsg(null);
        try {
            const res = await api(`/discussions/${courseId}`, {
                method: "POST",
                body: JSON.stringify({
                    title: newForm.title,
                    body: newForm.body,
                    lessonId: newForm.lessonId || undefined,
                }),
            });
            const json = await res.json().catch(() => null);
            if (!res.ok || json?.ok === false) throw new Error(json?.msg || "Failed to post");
            setDiscussions((prev) => [{ ...json.discussion, replies: [] }, ...prev]);
            setNewForm({ title: "", body: "", lessonId: "" });
            setShowNew(false);
        } catch (err) {
            setMsg(err instanceof Error ? err.message : "Unable to post discussion");
        } finally {
            setSubmitting(false);
        }
    }

    async function handleReply(discussionId: string) {
        const body = replyInputs[discussionId]?.trim();
        if (!body) return;
        setReplyingTo(discussionId);
        try {
            const res = await api(`/discussions/${courseId}/${discussionId}/replies`, {
                method: "POST",
                body: JSON.stringify({ body }),
            });
            const json = await res.json().catch(() => null);
            if (!res.ok || json?.ok === false) throw new Error(json?.msg || "Failed to reply");
            setDiscussions((prev) =>
                prev.map((d) =>
                    d.id === discussionId
                        ? { ...d, replies: [...d.replies, json.reply] }
                        : d,
                ),
            );
            setReplyInputs((prev) => ({ ...prev, [discussionId]: "" }));
        } catch {
            // ignore
        } finally {
            setReplyingTo(null);
        }
    }

    async function handleResolve(disc: Discussion) {
        await api(`/discussions/${courseId}/${disc.id}`, {
            method: "PATCH",
            body: JSON.stringify({ isResolved: !disc.isResolved }),
        });
        setDiscussions((prev) => prev.map((d) => d.id === disc.id ? { ...d, isResolved: !d.isResolved } : d));
    }

    async function handleDelete(id: string) {
        if (!confirm("Delete this discussion?")) return;
        await api(`/discussions/${courseId}/${id}`, { method: "DELETE" });
        setDiscussions((prev) => prev.filter((d) => d.id !== id));
    }

    if (loading) {
        return (
            <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-slate-500 py-6">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading discussions…
            </div>
        );
    }

    return (
        <section id="discussions" className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5 text-[#2D8F80]" />
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Discussions</h3>
                    {discussions.length > 0 && (
                        <span className="rounded-full bg-[#E9F7F5] dark:bg-slate-700 px-2 py-0.5 text-xs font-semibold text-[#2D8F80] dark:text-[#63C0B9]">
                            {discussions.length}
                        </span>
                    )}
                </div>
                <button
                    onClick={() => setShowNew(!showNew)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#2D8F80] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1F6C62] transition-colors"
                >
                    <Plus className="h-3.5 w-3.5" /> Ask
                </button>
            </div>

            {/* New discussion form */}
            <AnimatePresence>
                {showNew && (
                    <motion.form
                        variants={FADES.floatUp}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        onSubmit={handleNewDiscussion}
                        className="rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-4 space-y-3 shadow-sm"
                    >
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">New Discussion</p>
                        <input
                            value={newForm.title}
                            onChange={(e) => setNewForm((f) => ({ ...f, title: e.target.value }))}
                            placeholder="What's your question or topic?"
                            maxLength={300}
                            required
                            className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#63C0B9]"
                        />
                        <textarea
                            value={newForm.body}
                            onChange={(e) => setNewForm((f) => ({ ...f, body: e.target.value }))}
                            placeholder="Describe your question or share your thoughts…"
                            rows={3}
                            required
                            className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#63C0B9] resize-none"
                        />
                        {lessons.length > 0 && (
                            <div>
                                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Related lesson (optional)</label>
                                <select
                                    value={newForm.lessonId}
                                    onChange={(e) => setNewForm((f) => ({ ...f, lessonId: e.target.value }))}
                                    className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-800 dark:text-slate-100"
                                >
                                    <option value="">General course question</option>
                                    {lessons.map((l) => (
                                        <option key={l.id} value={l.id}>{l.order}. {l.title}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div className="flex items-center justify-end gap-2">
                            <button type="button" onClick={() => setShowNew(false)} className="rounded-full px-3 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="rounded-full bg-[#2D8F80] px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                            >
                                {submitting ? "Posting…" : "Post discussion"}
                            </button>
                        </div>
                        {msg && <p className="text-xs text-red-500">{msg}</p>}
                    </motion.form>
                )}
            </AnimatePresence>

            {discussions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-600 p-8 text-center">
                    <MessageCircle className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <p className="text-sm text-slate-500 dark:text-slate-400">No discussions yet. Be the first to ask a question!</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {discussions.map((disc) => (
                        <motion.div
                            key={disc.id}
                            layout
                            className={`rounded-2xl border p-4 transition-colors ${
                                disc.isResolved
                                    ? "border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/50 dark:bg-emerald-900/10"
                                    : disc.isPinned
                                        ? "border-[#63C0B9]/40 bg-[#E9F7F5] dark:bg-slate-800/70 dark:border-[#63C0B9]/30"
                                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                            }`}
                        >
                            {/* Discussion header */}
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {disc.isPinned && <Pin className="h-3.5 w-3.5 text-[#2D8F80] flex-shrink-0" />}
                                        {disc.isResolved && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />}
                                        <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{disc.title}</p>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        {disc.author?.name || "Student"} · {timeAgo(disc.createdAt)}
                                        {disc.replies.length > 0 && ` · ${disc.replies.length} repl${disc.replies.length === 1 ? "y" : "ies"}`}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1">
                                    {canManage && (
                                        <>
                                            <button onClick={() => handleResolve(disc)} title={disc.isResolved ? "Unresolve" : "Mark resolved"} className="rounded-full p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20">
                                                <CheckCircle2 className="h-3.5 w-3.5" />
                                            </button>
                                            {(disc.author?.id === userId || canManage) && (
                                                <button onClick={() => handleDelete(disc.id)} className="rounded-full p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            )}
                                        </>
                                    )}
                                    <button
                                        onClick={() => setExpanded(expanded === disc.id ? null : disc.id)}
                                        className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                                    >
                                        {expanded === disc.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                    </button>
                                </div>
                            </div>

                            <AnimatePresence>
                                {expanded === disc.id && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="overflow-hidden"
                                    >
                                        {/* Body */}
                                        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-600">
                                            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{disc.body}</p>
                                        </div>

                                        {/* Replies */}
                                        {disc.replies.length > 0 && (
                                            <div className="mt-3 space-y-2 pl-3 border-l-2 border-slate-200 dark:border-slate-600">
                                                {disc.replies.map((reply) => (
                                                    <div
                                                        key={reply.id}
                                                        className={`rounded-xl p-3 text-sm ${
                                                            reply.isInstructorReply
                                                                ? "bg-[#E9F7F5] dark:bg-slate-700/60 border border-[#63C0B9]/30"
                                                                : "bg-slate-50 dark:bg-slate-700/40"
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-1.5 mb-1">
                                                            {reply.isInstructorReply && (
                                                                <span className="rounded-full bg-[#63C0B9] px-1.5 py-0.5 text-[10px] font-bold text-white">Instructor</span>
                                                            )}
                                                            <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{reply.author?.name || "User"}</span>
                                                            <span className="text-xs text-slate-400">· {timeAgo(reply.createdAt)}</span>
                                                        </div>
                                                        <p className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{reply.body}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Reply input */}
                                        <div className="mt-3 flex gap-2">
                                            <input
                                                value={replyInputs[disc.id] || ""}
                                                onChange={(e) => setReplyInputs((prev) => ({ ...prev, [disc.id]: e.target.value }))}
                                                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleReply(disc.id); } }}
                                                placeholder="Reply to this discussion…"
                                                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#63C0B9]"
                                            />
                                            <button
                                                onClick={() => handleReply(disc.id)}
                                                disabled={replyingTo === disc.id}
                                                className="rounded-xl bg-[#2D8F80] px-3 py-2 text-white disabled:opacity-60 hover:bg-[#1F6C62]"
                                            >
                                                {replyingTo === disc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                            </button>
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
