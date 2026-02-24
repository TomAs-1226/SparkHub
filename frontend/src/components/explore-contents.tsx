"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import CoverflowRow, { ContentItem } from "@/components/coverflow-row";
import { FADES } from "@/lib/motion-presets";
import { Library, Briefcase, BookOpen } from "lucide-react";

type Cat = "resources" | "opportunities" | "courses";
type LoadingState = "loading" | "loaded" | "error";
const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");

type ApiContent = {
    id?: string | number;
    _id?: string;
    slug?: string;
    uuid?: string;
    title?: string | null;
    name?: string | null;
    summary?: string | null;
    description?: string | null;
    details?: string | null;
    content?: string | null;
    overview?: string | null;
    body?: string | null;
    eventDescription?: string | null;
    courseDescription?: string | null;
    image?: string | null;
    cover?: string | null;
    thumbnail?: string | null;
    banner?: string | null;
    tag?: string | null;
    category?: string | null;
    type?: string | null;
};

function stableId(cat: Cat, title: string, idx: number) {
    // deterministic slug-ish id: cat-titlehash-idx
    const base = (title || "untitled").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    return `${cat}-${base || "item"}-${idx}`;
}

function pickSummary(obj: ApiContent | null | undefined): string | null {
    return (
        obj?.summary ??
        obj?.description ??
        obj?.details ??
        obj?.content ??
        obj?.overview ??
        obj?.body ??
        obj?.eventDescription ??
        obj?.courseDescription ??
        null
    );
}

function normalizeItems(cat: Cat, arrCandidate: ApiContent[]): ContentItem[] {
    return arrCandidate.slice(0, 10).map((raw, idx) => {
        const it = raw as ApiContent;
        const rawId = it.id ?? it._id ?? it.slug ?? it.uuid ?? null;
        const normalizedId = rawId ?? stableId(cat, it.title ?? it.name ?? "", idx);
        const href = rawId ? `/${cat}/${encodeURIComponent(String(rawId))}` : it.slug ? `/${cat}/${encodeURIComponent(String(it.slug))}` : `/${cat}`;
        return {
            id: normalizedId,
            title: it.title ?? it.name ?? "Untitled",
            summary: pickSummary(it),
            image: it.image ?? it.cover ?? it.thumbnail ?? it.banner ?? null,
            tag: it.tag ?? it.category ?? it.type ?? null,
            href,
        } satisfies ContentItem;
    });
}

function firstFulfilled<T>(promises: Promise<T>[]): Promise<T> {
    return new Promise((resolve, reject) => {
        if (promises.length === 0) {
            reject(new Error("No promises provided"));
            return;
        }
        let rejected = 0;
        promises.forEach((promise) => {
            promise.then(resolve).catch(() => {
                rejected += 1;
                if (rejected === promises.length) {
                    reject(new Error("All requests failed"));
                }
            });
        });
    });
}

async function tryFetchCategory(url: string, cat: Cat, controller: AbortController): Promise<ContentItem[]> {
    const timer = setTimeout(() => controller.abort(), 4000);
    try {
        const res = await fetch(url, { cache: "no-store", signal: controller.signal });
        if (!res.ok) throw new Error("Network error");
        const data = (await res.json()) as unknown;
        const payload = (data as { items?: unknown; data?: unknown; list?: unknown }) ?? {};
        const arrCandidate = (payload.items ?? payload.data ?? payload.list ?? data) as unknown;
        if (Array.isArray(arrCandidate) && arrCandidate.length) {
            return normalizeItems(cat, arrCandidate as ApiContent[]);
        }
        throw new Error("Empty payload");
    } finally {
        clearTimeout(timer);
    }
}

async function fetchCategory(cat: Cat): Promise<ContentItem[]> {
    const urls = [`/api/${cat}?limit=10`];
    if (API_BASE) {
        urls.push(`${API_BASE}/${cat}?limit=10`, `${API_BASE}/api/${cat}?limit=10`);
    }

    const controllers = urls.map(() => new AbortController());
    try {
        const result = await firstFulfilled(
            urls.map((url, index) => tryFetchCategory(url, cat, controllers[index])),
        );
        controllers.forEach((controller) => controller.abort());
        return result;
    } catch {
        controllers.forEach((controller) => controller.abort());
        // Return empty array - no fake data in production
        return [];
    }
}

function LoadingSkeleton({ title }: { title: string }) {
    return (
        <div className="mb-14">
            <div className="mb-5 flex items-center justify-between">
                <div className="h-7 w-40 rounded-lg bg-slate-200/70 animate-pulse" />
                <div className="h-7 w-20 rounded-full bg-slate-200/50 animate-pulse" />
            </div>
            <div className="flex gap-3 overflow-hidden px-6 py-8">
                {Array.from({ length: 5 }).map((_, idx) => (
                    <div
                        key={idx}
                        className="h-[224px] w-[152px] shrink-0 rounded-[14px] overflow-hidden relative"
                        style={{ animationDelay: `${idx * 0.1}s` }}
                    >
                        <div className="absolute inset-0 bg-slate-200/70 animate-pulse" />
                        <div
                            className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite]"
                            style={{
                                background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)",
                                animationDelay: `${idx * 0.15}s`,
                            }}
                        />
                    </div>
                ))}
            </div>
            <p className="sr-only">Loading {title}…</p>
        </div>
    );
}

function EmptyState({ category, icon }: { category: string; icon: React.ReactNode }) {
    return (
        <motion.div
            variants={FADES.gentleUp}
            initial="initial"
            animate="animate"
            className="mb-14 rounded-3xl border border-dashed border-slate-300/60 bg-white/70 backdrop-blur-sm p-8 text-center"
        >
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100/80 text-slate-400">
                {icon}
            </div>
            <p className="text-[15px] font-bold text-slate-600">No {category} yet</p>
            <p className="mt-1.5 text-[13px] text-slate-400 max-w-xs mx-auto">
                Content will appear here once it&apos;s published. Check back soon!
            </p>
        </motion.div>
    );
}

export default function ExploreContents() {
    const [resources, setResources] = useState<ContentItem[] | null>(null);
    const [opps, setOpps] = useState<ContentItem[] | null>(null);
    const [courses, setCourses] = useState<ContentItem[] | null>(null);
    const [loadingStates, setLoadingStates] = useState<Record<Cat, LoadingState>>({
        resources: "loading",
        opportunities: "loading",
        courses: "loading",
    });

    useEffect(() => {
        let cancelled = false;

        const fetchWithState = async (cat: Cat, setter: (items: ContentItem[]) => void) => {
            try {
                const items = await fetchCategory(cat);
                if (!cancelled) {
                    setter(items);
                    setLoadingStates((prev) => ({ ...prev, [cat]: "loaded" }));
                }
            } catch {
                if (!cancelled) {
                    setter([]);
                    setLoadingStates((prev) => ({ ...prev, [cat]: "error" }));
                }
            }
        };

        fetchWithState("resources", setResources);
        fetchWithState("opportunities", setOpps);
        fetchWithState("courses", setCourses);

        return () => {
            cancelled = true;
        };
    }, []);

    const isLoading = (cat: Cat) => loadingStates[cat] === "loading";

    return (
        <section className="bg-[#ECF4F9] py-16">
            <div className="mx-auto w-full max-w-[1180px] px-4 sm:px-6 lg:px-8">
                <motion.div
                    variants={FADES.gentleUp}
                    initial="initial"
                    animate="animate"
                    className="mb-10"
                >
                    <h2 className="text-[24px] md:text-[28px] font-extrabold text-slate-800 tracking-tight">
                        Explore the Contents
                    </h2>
                    <p className="mt-1.5 text-[14px] text-slate-500 max-w-md">
                        Click a card to open a preview, drag or scroll to browse. Keyboard and touch friendly.
                    </p>
                </motion.div>

                {isLoading("resources") ? (
                    <LoadingSkeleton title="Resources" />
                ) : resources && resources.length > 0 ? (
                    <CoverflowRow title="Resources" slug="resources" items={resources} />
                ) : (
                    <EmptyState category="resources" icon={<Library className="h-7 w-7" />} />
                )}

                {isLoading("opportunities") ? (
                    <LoadingSkeleton title="Opportunities" />
                ) : opps && opps.length > 0 ? (
                    <CoverflowRow title="Opportunities" slug="opportunities" items={opps} />
                ) : (
                    <EmptyState category="opportunities" icon={<Briefcase className="h-7 w-7" />} />
                )}

                {isLoading("courses") ? (
                    <LoadingSkeleton title="Courses & Certificates" />
                ) : courses && courses.length > 0 ? (
                    <CoverflowRow title="Courses & Certificates" slug="courses" items={courses} />
                ) : (
                    <EmptyState category="courses" icon={<BookOpen className="h-7 w-7" />} />
                )}
            </div>
        </section>
    );
}