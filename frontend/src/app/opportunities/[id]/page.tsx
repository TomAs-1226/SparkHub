"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Briefcase, Mail, Tag } from "lucide-react";

import SiteNav from "@/components/site-nav";

interface OpportunityDetail {
    id: string;
    title: string;
    description: string;
    skills?: string[];
    benefits?: string | null;
    duration?: string | null;
    photos?: string[];
    files?: string[];
    contact: string;
}

export default function OpportunityDetailPage({ params }: { params: { id: string } }) {
    const [status, setStatus] = useState<"loading" | "ready" | "missing">("loading");
    const [job, setJob] = useState<OpportunityDetail | null>(null);

    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const res = await fetch(`/api/jobs/${params.id}`, { cache: "no-store" });
                if (!res.ok) {
                    setStatus("missing");
                    return;
                }
                const json = await res.json();
                if (!active) return;
                setJob(json?.job || null);
                setStatus(json?.job ? "ready" : "missing");
            } catch {
                if (active) setStatus("missing");
            }
        })();
        return () => {
            active = false;
        };
    }, [params.id]);

    return (
        <div className="min-h-dvh bg-[#F4F7FB] dark:bg-slate-900 text-slate-800 dark:text-slate-100">
            <SiteNav />
            <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-10">
                <motion.section
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="rounded-[32px] border border-white/60 bg-white/95 p-6 shadow-2xl md:p-10"
                >
                    <Link href="/opportunities" className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#2D8F80]">
                        <ArrowLeft className="h-4 w-4" /> Back to opportunities
                    </Link>

                    {status === "loading" ? (
                        <div className="mt-6 h-[360px] animate-pulse rounded-3xl bg-slate-100" />
                    ) : status === "missing" || !job ? (
                        <div className="mt-6 text-sm text-slate-600">This opportunity is no longer available.</div>
                    ) : (
                        <div className="mt-6 space-y-6">
                            <div className="rounded-3xl border border-slate-100 bg-[#F9FBFF] p-5">
                                <p className="text-xs font-semibold uppercase tracking-wide text-[#2D8F80]">Opportunity</p>
                                <h1 className="mt-2 text-3xl font-semibold text-slate-900">{job.title}</h1>
                                <p className="mt-2 text-sm text-slate-600">{job.description}</p>
                                {job.skills && job.skills.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#2B2B2B]">
                                        {job.skills.map((skill) => (
                                            <span key={skill} className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 font-semibold">
                                                <Tag className="h-3 w-3" /> {skill}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {job.photos && job.photos.length > 0 && (
                                <div className="grid gap-3 sm:grid-cols-2">
                                    {job.photos.map((photo) => (
                                        <div key={photo} className="h-48 overflow-hidden rounded-3xl">
                                            <div className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${photo})` }} />
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="rounded-3xl border border-slate-100 bg-[#F9FBFF] p-4 text-sm text-slate-600">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Duration</p>
                                    <p className="text-base font-semibold text-slate-900">{job.duration || "Flexible"}</p>
                                    <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Benefits</p>
                                    <p>{job.benefits || "Connect with the host for more details."}</p>
                                </div>
                                <div className="rounded-3xl border border-slate-100 bg-[#F9FBFF] p-4 text-sm text-slate-600">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Contact</p>
                                    <a href={`mailto:${job.contact}`} className="mt-2 inline-flex items-center gap-2 text-base font-semibold text-[#2B2E83]">
                                        <Mail className="h-4 w-4" /> {job.contact}
                                    </a>
                                    {job.files && job.files.length > 0 && (
                                        <div className="mt-3 flex flex-wrap gap-2 text-xs">
                                            {job.files.map((file) => (
                                                <a key={file} href={file} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-[#CFE3E0] px-3 py-1 font-semibold text-[#2B2B2B]">
                                                    <Briefcase className="h-3 w-3" /> Download
                                                </a>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </motion.section>
            </main>
        </div>
    );
}
