"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import SiteNav from "@/components/site-nav";
import SparkHubLogo from "@/components/SparkHubLogo";

// client-only to avoid hydration issues in ExploreContents
const ExploreContents = dynamic(() => import("@/components/explore-contents"), {
    ssr: false,
});

type EventItem = {
    id: string;
    title: string;
    summary?: string | null;
    image?: string | null;
    type?: string | null;
    startsAt?: string | null;
    endsAt?: string | null;
    location?: string | null;
};

function pickSummary(obj: Record<string, unknown> | null | undefined): string | null {
    if (!obj) return null;
    const fields = ["summary", "description", "details", "content", "overview", "body"];
    for (const field of fields) {
        const value = obj[field];
        if (typeof value === "string" && value.trim()) {
            return value;
        }
    }
    return null;
}

async function fetchEvents(limit = 4, signal?: AbortSignal): Promise<EventItem[]> {
    try {
        const query = limit ? `?limit=${limit}` : "";
        const res = await fetch(`/api/events${query}`, { cache: "no-store", signal });
        if (!res.ok) return [];
        const json = await res.json();
        const arr = Array.isArray(json?.list) ? json.list : Array.isArray(json) ? json : [];
        return arr.slice(0, limit).map((e) => ({
            id: String(e.id ?? ""),
            title: e.title ?? e.name ?? "Untitled event",
            summary: pickSummary(e),
            image: e.image ?? e.cover ?? e.thumbnail ?? null,
            type: e.type ?? e.category ?? e.kind ?? null,
            startsAt: e.startsAt ?? e.startTime ?? null,
            endsAt: e.endsAt ?? e.endTime ?? null,
            location: e.location ?? null,
        }));
    } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return [];
        return [];
    }
}

export default function HomePage() {
    const [events, setEvents] = useState<EventItem[]>([]);
    useEffect(() => {
        const controller = new AbortController();
        fetchEvents(4, controller.signal)
            .then((rows) => {
                if (!controller.signal.aborted) setEvents(rows);
            })
            .catch(() => {
                // ignore network hiccups; hero renders static copy
            });
        return () => controller.abort();
    }, []);
    const feature = useMemo(() => events[0], [events]);
    const side = useMemo(() => events.slice(1, 4), [events]);

    return (
        <main className="min-h-dvh">
            {/* HERO */}
            <section className="relative overflow-hidden">
                <div className="relative bg-[#63C0B9]">
                    <div className="absolute inset-0 bg-[radial-gradient(1200px_600px_at_10%_0%,rgba(255,255,255,0.25),transparent_60%)]" />
                    <SiteNav />

                    <div className="relative z-10 mx-auto grid w-full max-w-[1280px] items-center gap-8 px-4 sm:px-6 lg:px-8 pt-28 pb-28 md:grid-cols-[1.05fr_1fr]">
                        {/* LEFT */}
                        <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.45, ease: "easeOut" }}
                            className="text-white"
                        >
                            <h1 className="text-[38px] leading-tight font-extrabold md:text-[48px]">
                                <span className="text-white/90">Students’</span> very own <br />{" "}
                                development center
                            </h1>
                            <p className="mt-4 max-w-[520px] text-white/90">
                                SparkHub—where students help each other through mentorship,
                                community connections, and online courses.
                            </p>
                            <div className="mt-7">
                                <Link
                                    href="/register"
                                    className="rounded-full bg-white/90 px-6 py-3 text-sm font-semibold text-[#2B2B2B] shadow-sm hover:bg-white transition"
                                >
                                    Join now
                                </Link>
                            </div>
                        </motion.div>

                        {/* RIGHT art + widgets */}
                        <div className="relative">
                            <motion.div
                                initial={{ opacity: 0, scale: 1.035 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                                className="relative mx-auto h-[460px] w-[360px] md:h-[520px] md:w-[420px]"
                            >
                                <Image
                                    src="/landing/hero-student.png"
                                    alt="Student holding books"
                                    fill
                                    priority
                                    className="object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.25)]"
                                />
                            </motion.div>

                            {/* toasts */}
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.45, duration: 0.35 }}
                                className="absolute right-0 top-[35%]"
                            >
                                <div className="flex items-center gap-3 rounded-xl bg-white/95 px-4 py-3 text-sm text-[#2B2B2B] shadow-xl ring-1 ring-black/5 backdrop-blur">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFF4E7]">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M4 6h16v12H4z" stroke="#F59E0B" strokeWidth="1.6" />
                      <path d="M4 6l8 6 8-6" stroke="#F59E0B" strokeWidth="1.6" />
                    </svg>
                  </span>
                                    <div className="leading-tight">
                                        <div className="font-semibold">Congratulations</div>
                                        <div className="text-xs text-neutral-600">
                                            Your admission completed
                                        </div>
                                    </div>
                                </div>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.55, duration: 0.35 }}
                                className="absolute left-[-6px] bottom-[-10px] md:left-[-20px]"
                            >
                                <div className="flex items-center gap-3 rounded-2xl bg-white/95 px-4 py-3 text-sm text-[#2B2B2B] shadow-xl ring-1 ring-black/5 backdrop-blur">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#E7F3F2]">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path
                          d="M7 9a4 4 0 108 0 4 4 0 00-8 0z"
                          stroke="#2B908F"
                          strokeWidth="1.6"
                      />
                      <path
                          d="M3 21a9 9 0 0118 0"
                          stroke="#2B908F"
                          strokeWidth="1.6"
                      />
                    </svg>
                  </span>
                                    <div className="leading-tight">
                                        <div className="font-semibold">Live mentors online</div>
                                        <div className="text-xs text-neutral-600">
                                            Book a 1:1 in minutes
                                        </div>
                                    </div>
                                </div>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, x: -12 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.65, duration: 0.35 }}
                                className="absolute left-1 md:left-[-10px] top-[10%]"
                            >
                                <div className="flex items-center gap-2 rounded-xl bg-white/95 px-3 py-2 text-xs text-[#2B2B2B] shadow-md ring-1 ring-black/5 backdrop-blur">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                        <path d="M5 5h14v14H5z" stroke="#4F46E5" strokeWidth="1.6" />
                                        <path d="M8 12h8M12 8v8" stroke="#4F46E5" strokeWidth="1.6" />
                                    </svg>
                                    <span className="font-medium">New course published</span>
                                </div>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.75, duration: 0.35 }}
                                className="absolute right-1 md:right-[-6px] bottom-[8%]"
                            >
                                <div className="flex items-center gap-2 rounded-xl bg-white/95 px-3 py-2 text-xs text-[#2B2B2B] shadow-md ring-1 ring-black/5 backdrop-blur">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                        <path
                                            d="M4 12h16M12 4v16"
                                            stroke="#10B981"
                                            strokeWidth="1.8"
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                    <span className="font-medium">More courses coming!</span>
                                </div>
                            </motion.div>
                        </div>
                    </div>

                    {/* wave to white */}
                    <svg
                        className="absolute bottom-[-1px] left-0 right-0 w-full"
                        viewBox="0 0 1440 140"
                        preserveAspectRatio="none"
                    >
                        <path
                            d="M0,64 C240,160 480,0 720,64 C960,128 1200,112 1440,32 L1440,140 L0,140 Z"
                            fill="#ffffff"
                        />
                    </svg>
                </div>
            </section>

            {/* FEATURE INTRO */}
            <section className="relative bg-white">
                <div className="mx-auto w-full max-w-[1180px] px-4 sm:px-6 lg:px-8 py-14">
                    <div className="text-center">
                        <h2 className="text-[24px] md:text-[28px] font-extrabold text-[#2B2B2B]">
                            All-In-One <span className="text-[#35B6A6]">Online Platform.</span>
                        </h2>
                        <p className="mx-auto mt-3 max-w-[700px] text-sm md:text-base text-neutral-600">
                            SparkHub is one powerful online software suite that combines all
                            the tools needed for students to engage with the broader
                            community.
                        </p>
                    </div>

                    <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        <Card
                            icon="book"
                            title="Online Courses, Tutorials & Certificates"
                            text="Access & build skills at your own pace with practical resources. Or become a curator yourself, helping others willing to learn."
                            color="#4F46E5"
                            bg="#E9EEFF"
                        />
                        <Card
                            icon="calendar"
                            title="Easy Scheduling & Tracking events"
                            text="Effortlessly find and sign up for upcoming workshops and events. Track your schedule and attendance all in one place."
                            color="#10B981"
                            bg="#E7FAF5"
                        />
                        <Card
                            icon="users"
                            title="Connect Leaders & Book Mentors"
                            text="Through networking and scheduling sessions with youth leaders, we connect you with dedicated student mentors."
                            color="#2563EB"
                            bg="#EAF2FF"
                        />
                    </div>
                </div>
            </section>

            {/* WHAT IS SPARKHUB */}
            <section className="bg-white">
                <div className="mx-auto w-full max-w-[1180px] px-4 sm:px-6 lg:px-8 py-16">
                    <div className="text-center">
                        <h2 className="text-[26px] md:text-[32px] font-extrabold">
                            <span className="text-[#2B2E83]">What is </span>
                            <span className="text-[#35B6A6]">Sparkhub?</span>
                        </h2>
                        <p className="mx-auto mt-4 max-w-[900px] text-[15px] md:text-[16px] leading-7 text-[#616882]">
                            Sparkhub enables youth experts and leaders to create online
                            classes, store materials and find enthusiastic participants for
                            projects. For learners, Sparkhub guides you to access resources,
                            participate in offline events, and earn certificates.
                        </p>
                    </div>

                    <div className="mt-10 grid gap-6 md:grid-cols-2">
                        <FeatureCard
                            title="FOR CREATORS"
                            btnText="Build your profile now"
                            href="/register"
                            image="/landing/creator.jpg"
                            overlay="light"
                            buttonStyle="outline"
                        />
                        <FeatureCard
                            title="FOR LEARNERS"
                            btnText="Start exploring today"
                            href="/register"
                            image="/landing/learner.jpg"
                            overlay="dark"
                            buttonStyle="solid"
                        />
                    </div>
                </div>
            </section>

            {/* ALBUM-FLOW */}
            <ExploreContents />

            {/* EVENTS */}
            <section className="bg-white py-14">
                <div className="mx-auto w-full max-w-[1180px] px-4 sm:px-6 lg:px-8">
                    <div className="text-center">
                        <h3 className="text-[22px] md:text-[24px] font-extrabold text-[#2B2E83]">
                            Events coming up
                        </h3>
                        <p className="mx-auto mt-2 max-w-[720px] text-sm text-[#6B7280]">
                            Check out exciting workshops, seminars and many other events
                            happening on our offline bases
                        </p>
                    </div>

                    {events.length === 0 ? (
                        <div className="mt-10 rounded-3xl border border-dashed border-slate-200 bg-slate-50/80 p-8 text-center text-sm text-slate-600">
                            There are currently no upcoming events. Once an admin publishes an event, it will appear here.
                        </div>
                    ) : (
                        <div className="mt-10 grid gap-8 md:grid-cols-[1.2fr_1fr]">
                            {feature && (
                                <motion.article
                                    initial={{ opacity: 0, y: 16 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true, margin: "-80px" }}
                                    transition={{ duration: 0.35 }}
                                    className="rounded-2xl ring-1 ring-black/10 shadow-[0_10px_30px_rgba(0,0,0,0.06)] overflow-hidden"
                                >
                                    <div className="relative h-[230px] w-full">
                                        <Image
                                            src={feature.image || "/landing/events-fallback.jpg"}
                                            alt={feature.title}
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                    <div className="p-5">
                                        {feature.type && (
                                            <span className="inline-flex items-center rounded-full bg-[#CFEDEE] px-3 py-1 text-xs font-semibold text-[#2FB3A4]">
                                                {feature.type}
                                            </span>
                                        )}
                                        <h4 className="mt-3 text-[17px] font-semibold text-[#2B2B2B] leading-snug">
                                            {feature.title}
                                        </h4>
                                        {feature.summary ? (
                                            <p className="mt-2 text-sm text-[#6B7280] line-clamp-3">
                                                {feature.summary}
                                            </p>
                                        ) : (
                                            <p className="mt-2 text-sm text-[#6B7280]">
                                                Details will appear as soon as the organizer adds them.
                                            </p>
                                        )}
                                        <p className="mt-3 text-xs text-[#4B5563]">
                                            {formatEventDate(feature.startsAt)} · {feature.location || "Location coming soon"}
                                        </p>
                                        <div className="mt-4">
                                            <Link
                                                href={`/events/${feature.id}`}
                                                className="text-sm font-semibold text-[#2B2E83] underline underline-offset-4 hover:opacity-90"
                                            >
                                                See details
                                            </Link>
                                        </div>
                                    </div>
                                </motion.article>
                            )}

                            <div className="grid gap-5">
                                {side.map((e) => (
                                    <motion.article
                                        key={e.id}
                                        initial={{ opacity: 0, y: 16 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true, margin: "-80px" }}
                                        transition={{ duration: 0.35 }}
                                        className="grid grid-cols-[150px_1fr] gap-4 rounded-2xl ring-1 ring-black/10 shadow-[0_10px_24px_rgba(0,0,0,0.05)] overflow-hidden"
                                    >
                                        <div className="relative h-[100px] w-full">
                                            <Image
                                                src={e.image || "/landing/events-fallback.jpg"}
                                                alt={e.title}
                                                fill
                                                className="object-cover"
                                            />
                                        </div>
                                        <div className="py-3 pr-3">
                                            {e.type && (
                                                <span className="inline-flex items-center rounded-full bg-[#E6F4FF] px-2.5 py-1 text-[10px] font-bold text-[#2B7FFF]">
                                                    {e.type}
                                                </span>
                                            )}
                                            <h5 className="mt-1.5 text-sm font-semibold text-[#2B2B2B] leading-snug">
                                                {e.title}
                                            </h5>
                                            {e.summary ? (
                                                <p className="mt-1 text-xs text-[#6B7280] line-clamp-2">
                                                    {e.summary}
                                                </p>
                                            ) : (
                                                <p className="mt-1 text-xs text-[#9CA3AF]">
                                                    Description will be added soon.
                                                </p>
                                            )}
                                            <p className="mt-2 text-[11px] text-[#4B5563]">
                                                {formatEventDate(e.startsAt)} · {e.location || "Location TBD"}
                                            </p>
                                            <Link
                                                href={`/events/${e.id}`}
                                                className="mt-2 inline-flex items-center text-[11px] font-semibold text-[#2B2E83] underline underline-offset-4"
                                            >
                                                View event
                                            </Link>
                                        </div>
                                    </motion.article>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* FOOTER */}
            <footer className="bg-[#1E2335] text-white pt-10 pb-12">
                <div className="mx-auto w-full max-w-[1180px] px-4 sm:px-6 lg:px-8">
                    <div className="grid gap-6 md:grid-cols-[auto_1fr] md:items-center">
                        <div className="flex items-center gap-4">
                            <SparkHubLogo className="h-8 w-auto text-white/95" />
                            <div className="text-sm opacity-80">
                                <div className="font-semibold">Online Learners’</div>
                                <div>Community</div>
                            </div>
                        </div>
                        <div className="md:justify-self-end">
                            <div className="text-center md:text-right text-sm opacity-90 mb-2">
                                Subscribe to get updates on events
                            </div>
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                }}
                                className="flex items-center gap-2"
                            >
                                <input
                                    type="email"
                                    placeholder="Your Email"
                                    className="w-60 rounded-full bg-transparent px-4 py-2 text-sm outline-none ring-1 ring-white/30 placeholder:text-white/50 focus:ring-white/60"
                                    required
                                />
                                <button
                                    type="submit"
                                    className="rounded-full bg-[#63C0B9] px-4 py-2 text-sm font-semibold text-[#1E2335] hover:brightness-110"
                                >
                                    Subscribe
                                </button>
                            </form>
                        </div>
                    </div>

                    <div className="mt-10 border-t border-white/10 pt-6 text-center text-xs opacity-80">
                        <div className="space-x-4">
                            <Link href="/privacy" className="hover:opacity-100">
                                Privacy Policy
                            </Link>
                            <span className="opacity-50">|</span>
                            <Link href="/terms" className="hover:opacity-100">
                                Terms &amp; Conditions
                            </Link>
                        </div>
                        <div className="mt-2">© SparkHub Learning Center.</div>
                    </div>
                </div>
            </footer>
        </main>
    );
}

function formatEventDate(iso?: string | null) {
    if (!iso) return "Date to be announced";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "Date to be announced";
    return date.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

/* ---------- small helpers ---------- */
function Card({
                  icon,
                  title,
                  text,
                  color,
                  bg,
              }: {
    icon: "book" | "calendar" | "users";
    title: string;
    text: string;
    color: string;
    bg: string;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.35 }}
            className="rounded-2xl bg-white p-6 shadow-[0_6px_26px_rgba(0,0,0,0.06)] ring-1 ring-black/5"
        >
            <div
                className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full"
                style={{ background: bg }}
            >
                {icon === "book" && (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path
                            d="M5 4h10a3 3 0 013 3v13H8a3 3 0 01-3-3V4z"
                            stroke={color}
                            strokeWidth="1.8"
                        />
                        <path d="M8 4v13" stroke={color} strokeWidth="1.8" />
                    </svg>
                )}
                {icon === "calendar" && (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <rect
                            x="3"
                            y="5"
                            width="18"
                            height="16"
                            rx="3"
                            stroke={color}
                            strokeWidth="1.8"
                        />
                        <path
                            d="M8 3v4M16 3v4M3 10h18"
                            stroke={color}
                            strokeWidth="1.8"
                        />
                    </svg>
                )}
                {icon === "users" && (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path
                            d="M16 11a4 4 0 10-8 0 4 4 0 008 0z"
                            stroke={color}
                            strokeWidth="1.8"
                        />
                        <path d="M3 20a7 7 0 0118 0" stroke={color} strokeWidth="1.8" />
                    </svg>
                )}
            </div>
            <h3 className="text-lg font-semibold text-[#2B2B2B]">{title}</h3>
            <p className="mt-2 text-sm text-neutral-600">{text}</p>
        </motion.div>
    );
}

function FeatureCard({
                         title,
                         btnText,
                         href,
                         image,
                         overlay,
                         buttonStyle,
                     }: {
    title: string;
    btnText: string;
    href: string;
    image?: string;
    overlay: "light" | "dark";
    buttonStyle: "outline" | "solid";
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.35 }}
            className="group relative overflow-hidden rounded-[18px] ring-1 ring-black/10 shadow-[0_10px_30px_rgba(0,0,0,0.08)]"
        >
            <div
                className="h-[280px] bg-center bg-cover"
                style={{
                    backgroundImage: image
                        ? `url(${image})`
                        : "radial-gradient(800px 300px at 10% 20%, rgba(255,255,255,0.38), rgba(0,0,0,0.25))",
                }}
            />
            <div
                className={`absolute inset-0 ${
                    overlay === "light"
                        ? "bg-[linear-gradient(0deg,rgba(0,0,0,0.28)_0%,rgba(0,0,0,0.10)_50%)]"
                        : "bg-[linear-gradient(0deg,rgba(0,0,0,0.30)_0%,rgba(0,0,0,0.15)_50%)]"
                }`}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
                <h3 className="text-white text-2xl font-extrabold tracking-wide">
                    {title}
                </h3>
                <Link
                    href={href}
                    className={`mt-5 inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm transition ${
                        buttonStyle === "outline"
                            ? "border border-white/70 text-white hover:bg-white/10"
                            : "bg-[#5FB4E5] text-white font-semibold shadow ring-1 ring-black/10 hover:brightness-110"
                    }`}
                >
                    {btnText}
                </Link>
            </div>
        </motion.div>
    );
}