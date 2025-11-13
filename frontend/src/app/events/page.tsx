"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { CalendarDays, Clock4, MapPin, NotebookPen } from "lucide-react";

import SiteNav from "@/components/site-nav";

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
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
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
                            <div className="mt-4 space-y-3">
                                {loading ? (
                                    Array.from({ length: 4 }).map((_, idx) => (
                                        <div key={idx} className="h-[72px] animate-pulse rounded-2xl bg-slate-100" />
                                    ))
                                ) : events.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-600">
                                        There are currently no events in the database.
                                    </div>
                                ) : (
                                    events.map((event) => {
                                        const isActive = selectedId === event.id;
                                        return (
                                            <button
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
                                            >
                                                <div className="text-sm font-semibold text-slate-800">{event.title}</div>
                                                <div className="mt-1 text-xs text-slate-500">
                                                    {formatEventDate(event.startsAt)} · {event.location || "Location TBD"}
                                                </div>
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        <div className="rounded-3xl border border-slate-100 bg-[#F9FBFF] p-6">
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
                                    <div className="rounded-2xl border border-dashed border-[#CFE3E0] bg-white/80 p-4 text-sm text-slate-600">
                                        <p className="font-semibold text-slate-900">Need more info?</p>
                                        <p>
                                            Open the detailed view to contact hosts, view notes, and sign up using the SparkHub backend.
                                        </p>
                                        <Link
                                            href={`/events/${selected.id}`}
                                            className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#63C0B9] px-4 py-2 text-sm font-semibold text-white"
                                        >
                                            <NotebookPen className="h-4 w-4" /> Open detail view
                                        </Link>
                                    </div>
                                </div>
                            ) : loading ? (
                                <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
                            ) : (
                                <div className="text-sm text-slate-600">Select an event to view its information.</div>
                            )}
                        </div>
                    </div>
                </motion.section>
            </main>
        </div>
    );
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
