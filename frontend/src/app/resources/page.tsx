"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { BookOpenCheck, ExternalLink } from "lucide-react";

import SiteNav from "@/components/site-nav";

interface ResourceItem {
    id: string;
    title: string;
    kind: string;
    url: string;
    summary?: string | null;
}

export default function ResourcesPage() {
    const [resources, setResources] = useState<ResourceItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const res = await fetch("/api/resources", { cache: "no-store" });
                const json = await res.json();
                if (!active) return;
                setResources(Array.isArray(json?.list) ? json.list : []);
            } catch {
                if (active) setResources([]);
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
                            <p className="text-sm font-semibold uppercase tracking-wide text-[#2D8F80]">SparkHub resources</p>
                            <h1 className="mt-2 text-2xl font-semibold">Resources curated by admins</h1>
                            <p className="mt-1 text-sm text-slate-500">
                                Everything you see is sourced directly from the backend resources API.
                            </p>
                        </div>
                        <Link
                            href="/admin"
                            className="rounded-full border border-[#CFE3E0] px-4 py-2 text-sm font-semibold text-[#2B2B2B] hover:bg-slate-50"
                        >
                            Admin panel
                        </Link>
                    </div>

                    <div className="mt-8 grid gap-5">
                        {loading ? (
                            Array.from({ length: 4 }).map((_, idx) => (
                                <div key={idx} className="h-[120px] animate-pulse rounded-2xl bg-slate-100" />
                            ))
                        ) : resources.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-sm text-slate-600">
                                There are currently no resources in the system.
                            </div>
                        ) : (
                            resources.map((resource) => (
                                <article
                                    key={resource.id}
                                    className="rounded-3xl border border-slate-100 bg-gradient-to-br from-white to-[#F7FBFF] p-6 shadow-xl"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wide text-[#2D8F80]">{resource.kind}</p>
                                            <h2 className="mt-1 text-xl font-semibold text-slate-900">{resource.title}</h2>
                                        </div>
                                        <div className="rounded-full bg-[#E7F6F3] p-2 text-[#2D8F80]">
                                            <BookOpenCheck className="h-5 w-5" />
                                        </div>
                                    </div>
                                    <p className="mt-2 text-sm text-slate-600">
                                        {resource.summary || "No description has been added for this resource."}
                                    </p>
                                    <div className="mt-4">
                                        <a
                                            href={resource.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 rounded-full bg-[#63C0B9] px-4 py-2 text-sm font-semibold text-white"
                                        >
                                            Open resource
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
