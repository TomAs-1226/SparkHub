"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import type { CSSProperties } from "react";
import {
    motion,
    AnimatePresence,
    LayoutGroup,
    useReducedMotion,
    type PanInfo,
    type Transition as FMTransition,
} from "framer-motion";
import { EASE } from "@/lib/motion-presets";

export type ContentItem = {
    id: string | number;
    title: string;
    summary?: string | null;
    image?: string | null;
    tag?: string | null;
    href?: string | null;
};

type RowProps = {
    title: string;
    slug: "resources" | "opportunities" | "courses";
    items: ContentItem[];
};

/* ---------- Tunables ---------- */
const EXPAND_W_FACTOR = 2.0;   // 2x wide
const EXPAND_H_FACTOR = 1.5;   // 1.5x tall
const MIN_EXPANDED_W  = 420;
const MIN_EXPANDED_H  = 300;
const EDGE_PAD = 20;
const DRAG_PX = 60;
const DRAG_VEL = 400;
const EDGE_HOVER_ZONE = 72;    // px near container edges for auto-pan
const EDGE_HOVER_RATE = 260;   // ms/step while hovering edge
const PUSH_MAG_BASE = 10;
/* ------------------------------ */

const gradients = [
    "from-[#0ea5e9] via-[#38bdf8] to-[#7dd3fc]",   // sky blue
    "from-[#8b5cf6] via-[#a78bfa] to-[#c4b5fd]",   // violet
    "from-[#f97316] via-[#fb923c] to-[#fdba74]",   // orange
    "from-[#ec4899] via-[#f472b6] to-[#f9a8d4]",   // pink
    "from-[#10b981] via-[#34d399] to-[#6ee7b7]",   // emerald
    "from-[#06b6d4] via-[#22d3ee] to-[#67e8f9]",   // cyan
    "from-[#6366f1] via-[#818cf8] to-[#a5b4fc]",   // indigo
    "from-[#f59e0b] via-[#fbbf24] to-[#fcd34d]",   // amber
];

// Use centralized spring from motion-presets with slight customization for coverflow
const spring: FMTransition = { type: "spring", mass: 0.6, stiffness: 280, damping: 24 };
const springReduced: FMTransition = { type: "tween", duration: 0.2, ease: EASE.swift };
const book3dStyle: CSSProperties = { perspective: 1200, transformStyle: "preserve-3d" };

function dimsFor(viewW: number) {
    if (viewW < 640)   return { baseW: 118, baseH: 186, gap: 8,  maxExpandedCap: Math.floor(viewW * 0.92) };
    if (viewW < 1024)  return { baseW: 138, baseH: 206, gap: 10, maxExpandedCap: 760 };
    return               { baseW: 152, baseH: 224, gap: 12, maxExpandedCap: 980 };
}

export default function CoverflowRow({ title, slug, items }: RowProps) {
    const all = (items || []).slice(0, 10);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const prefersReducedMotion = useReducedMotion();

    const [containerW, setContainerW] = useState(1180);
    const [dims, setDims] = useState(() => dimsFor(typeof window !== "undefined" ? window.innerWidth : 1280));

    // The single source of truth for selection
    const [currentIdx, setCurrentIdx] = useState(0);

    // Expanded card (null = none)
    const [expandedId, setExpandedId] = useState<string | number | null>(null);

    // Select appropriate transition based on motion preference
    const activeSpring = prefersReducedMotion ? springReduced : spring;

    // measure container
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const ro = new ResizeObserver((entries) => {
            const w = entries[0]?.contentRect?.width ?? el.clientWidth ?? 1180;
            setContainerW(w);
            const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
            setDims(dimsFor(vw));
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // keep currentIdx valid if data changes
    useEffect(() => {
        if (currentIdx >= all.length) setCurrentIdx(Math.max(0, all.length - 1));
    }, [all.length, currentIdx]);

    // if expanded changes, follow with currentIdx for centering
    useEffect(() => {
        if (expandedId == null) return;
        const idx = all.findIndex((x) => x.id === expandedId);
        if (idx >= 0) setCurrentIdx(idx);
    }, [expandedId, all]);

    const { baseW, baseH, gap, maxExpandedCap } = dims;

    // size math
    const expandedWRaw = baseW * EXPAND_W_FACTOR;
    const expandedW = Math.min(
        Math.max(expandedWRaw, MIN_EXPANDED_W),
        Math.max(300, Math.min(maxExpandedCap, containerW - EDGE_PAD * 2))
    );
    const expandedH = Math.max(Math.round(baseH * EXPAND_H_FACTOR), MIN_EXPANDED_H);

    const isAnyExpanded = expandedId != null;
    const widths = all.map((_, i) => (isAnyExpanded && i === currentIdx ? expandedW : baseW));
    const contentW = widths.reduce((a, b) => a + b, 0) + gap * (all.length - 1);

    // precompute centers
    const centersX: number[] = [];
    let run = 0;
    for (let i = 0; i < all.length; i++) {
        const w = widths[i];
        centersX.push(run + w / 2);
        run += w + gap;
    }

    // helpers
    const clamp = (v: number, a: number, b: number) => {
        const [min, max] = a <= b ? [a, b] : [b, a];
        return Math.max(min, Math.min(max, v));
    };
    const centerIfNarrow = () => (containerW - contentW) / 2;

    // compute rail position
    const desiredRailX = containerW / 2 - centersX[currentIdx];
    const minRailX = containerW - contentW - EDGE_PAD;
    const maxRailX = EDGE_PAD;
    const railX =
        contentW + EDGE_PAD * 2 <= containerW
            ? centerIfNarrow()
            : clamp(desiredRailX, minRailX, maxRailX);

    // push feel
    const leftSpace  = centersX[currentIdx] + railX - EDGE_PAD;
    const rightSpace = containerW - EDGE_PAD - (centersX[currentIdx] + railX);
    const tightnessFactor = Math.max(0.6, Math.min(1, Math.min(leftSpace, rightSpace) / 140));

    // nav helpers
    const canPrev = currentIdx > 0;
    const canNext = currentIdx < all.length - 1;

    const move = useCallback((dir: -1 | 1) => {
        if ((dir === -1 && !canPrev) || (dir === 1 && !canNext)) return;
        const nextIdx = currentIdx + dir;
        setCurrentIdx(nextIdx);
        if (isAnyExpanded) setExpandedId(all[nextIdx].id); // transfer expansion
    }, [currentIdx, canPrev, canNext, isAnyExpanded, all]);

    // drag snaps one item
    const onDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const { offset, velocity } = info;
        if (offset.x < -DRAG_PX || velocity.x < -DRAG_VEL) move(1);
        else if (offset.x > DRAG_PX || velocity.x > DRAG_VEL) move(-1);
    };

    // wheel / shift+wheel steps one
    const onWheel = (e: React.WheelEvent) => {
        const isHorizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY);
        const delta = isHorizontal ? e.deltaX : e.shiftKey ? e.deltaY : 0;
        if (delta > 12) move(1);
        else if (delta < -12) move(-1);
    };

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowLeft")  { e.preventDefault(); move(-1); }
        if (e.key === "ArrowRight") { e.preventDefault(); move(1); }
        if (e.key === "Enter") {
            e.preventDefault();
            const id = all[currentIdx]?.id;
            if (!id) return;
            setExpandedId(prev => (prev === id ? null : id));
        }
        if (e.key === "Escape") { e.preventDefault(); setExpandedId(null); }
    };

    /* ===== Document-level edge hover tracking ===== */
    const autoTimer = useRef<NodeJS.Timeout | null>(null);
    const insideRef = useRef(false);

    const stopAuto = () => { if (autoTimer.current) { clearInterval(autoTimer.current); autoTimer.current = null; } };
    const startAuto = useCallback((dir: -1 | 1) => {
        if (autoTimer.current) return;
        autoTimer.current = setInterval(() => move(dir), EDGE_HOVER_RATE);
    }, [move]);

    useEffect(() => {
        const onDocMove = (ev: MouseEvent) => {
            if (!insideRef.current) return;
            const el = containerRef.current;
            if (!el) return;
            const rect = el.getBoundingClientRect();
            const x = ev.clientX - rect.left;
            if (x <= EDGE_HOVER_ZONE)      startAuto(-1);
            else if (x >= rect.width - EDGE_HOVER_ZONE) startAuto(1);
            else stopAuto();
        };
        document.addEventListener("mousemove", onDocMove);
        return () => {
            document.removeEventListener("mousemove", onDocMove);
            stopAuto();
        };
    }, [move, startAuto]);

    const onMouseEnterContainer = () => { insideRef.current = true; };
    const onMouseLeaveContainer = () => { insideRef.current = false; stopAuto(); };

    const primaryCtaLabel = useMemo(() => {
        if (slug === "courses") return "Open course";
        if (slug === "opportunities") return "View opportunity";
        return "Explore";
    }, [slug]);

    return (
        <section className="relative mb-14 isolate">
            {/* Header */}
            <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h3 className="text-[19px] font-extrabold text-slate-800 tracking-tight">{title}</h3>
                </div>

                <Link
                    href={`/${slug}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/80 px-3.5 py-1.5 text-[12px] font-bold text-slate-600 shadow-sm hover:border-[#63C0B9]/40 hover:bg-[#E9F7F5] hover:text-[#2D8F80] transition-all"
                >
                    See all
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M7 12h10M13 8l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </Link>
            </div>

            {/* Row + arrows */}
            <div className="relative">
                <button
                    onClick={() => move(-1)}
                    disabled={!canPrev}
                    aria-label="Previous"
                    className="absolute left-2 top-1/2 z-[1100] -translate-y-1/2 rounded-full bg-white/95 p-3 shadow-lg ring-1 ring-black/10 hover:scale-105 transition disabled:opacity-40 disabled:hover:scale-100"
                >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                        <path d="M15 19l-7-7 7-7" stroke="#334155" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
                <button
                    onClick={() => move(1)}
                    disabled={!canNext}
                    aria-label="Next"
                    className="absolute right-2 top-1/2 z-[1100] -translate-y-1/2 rounded-full bg-white/95 p-3 shadow-lg ring-1 ring-black/10 hover:scale-105 transition disabled:opacity-40 disabled:hover:scale-100"
                >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                        <path d="M9 5l7 7-7 7" stroke="#334155" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>

                {/* edge fades */}
                <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-[#ECF4F9] to-transparent" />
                <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-[#ECF4F9] to-transparent" />

                {/* Rail */}
                <div
                    ref={containerRef}
                    className="relative mx-auto w-full max-w-[1180px] overflow-hidden px-6 py-8"
                    tabIndex={0}
                    onKeyDown={onKeyDown}
                    onWheel={onWheel}
                    onMouseEnter={onMouseEnterContainer}
                    onMouseLeave={onMouseLeaveContainer}
                >
                    <LayoutGroup id={`lg-${slug}`}>
                        <motion.div
                            layout
                            drag="x"
                            dragConstraints={{ left: 0, right: 0 }}
                            dragElastic={0.08}
                            dragMomentum={false}
                            onDragEnd={onDragEnd}
                            animate={{ x: railX }}
                            transition={{ layout: { duration: prefersReducedMotion ? 0.15 : 0.36, ease: EASE.drift }, default: activeSpring }}
                            className="flex select-none items-end cursor-grab active:cursor-grabbing [touch-action:pan-y] will-change-transform"
                            style={{ gap }}
                        >
                            {all.map((it, i) => {
                                const isExpanded = expandedId === it.id;
                                const isSelected = i === currentIdx;
                                const fallbackHref = `/${slug}/${encodeURIComponent(String(it.id))}`;
                                const detailHref = typeof it.href === "string" && it.href.length > 0 ? it.href : fallbackHref;

                                const w = isExpanded ? expandedW : baseW;
                                const h = isExpanded ? Math.max(baseH, Math.max(expandedH, MIN_EXPANDED_H)) : baseH;

                                const dist = i - currentIdx;
                                const pushX = isExpanded
                                    ? 0
                                    : Math.max(-PUSH_MAG_BASE, Math.min(PUSH_MAG_BASE, dist * (PUSH_MAG_BASE * tightnessFactor)));

                                const z = isExpanded ? 1000 : 100 - Math.abs(dist);
                                const gradient = gradients[i % gradients.length];

                                return (
                                    <motion.div
                                        key={String(it.id)}
                                        layout
                                        transition={{ layout: { duration: prefersReducedMotion ? 0.15 : 0.36, ease: EASE.drift } }}
                                        className="relative shrink-0"
                                        style={{ width: w, zIndex: z }}
                                        onMouseEnter={() => {
                                            // Hover should "own" selection ONLY when not expanded
                                            if (expandedId == null) setCurrentIdx(i);
                                        }}
                                    >
                                        <motion.div
                                            layoutId={`card-${slug}-${it.id}`}
                                            onClick={() => {
                                                // Click toggles expansion on the selected card
                                                setCurrentIdx(i);
                                                setExpandedId(prev => (prev === it.id ? null : it.id));
                                            }}
                                            style={{ height: h, transformOrigin: "bottom center", willChange: "transform, box-shadow, opacity" }}
                                            className="group relative cursor-pointer overflow-visible rounded-[14px] ring-1 ring-black/10 bg-white shadow-[0_10px_28px_rgba(0,0,0,0.14)]"
                                            animate={{
                                                x: prefersReducedMotion ? 0 : pushX,
                                                scale: prefersReducedMotion ? 1 : (isExpanded ? 1.0 : (isSelected ? 1.16 : 0.92)),
                                                opacity: isExpanded ? 1 : isSelected ? 1 : 0.92,
                                                borderRadius: isExpanded ? 18 : 14,
                                                boxShadow: isExpanded
                                                    ? "0 32px 100px rgba(0,0,0,0.32)"
                                                    : isSelected
                                                        ? "0 22px 74px rgba(0,0,0,0.22)"
                                                        : "0 10px 28px rgba(0,0,0,0.14)",
                                                filter: (isSelected || isExpanded) ? "brightness(1)" : "brightness(0.98)",
                                            }}
                                            transition={activeSpring}
                                        >
                                            {/* Small cover */}
                                            {!isExpanded && (
                                                <>
                                                    {it.image ? (
                                                        <img src={it.image} alt={it.title} className="h-full w-full rounded-[14px] object-cover" />
                                                    ) : (
                                                        <div className={`h-full w-full rounded-[14px] bg-gradient-to-br ${gradient}`} />
                                                    )}
                                                                                        {/* book spine effect */}
                                                    <div className="pointer-events-none absolute inset-y-0 left-0 w-3 rounded-l-[14px] bg-gradient-to-r from-black/35 via-black/12 to-transparent mix-blend-multiply" />
                                                    <div className="pointer-events-none absolute inset-y-0 left-[3px] w-[2px] rounded-full bg-white/40 opacity-60" />
                                                    <div className="pointer-events-none absolute inset-y-2 right-1 w-2 rounded-sm opacity-45 bg-[repeating-linear-gradient(180deg,rgba(255,255,255,0.95)_0,rgba(255,255,255,0.95)_2px,rgba(226,232,240,0.95)_2px,rgba(226,232,240,0.95)_4px)]" />
                                                    {/* bottom gradient overlay */}
                                                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 rounded-b-[14px] bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                                                    {/* title label */}
                                                    <div className="absolute inset-x-2.5 bottom-2.5 z-30">
                                                        <div className="line-clamp-2 text-[11.5px] font-bold leading-snug text-white drop-shadow-md">{it.title}</div>
                                                    </div>
                                                    {it.tag && (
                                                        <div className="absolute left-2.5 top-2.5 z-20 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-bold text-slate-700 shadow-sm ring-1 ring-black/5">
                                                            {it.tag}
                                                        </div>
                                                    )}
                                                </>
                                            )}

                                            {/* OPEN BOOK */}
                                            <AnimatePresence>
                                                {isExpanded && (
                                                    <motion.div
                                                        key="openbook"
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        exit={{ opacity: 0 }}
                                                        className="absolute inset-0 z-[1050] rounded-[18px] overflow-hidden"
                                                        style={book3dStyle}
                                                        onClick={(e) => { e.stopPropagation(); }}
                                                    >
                                                        <div className="absolute inset-0 rounded-[18px] bg-neutral-50" />
                                                        <div className="pointer-events-none absolute inset-y-2 left-1/2 w-[2px] -translate-x-1/2 rounded-full bg-gradient-to-b from-black/30 via-black/10 to-black/30 opacity-30" />
                                                        <div className="pointer-events-none absolute inset-0 rounded-[18px] shadow-[inset_0_0_48px_rgba(0,0,0,0.12)]" />

                                                        <div className="absolute inset-0 grid grid-cols-2">
                                                            {/* LEFT PAGE */}
                                                            <motion.div
                                                                initial={{ rotateY: prefersReducedMotion ? 0 : -12, opacity: 0.9 }}
                                                                animate={{ rotateY: prefersReducedMotion ? 0 : -3, opacity: 1 }}
                                                                exit={{ rotateY: prefersReducedMotion ? 0 : -12, opacity: 0.9 }}
                                                                transition={activeSpring}
                                                                style={{ transformOrigin: "right center" }}
                                                                className="relative h-full rounded-l-[18px] bg-white"
                                                            >
                                                                <div className="absolute inset-0 bg-[repeating-linear-gradient(180deg,rgba(0,0,0,0.03)_0px,rgba(0,0,0,0.03)_1px,transparent_1px,transparent_6px)] opacity-40" />
                                                                <div className="pointer-events-none absolute inset-y-0 right-0 w-4 bg-gradient-to-l from-black/20 to-transparent opacity-25 rounded-r-[6px]" />
                                                                <div className="relative h-full w-full p-4 sm:p-5 md:p-6">
                                                                    <div className="relative h-[58%] w-full overflow-hidden rounded-xl ring-1 ring-black/10">
                                                                        {it.image ? (
                                                                            <img src={it.image} alt={it.title} className="h-full w-full object-cover" />
                                                                        ) : (
                                                                            <div className={`h-full w-full bg-gradient-to-br ${gradients[i % gradients.length]}`} />
                                                                        )}
                                                                        <div className="pointer-events-none absolute inset-0 bg-black/8" />
                                                                    </div>
                                                                    <div className="mt-3 flex flex-wrap gap-2">
                                                                        {it.tag && (<span className="rounded-full bg-slate-900/5 px-2.5 py-1 text-[11px] font-medium text-slate-700 ring-1 ring-black/5">{it.tag}</span>)}
                                                                        <span className="rounded-full bg-slate-900/5 px-2.5 py-1 text-[11px] font-medium text-slate-700 ring-1 ring-black/5">Beginner</span>
                                                                        <span className="rounded-full bg-slate-900/5 px-2.5 py-1 text-[11px] font-medium text-slate-700 ring-1 ring-black/5">~4–6 hrs</span>
                                                                        <span className="rounded-full bg-slate-900/5 px-2.5 py-1 text-[11px] font-medium text-slate-700 ring-1 ring-black/5">Certificate</span>
                                                                    </div>
                                                                </div>
                                                            </motion.div>

                                                            {/* RIGHT PAGE */}
                                                            <motion.div
                                                                initial={{ rotateY: prefersReducedMotion ? 0 : 12, opacity: 0.9 }}
                                                                animate={{ rotateY: prefersReducedMotion ? 0 : 3, opacity: 1 }}
                                                                exit={{ rotateY: prefersReducedMotion ? 0 : 12, opacity: 0.9 }}
                                                                transition={activeSpring}
                                                                style={{ transformOrigin: "left center" }}
                                                                className="relative h-full rounded-r-[18px] bg-white"
                                                            >
                                                                <div className="absolute inset-0 bg-[repeating-linear-gradient(180deg,rgba(0,0,0,0.03)_0px,rgba(0,0,0,0.03)_1px,transparent_1px,transparent_6px)] opacity-40" />
                                                                <div className="pointer-events-none absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-black/20 to-transparent opacity-25 rounded-l-[6px]" />

                                                                <div className="relative flex h-full w-full flex-col p-4 sm:p-5 md:p-6 overflow-hidden">
                                                                    <div className="flex items-start justify-between gap-3">
                                                                        <h4 className="text-[15px] sm:text-[16px] md:text-[18px] font-semibold text-slate-900 leading-snug">
                                                                            {it.title}
                                                                        </h4>
                                                                        <button
                                                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setExpandedId(null); }}
                                                                            className="shrink-0 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 transition"
                                                                        >
                                                                            Close
                                                                        </button>
                                                                    </div>

                                                                    {it.summary && (
                                                                        <p className="mt-2 text-[12px] sm:text-[13px] leading-relaxed text-slate-700">
                                                                            {it.summary}
                                                                        </p>
                                                                    )}

                                                                    <ul className="mt-3 space-y-1.5 text-[12px] text-slate-700">
                                                                        <li className="flex items-start gap-2"><span className="mt-[6px] inline-block h-1.5 w-1.5 rounded-full bg-[#2FB3A4]" /> Hands-on projects</li>
                                                                        <li className="flex items-start gap-2"><span className="mt-[6px] inline-block h-1.5 w-1.5 rounded-full bg-[#2FB3A4]" /> Mentor feedback</li>
                                                                        <li className="flex items-start gap-2"><span className="mt-[6px] inline-block h-1.5 w-1.5 rounded-full bg-[#2FB3A4]" /> Community support</li>
                                                                    </ul>

                                                                    <div className="mt-2 flex-1 overflow-auto pr-1" />

                                                                    <div
                                                                        className="mt-3 flex flex-wrap items-center justify-end gap-2"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    >
                                                                        <Link
                                                                            href={detailHref}
                                                                            className="inline-flex items-center justify-center rounded-full bg-[#2FB3A4] px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow hover:brightness-110 transition"
                                                                        >
                                                                            {primaryCtaLabel}
                                                                        </Link>
                                                                        <Link
                                                                            href={`/${slug}`}
                                                                            className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                                                                        >
                                                                            See more
                                                                        </Link>
                                                                    </div>
                                                                </div>
                                                            </motion.div>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </motion.div>
                                    </motion.div>
                                );
                            })}
                        </motion.div>
                    </LayoutGroup>
                </div>
            </div>
        </section>
    );
}