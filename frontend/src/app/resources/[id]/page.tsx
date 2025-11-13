"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, BookOpen, Download } from "lucide-react";

import SiteNav from "@/components/site-nav";

interface ResourceDetail {
    id: string;
    title: string;
    kind: string;
    summary?: string | null;
    details?: string | null;
    url?: string | null;
    imageUrl?: string | null;
    attachmentUrl?: string | null;
}

export default function ResourceDetailPage({ params }: { params: { id: string } }) {
    const [status, setStatus] = useState<"loading" | "ready" | "missing">("loading");
    const [resource, setResource] = useState<ResourceDetail | null>(null);

    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const res = await fetch(`/api/resources/${params.id}`, { cache: "no-store" });
                if (!res.ok) {
                    setStatus("missing");
                    return;
                }
                const json = await res.json();
                if (!active) return;
                setResource(json?.resource || null);
                setStatus(json?.resource ? "ready" : "missing");
            } catch {
                if (active) setStatus("missing");
            }
        })();
        return () => {
            active = false;
        };
    }, [params.id]);

    return (
        <div className="min-h-dvh bg-[#F4F7FB] text-slate-800">
            <SiteNav />
            <main className="mx-auto w-full max-w-4xl px-4 pb-16 pt-10">
                <motion.section
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="rounded-[32px] border border-white/60 bg-white/95 p-6 shadow-2xl md:p-10"
                >
                    <Link href="/resources" className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#2D8F80]">
                        <ArrowLeft className="h-4 w-4" /> Back to resources
                    </Link>

                    {status === "loading" ? (
                        <div className="mt-6 h-[320px] animate-pulse rounded-3xl bg-slate-100" />
                    ) : status === "missing" || !resource ? (
                        <div className="mt-6 text-sm text-slate-600">This resource was not found.</div>
                    ) : (
                        <div className="mt-6 space-y-6">
                            {resource.imageUrl && (
                                <div className="h-64 w-full overflow-hidden rounded-3xl">
                                    <div
                                        className="h-full w-full bg-cover bg-center"
                                        style={{ backgroundImage: `url(${resource.imageUrl})` }}
                                    />
                                </div>
                            )}
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-[#2D8F80]">{resource.kind}</p>
                                <h1 className="mt-2 text-3xl font-semibold text-slate-900">{resource.title}</h1>
                                <p className="mt-2 text-sm text-slate-600">{resource.summary || "No summary provided."}</p>
                            </div>
                            <div className="rounded-3xl border border-slate-100 bg-[#F9FBFF] p-5 text-sm text-slate-700">
                                <BookOpen className="mb-2 h-5 w-5 text-[#2D8F80]" />
                                <p>{resource.details || "This resource does not have additional context yet."}</p>
                            </div>
                            <div className="flex flex-wrap gap-3 text-sm font-semibold">
                                {resource.url || resource.attachmentUrl ? (
                                    <a
                                        href={resource.url || resource.attachmentUrl || "#"}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-2 rounded-full bg-[#63C0B9] px-4 py-2 text-white"
                                    >
                                        Open resource
                                    </a>
                                ) : (
                                    <span className="inline-flex items-center gap-2 rounded-full border border-dashed border-[#CFE3E0] px-4 py-2 text-[#7A8584]">
                                        Upload pending
                                    </span>
                                )}
                                {resource.attachmentUrl && (
                                    <a
                                        href={resource.attachmentUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-2 rounded-full border border-[#CFE3E0] px-4 py-2 text-[#2B2B2B]"
                                    >
                                        <Download className="h-4 w-4" /> {fileName(resource.attachmentUrl)}
                                    </a>
                                )}
                            </div>
                        </div>
                    )}
                </motion.section>
            </main>
        </div>
    );
}

function fileName(path?: string | null) {
    if (!path) return "Download";
    return path.split("/").pop() || "Download";
}
