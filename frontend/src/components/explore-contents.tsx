"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import CoverflowRow, { ContentItem } from "@/components/coverflow-row";
import { FADES } from "@/lib/motion-presets";

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
            <div className="mb-4 flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white shadow ring-1 ring-black/5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M4 8h16M4 16h16" stroke="#64748B" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                </span>
                <h3 className="text-[18px] font-semibold text-slate-800">{title}</h3>
            </div>
            <div className="flex gap-3 overflow-hidden">
                {Array.from({ length: 5 }).map((_, idx) => (
                    <div
                        key={idx}
                        className="h-[224px] w-[152px] shrink-0 animate-pulse rounded-[14px] bg-slate-200/60"
                    />
                ))}
            </div>
        </div>
    );
}

function EmptyState({ category }: { category: string }) {
    return (
        <motion.div
            variants={FADES.gentleUp}
            initial="initial"
            animate="animate"
            className="mb-14 rounded-2xl border border-dashed border-slate-200 bg-white/60 p-6 text-center"
        >
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
                    <path d="M19 11H5M19 11a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2M19 11V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
            </div>
            <p className="text-sm font-medium text-slate-600">No {category} available yet</p>
            <p className="mt-1 text-xs text-slate-400">
                Check back soon or contact an admin to add content.
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
        <section className="bg-[#ECF4F9] py-14">
            <div className="mx-auto w-full max-w-[1180px] px-4 sm:px-6 lg:px-8">
                <motion.div
                    variants={FADES.gentleUp}
                    initial="initial"
                    animate="animate"
                    className="mb-8"
                >
                    <h2 className="text-[22px] md:text-[24px] font-extrabold text-slate-800">Explore the Contents</h2>
                    <p className="mt-1 text-[14px] text-slate-500">
                        Hover to preview, click to open as a book. Use arrows, drag, or scroll to browse.
                    </p>
                </motion.div>

                {isLoading("resources") ? (
                    <LoadingSkeleton title="Resources" />
                ) : resources && resources.length > 0 ? (
                    <CoverflowRow title="Resources" slug="resources" items={resources} />
                ) : (
                    <EmptyState category="resources" />
                )}

                {isLoading("opportunities") ? (
                    <LoadingSkeleton title="Opportunities" />
                ) : opps && opps.length > 0 ? (
                    <CoverflowRow title="Opportunities" slug="opportunities" items={opps} />
                ) : (
                    <EmptyState category="opportunities" />
                )}

                {isLoading("courses") ? (
                    <LoadingSkeleton title="Courses & Certificates" />
                ) : courses && courses.length > 0 ? (
                    <CoverflowRow title="Courses & Certificates" slug="courses" items={courses} />
                ) : (
                    <EmptyState category="courses" />
                )}
            </div>
        </section>
    );
}