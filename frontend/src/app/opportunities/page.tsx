"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Briefcase, ExternalLink } from "lucide-react";

import SiteNav from "@/components/site-nav";

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
        <div className="min-h-dvh bg-[#F4F7FB] text-slate-800">
            <SiteNav />
            <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-10">
                <motion.section
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="rounded-[32px] border border-white/60 bg-white/95 p-6 shadow-2xl md:p-10"
                >
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <p className="text-sm font-semibold uppercase tracking-wide text-[#2D8F80]">Opportunities</p>
                            <h1 className="mt-2 text-2xl font-semibold">Real postings from SparkHub recruiters</h1>
                            <p className="mt-1 text-sm text-slate-500">
                                Every card below is rendered directly from the backend jobs API.
                            </p>
                        </div>
                        <Link
                            href="/admin"
                            className="rounded-full border border-[#CFE3E0] px-4 py-2 text-sm font-semibold text-[#2B2B2B] hover:bg-slate-50"
                        >
                            Admin tools
                        </Link>
                    </div>

                    <div className="mt-8 grid gap-6">
                        {loading ? (
                            Array.from({ length: 3 }).map((_, idx) => (
                                <div key={idx} className="h-[180px] animate-pulse rounded-2xl bg-slate-100" />
                            ))
                        ) : jobs.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-6 text-sm text-slate-600">
                                There are currently no job or opportunity postings.
                            </div>
                        ) : (
                            jobs.map((job) => (
                                <article
                                    key={job.id}
                                    className="rounded-3xl border border-slate-100 bg-gradient-to-br from-white to-[#F4F8FF] p-6 shadow-xl"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wide text-[#2D8F80]">Opportunity</p>
                                            <h2 className="mt-1 text-xl font-semibold text-slate-900">{job.title}</h2>
                                        </div>
                                        <div className="rounded-full bg-[#E7F6F3] p-2 text-[#2D8F80]">
                                            <Briefcase className="h-5 w-5" />
                                        </div>
                                    </div>
                                    <p className="mt-2 text-sm text-slate-600">{job.description}</p>
                                    {job.skills && job.skills.length > 0 && (
                                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#2B2B2B]">
                                            {job.skills.map((skill) => (
                                                <span key={skill} className="rounded-full bg-[#E9F7F5] px-3 py-1 font-semibold">
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    <div className="mt-4 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                                        <div>
                                            <span className="font-semibold text-slate-900">Starts:</span> {formatDate(job.startTime)}
                                        </div>
                                        <div>
                                            <span className="font-semibold text-slate-900">Ends:</span> {formatDate(job.endTime)}
                                        </div>
                                        <div className="md:col-span-2">
                                            <span className="font-semibold text-slate-900">Contact:</span> {job.contact}
                                        </div>
                                    </div>
                                    <div className="mt-4 flex flex-wrap gap-3 text-sm">
                                        <Link
                                            href={`/opportunities/${job.id}`}
                                            className="inline-flex items-center gap-2 rounded-full border border-[#CFE3E0] px-4 py-2 font-semibold text-[#2B2B2B] hover:bg-slate-50"
                                        >
                                            About this role
                                        </Link>
                                        <a
                                            href={`mailto:${job.contact}`}
                                            className="inline-flex items-center gap-2 rounded-full bg-[#63C0B9] px-4 py-2 font-semibold text-white"
                                        >
                                            Contact host
                                            <ExternalLink className="h-4 w-4" />
                                        </a>
                                    </div>
                                </article>
                            ))
                        )}
                    </div>
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
