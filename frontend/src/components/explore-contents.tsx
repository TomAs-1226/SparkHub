"use client";

import { useEffect, useState } from "react";
import CoverflowRow, { ContentItem } from "@/components/coverflow-row";

type Cat = "resources" | "opportunities" | "courses";
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

async function fetchCategory(cat: Cat): Promise<ContentItem[]> {
    const urls = [`/api/${cat}?limit=10`];
    if (API_BASE) {
        urls.push(`${API_BASE}/${cat}?limit=10`, `${API_BASE}/api/${cat}?limit=10`);
    }

    for (const url of urls) {
        try {
            const res = await fetch(url, { cache: "no-store" });
            if (!res.ok) continue;
            const data = (await res.json()) as unknown;
            const payload = (data as { items?: unknown; data?: unknown; list?: unknown }) ?? {};
            const arrCandidate = (payload.items ?? payload.data ?? payload.list ?? data) as unknown;
            if (Array.isArray(arrCandidate) && arrCandidate.length) {
                return arrCandidate.slice(0, 10).map((raw, idx) => {
                    const it = raw as ApiContent;
                    const rawId =
                        it.id ??
                        it._id ??
                        it.slug ??
                        it.uuid ??
                        null;
                    const normalizedId = rawId ?? stableId(cat, it.title ?? it.name ?? "", idx);
                    const href = rawId ? `/${cat}/${encodeURIComponent(String(rawId))}` : `/${cat}`;
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
        } catch {
            // ignore and try next url
        }
    }

    // Fallback demo data (stable IDs)
    const make = (titles: string[], tag: string) =>
        titles.map((t, i) => ({
            id: stableId(cat, t, i),
            title: t,
            summary: "Curated content to help you move faster.",
            tag,
            image: null,
            href: `/${cat}`,
        }));

    if (cat === "courses")
        return make(
            [
                "Intro to UX",
                "Prototyping Essentials",
                "Design Systems 101",
                "Web Accessibility",
                "Portfolio Studio",
                "Frontend for Designers",
                "Interview Prep",
                "Usability Testing",
                "Figma Advanced",
                "Responsive Web",
            ],
            "Course"
        );
    if (cat === "opportunities")
        return make(
            [
                "Campus UX Challenge",
                "AI for Good",
                "Summer Internship",
                "Volunteer Drive",
                "Design Sprint",
                "Startup Weekend",
                "Research Assistant",
                "Mentor Shadowing",
                "Community Project",
                "Open Call: Speakers",
            ],
            "Opportunity"
        );
    return make(
        [
            "Study Guide: UX Basics",
            "Mentor Directory",
            "Figma Shortcuts",
            "Open Data Pack",
            "Brief Template",
            "Interview Q&A",
            "Pitch Slides",
            "Scholarship List",
            "Hackathon Kit",
            "Career Roadmap",
        ],
        "Resource"
    );
}

export default function ExploreContents() {
    const [resources, setResources] = useState<ContentItem[] | null>(null);
    const [opps, setOpps] = useState<ContentItem[] | null>(null);
    const [courses, setCourses] = useState<ContentItem[] | null>(null);

    useEffect(() => {
        let cancelled = false;
        fetchCategory("resources").then((items) => {
            if (!cancelled) setResources(items);
        });
        fetchCategory("opportunities").then((items) => {
            if (!cancelled) setOpps(items);
        });
        fetchCategory("courses").then((items) => {
            if (!cancelled) setCourses(items);
        });
        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <section className="bg-[#ECF4F9] py-14">
            <div className="mx-auto w-full max-w-[1180px] px-4 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <h2 className="text-[22px] md:text-[24px] font-extrabold text-slate-800">Explore the Contents</h2>
                    <p className="mt-1 text-[14px] text-slate-500">
                        Hover to preview, click to open as a book. Use arrows, drag, or scroll to browse.
                    </p>
                </div>

                <CoverflowRow title="Resources" slug="resources" items={resources ?? []} />
                <CoverflowRow title="Opportunities" slug="opportunities" items={opps ?? []} />
                <CoverflowRow title="Courses & Certificates" slug="courses" items={courses ?? []} />
            </div>
        </section>
    );
}