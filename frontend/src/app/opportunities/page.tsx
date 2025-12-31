"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Briefcase, Download, ExternalLink } from "lucide-react";

import SiteNav from "@/components/site-nav";
import { useCurrentUser } from "@/hooks/use-current-user";
import { EASE, FADES, STAGGER, SURFACES } from "@/lib/motion-presets";

const staggeredList = {
    hidden: {},
    visible: { transition: STAGGER.slow },
};

interface JobItem {
    id: string;
    title: string;
    description: string;
    skills?: string[];
    contact: string;
    startTime?: string | null;
    endTime?: string | null;
    photos?: string[];
    files?: string[];
}

export default function OpportunitiesPage() {
    const [jobs, setJobs] = useState<JobItem[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useCurrentUser();
    const role = user?.role;

    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const res = await fetch("/api/jobs", { cache: "no-store" });
                const json = await res.json();
                if (!active) return;
                setJobs(Array.isArray(json?.list) ? json.list : []);
            } catch {
                if (active) setJobs([]);
            } finally {
                if (active) setLoading(false);
            }
        })();
        return () => {
            active = false;
        };
    }, []);

    return (
        <div className="min-h-dvh bg-[#F4F7FB] dark:bg-slate-900 text-slate-800 dark:text-slate-100">
            <SiteNav />
            <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-10">
                <motion.section
                    variants={FADES.floatUp}
                    initial="initial"
                    animate="animate"
                    className="rounded-[32px] border border-white/60 dark:border-slate-700 bg-white/95 dark:bg-slate-800/95 p-6 shadow-2xl md:p-10"
                >
                    <div className="relative overflow-hidden rounded-2xl border border-[#E8F2F1] dark:border-slate-700 bg-[#FDFEFE] dark:bg-slate-800 p-4">
                        <motion.div
                            className="pointer-events-none absolute -inset-8 rounded-[32px] bg-[radial-gradient(circle_at_20%_22%,rgba(99,192,185,0.17),transparent_34%),radial-gradient(circle_at_78%_6%,rgba(45,46,131,0.14),transparent_36%)] blur-3xl"
                            aria-hidden
                            animate={{ rotate: [0, -2, 3, 0], scale: [1, 1.025, 1.01, 1] }}
                            transition={{ duration: 15, ease: EASE.emphasized, repeat: Infinity, repeatType: "mirror" }}
                        />
                        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <p className="text-sm font-semibold uppercase tracking-wide text-[#2D8F80] dark:text-[#63C0B9]">Opportunities</p>
                                <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">Real postings from SparkHub recruiters</h1>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                    Every listing is live from our hiring partners so you can act the moment roles open.
                                </p>
                            </div>
                            {user ? (
                                user.role === "ADMIN" ? (
                                    <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
                                        <Link
                                            href="/admin"
                                            className="inline-flex rounded-full border border-[#CFE3E0] dark:border-slate-600 px-4 py-2 text-sm font-semibold text-[#2B2B2B] dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                                        >
                                            Admin tools
                                        </Link>
                                    </motion.div>
                                ) : (
                                    <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
                                        <Link
                                            href="/tutors/dashboard"
                                            className="inline-flex rounded-full border border-[#CFE3E0] dark:border-slate-600 px-4 py-2 text-sm font-semibold text-[#2B2B2B] dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                                        >
                                            Post an opportunity
                                        </Link>
                                    </motion.div>
                                )
                            ) : (
                                <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
                                    <Link
                                        href="/login?from=/admin"
                                        className="inline-flex rounded-full border border-[#CFE3E0] dark:border-slate-600 px-4 py-2 text-sm font-semibold text-[#2B2B2B] dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                                    >
                                        Sign in for tools
                                    </Link>
                                </motion.div>
                            )}
                        </div>
                    </div>

                    {(() => {
                        if (!role) {
                            return (
                                <div className="mt-4 rounded-2xl border border-dashed border-[#CFE3E0] dark:border-slate-600 bg-[#F9FEFD] dark:bg-slate-800/70 px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
                                    Create a free account to bookmark opportunities and receive reminders.
                                </div>
                            );
                        }
                        if (role === "ADMIN") {
                            return (
                                <div className="mt-4 rounded-2xl border border-dashed border-[#CFE3E0] dark:border-slate-600 bg-[#F9FEFD] dark:bg-slate-800/70 px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
                                    Need to edit or remove a role? <Link href="/admin" className="font-semibold text-[#2D8F80] dark:text-[#63C0B9]">Open the admin panel</Link> for full controls.
                                </div>
                            );
                        }
                        if (["TUTOR", "CREATOR", "RECRUITER"].includes(role)) {
                            return (
                                <div className="mt-4 rounded-2xl border border-dashed border-[#CFE3E0] dark:border-slate-600 bg-[#F9FEFD] dark:bg-slate-800/70 px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
                                    Share your own opportunities from the <Link href="/tutors/dashboard" className="font-semibold text-[#2D8F80] dark:text-[#63C0B9]">publishing workspace</Link> — uploads appear instantly.
                                </div>
                            );
                        }
                        return (
                            <div className="mt-4 rounded-2xl border border-dashed border-[#CFE3E0] dark:border-slate-600 bg-[#F9FEFD] dark:bg-slate-800/70 px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
                                Tip: open a role to add it to your calendar and stay on top of deadlines.
                            </div>
                        );
                    })()}

                    <motion.div
                        className="mt-8 grid gap-6"
                        variants={staggeredList}
                        initial="hidden"
                        animate="visible"
                        viewport={{ once: true, amount: 0.45 }}
                    >
                        {loading ? (
                            Array.from({ length: 3 }).map((_, idx) => (
                                <div key={idx} className="h-[180px] animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-700" />
                            ))
                        ) : jobs.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-600 bg-slate-50/80 dark:bg-slate-800/70 p-6 text-sm text-slate-600 dark:text-slate-400">
                                There are currently no job or opportunity postings.
                            </div>
                        ) : (
                            jobs.map((job, idx) => (
                                <motion.article
                                    key={job.id}
                                    initial={SURFACES.lift.initial}
                                    whileInView={SURFACES.lift.animate(idx * 0.05)}
                                    viewport={{ once: true, amount: 0.4 }}
                                    whileHover={SURFACES.lift.whileHover}
                                    transition={{ duration: 0.6, ease: EASE.emphasized }}
                                    className="rounded-3xl border border-slate-100 dark:border-slate-700 bg-gradient-to-br from-white to-[#F4F8FF] dark:from-slate-800 dark:to-slate-800/90 p-6 shadow-xl"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wide text-[#2D8F80] dark:text-[#63C0B9]">Opportunity</p>
                                            <h2 className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-100">{job.title}</h2>
                                        </div>
                                        <div className="rounded-full bg-[#E7F6F3] dark:bg-slate-700 p-2 text-[#2D8F80] dark:text-[#63C0B9]">
                                            <Briefcase className="h-5 w-5" />
                                        </div>
                                    </div>
                                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{job.description}</p>
                                    {job.skills && job.skills.length > 0 && (
                                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#2B2B2B] dark:text-slate-200">
                                            {job.skills.map((skill) => (
                                                <span key={skill} className="rounded-full bg-[#E9F7F5] dark:bg-slate-700 px-3 py-1 font-semibold">
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    <div className="mt-4 grid gap-2 text-sm text-slate-600 dark:text-slate-400 md:grid-cols-2">
                                        <div>
                                            <span className="font-semibold text-slate-900 dark:text-slate-100">Starts:</span> {formatDate(job.startTime)}
                                        </div>
                                        <div>
                                            <span className="font-semibold text-slate-900 dark:text-slate-100">Ends:</span> {formatDate(job.endTime)}
                                        </div>
                                        <div className="md:col-span-2">
                                            <span className="font-semibold text-slate-900 dark:text-slate-100">Contact:</span> {job.contact}
                                        </div>
                                    </div>
                                    <div className="mt-4 flex flex-wrap gap-3 text-sm">
                                        <Link
                                            href={`/opportunities/${job.id}`}
                                            className="inline-flex items-center gap-2 rounded-full border border-[#CFE3E0] dark:border-slate-600 px-4 py-2 font-semibold text-[#2B2B2B] dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                                        >
                                            About this role
                                        </Link>
                                        <a
                                            href={contactHref(job.contact)}
                                            className="inline-flex items-center gap-2 rounded-full bg-[var(--sh-accent,#63C0B9)] px-4 py-2 font-semibold text-white"
                                            target={job.contact.includes("http") ? "_blank" : undefined}
                                            rel={job.contact.includes("http") ? "noreferrer" : undefined}
                                        >
                                            {role === "STUDENT" ? "Email recruiter" : "Contact host"}
                                            <ExternalLink className="h-4 w-4" />
                                        </a>
                                        {job.files && job.files.length > 0 && (
                                            <div className="flex flex-wrap gap-2">
                                                {job.files.map((file) => (
                                                    <a
                                                        key={file}
                                                        href={file}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-2 rounded-full border border-[#CFE3E0] dark:border-slate-600 px-4 py-2 font-semibold text-[#2B2B2B] dark:text-slate-200"
                                                    >
                                                        <Download className="h-4 w-4" /> {fileLabel(file)}
                                                    </a>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </motion.article>
                            ))
                        )}
                    </motion.div>
                </motion.section>
            </main>
        </div>
    );
}

function formatDate(iso?: string | null) {
    if (!iso) return "Not set";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "Not set";
    return date.toLocaleDateString();
}

function fileLabel(path?: string | null, fallback = "Brief") {
    if (!path) return fallback;
    try {
        const url = new URL(path, typeof window === "undefined" ? "http://localhost" : window.location.origin);
        const segments = url.pathname.split("/").filter(Boolean);
        return segments.pop() || fallback;
    } catch {
        const parts = path.split("/").filter(Boolean);
        return parts.pop() || fallback;
    }
}

function contactHref(contact: string) {
    if (!contact) return "#";
    if (contact.startsWith("http")) return contact;
    if (contact.includes("@")) return `mailto:${contact}`;
    if (/^\+?\d/.test(contact)) return `tel:${contact}`;
    return contact;
}
