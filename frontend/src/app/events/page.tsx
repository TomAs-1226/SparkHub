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
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <p className="text-sm font-semibold uppercase tracking-wide text-[#2D8F80]">SparkHub events</p>
                            <h1 className="mt-2 text-2xl font-semibold">Upcoming events</h1>
                            <p className="mt-1 text-sm text-slate-500">
                                Every event below is fetched from the real-time SparkHub API. Tap one to see full details.
                            </p>
                        </div>
                        <Link
                            href="/dashboard"
                            className="rounded-full border border-[#CFE3E0] px-4 py-2 text-sm font-semibold text-[#2B2B2B] hover:bg-slate-50"
                        >
                            Back to dashboard
                        </Link>
                    </div>

                    <div className="mt-8 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
                        <div>
                            <h2 className="text-sm font-semibold text-slate-600">All events</h2>
                            <motion.div
                                className="mt-4 space-y-3"
                                variants={{ hidden: {}, visible: { transition: STAGGER.base } }}
                                initial="hidden"
                                animate="visible"
                                viewport={{ once: true, amount: 0.35 }}
                            >
                                {loading ? (
                                    Array.from({ length: 4 }).map((_, idx) => (
                                        <div key={idx} className="h-[72px] animate-pulse rounded-2xl bg-slate-100" />
                                    ))
                                ) : events.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-600">
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
                                    ? "border-[#63C0B9] bg-[#E9F7F5]"
                                    : "border-slate-200 bg-white hover:border-[#CFE3E0]"
                            }
                        `}
                                                initial={SURFACES.lift.initial}
                                                whileInView={SURFACES.lift.animate(idx * 0.04)}
                                                viewport={{ once: true, amount: 0.5 }}
                                                whileHover={SURFACES.lift.whileHover}
                                                transition={{ duration: 0.4, ease: EASE.lift }}
                                            >
                                                <div className="text-sm font-semibold text-slate-800">{event.title}</div>
                                                <div className="mt-1 text-xs text-slate-500">
                                                    {formatEventDate(event.startsAt)} · {event.location || "Location TBD"}
                                                </div>
                                            </motion.button>
                                        );
                                    })
                                )}
                            </motion.div>
                        </div>

                        <motion.div
                            className="rounded-3xl border border-slate-100 bg-[#F9FBFF] p-6"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, ease: EASE.emphasized, delay: 0.05 }}
                        >
                            {selected ? (
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wide text-[#2D8F80]">Selected event</p>
                                        <h3 className="mt-1 text-xl font-semibold text-slate-900">{selected.title}</h3>
                                        <p className="mt-2 text-sm text-slate-600">
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
                                                setSignupStatus("You’re signed up for this event.");
                                            } catch (err) {
                                                setSignupStatus(err instanceof Error ? err.message : "Unable to RSVP.");
                                            } finally {
                                                setSigningUp(false);
                                            }
                                        }}
                                    />
                                </div>
                            ) : loading ? (
                                <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
                            ) : (
                                <div className="text-sm text-slate-600">Select an event to view its information.</div>
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
            <div className="rounded-2xl border border-dashed border-[#CFE3E0] bg-white/80 p-4 text-sm text-slate-600">
                <p className="font-semibold text-slate-900">Admin shortcut</p>
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
            <div className="rounded-2xl border border-dashed border-[#CFE3E0] bg-white/80 p-4 text-sm text-slate-600">
                <p className="font-semibold text-slate-900">Need to host something similar?</p>
                <p>Head to the publishing workspace to duplicate this format or attach new assets.</p>
                <Link
                    href="/tutors/dashboard"
                    className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#63C0B9] px-4 py-2 text-sm font-semibold text-white"
                >
                    Open workspace
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-3 rounded-2xl border border-dashed border-[#CFE3E0] bg-white/80 p-4 text-sm text-slate-600">
            <div>
                <p className="font-semibold text-slate-900">Add to your calendar</p>
                <p>Save the invite and optionally RSVP so hosts know you’re coming.</p>
            </div>
            <div className="flex flex-wrap gap-3">
                <a
                    href={calendarUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-[#CFE3E0] px-4 py-2 text-sm font-semibold text-[#2B2B2B]"
                >
                    Add to calendar
                </a>
                {userId ? (
                    <button
                        type="button"
                        onClick={onSignup}
                        disabled={signingUp}
                        className="inline-flex items-center gap-2 rounded-full bg-[#63C0B9] px-4 py-2 text-sm font-semibold text-white disabled:opacity-70"
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
            {signupStatus && <p className="text-xs text-[#2D8F80]">{signupStatus}</p>}
            <Link
                href={`/events/${event.id}`}
                className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#2D8F80]"
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
        <div className="flex items-start gap-3 rounded-2xl border border-white bg-white/80 p-4 text-sm text-slate-600">
            <div className="rounded-full bg-[#E7F6F3] p-2 text-[#2D8F80]">{icon}</div>
            <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                <p className="text-sm text-slate-800">{children}</p>
            </div>
        </div>
    );
}
