"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { BookOpenCheck, ExternalLink, Download } from "lucide-react";

import SiteNav from "@/components/site-nav";
import { useCurrentUser } from "@/hooks/use-current-user";
import { EASE, FADES, STAGGER, SURFACES } from "@/lib/motion-presets";

interface ResourceItem {
    id: string;
    title: string;
    kind: string;
    url?: string | null;
    summary?: string | null;
    attachmentUrl?: string | null;
    imageUrl?: string | null;
}

export default function ResourcesPage() {
    const [resources, setResources] = useState<ResourceItem[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useCurrentUser();

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
                    variants={FADES.floatUp}
                    initial="initial"
                    animate="animate"
                    transition={{ ease: EASE.lift }}
                    className="rounded-[32px] border border-white/60 bg-white/95 p-6 shadow-2xl md:p-10"
                >
                    <div className="relative overflow-hidden rounded-2xl border border-[#E8F2F1] bg-[#FDFEFE] p-4">
                        <motion.div
                            className="pointer-events-none absolute -inset-8 rounded-[32px] bg-[radial-gradient(circle_at_18%_22%,rgba(99,192,185,0.16),transparent_34%),radial-gradient(circle_at_82%_8%,rgba(45,46,131,0.14),transparent_36%)] blur-3xl"
                            aria-hidden
                            animate={{ opacity: [0.8, 1, 0.85], scale: [1, 1.03, 1] }}
                            transition={{ duration: 16, ease: EASE.emphasized, repeat: Infinity, repeatType: "mirror" }}
                        />
                        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <p className="text-sm font-semibold uppercase tracking-wide text-[#2D8F80]">SparkHub resources</p>
                                <h1 className="mt-2 text-2xl font-semibold">Resources curated by admins</h1>
                                <p className="mt-1 text-sm text-slate-500">
                                    Every guide and toolkit here is curated by admins and refreshed automatically.
                                </p>
                            </div>
                            {user ? (
                                user.role === "ADMIN" ? (
                                    <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
                                        <Link
                                            href="/admin"
                                            className="inline-flex rounded-full border border-[#CFE3E0] px-4 py-2 text-sm font-semibold text-[#2B2B2B] hover:bg-slate-50"
                                        >
                                            Admin panel
                                        </Link>
                                    </motion.div>
                                ) : (
                                    <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
                                        <Link
                                            href="/tutors/dashboard"
                                            className="inline-flex rounded-full border border-[#CFE3E0] px-4 py-2 text-sm font-semibold text-[#2B2B2B] hover:bg-slate-50"
                                        >
                                            Share a resource
                                        </Link>
                                    </motion.div>
                                )
                            ) : (
                                <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
                                    <Link
                                        href="/login?from=/admin"
                                        className="inline-flex rounded-full border border-[#CFE3E0] px-4 py-2 text-sm font-semibold text-[#2B2B2B] hover:bg-slate-50"
                                    >
                                        Sign in for tools
                                    </Link>
                                </motion.div>
                            )}
                        </div>
                    </div>

                    <motion.div
                        className="mt-8 grid gap-5"
                        variants={{ hidden: {}, visible: { transition: STAGGER.base } }}
                        initial="hidden"
                        animate="visible"
                        viewport={{ once: true, amount: 0.35 }}
                    >
                        {loading ? (
                            Array.from({ length: 4 }).map((_, idx) => (
                                <div key={idx} className="h-[120px] animate-pulse rounded-2xl bg-slate-100" />
                            ))
                        ) : resources.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-sm text-slate-600">
                                There are currently no resources in the system.
                            </div>
                        ) : (
                            resources.map((resource, idx) => (
                                <motion.article
                                    key={resource.id}
                                    initial={SURFACES.lift.initial}
                                    whileInView={SURFACES.lift.animate(idx * 0.05)}
                                    viewport={{ once: true, amount: 0.35 }}
                                    whileHover={SURFACES.lift.whileHover}
                                    transition={{ duration: 0.5, ease: EASE.emphasized }}
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
                                    {resource.imageUrl && (
                                        <div
                                            className="mt-3 h-40 w-full overflow-hidden rounded-2xl border border-slate-100 bg-slate-50"
                                            style={{ backgroundImage: `url(${resource.imageUrl})`, backgroundSize: "cover", backgroundPosition: "center" }}
                                        />
                                    )}
                                    <div className="mt-4 flex flex-wrap gap-3 text-sm">
                                        <Link
                                            href={`/resources/${resource.id}`}
                                            className="inline-flex items-center gap-2 rounded-full border border-[#CFE3E0] px-4 py-2 font-semibold text-[#2B2B2B] hover:bg-slate-50"
                                        >
                                            About this resource
                                        </Link>
                                        {resource.url || resource.attachmentUrl ? (
                                            <a
                                                href={resource.url || resource.attachmentUrl || "#"}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 rounded-full bg-[#63C0B9] px-4 py-2 font-semibold text-white"
                                            >
                                                Open resource
                                                <ExternalLink className="h-4 w-4" />
                                            </a>
                                        ) : (
                                            <span className="inline-flex items-center gap-2 rounded-full border border-dashed border-[#CFE3E0] px-4 py-2 font-semibold text-[#7A8584]">
                                                Upload pending
                                            </span>
                                        )}
                                        {resource.attachmentUrl && (
                                            <a
                                                href={resource.attachmentUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 rounded-full border border-[#CFE3E0] px-4 py-2 font-semibold text-[#2B2B2B]"
                                            >
                                                <Download className="h-4 w-4" /> {fileName(resource.attachmentUrl)}
                                            </a>
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

function fileName(path?: string | null) {
    if (!path) return "Download";
    try {
        const url = new URL(path, typeof window === "undefined" ? "http://localhost" : window.location.origin);
        const segments = url.pathname.split("/").filter(Boolean);
        return segments[segments.length - 1] || "Download";
    } catch {
        return path.split("/").pop() || "Download";
    }
}
