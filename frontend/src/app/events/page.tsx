"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { CalendarDays, Clock4, MapPin, NotebookPen } from "lucide-react";

import SiteNav from "@/components/site-nav";
import { useCurrentUser } from "@/hooks/use-current-user";
import { api } from "@/lib/api";
import { EASE, FADES, STAGGER, SURFACES } from "@/lib/motion-presets";

interface EventRow {
    id: string;
    title: string;
    location?: string | null;
    startsAt?: string | null;
    endsAt?: string | null;
    description?: string | null;
}

export default function EventsPage() {
    const [events, setEvents] = useState<EventRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [signingUp, setSigningUp] = useState(false);
    const [signupStatus, setSignupStatus] = useState<string | null>(null);
    const { user } = useCurrentUser();

    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const res = await fetch("/api/events", { cache: "no-store" });
                const json = await res.json();
                if (!active) return;
                const list: EventRow[] = Array.isArray(json?.list) ? json.list : [];
                setEvents(list);
                setSelectedId((prev) => prev ?? list[0]?.id ?? null);
            } catch {
                if (active) setEvents([]);
            } finally {
                if (active) setLoading(false);
            }
        })();
        return () => {
            active = false;
        };
    }, []);

    const selected = useMemo(() => events.find((ev) => ev.id === selectedId) || null, [events, selectedId]);

    return (
        <div className="min-h-dvh bg-[#F4F7FB] dark:bg-slate-900 text-slate-800 dark:text-slate-100">
            <SiteNav />
            <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-10">
                <motion.section
                    variants={FADES.floatUp}
                    initial="initial"
                    animate="animate"
                    transition={{ ease: EASE.lift }}
                    className="rounded-[32px] border border-white/60 dark:border-slate-700 bg-white/95 dark:bg-slate-800/95 p-6 shadow-2xl md:p-10"
                >
                    <div className="relative overflow-hidden rounded-2xl border border-[#E8F2F1] dark:border-slate-700 bg-[#FDFEFE] dark:bg-slate-800 p-4">
                        <motion.div
                            className="pointer-events-none absolute -inset-8 rounded-[32px] bg-[radial-gradient(circle_at_15%_20%,rgba(99,192,185,0.18),transparent_32%),radial-gradient(circle_at_80%_10%,rgba(45,46,131,0.16),transparent_35%)] blur-3xl"
                            aria-hidden
                            animate={{ rotate: [0, 2, -2, 0], scale: [1, 1.02, 1.01, 1] }}
                            transition={{ duration: 14, ease: EASE.emphasized, repeat: Infinity, repeatType: "mirror" }}
                        />
                        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <p className="text-sm font-semibold uppercase tracking-wide text-[#2D8F80] dark:text-[#63C0B9]">SparkHub events</p>
                                <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">Upcoming events</h1>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                    Every event updates in real time so you can tap in for fresh details without reloading.
                                </p>
                            </div>
                            <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
                                <Link
                                    href="/dashboard"
                                    className="inline-flex rounded-full border border-[#CFE3E0] dark:border-slate-600 px-4 py-2 text-sm font-semibold text-[#2B2B2B] dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                                >
                                    Back to dashboard
                                </Link>
                            </motion.div>
                        </div>
                    </div>

                    <div className="mt-8 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
                        <div>
                            <h2 className="text-sm font-semibold text-slate-600 dark:text-slate-400">All events</h2>
                            <motion.div
                                className="mt-4 space-y-3"
                                variants={{ hidden: {}, visible: { transition: STAGGER.base } }}
                                initial="hidden"
                                animate="visible"
                                viewport={{ once: true, amount: 0.35 }}
                            >
                                {loading ? (
                                    Array.from({ length: 4 }).map((_, idx) => (
                                        <div key={idx} className="h-[72px] animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-700" />
                                    ))
                                ) : events.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-600 bg-slate-50/80 dark:bg-slate-800/70 p-4 text-sm text-slate-600 dark:text-slate-400">
                                        There are currently no events in the database.
                                    </div>
                                ) : (
                                    events.map((event, idx) => {
                                        const isActive = selectedId === event.id;
                                        return (
                                            <motion.button
                                                key={event.id}
                                                type="button"
                                                onClick={() => setSelectedId(event.id)}
                                                className={`w-full rounded-2xl border px-4 py-4 text-left transition shadow-sm
                            ${
                                isActive
                                    ? "border-[#63C0B9] bg-[#E9F7F5] dark:bg-[#63C0B9]/20"
                                    : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-[#CFE3E0] dark:hover:border-slate-600"
                            }
                        `}
                                                initial={SURFACES.lift.initial}
                                                whileInView={SURFACES.lift.animate(idx * 0.04)}
                                                viewport={{ once: true, amount: 0.5 }}
                                                whileHover={SURFACES.lift.whileHover}
                                                transition={{ duration: 0.4, ease: EASE.lift }}
                                            >
                                                <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">{event.title}</div>
                                                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                                    {formatEventDate(event.startsAt)} · {event.location || "Location TBD"}
                                                </div>
                                            </motion.button>
                                        );
                                    })
                                )}
                            </motion.div>
                        </div>

                        <motion.div
                            className="rounded-3xl border border-slate-100 dark:border-slate-700 bg-[#F9FBFF] dark:bg-slate-800 p-6"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, ease: EASE.emphasized, delay: 0.05 }}
                        >
                            {selected ? (
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wide text-[#2D8F80] dark:text-[#63C0B9]">Selected event</p>
                                        <h3 className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-100">{selected.title}</h3>
                                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                                            {selected.description || "No description has been provided for this event yet."}
                                        </p>
                                    </div>
                                    <DetailRow icon={<CalendarDays className="h-4 w-4" />} label="Date and time">
                                        {formatEventDate(selected.startsAt)}
                                    </DetailRow>
                                    <DetailRow icon={<Clock4 className="h-4 w-4" />} label="Ends">
                                        {formatEventDate(selected.endsAt)}
                                    </DetailRow>
                                    <DetailRow icon={<MapPin className="h-4 w-4" />} label="Location">
                                        {selected.location || "Location to be announced"}
                                    </DetailRow>
                                    <RoleCallout
                                        event={selected}
                                        role={user?.role}
                                        userId={user?.id}
                                        signingUp={signingUp}
                                        signupStatus={signupStatus}
                                        onSignup={async () => {
                                            if (!user) {
                                                window.location.href = "/login?from=/events";
                                                return;
                                            }
                                            setSigningUp(true);
                                            setSignupStatus(null);
                                            try {
                                                const res = await api(`/events/${selected.id}/signup`, {
                                                    method: "POST",
                                                    body: JSON.stringify({ note: "Saved from events catalog" }),
                                                });
                                                const json = await res.json();
                                                if (!res.ok || json?.ok === false) throw new Error(json?.msg || "Unable to RSVP");
                                                setSignupStatus("You're signed up for this event.");
                                            } catch (err) {
                                                setSignupStatus(err instanceof Error ? err.message : "Unable to RSVP.");
                                            } finally {
                                                setSigningUp(false);
                                            }
                                        }}
                                    />
                                </div>
                            ) : loading ? (
                                <div className="h-64 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-700" />
                            ) : (
                                <div className="text-sm text-slate-600 dark:text-slate-400">Select an event to view its information.</div>
                            )}
                        </motion.div>
                    </div>
                </motion.section>
            </main>
        </div>
    );
}

function RoleCallout({
    role,
    event,
    userId,
    signingUp,
    signupStatus,
    onSignup,
}: {
    role?: string;
    event: EventRow;
    userId?: string;
    signingUp: boolean;
    signupStatus: string | null;
    onSignup: () => Promise<void>;
}) {
    const calendarUrl = createCalendarLink(event);
    if (role === "ADMIN") {
        return (
            <div className="rounded-2xl border border-dashed border-[#CFE3E0] dark:border-slate-600 bg-white/80 dark:bg-slate-700/80 p-4 text-sm text-slate-600 dark:text-slate-400">
                <p className="font-semibold text-slate-900 dark:text-slate-100">Admin shortcut</p>
                <p>Jump into the control panel to edit, duplicate, or delete this event.</p>
                <Link
                    href={`/admin?event=${event.id}`}
                    className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#2B2E83] px-4 py-2 text-sm font-semibold text-white"
                >
                    Manage in admin
                </Link>
            </div>
        );
    }

    if (role && ["TUTOR", "CREATOR"].includes(role)) {
        return (
            <div className="rounded-2xl border border-dashed border-[#CFE3E0] dark:border-slate-600 bg-white/80 dark:bg-slate-700/80 p-4 text-sm text-slate-600 dark:text-slate-400">
                <p className="font-semibold text-slate-900 dark:text-slate-100">Need to host something similar?</p>
                <p>Head to the publishing workspace to duplicate this format or attach new assets.</p>
                <Link
                    href="/tutors/dashboard"
                    className="mt-3 inline-flex items-center gap-2 rounded-full bg-[var(--sh-accent,#63C0B9)] px-4 py-2 text-sm font-semibold text-white"
                >
                    Open workspace
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-3 rounded-2xl border border-dashed border-[#CFE3E0] dark:border-slate-600 bg-white/80 dark:bg-slate-700/80 p-4 text-sm text-slate-600 dark:text-slate-400">
            <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">Add to your calendar</p>
                <p>Save the invite and optionally RSVP so hosts know you're coming.</p>
            </div>
            <div className="flex flex-wrap gap-3">
                <a
                    href={calendarUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-[#CFE3E0] dark:border-slate-600 px-4 py-2 text-sm font-semibold text-[#2B2B2B] dark:text-slate-200"
                >
                    Add to calendar
                </a>
                {userId ? (
                    <button
                        type="button"
                        onClick={onSignup}
                        disabled={signingUp}
                        className="inline-flex items-center gap-2 rounded-full bg-[var(--sh-accent,#63C0B9)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-70"
                    >
                        {signingUp ? "Saving..." : "Save me a seat"}
                    </button>
                ) : (
                    <Link
                        href="/login?from=/events"
                        className="inline-flex items-center gap-2 rounded-full bg-[#2B2E83] px-4 py-2 text-sm font-semibold text-white"
                    >
                        Sign in to RSVP
                    </Link>
                )}
            </div>
            {signupStatus && <p className="text-xs text-[#2D8F80] dark:text-[#63C0B9]">{signupStatus}</p>}
            <Link
                href={`/events/${event.id}`}
                className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#2D8F80] dark:text-[#63C0B9]"
            >
                <NotebookPen className="h-3.5 w-3.5" /> View full details
            </Link>
        </div>
    );
}

function createCalendarLink(event: EventRow) {
    const base = new URL("https://calendar.google.com/calendar/render");
    base.searchParams.set("action", "TEMPLATE");
    base.searchParams.set("text", event.title);
    const start = toCalendarStamp(event.startsAt);
    const end = toCalendarStamp(event.endsAt || event.startsAt);
    if (start) base.searchParams.set("dates", `${start}/${end || start}`);
    if (event.description) base.searchParams.set("details", event.description);
    if (event.location) base.searchParams.set("location", event.location);
    return base.toString();
}

function toCalendarStamp(iso?: string | null) {
    if (!iso) return null;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function formatEventDate(iso?: string | null) {
    if (!iso) return "Date to be announced";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "Date to be announced";
    return date.toLocaleString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

function DetailRow({
    icon,
    label,
    children,
}: {
    icon: ReactNode;
    label: string;
    children: ReactNode;
}) {
    return (
        <div className="flex items-start gap-3 rounded-2xl border border-white dark:border-slate-700 bg-white/80 dark:bg-slate-700/80 p-4 text-sm text-slate-600 dark:text-slate-400">
            <div className="rounded-full bg-[#E7F6F3] dark:bg-slate-600 p-2 text-[#2D8F80] dark:text-[#63C0B9]">{icon}</div>
            <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
                <p className="text-sm text-slate-800 dark:text-slate-200">{children}</p>
            </div>
        </div>
    );
}
