"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

import SiteNav from "@/components/site-nav";
import { EASE, FADES } from "@/lib/motion-presets";

const releases = [
    {
        version: "2.5",
        codename: "Pocket Glass",
        date: "May 2025",
        highlights: [
            "Responsive nav that tucks quick links into the menu on tight screens while keeping desktop pills unchanged",
            "Compact profile access and glass chrome that stay readable on phones without losing the frosted effect",
            "Non-linear motion presets applied to drawers, menus, and cards for a cohesive feel everywhere",
        ],
        notes: "Primary dev: Baichen Yu — championing pocket-friendly glass navigation and unified motion polish.",
    },
    {
        version: "2.4",
        codename: "Velvet Pulse",
        date: "April 2025",
        highlights: [
            "Removed the obstructive progress bar in favor of breathable glass chrome and visible underlying UI",
            "Unified non-linear motion presets across nav, drawers, release cards, and return-to-top controls",
            "Dedicated animation shells for expandable menus keep sub-navigation fluid and consistently timed",
        ],
        notes: "Primary dev: Baichen Yu — leading the motion unification, glass refinement, and ergonomics refresh.",
    },
    {
        version: "2.3",
        codename: "Aurora Rise",
        date: "March 2025",
        highlights: [
            "Cinematic, non-linear glass nav motion that stays readable while revealing UI beneath with edge blur",
            "Floating return-to-top control keeps long reads ergonomic without visual clutter",
            "Accent-rich chrome touches extended to quick actions, drawers, and new surface veils",
        ],
        notes: "Primary dev: Baichen Yu — bringing Apple-like motion polish, handy shortcuts, and clearer cues.",
    },
    {
        version: "2.2",
        codename: "Skyline Drift",
        date: "February 2025",
        highlights: [
            "Pinned glass nav with softened edge blur that reveals the UI beneath without hiding controls",
            "Navigation pills keep their spacing and single-line join actions while animating smoothly at the top of the page",
            "Accent-synced chrome, profile access, and quick actions pick up your theme instantly",
        ],
        notes: "Primary dev: Baichen Yu — dialing in ergonomics while keeping the glass look lively.",
    },
    {
        version: "2.1",
        codename: "Edge Current",
        date: "January 2025",
        highlights: [
            "Glass-pill navigation that stays pinned with edge blur while you scroll",
            "Accent-aware chrome that shows through underlying UI with softer gradients",
            "More animated affordances for feature suites, join codes, and publishing flows",
        ],
        notes: "Primary dev: Baichen Yu — carrying the glass aesthetic forward with better ergonomics.",
    },
    {
        version: "2.0",
        codename: "Glass Harbor",
        date: "December 2024",
        highlights: [
            "Frosted pill navigation with accent-driven gradients and quicker tap targets",
            "Expanded accent palette plus richer theming touches across controls",
            "Higher polish on release notes, profile settings, and interactive affordances",
        ],
        notes: "Primary dev: Baichen Yu — shipping ergonomic glassmorphism and deeper customization.",
    },
    {
        version: "1.9",
        codename: "Mesa Bloom",
        date: "November 2024",
        highlights: [
            "Ergonomic navigation with scrollable quick links on desktop and mobile",
            "Expanded accent palette with richer customization options",
            "Smoother animations for menus and interactive elements",
        ],
        notes: "Primary dev: Baichen Yu — crafting friendlier journeys without sacrificing speed.",
    },
    {
        version: "1.8",
        codename: "Sierra Lantern",
        date: "October 2024",
        highlights: [
            "Smarter opportunity publishing with richer validation",
            "Faster API responses with optional clustered workers",
            "Clipboard-safe join codes for every course",
        ],
        notes: "Primary dev: Baichen Yu — delivering resilient growth for new cohorts.",
    },
    {
        version: "1.7",
        codename: "Marigold Arc",
        date: "September 2024",
        highlights: ["Improved tutor workspace layouts", "New calendar-ready event exports"],
        notes: "Primary dev: Baichen Yu — smoothing publishing flows and calendars.",
    },
    {
        version: "1.6",
        codename: "Cinder Bay",
        date: "August 2024",
        highlights: ["Resource hub redesign", "Streamlined authentication and session recovery"],
        notes: "Primary dev: Baichen Yu — cleanup with better recovery and discovery.",
    },
];

const featureCallouts = [
    {
        title: "Pocket-ready glass nav",
        copy: "On narrow screens the frosted pills gracefully collapse into the menu while desktop spacing stays untouched.",
    },
    {
        title: "Glide across the page",
        copy: "Pinned frosted nav with edge blur, breathing space, and a floating return-to-top keeps you oriented without clutter.",
    },
    {
        title: "Apple-inspired motion",
        copy: "Non-linear easing, subtle parallax veils, and springy controls now power drawers, menus, and release cards alike.",
    },
    {
        title: "Opportunities built to grow",
        copy: "Publish internships, projects, or mentorships with attachments, timelines, and recruiter contact all in one place.",
    },
    {
        title: "Courses that welcome everyone",
        copy: "Share enrollment codes confidently thanks to resilient clipboard support, roster approvals, and assignment workflows.",
    },
    {
        title: "Security-first platform",
        copy: "Layered rate limiting, hardened headers, and health checks keep normal traffic flowing while rejecting noisy attacks.",
    },
    {
        title: "Feature suites that stay fresh",
        copy: "Release cards now carry codenames, primary dev credit, and expandable highlights so every iteration is easy to track.",
    },
    {
        title: "Custom accents everywhere",
        copy: "Pill navs, profile menus, and quick actions now inherit your chosen accent for a consistent identity across pages.",
    },
    {
        title: "Live publishing shortcuts",
        copy: "Glass-draped quick actions help tutors jump into studios or share codes without losing context while browsing.",
    },
    {
        title: "Always-visible glass nav",
        copy: "A frosted pill that follows you with edge blur, ergonomic spacing, and glass veils so links stay easy to tap.",
    },
    {
        title: "Theme it your way",
        copy: "Expanded accent palettes and synced chrome let every surface — nav, profile, join flows — mirror your identity.",
    },
    {
        title: "Release storytelling",
        copy: "Each version ships with a codename, primary developer credit for Baichen Yu, and expandable highlights to explore.",
    },
];

export default function AboutPage() {
    const [openRelease, setOpenRelease] = useState(releases[0].version);

    return (
        <div className="min-h-dvh bg-[#F4F7FB] text-slate-800">
            <SiteNav />
            <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-10">
                <motion.section
                    variants={FADES.gentleUp}
                    initial="initial"
                    animate="animate"
                    className="overflow-hidden rounded-[32px] border border-white/60 bg-gradient-to-br from-white via-white to-[#E6F4F1] p-8 shadow-2xl md:p-12"
                >
                    <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                        <div className="space-y-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2D8F80]">About SparkHub</p>
                            <h1 className="text-3xl font-semibold text-slate-900 md:text-4xl">Connecting learners, tutors, and recruiters</h1>
                            <p className="max-w-2xl text-sm text-slate-600 md:text-base">
                                SparkHub helps students discover courses, events, and real opportunities without sacrificing security or performance. Every release ships
                                with visible improvements so you always know what changed.
                            </p>
                            <div className="flex flex-wrap gap-3 text-sm font-semibold text-[#2B2B2B]">
                                <Link
                                    href="/opportunities"
                                    className="rounded-full bg-[#63C0B9] px-4 py-2 text-white shadow-md transition hover:translate-y-[-1px] hover:shadow-lg"
                                >
                                    View opportunities
                                </Link>
                                <Link
                                    href="/courses"
                                    className="rounded-full border border-[#CFE3E0] px-4 py-2 transition hover:bg-white"
                                >
                                    Explore courses
                                </Link>
                            </div>
                        </div>
                        <motion.div
                            whileHover={{ rotate: -1.5, scale: 1.02 }}
                            className="rounded-[28px] border border-[#CFE3E0] bg-white/90 p-6 shadow-xl"
                        >
                            <p className="text-xs font-semibold uppercase tracking-wide text-[#2B2E83]">Latest release</p>
                            <h2 className="mt-2 text-2xl font-semibold text-slate-900">{releases[0].version}</h2>
                            <p className="text-sm text-slate-600">{releases[0].date}</p>
                            <p className="text-sm font-semibold text-[#2D8F80]">Codename: {releases[0].codename}</p>
                            <ul className="mt-3 space-y-2 text-sm text-slate-700">
                                {releases[0].highlights.map((item) => (
                                    <li key={item} className="flex items-start gap-2">
                                        <span className="mt-[3px] inline-block h-2 w-2 rounded-full bg-[#2D8F80]" />
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                            <div className="mt-3 rounded-2xl bg-[#F6FBFA] px-3 py-2 text-xs font-semibold text-[#2B2E83] shadow-[var(--sh-card-glow)]">
                                {releases[0].notes}
                            </div>
                        </motion.div>
                    </div>
                </motion.section>

                <section className="mt-10 grid gap-6 md:grid-cols-2">
                    <motion.div
                        variants={FADES.gentleUp}
                        initial="initial"
                        animate="animate"
                        transition={{ delay: 0.05 }}
                        className="rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-2xl"
                    >
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#2D8F80]">Release notes</p>
                        <h3 className="mt-2 text-xl font-semibold text-slate-900">What changed recently</h3>
                        <div className="mt-4 space-y-4">
                            {releases.map((release, idx) => (
                                <ReleaseCard
                                    key={release.version}
                                    release={release}
                                    isOpen={openRelease === release.version}
                                    index={idx}
                                    onToggle={() => setOpenRelease(openRelease === release.version ? "" : release.version)}
                                />
                            ))}
                        </div>
                    </motion.div>

                    <motion.div
                        variants={FADES.gentleUp}
                        initial="initial"
                        animate="animate"
                        transition={{ delay: 0.1 }}
                        className="rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-2xl"
                    >
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#2B2E83]">Why teams choose SparkHub</p>
                        <h3 className="mt-2 text-xl font-semibold text-slate-900">Feature highlights</h3>
                        <div className="mt-4 grid gap-4">
                            {featureCallouts.map((feature, idx) => (
                                <FeatureCard key={feature.title} feature={feature} index={idx} />
                            ))}
                        </div>
                        <div className="mt-6 rounded-2xl border border-dashed border-[#CFE3E0] bg-[#F2FBF9] p-4 text-sm text-slate-700">
                            Want something added next? <Link href="/contact" className="font-semibold text-[#2D8F80]">Tell the team</Link> so we can include it in the next release note.
                        </div>
                    </motion.div>
                </section>
            </main>
        </div>
    );
}

type Release = (typeof releases)[number];

function ReleaseCard({ release, isOpen, index, onToggle }: { release: Release; isOpen: boolean; index: number; onToggle: () => void }) {
    return (
        <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.995 }}
            onClick={onToggle}
            className={`w-full rounded-2xl border p-4 text-left shadow-sm transition ${
                isOpen ? "border-[var(--sh-accent)] bg-[#F9FEFD] shadow-[var(--sh-card-glow)]" : "border-[#E6F0EF] bg-[#F9FEFD]"
            }`}
            transition={{ duration: 0.3, ease: EASE.emphasized, delay: index * 0.035 }}
        >
            <div className="flex items-center justify-between text-sm font-semibold text-slate-800">
                <div className="flex items-center gap-2">
                    <span className="rounded-full bg-[var(--sh-accent-soft)] px-3 py-1 text-xs font-bold text-[var(--sh-accent)]">
                        Codename {release.codename}
                    </span>
                    <span>Version {release.version}</span>
                </div>
                <span className="text-xs text-slate-500">{release.date}</span>
            </div>
            <AnimatePresence initial={false}>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0, y: -6 }}
                        animate={{ height: "auto", opacity: 1, y: 0 }}
                        exit={{ height: 0, opacity: 0, y: -4 }}
                        transition={{ duration: 0.35, ease: EASE.lift }}
                        className="overflow-hidden"
                    >
                        <ul className="mt-3 space-y-1 text-sm text-slate-700">
                            {release.highlights.map((item) => (
                                <li key={item} className="flex items-start gap-2">
                                    <span className="mt-[6px] inline-block h-1.5 w-1.5 rounded-full bg-[#2B2E83]" />
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="mt-3 rounded-xl bg-white/80 px-3 py-2 text-xs font-semibold text-[#2B2E83] shadow-[var(--sh-card-glow)]">
                            {release.notes}
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.button>
    );
}

function FeatureCard({ feature, index }: { feature: { title: string; copy: string }; index: number }) {
    return (
        <motion.div
            whileHover={{ scale: 1.015, y: -1 }}
            transition={{ duration: 0.3, ease: EASE.swift, delay: index * 0.025 }}
            className="rounded-2xl border border-[#E6EAF5] bg-[#F8FAFF] p-4 shadow-sm"
        >
            <p className="text-sm font-semibold text-slate-900">{feature.title}</p>
            <p className="mt-1 text-sm text-slate-600">{feature.copy}</p>
        </motion.div>
    );
}
