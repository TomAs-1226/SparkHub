"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Search, BookOpen, CalendarDays, FileText, Briefcase, X, Loader2 } from "lucide-react";

interface SearchResult {
    id: string;
    title: string;
    subtitle?: string;
}

interface SearchResults {
    courses: SearchResult[];
    events: (SearchResult & { startsAt?: string | null; location?: string | null })[];
    resources: (SearchResult & { kind?: string })[];
    jobs: (SearchResult & { skillsCsv?: string })[];
    total: number;
}

function useDebounce<T>(value: T, delay: number): T {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(t);
    }, [value, delay]);
    return debounced;
}

export default function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResults | null>(null);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const debouncedQuery = useDebounce(query, 300);

    useEffect(() => {
        if (open) {
            setQuery("");
            setResults(null);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [open, onClose]);

    useEffect(() => {
        if (debouncedQuery.length < 2) {
            setResults(null);
            return;
        }
        let active = true;
        setLoading(true);
        fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`)
            .then((r) => r.json())
            .then((json) => {
                if (active && json.ok) setResults(json);
            })
            .catch(() => {})
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [debouncedQuery]);

    const hasResults = results && results.total > 0;
    const showEmpty = results && results.total === 0 && !loading && debouncedQuery.length >= 2;

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    key="search-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="fixed inset-0 z-[500] flex items-start justify-center px-4 pt-[12vh] backdrop-blur-sm bg-slate-900/60"
                    onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
                >
                    <motion.div
                        initial={{ opacity: 0, y: -16, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.97 }}
                        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                        className="w-full max-w-xl overflow-hidden rounded-[24px] bg-white dark:bg-slate-800 shadow-2xl border border-slate-100 dark:border-slate-700"
                    >
                        {/* Search input */}
                        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                            <Search className="h-4 w-4 flex-shrink-0 text-slate-400" />
                            <input
                                ref={inputRef}
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search courses, events, resources…"
                                className="flex-1 bg-transparent text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
                            />
                            {loading && <Loader2 className="h-4 w-4 animate-spin text-slate-400 flex-shrink-0" />}
                            <button
                                onClick={onClose}
                                className="rounded-full p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                                aria-label="Close search"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Results */}
                        <div className="max-h-[60vh] overflow-y-auto">
                            {!hasResults && !showEmpty && !loading && (
                                <div className="px-4 py-8 text-center text-sm text-slate-400">
                                    {query.length < 2 ? "Type at least 2 characters to search" : ""}
                                </div>
                            )}

                            {showEmpty && (
                                <div className="px-4 py-8 text-center text-sm text-slate-400">
                                    No results for <span className="font-semibold text-slate-600 dark:text-slate-300">&quot;{debouncedQuery}&quot;</span>
                                </div>
                            )}

                            {hasResults && (
                                <motion.div
                                    className="divide-y divide-slate-50 dark:divide-slate-700/50"
                                    initial="hidden"
                                    animate="visible"
                                    variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.04 } } }}
                                >
                                    <ResultSection
                                        title="Courses"
                                        icon={<BookOpen className="h-3.5 w-3.5" />}
                                        items={results.courses.map((c) => ({
                                            href: `/courses/${c.id}`,
                                            title: c.title,
                                            subtitle: c.subtitle || "Course",
                                        }))}
                                        onClose={onClose}
                                    />
                                    <ResultSection
                                        title="Events"
                                        icon={<CalendarDays className="h-3.5 w-3.5" />}
                                        items={results.events.map((e) => ({
                                            href: `/events`,
                                            title: e.title,
                                            subtitle: e.location || "Event",
                                        }))}
                                        onClose={onClose}
                                    />
                                    <ResultSection
                                        title="Resources"
                                        icon={<FileText className="h-3.5 w-3.5" />}
                                        items={results.resources.map((r) => ({
                                            href: `/resources/${r.id}`,
                                            title: r.title,
                                            subtitle: r.kind || "Resource",
                                        }))}
                                        onClose={onClose}
                                    />
                                    <ResultSection
                                        title="Opportunities"
                                        icon={<Briefcase className="h-3.5 w-3.5" />}
                                        items={results.jobs.map((j) => ({
                                            href: `/opportunities/${j.id}`,
                                            title: j.title,
                                            subtitle: j.skillsCsv ? j.skillsCsv.split(",").slice(0, 3).join(", ") : "Opportunity",
                                        }))}
                                        onClose={onClose}
                                    />
                                </motion.div>
                            )}
                        </div>

                        {/* Footer hint */}
                        <div className="border-t border-slate-100 dark:border-slate-700 px-4 py-2 flex items-center justify-between">
                            <span className="text-[11px] text-slate-400">Press Esc to close</span>
                            {hasResults && (
                                <span className="text-[11px] text-slate-400">{results.total} result{results.total !== 1 ? "s" : ""}</span>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

function ResultSection({
    title,
    icon,
    items,
    onClose,
}: {
    title: string;
    icon: React.ReactNode;
    items: { href: string; title: string; subtitle: string }[];
    onClose: () => void;
}) {
    if (items.length === 0) return null;
    return (
        <div className="py-2">
            <div className="flex items-center gap-1.5 px-4 pb-1">
                <span className="text-slate-400">{icon}</span>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{title}</span>
            </div>
            {items.map((item, i) => (
                <motion.div
                    key={i}
                    variants={{ hidden: { opacity: 0, x: -8 }, visible: { opacity: 1, x: 0 } }}
                >
                    <Link
                        href={item.href}
                        onClick={onClose}
                        className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                    >
                        <span className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{item.title}</span>
                        <span className="flex-shrink-0 text-xs text-slate-400 truncate max-w-[120px]">{item.subtitle}</span>
                    </Link>
                </motion.div>
            ))}
        </div>
    );
}
