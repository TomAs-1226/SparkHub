"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
    Calendar,
    GraduationCap,
    BriefcaseBusiness,
    BookOpen,
    Video,
    Clock,
    ExternalLink,
    Users,
    ShieldCheck,
} from "lucide-react";

import { api } from "@/lib/api";
import DashboardCard from "@/components/DashboardCard";

// ---------- types that match your backend responses ----------
type User = {
    id: string;
    email: string;
    name?: string;
    role: string;
};

type EventRow = {
    id: string;
    title: string;
    location: string;
    startsAt: string; // ISO
    endsAt: string;   // ISO
    capacity?: number | null;
    description?: string | null;
};

type SessionRow = {
    id: string;
    startsAt: string;
    endsAt: string;
    status: string;
    note?: string | null;
    meetingUrl?: string | null;

    // if the viewer is TUTOR, backend includes { student: {...} }
    student?: {
        id: string;
        name?: string;
        email: string;
    };

    // if the viewer is STUDENT, backend includes { tutor: {...} }
    tutor?: {
        id: string;
        bio: string;
        subjectsCsv?: string;
        userId: string;
    };
};

type JobRow = {
    id: string;
    title: string;
    description: string;
    skills?: string[];
    photos?: string[];
    contact: string;
    startTime?: string | null;
    endTime?: string | null;
    duration?: string | null;
    benefits?: string | null;
};

type ResourceRow = {
    id: string;
    title: string;
    kind: string;
    url: string;
    summary?: string | null;
};

// ---------- utility helpers ----------
function fmtDateShort(iso: string | undefined) {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

// safe JSON parse just like login/register use
async function safeJson(res: Response) {
    try {
        return await res.json();
    } catch {
        return null;
    }
}

// ---------- main dashboard component ----------
export default function DashboardPage() {
    const router = useRouter();

    // state
    const [loading, setLoading] = useState(true);

    const [me, setMe] = useState<User | null>(null);
    const [events, setEvents] = useState<EventRow[]>([]);
    const [sessions, setSessions] = useState<SessionRow[]>([]);
    const [jobs, setJobs] = useState<JobRow[]>([]);
    const [resources, setResources] = useState<ResourceRow[]>([]);

    const [errMsg, setErrMsg] = useState<string | null>(null);

    // load data from backend API (which is already proxied via /api/... in next.config.ts)
    useEffect(() => {
        let cancelled = false;

        (async () => {
            // 1. who am I
            const meRes = await api("/auth/me", { method: "GET" });
            if (meRes.status === 401) {
                // not logged in -> go login
                router.push("/login");
                return;
            }

            const meJson = await safeJson(meRes);
            if (!meJson?.ok) {
                setErrMsg("Unable to load user.");
                setLoading(false);
                return;
            }

            const user: User = meJson.user;
            if (!cancelled) setMe(user);

            // 2. parallel fetch everything else
            const [evRes, sessRes, jobRes, resRes] = await Promise.all([
                api("/events", { method: "GET" }),
                api("/tutors/sessions/mine", { method: "GET" }),
                api("/jobs", { method: "GET" }),
                api("/resources", { method: "GET" }),
            ]);

            const [evJson, sessJson, jobJson, resJson] = await Promise.all([
                safeJson(evRes),
                safeJson(sessRes),
                safeJson(jobRes),
                safeJson(resRes),
            ]);

            if (!cancelled) {
                setEvents(evJson?.list || []);
                setSessions(sessJson?.list || []);
                setJobs(jobJson?.list || []);
                setResources(resJson?.list || []);
                setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [router]);

    // quick counts for hero badges
    const upcomingEventCount = events.length;
    const activeSessionCount = sessions.length;

    // skeleton shimmer block
    const Skeleton = ({ className = "" }: { className?: string }) => (
        <div
            className={
                "animate-pulse rounded-[12px] bg-slate-200/50 " + className
            }
        />
    );

    // ---------- RENDER ----------
    return (
        <main className="min-h-dvh flex justify-center px-4 sm:px-6 lg:px-8 py-8 text-slate-800 bg-white">
            <div className="w-full max-w-[1280px]">
                {/* HERO / WELCOME PANEL */}
                <motion.section
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="
                        relative overflow-hidden rounded-[24px]
                        border border-[#CFE3E0]/60
                        bg-[radial-gradient(circle_at_20%_20%,#E7F7F5_0%,#F8FBFC_60%)]
                        shadow-[0_2px_24px_rgba(0,0,0,0.06)]
                        ring-1 ring-black/5
                        px-6 py-6 sm:px-8 sm:py-8
                    "
                >
                    {/* soft gradient blobs */}
                    <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-[#63C0B9]/20 blur-[60px]" />
                    <div className="pointer-events-none absolute bottom-[-40px] left-[-40px] h-48 w-48 rounded-full bg-[#5FB4E5]/20 blur-[60px]" />

                    <div className="relative flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                        <div className="flex-1">
                            <h1 className="text-[20px] sm:text-[22px] font-semibold text-[#1f2e2d] leading-tight">
                                {loading
                                    ? "Loading your dashboard…"
                                    : `Welcome${
                                        me?.name ? `, ${me.name}` : ""
                                    } 👋`}
                            </h1>

                            <p className="mt-2 max-w-[600px] text-[14px] leading-relaxed text-slate-600">
                                Track sessions, events, opportunities, and
                                resources — all in one place. SparkHub keeps you
                                moving.
                            </p>

                            {/* Quick actions row */}
                            <div className="mt-5 flex flex-wrap gap-2 text-[13px] font-medium">
                                <QuickAction
                                    href="/courses"
                                    icon={<GraduationCap size={16} />}
                                    label="Browse Courses"
                                />
                                <QuickAction
                                    href="/tutors"
                                    icon={<Users size={16} />}
                                    label="Find a Tutor"
                                />
                                <QuickAction
                                    href="/events"
                                    icon={<Calendar size={16} />}
                                    label="Events"
                                />
                                <QuickAction
                                    href="/opportunities"
                                    icon={<BriefcaseBusiness size={16} />}
                                    label="Opportunities"
                                />
                                <QuickAction
                                    href="/resources"
                                    icon={<BookOpen size={16} />}
                                    label="Resources"
                                />
                            </div>
                        </div>

                        {/* animated mini-stats badges */}
                        <div className="grid grid-cols-2 gap-3 min-w-[200px] max-w-[260px] text-[12px]">
                            <StatBubble
                                icon={<Calendar size={16} />}
                                label="Upcoming events"
                                value={
                                    loading
                                        ? "—"
                                        : upcomingEventCount.toString()
                                }
                                delay={0.4}
                                accent="#5FB4E5"
                            />
                            <StatBubble
                                icon={<Clock size={16} />}
                                label="Your sessions"
                                value={
                                    loading
                                        ? "—"
                                        : activeSessionCount.toString()
                                }
                                delay={0.5}
                                accent="#63C0B9"
                            />
                        </div>
                    </div>
                </motion.section>

                {/* ERROR MESSAGE */}
                {errMsg ? (
                    <div className="mt-4 rounded-[12px] bg-red-50 text-[13px] text-red-700 ring-1 ring-red-200 px-4 py-3">
                        {errMsg}
                    </div>
                ) : null}

                {/* MAIN GRID CONTENT */}
                <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {me?.role === "ADMIN" && (
                        <DashboardCard
                            title="Admin tools"
                            icon={<ShieldCheck size={16} />}
                            className="md:col-span-2 xl:col-span-3"
                        >
                            <p>
                                Publish events, resources, and opportunities using the admin control panel. Any change is
                                reflected instantly across the site.
                            </p>
                            <div className="mt-3">
                                <Link
                                    href="/admin"
                                    className="inline-flex items-center rounded-full bg-[#63C0B9] px-4 py-2 text-sm font-semibold text-white"
                                >
                                    Open admin panel
                                </Link>
                            </div>
                        </DashboardCard>
                    )}
                    {/* Sessions */}
                    <DashboardCard
                        title="Your tutoring sessions"
                        icon={<Clock size={16} />}
                    >
                        {loading ? (
                            <div className="space-y-3">
                                <Skeleton className="h-[40px]" />
                                <Skeleton className="h-[40px]" />
                            </div>
                        ) : sessions.length === 0 ? (
                            <p className="text-slate-500 text-[13px]">
                                No sessions scheduled yet.{" "}
                                <Link
                                    href="/tutors"
                                    className="text-[#5FB4E5] underline underline-offset-2 hover:brightness-110"
                                >
                                    Book a tutor
                                </Link>
                                .
                            </p>
                        ) : (
                            <ul className="space-y-4">
                                {sessions.slice(0, 4).map((s) => {
                                    const partnerName = s.student?.name
                                        ? `with ${s.student.name}`
                                        : s.tutor
                                            ? "with tutor"
                                            : "";
                                    return (
                                        <li
                                            key={s.id}
                                            className="rounded-[12px] border border-slate-200/60 bg-white p-3 text-[13px] leading-relaxed shadow-[0_2px_10px_rgba(0,0,0,0.03)]"
                                        >
                                            <div className="flex flex-col">
                                                <div className="font-medium text-slate-800 flex items-center gap-2">
                                                    <Video
                                                        size={14}
                                                        className="shrink-0 text-[#5FB4E5]"
                                                    />
                                                    <span>
                                                        {fmtDateShort(
                                                            s.startsAt
                                                        )}
                                                    </span>
                                                </div>
                                                <div className="text-slate-600">
                                                    {partnerName} ·{" "}
                                                    {s.status || "PENDING"}
                                                </div>
                                                {s.meetingUrl ? (
                                                    <div className="mt-1">
                                                        <a
                                                            className="inline-flex items-center gap-1 text-[#5FB4E5] hover:brightness-110 underline underline-offset-2"
                                                            href={s.meetingUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                        >
                                                            Join call
                                                            <ExternalLink
                                                                size={12}
                                                            />
                                                        </a>
                                                    </div>
                                                ) : null}
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </DashboardCard>

                    {/* Events */}
                    <DashboardCard
                        title="Upcoming events"
                        icon={<Calendar size={16} />}
                    >
                        {loading ? (
                            <div className="space-y-3">
                                <Skeleton className="h-[40px]" />
                                <Skeleton className="h-[40px]" />
                            </div>
                        ) : events.length === 0 ? (
                            <p className="text-slate-500 text-[13px]">
                                No events yet. Check back soon.
                            </p>
                        ) : (
                            <ul className="space-y-4">
                                {events.slice(0, 4).map((ev) => (
                                    <li
                                        key={ev.id}
                                        className="rounded-[12px] border border-slate-200/60 bg-white p-3 text-[13px] leading-relaxed shadow-[0_2px_10px_rgba(0,0,0,0.03)]"
                                    >
                                        <div className="font-medium text-slate-800">
                                            {ev.title}
                                        </div>
                                        <div className="text-slate-600">
                                            {fmtDateShort(ev.startsAt)} ·{" "}
                                            {ev.location}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}

                        <div className="mt-4 text-right">
                            <Link
                                href="/events"
                                className="text-[12px] font-medium text-[#5FB4E5] underline underline-offset-2 hover:brightness-110"
                            >
                                View all events →
                            </Link>
                        </div>
                    </DashboardCard>

                    {/* Jobs / Opportunities */}
                    <DashboardCard
                        title="Opportunities for you"
                        icon={<BriefcaseBusiness size={16} />}
                    >
                        {loading ? (
                            <div className="space-y-3">
                                <Skeleton className="h-[40px]" />
                                <Skeleton className="h-[40px]" />
                            </div>
                        ) : jobs.length === 0 ? (
                            <p className="text-slate-500 text-[13px]">
                                No active postings.
                            </p>
                        ) : (
                            <ul className="space-y-4">
                                {jobs.slice(0, 4).map((job) => (
                                    <li
                                        key={job.id}
                                        className="rounded-[12px] border border-slate-200/60 bg-white p-3 text-[13px] leading-relaxed shadow-[0_2px_10px_rgba(0,0,0,0.03)]"
                                    >
                                        <div className="font-medium text-slate-800">
                                            {job.title}
                                        </div>
                                        {job.skills && job.skills.length > 0 ? (
                                            <div className="mt-1 flex flex-wrap gap-1 text-[11px] text-slate-600">
                                                {job.skills.slice(0, 4).map(
                                                    (skill, i) => (
                                                        <span
                                                            key={i}
                                                            className="rounded-full border border-[#CFE3E0] bg-white/70 px-2 py-[2px] text-[11px] font-medium text-[#2B2B2B]"
                                                        >
                                                            {skill}
                                                        </span>
                                                    )
                                                )}
                                                {job.skills.length > 4 ? (
                                                    <span className="text-slate-500">
                                                        +{job.skills.length - 4}
                                                    </span>
                                                ) : null}
                                            </div>
                                        ) : null}
                                        <div className="mt-1 text-slate-600 line-clamp-2">
                                            {job.description}
                                        </div>
                                        <div className="mt-1 text-[11px] text-slate-500">
                                            Contact: {job.contact}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}

                        <div className="mt-4 text-right">
                            <Link
                                href="/opportunities"
                                className="text-[12px] font-medium text-[#5FB4E5] underline underline-offset-2 hover:brightness-110"
                            >
                                View all opportunities →
                            </Link>
                        </div>
                    </DashboardCard>

                    {/* Learning Resources */}
                    <DashboardCard
                        title="New resources"
                        icon={<BookOpen size={16} />}
                        className="md:col-span-2 xl:col-span-1"
                    >
                        {loading ? (
                            <div className="space-y-3">
                                <Skeleton className="h-[40px]" />
                                <Skeleton className="h-[40px]" />
                            </div>
                        ) : resources.length === 0 ? (
                            <p className="text-slate-500 text-[13px]">
                                Nothing posted yet. Come back later.
                            </p>
                        ) : (
                            <ul className="space-y-4">
                                {resources.slice(0, 4).map((r) => (
                                    <li
                                        key={r.id}
                                        className="rounded-[12px] border border-slate-200/60 bg-white p-3 text-[13px] leading-relaxed shadow-[0_2px_10px_rgba(0,0,0,0.03)]"
                                    >
                                        <div className="font-medium text-slate-800 flex items-start justify-between gap-2">
                                            <span className="flex-1">
                                                {r.title}
                                            </span>
                                            <span className="rounded-full border border-[#CFE3E0] bg-white/70 px-2 py-[2px] text-[10px] font-medium text-[#2B2B2B] whitespace-nowrap">
                                                {r.kind}
                                            </span>
                                        </div>
                                        {r.summary ? (
                                            <div className="mt-1 text-slate-600 line-clamp-2">
                                                {r.summary}
                                            </div>
                                        ) : null}
                                        <div className="mt-2 text-[12px]">
                                            <a
                                                href={r.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 text-[#5FB4E5] font-medium underline underline-offset-2 hover:brightness-110"
                                            >
                                                Open resource
                                                <ExternalLink size={12} />
                                            </a>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}

                        <div className="mt-4 text-right">
                            <Link
                                href="/resources"
                                className="text-[12px] font-medium text-[#5FB4E5] underline underline-offset-2 hover:brightness-110"
                            >
                                Browse all resources →
                            </Link>
                        </div>
                    </DashboardCard>
                </div>
            </div>
        </main>
    );
}

// small pill-style CTA buttons in hero
function QuickAction(props: { href: string; icon: React.ReactNode; label: string }) {
    const { href, icon, label } = props;
    return (
        <Link
            href={href}
            className="
                inline-flex items-center gap-1.5 rounded-full
                border border-[#CFE3E0] bg-white/70 px-3 py-1.5
                text-[#2B2B2B] shadow-[0_2px_8px_rgba(0,0,0,0.04)]
                hover:bg-white hover:brightness-110 transition
            "
        >
            <span className="text-[#5FB4E5]">{icon}</span>
            <span>{label}</span>
        </Link>
    );
}

// little stat badge cards in hero (upcoming events, sessions)
function StatBubble(props: {
    icon: React.ReactNode;
    label: string;
    value: string;
    delay?: number;
    accent?: string;
}) {
    const { icon, label, value, delay = 0, accent = "#5FB4E5" } = props;

    return (
        <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
                duration: 0.4,
                ease: "easeOut",
                delay,
            }}
            className="
                relative overflow-hidden rounded-[16px]
                border border-[#CFE3E0]/60 bg-white/80
                shadow-[0_8px_24px_rgba(0,0,0,0.07)]
                ring-1 ring-black/5
                p-3
            "
        >
            {/* subtle accent glow */}
            <div
                className="pointer-events-none absolute -top-6 -right-6 h-16 w-16 rounded-full blur-[40px]"
                style={{ backgroundColor: accent + "33" /* ~20% alpha */ }}
            />
            <div className="flex items-start gap-2 relative">
                <div
                    className="flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-medium ring-1 ring-black/5"
                    style={{
                        backgroundColor: accent + "1A", // ~10% alpha
                        color: "#1f2e2d",
                    }}
                >
                    {icon}
                </div>
                <div className="flex-1 leading-tight">
                    <div className="text-[11px] font-medium text-slate-600">
                        {label}
                    </div>
                    <div className="text-[15px] font-semibold text-slate-800">
                        {value}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}