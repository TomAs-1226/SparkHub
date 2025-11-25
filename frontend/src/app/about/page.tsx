"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

import SiteNav from "@/components/site-nav";

const releases = [
    {
        version: "1.9",
        codename: "Mesa Bloom",
        date: "November 2024",
        highlights: [
            "Ergonomic navigation with scrollable quick links on desktop and mobile",
            "Expanded accent palette with richer customization options",
            "Smoother animations for menus and interactive elements",
        ],
        notes: "Primary dev: You — crafting friendlier journeys without sacrificing speed.",
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
        notes: "Primary dev: You — delivering resilient growth for new cohorts.",
    },
    {
        version: "1.7",
        codename: "Marigold Arc",
        date: "September 2024",
        highlights: ["Improved tutor workspace layouts", "New calendar-ready event exports"],
        notes: "Primary dev: You — smoothing publishing flows and calendars.",
    },
    {
        version: "1.6",
        codename: "Cinder Bay",
        date: "August 2024",
        highlights: ["Resource hub redesign", "Streamlined authentication and session recovery"],
        notes: "Primary dev: You — cleanup with better recovery and discovery.",
    },
];

const featureCallouts = [
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
];

const fadeUp = {
    initial: { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
};

export default function AboutPage() {
    const [openRelease, setOpenRelease] = useState(releases[0].version);

    return (
        <div className="min-h-dvh bg-[#F4F7FB] text-slate-800">
            <SiteNav />
            <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-10">
                <motion.section
                    {...fadeUp}
                    transition={{ duration: 0.5, ease: "easeOut" }}
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
                        {...fadeUp}
                        transition={{ duration: 0.45, delay: 0.05 }}
                        className="rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-2xl"
                    >
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#2D8F80]">Release notes</p>
                        <h3 className="mt-2 text-xl font-semibold text-slate-900">What changed recently</h3>
                        <div className="mt-4 space-y-4">
                            {releases.map((release, idx) => {
                                const isOpen = openRelease === release.version;
                                return (
                                    <motion.button
                                        key={release.version}
                                        whileHover={{ y: -2 }}
                                        onClick={() => setOpenRelease(isOpen ? "" : release.version)}
                                        className={`w-full rounded-2xl border p-4 text-left shadow-sm transition ${
                                            isOpen
                                                ? "border-[var(--sh-accent)] bg-[#F9FEFD] shadow-[var(--sh-card-glow)]"
                                                : "border-[#E6F0EF] bg-[#F9FEFD]"
                                        }`}
                                        transition={{ duration: 0.2, delay: idx * 0.03 }}
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
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: "auto", opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
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
                            })}
                        </div>
                    </motion.div>

                    <motion.div
                        {...fadeUp}
                        transition={{ duration: 0.45, delay: 0.1 }}
                        className="rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-2xl"
                    >
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#2B2E83]">Why teams choose SparkHub</p>
                        <h3 className="mt-2 text-xl font-semibold text-slate-900">Feature highlights</h3>
                        <div className="mt-4 grid gap-4">
                            {featureCallouts.map((feature) => (
                                <motion.div
                                    key={feature.title}
                                    whileHover={{ scale: 1.01 }}
                                    className="rounded-2xl border border-[#E6EAF5] bg-[#F8FAFF] p-4 shadow-sm"
                                >
                                    <p className="text-sm font-semibold text-slate-900">{feature.title}</p>
                                    <p className="mt-1 text-sm text-slate-600">{feature.copy}</p>
                                </motion.div>
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
