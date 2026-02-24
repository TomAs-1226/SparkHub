"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    Mail,
    MailOpen,
    Trash2,
    CheckCheck,
    ChevronDown,
    ChevronUp,
    Inbox,
    RefreshCw,
} from "lucide-react";
import SiteNav from "@/components/site-nav";
import { api } from "@/lib/api";
import { useCurrentUser } from "@/hooks/use-current-user";

/* ─── Simple markdown → React renderer ─── */
function inlineHtml(text: string): string {
    return text
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.+?)\*/g, "<em>$1</em>")
        .replace(/_(.+?)_/g, "<em>$1</em>")
        .replace(/`(.+?)`/g, '<code class="bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded text-[12px] font-mono">$1</code>');
}

function MarkdownBody({ text }: { text: string }) {
    const elements: React.ReactNode[] = [];
    const lines = text.split("\n");
    let listBuf: string[] = [];
    let key = 0;

    function flushList() {
        if (!listBuf.length) return;
        elements.push(
            <ul key={key++} className="my-2 space-y-1 ml-1">
                {listBuf.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed">
                        <span className="mt-[7px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#63C0B9]" />
                        <span dangerouslySetInnerHTML={{ __html: inlineHtml(item) }} />
                    </li>
                ))}
            </ul>
        );
        listBuf = [];
    }

    for (const line of lines) {
        if (line.startsWith("## ")) {
            flushList();
            elements.push(
                <h3 key={key++} className="mt-4 mb-1.5 flex items-center gap-2 text-[14px] font-bold text-slate-800 dark:text-slate-100">
                    <span className="h-0.5 w-3 rounded-full bg-[#63C0B9] flex-shrink-0 inline-block" />
                    {line.slice(3)}
                </h3>
            );
        } else if (line.startsWith("# ")) {
            flushList();
            elements.push(
                <h2 key={key++} className="mt-3 mb-1.5 text-[15px] font-extrabold text-slate-800 dark:text-slate-100">
                    {line.slice(2)}
                </h2>
            );
        } else if (/^---+$/.test(line.trim())) {
            flushList();
            elements.push(<hr key={key++} className="my-3 border-slate-200 dark:border-slate-600" />);
        } else if (line.startsWith("- ") || line.startsWith("* ")) {
            listBuf.push(line.slice(2));
        } else if (line.trim() === "") {
            flushList();
        } else {
            flushList();
            elements.push(
                <p key={key++} className="text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed my-1"
                   dangerouslySetInnerHTML={{ __html: inlineHtml(line) }} />
            );
        }
    }
    flushList();

    return <div className="space-y-0.5">{elements}</div>;
}

type TabKey = "all" | "unread" | "digests";

interface InboxMessage {
    id: string;
    fromName: string;
    title: string;
    body: string;
    kind: string;
    isRead: boolean;
    createdAt: string;
}

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const PAGE_SIZE = 20;

export default function InboxPage() {
    const router = useRouter();
    const { user, loading: userLoading } = useCurrentUser();

    const [tab, setTab] = useState<TabKey>("all");
    const [messages, setMessages] = useState<InboxMessage[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [markingAll, setMarkingAll] = useState(false);

    useEffect(() => {
        if (!userLoading && !user) {
            router.push("/login");
        }
    }, [user, userLoading, router]);

    const fetchMessages = useCallback(
        async (currentTab: TabKey, currentPage: number, append = false) => {
            setLoading(true);
            setError(null);
            try {
                const params = new URLSearchParams();
                if (currentTab === "unread") params.set("unread", "true");
                if (currentTab === "digests") params.set("kind", "DIGEST");
                params.set("page", String(currentPage));
                params.set("limit", String(PAGE_SIZE));

                const res = await api(`/inbox?${params.toString()}`);
                if (!res.ok) throw new Error(`Failed to load inbox (${res.status})`);
                const data = await res.json();

                const items: InboxMessage[] = Array.isArray(data) ? data : data.messages ?? [];
                const total: number = data.total ?? items.length;

                setMessages((prev) => (append ? [...prev, ...items] : items));
                setHasMore(currentPage * PAGE_SIZE < total);
            } catch (e: unknown) {
                setError(e instanceof Error ? e.message : "Could not load inbox.");
            } finally {
                setLoading(false);
            }
        },
        []
    );

    useEffect(() => {
        if (!user) return;
        setPage(1);
        setExpandedId(null);
        fetchMessages(tab, 1, false);
    }, [tab, user, fetchMessages]);

    function loadMore() {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchMessages(tab, nextPage, true);
    }

    async function toggleExpand(msg: InboxMessage) {
        if (expandedId === msg.id) {
            setExpandedId(null);
            return;
        }
        setExpandedId(msg.id);
        if (!msg.isRead) {
            try {
                await api(`/inbox/${msg.id}/read`, { method: "PATCH" });
                setMessages((prev) =>
                    prev.map((m) => (m.id === msg.id ? { ...m, isRead: true } : m))
                );
            } catch {
                // non-blocking
            }
        }
    }

    async function deleteMessage(id: string, e: React.MouseEvent) {
        e.stopPropagation();
        try {
            await api(`/inbox/${id}`, { method: "DELETE" });
            setMessages((prev) => prev.filter((m) => m.id !== id));
            if (expandedId === id) setExpandedId(null);
        } catch {
            // non-blocking
        }
    }

    async function markAllRead() {
        setMarkingAll(true);
        try {
            await api("/inbox/read-all", { method: "PATCH" });
            setMessages((prev) => prev.map((m) => ({ ...m, isRead: true })));
        } catch {
            // non-blocking
        } finally {
            setMarkingAll(false);
        }
    }

    const unreadCount = messages.filter((m) => !m.isRead).length;

    const tabs: { key: TabKey; label: string }[] = [
        { key: "all", label: "All" },
        { key: "unread", label: unreadCount > 0 ? `Unread (${unreadCount})` : "Unread" },
        { key: "digests", label: "Digests" },
    ];

    if (userLoading) {
        return (
            <div className="min-h-dvh bg-[#F4F7FB] dark:bg-slate-900 flex items-center justify-center">
                <RefreshCw className="h-6 w-6 animate-spin text-[#63C0B9]" />
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="min-h-dvh bg-[#F4F7FB] dark:bg-slate-900">
            <SiteNav />

            <main className="mx-auto max-w-2xl px-4 py-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                    className="mb-6 flex items-center justify-between"
                >
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#E9F7F5] dark:bg-teal-900/30">
                            <Inbox className="h-5 w-5 text-[#63C0B9]" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Inbox</h1>
                    </div>

                    {unreadCount > 0 && (
                        <motion.button
                            whileTap={{ scale: 0.97 }}
                            onClick={markAllRead}
                            disabled={markingAll}
                            className="flex items-center gap-2 rounded-full border border-[#63C0B9]/40 bg-[#E9F7F5] dark:bg-teal-900/20 px-4 py-2 text-[13px] font-semibold text-[#2D8F80] dark:text-teal-300 hover:bg-[#63C0B9]/10 transition-colors disabled:opacity-60"
                        >
                            <CheckCheck className="h-4 w-4" />
                            {markingAll ? "Marking..." : "Mark all read"}
                        </motion.button>
                    )}
                </motion.div>

                {/* Tabs */}
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05, duration: 0.3 }}
                    className="mb-4 flex gap-1 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-white/60 dark:border-slate-700/60 p-1 shadow-sm backdrop-blur-sm"
                >
                    {tabs.map(({ key, label }) => (
                        <button
                            key={key}
                            onClick={() => setTab(key)}
                            className={`flex-1 rounded-xl py-2 text-[13px] font-semibold transition-all ${
                                tab === key
                                    ? "bg-[#63C0B9] text-white shadow"
                                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </motion.div>

                {/* Card container */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.3 }}
                    className="rounded-[32px] bg-white/95 dark:bg-slate-800/95 border border-white/60 dark:border-slate-700/60 shadow-2xl overflow-hidden"
                >
                    {error && (
                        <div className="px-6 py-4 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20">
                            {error}
                        </div>
                    )}

                    {loading && messages.length === 0 && (
                        <div className="flex items-center justify-center gap-3 py-16 text-slate-400">
                            <RefreshCw className="h-5 w-5 animate-spin" />
                            <span className="text-sm">Loading messages…</span>
                        </div>
                    )}

                    {!loading && messages.length === 0 && !error && (
                        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
                            <span className="text-5xl">📬</span>
                            <p className="text-lg font-semibold text-slate-700 dark:text-slate-200">
                                Your inbox is empty
                            </p>
                            <p className="text-sm text-slate-400 dark:text-slate-500">
                                No messages here yet. Check back later.
                            </p>
                        </div>
                    )}

                    <AnimatePresence initial={false}>
                        {messages.map((msg, i) => (
                            <motion.div
                                key={msg.id}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, height: 0, overflow: "hidden" }}
                                transition={{ delay: i * 0.03, duration: 0.25 }}
                            >
                                <div
                                    className={`border-b border-slate-100 dark:border-slate-700/60 last:border-b-0 ${
                                        !msg.isRead ? "bg-[#E9F7F5]/40 dark:bg-teal-900/10" : ""
                                    }`}
                                >
                                    {/* Message row */}
                                    <button
                                        onClick={() => toggleExpand(msg)}
                                        className="w-full text-left px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                                    >
                                        <div className="flex items-start gap-3">
                                            {/* Unread dot */}
                                            <span
                                                className={`mt-1.5 flex-shrink-0 h-2.5 w-2.5 rounded-full transition-colors ${
                                                    !msg.isRead
                                                        ? "bg-[#63C0B9]"
                                                        : "bg-transparent border border-slate-300 dark:border-slate-600"
                                                }`}
                                            />

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2 mb-0.5">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <span className="text-[13px] text-slate-500 dark:text-slate-400 flex-shrink-0">
                                                            {msg.fromName}
                                                        </span>
                                                        <span className="font-semibold text-[14px] text-slate-800 dark:text-slate-100 truncate">
                                                            {msg.title}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                        <span className="text-[12px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
                                                            {timeAgo(msg.createdAt)}
                                                        </span>
                                                        <button
                                                            onClick={(e) => deleteMessage(msg.id, e)}
                                                            className="p-1 rounded-lg text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                            aria-label="Delete message"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {expandedId !== msg.id && (
                                                    <p className="text-[13px] text-slate-500 dark:text-slate-400 truncate">
                                                        {msg.body.slice(0, 60)}
                                                        {msg.body.length > 60 ? "…" : ""}
                                                    </p>
                                                )}
                                            </div>

                                            <span className="flex-shrink-0 text-slate-400 mt-0.5">
                                                {expandedId === msg.id ? (
                                                    <ChevronUp className="h-4 w-4" />
                                                ) : (
                                                    <ChevronDown className="h-4 w-4" />
                                                )}
                                            </span>
                                        </div>
                                    </button>

                                    {/* Expanded body */}
                                    <AnimatePresence>
                                        {expandedId === msg.id && (
                                            <motion.div
                                                key="body"
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: "auto" }}
                                                exit={{ opacity: 0, height: 0 }}
                                                transition={{ duration: 0.2 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="px-5 pb-5 pt-1 ml-[22px]">
                                                    <div className="rounded-2xl bg-slate-50 dark:bg-slate-700/40 border border-slate-100 dark:border-slate-600/40 px-4 py-3">
                                                        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-200 dark:border-slate-600/40">
                                                            {msg.isRead ? (
                                                                <MailOpen className="h-4 w-4 text-slate-400" />
                                                            ) : (
                                                                <Mail className="h-4 w-4 text-[#63C0B9]" />
                                                            )}
                                                            <span className="text-[12px] font-medium text-slate-500 dark:text-slate-400">
                                                                From {msg.fromName}
                                                            </span>
                                                            {msg.kind && msg.kind !== "GENERAL" && (
                                                                <span className="ml-auto rounded-full bg-[#E9F7F5] dark:bg-teal-900/30 px-2 py-0.5 text-[11px] font-semibold text-[#2D8F80] dark:text-teal-300">
                                                                    {msg.kind}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <MarkdownBody text={msg.body} />
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {/* Load more */}
                    {hasMore && !loading && (
                        <div className="flex justify-center px-5 py-4 border-t border-slate-100 dark:border-slate-700/60">
                            <button
                                onClick={loadMore}
                                className="rounded-full border border-[#63C0B9]/40 bg-[#E9F7F5] dark:bg-teal-900/20 px-6 py-2 text-[13px] font-semibold text-[#2D8F80] dark:text-teal-300 hover:bg-[#63C0B9]/10 transition-colors"
                            >
                                Load more
                            </button>
                        </div>
                    )}

                    {loading && messages.length > 0 && (
                        <div className="flex justify-center py-4">
                            <RefreshCw className="h-4 w-4 animate-spin text-[#63C0B9]" />
                        </div>
                    )}
                </motion.div>
            </main>
        </div>
    );
}
