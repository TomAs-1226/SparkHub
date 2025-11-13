"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { CalendarDays, CheckCircle2, Clock4, Globe, MapPin } from "lucide-react";

import SiteNav from "@/components/site-nav";

interface EventRow {
    id: string;
    title: string;
    location?: string | null;
    startsAt?: string | null;
    endsAt?: string | null;
    capacity?: number | null;
    description?: string | null;
}

export default function EventDetailPage({ params }: { params: { slug: string } }) {
    const eventId = params.slug;
    const [status, setStatus] = useState<"loading" | "ready" | "missing">("loading");
    const [event, setEvent] = useState<EventRow | null>(null);
    const [others, setOthers] = useState<EventRow[]>([]);

    useEffect(() => {
        let active = true;
        (async () => {
            setStatus("loading");
            try {
                const [detailRes, listRes] = await Promise.all([
                    fetch(`/api/events/${eventId}`, { cache: "no-store" }),
                    fetch("/api/events", { cache: "no-store" }),
                ]);

                const detailJson = detailRes.ok ? await detailRes.json() : null;
                const listJson = listRes.ok ? await listRes.json() : null;

                if (!active) return;

                if (detailRes.ok && detailJson?.event) {
                    setEvent(detailJson.event);
                    setStatus("ready");
                } else {
                    setEvent(null);
                    setStatus("missing");
                }

                const list = Array.isArray(listJson?.list) ? listJson.list : [];
                setOthers(list.filter((ev: EventRow) => ev.id !== eventId));
            } catch {
                if (!active) return;
                setEvent(null);
                setOthers([]);
                setStatus("missing");
            }
        })();

        return () => {
            active = false;
        };
    }, [eventId]);

    const timeRange = useMemo(() => {
        if (!event) return null;
        const start = formatEventDate(event.startsAt);
        const end = formatEventDate(event.endsAt);
        return `${start}${end ? ` → ${end}` : ""}`;
    }, [event]);

    return (
        <div className="min-h-dvh bg-[#F4F7FB] text-slate-800">
            <SiteNav />
            <div className="mx-auto flex w-full max-w-6xl items-center gap-2 px-4 pb-4 pt-10 text-sm font-semibold text-[#2D8F80]">
                <CheckCircle2 className="h-5 w-5" /> Event detail
            </div>
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-16 lg:flex-row">
                <motion.aside
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4 }}
                    className="w-full lg:w-[320px]"
                >
                    <div className="rounded-3xl border border-white/60 bg-white/90 p-6 shadow-xl shadow-slate-200/50">
                        <h3 className="text-lg font-semibold text-slate-900">Other upcoming events</h3>
                        <div className="mt-4 space-y-3">
                            {others.length === 0 ? (
                                <p className="text-sm text-slate-500">No other events are available right now.</p>
                            ) : (
                                others.slice(0, 5).map((item) => (
                                    <Link
                                        key={item.id}
                                        href={`/events/${item.id}`}
                                        className="block rounded-2xl border border-slate-100 bg-slate-50/60 p-3 text-sm hover:border-[#63C0B9]"
                                    >
                                        <div className="font-semibold text-slate-800">{item.title}</div>
                                        <div className="text-xs text-slate-500">
                                            {formatEventDate(item.startsAt)} · {item.location || "Location TBD"}
                                        </div>
                                    </Link>
                                ))
                            )}
                        </div>
                        <div className="mt-6 rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-600">
                            Events are listed exactly as they exist in the backend database. If the section above is empty, no
                            data has been published yet.
                        </div>
                    </div>
                </motion.aside>

                <motion.section
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45 }}
                    className="flex-1 rounded-3xl border border-white/60 bg-white/95 p-6 shadow-xl shadow-slate-200/50"
                >
                    {status === "loading" ? (
                        <div className="h-[360px] animate-pulse rounded-3xl bg-slate-100" />
                    ) : status === "missing" ? (
                        <div className="space-y-4 text-center text-sm text-slate-600">
                            <p>This event could not be found in the database.</p>
                            <Link
                                href="/events"
                                className="inline-flex items-center justify-center rounded-full bg-[#63C0B9] px-5 py-2 text-sm font-semibold text-white"
                            >
                                Browse events
                            </Link>
                        </div>
                    ) : event ? (
                        <div className="space-y-6">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-[#2D8F80]">SparkHub event</p>
                                <h1 className="mt-2 text-3xl font-semibold text-slate-900">{event.title}</h1>
                                <p className="mt-2 text-sm text-slate-600">
                                    {event.description || "The organizer has not provided a description yet."}
                                </p>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <InfoCard icon={<CalendarDays className="h-5 w-5" />} label="Schedule">
                                    {timeRange || "Dates to be announced"}
                                </InfoCard>
                                <InfoCard icon={<MapPin className="h-5 w-5" />} label="Location">
                                    {event.location || "Location coming soon"}
                                </InfoCard>
                                <InfoCard icon={<Clock4 className="h-5 w-5" />} label="Capacity">
                                    {event.capacity ? `${event.capacity} seats` : "Capacity not set"}
                                </InfoCard>
                                <InfoCard icon={<Globe className="h-5 w-5" />} label="Participation">
                                    Join directly through the SparkHub backend signup endpoint once registration opens.
                                </InfoCard>
                            </div>

                            <div className="rounded-2xl border border-dashed border-slate-200 bg-[#F9FBFF] p-4 text-sm text-slate-600">
                                <p className="font-semibold text-slate-900">Need to update this event?</p>
                                <p>
                                    Admins can edit or create events from the control panel. Changes are immediately reflected on
                                    this page.
                                </p>
                                <Link
                                    href="/admin"
                                    className="mt-3 inline-flex items-center justify-center rounded-full bg-[#2B2E83] px-4 py-2 text-sm font-semibold text-white"
                                >
                                    Go to admin panel
                                </Link>
                            </div>
                        </div>
                    ) : null}
                </motion.section>
            </div>
        </div>
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

function InfoCard({
    icon,
    label,
    children,
}: {
    icon: ReactNode;
    label: string;
    children: ReactNode;
}) {
    return (
        <div className="rounded-2xl border border-slate-100 bg-white p-4 text-sm text-slate-600 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {icon}
                <span>{label}</span>
            </div>
            <p className="mt-2 text-sm text-slate-800">{children}</p>
        </div>
    );
}
