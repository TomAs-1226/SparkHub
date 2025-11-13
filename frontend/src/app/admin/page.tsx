"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { BookMarked, Briefcase, CalendarDays } from "lucide-react";

import SiteNav from "@/components/site-nav";
import { api } from "@/lib/api";

interface User {
    id: string;
    name?: string;
    role: string;
}

interface EventRow {
    id: string;
    title: string;
    startsAt?: string | null;
    location?: string | null;
}

interface ResourceRow {
    id: string;
    title: string;
    kind: string;
}

interface JobRow {
    id: string;
    title: string;
    contact: string;
}

const EVENT_DEFAULT = {
    title: "",
    location: "",
    startsAt: "",
    endsAt: "",
    capacity: "",
    description: "",
};

const RESOURCE_DEFAULT = {
    title: "",
    kind: "",
    url: "",
    summary: "",
};

const JOB_DEFAULT = {
    title: "",
    description: "",
    skills: "",
    contact: "",
    startTime: "",
    endTime: "",
};

export default function AdminPage() {
    const router = useRouter();
    const [me, setMe] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [denied, setDenied] = useState(false);
    const [statusMsg, setStatusMsg] = useState<string | null>(null);

    const [events, setEvents] = useState<EventRow[]>([]);
    const [resources, setResources] = useState<ResourceRow[]>([]);
    const [jobs, setJobs] = useState<JobRow[]>([]);

    const [eventForm, setEventForm] = useState(EVENT_DEFAULT);
    const [resourceForm, setResourceForm] = useState(RESOURCE_DEFAULT);
    const [jobForm, setJobForm] = useState(JOB_DEFAULT);

    const [saving, setSaving] = useState({ event: false, resource: false, job: false });

    useEffect(() => {
        let active = true;
        (async () => {
            const res = await api("/auth/me", { method: "GET" });
            if (res.status === 401) {
                router.push("/login?from=/admin");
                return;
            }
            const json = await safeJson(res);
            if (!json?.ok || json.user.role !== "ADMIN") {
                if (active) {
                    setDenied(true);
                    setLoading(false);
                }
                return;
            }
            if (active) {
                setMe(json.user);
                await loadData();
                setLoading(false);
            }
        })();
        return () => {
            active = false;
        };
    }, [router]);

    async function loadData() {
        const [eventRes, resourceRes, jobRes] = await Promise.all([
            api("/events", { method: "GET" }),
            api("/resources", { method: "GET" }),
            api("/jobs", { method: "GET" }),
        ]);
        const [eventJson, resourceJson, jobJson] = await Promise.all([
            safeJson(eventRes),
            safeJson(resourceRes),
            safeJson(jobRes),
        ]);
        setEvents(Array.isArray(eventJson?.list) ? eventJson.list : []);
        setResources(Array.isArray(resourceJson?.list) ? resourceJson.list : []);
        setJobs(Array.isArray(jobJson?.list) ? jobJson.list : []);
    }

    async function handleCreateEvent(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setSaving((s) => ({ ...s, event: true }));
        setStatusMsg(null);
        try {
            const res = await api("/events", {
                method: "POST",
                body: JSON.stringify({
                    title: eventForm.title,
                    location: eventForm.location,
                    startsAt: eventForm.startsAt,
                    endsAt: eventForm.endsAt,
                    capacity: eventForm.capacity ? Number(eventForm.capacity) : null,
                    description: eventForm.description,
                }),
            });
            const json = await safeJson(res);
            if (!res.ok || json?.ok === false) {
                throw new Error(json?.msg || "Unable to create event");
            }
            setEventForm(EVENT_DEFAULT);
            await loadData();
            setStatusMsg("Event created successfully.");
        } catch (err) {
            setStatusMsg(getErrorMessage(err) || "Failed to create event.");
        } finally {
            setSaving((s) => ({ ...s, event: false }));
        }
    }

    async function handleCreateResource(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setSaving((s) => ({ ...s, resource: true }));
        setStatusMsg(null);
        try {
            const res = await api("/resources", {
                method: "POST",
                body: JSON.stringify(resourceForm),
            });
            const json = await safeJson(res);
            if (!res.ok || json?.ok === false) {
                throw new Error(json?.msg || "Unable to create resource");
            }
            setResourceForm(RESOURCE_DEFAULT);
            await loadData();
            setStatusMsg("Resource published.");
        } catch (err) {
            setStatusMsg(getErrorMessage(err) || "Failed to create resource.");
        } finally {
            setSaving((s) => ({ ...s, resource: false }));
        }
    }

    async function handleCreateJob(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setSaving((s) => ({ ...s, job: true }));
        setStatusMsg(null);
        try {
            const res = await api("/jobs", {
                method: "POST",
                body: JSON.stringify({
                    title: jobForm.title,
                    description: jobForm.description,
                    skills: jobForm.skills
                        ? jobForm.skills.split(",").map((s) => s.trim()).filter(Boolean)
                        : [],
                    contact: jobForm.contact,
                    startTime: jobForm.startTime || undefined,
                    endTime: jobForm.endTime || undefined,
                }),
            });
            const json = await safeJson(res);
            if (!res.ok || json?.ok === false) {
                throw new Error(json?.msg || "Unable to create opportunity");
            }
            setJobForm(JOB_DEFAULT);
            await loadData();
            setStatusMsg("Opportunity posted.");
        } catch (err) {
            setStatusMsg(getErrorMessage(err) || "Failed to create opportunity.");
        } finally {
            setSaving((s) => ({ ...s, job: false }));
        }
    }

    if (loading) {
        return (
            <div className="min-h-dvh bg-[#F4F7FB] text-slate-800">
                <SiteNav />
                <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-10">
                    <div className="h-[400px] animate-pulse rounded-[32px] bg-white" />
                </main>
            </div>
        );
    }

    if (denied) {
        return (
            <div className="min-h-dvh bg-[#F4F7FB] text-slate-800">
                <SiteNav />
                <main className="mx-auto w-full max-w-4xl px-4 pb-16 pt-10">
                    <div className="rounded-[32px] border border-white/60 bg-white/95 p-8 text-center shadow-2xl">
                        <p className="text-sm text-slate-600">You do not have admin permissions.</p>
                        <Link
                            href="/register"
                            className="mt-4 inline-flex items-center justify-center rounded-full bg-[#63C0B9] px-5 py-2 text-sm font-semibold text-white"
                        >
                            Create an admin account
                        </Link>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-dvh bg-[#F4F7FB] text-slate-800">
            <SiteNav />
            <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-10">
                <motion.section
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45 }}
                    className="rounded-[36px] border border-white/60 bg-white/95 p-6 shadow-2xl md:p-10"
                >
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <p className="text-sm font-semibold uppercase tracking-wide text-[#2D8F80]">Admin control panel</p>
                            <h1 className="mt-2 text-2xl font-semibold">Manage events, resources, and opportunities</h1>
                            <p className="mt-1 text-sm text-slate-500">Signed in as {me?.name || "Admin"}</p>
                        </div>
                        <Link
                            href="/dashboard"
                            className="rounded-full border border-[#CFE3E0] px-4 py-2 text-sm font-semibold text-[#2B2B2B] hover:bg-slate-50"
                        >
                            Back to dashboard
                        </Link>
                    </div>

                    {statusMsg && (
                        <div className="mt-6 rounded-2xl border border-[#CFE3E0] bg-[#E9F7F5] px-4 py-3 text-sm text-slate-700">
                            {statusMsg}
                        </div>
                    )}

                    <div className="mt-8 grid gap-6 md:grid-cols-2">
                        <AdminCard title="Create event" icon={<CalendarDays className="h-5 w-5" />}>
                            <form onSubmit={handleCreateEvent} className="space-y-3 text-sm">
                                <input
                                    type="text"
                                    placeholder="Title"
                                    value={eventForm.title}
                                    onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                                    className="w-full rounded-2xl border border-slate-200 px-4 py-2"
                                    required
                                />
                                <input
                                    type="text"
                                    placeholder="Location"
                                    value={eventForm.location}
                                    onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                                    className="w-full rounded-2xl border border-slate-200 px-4 py-2"
                                    required
                                />
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <label className="text-xs font-semibold text-slate-500">
                                        Starts at
                                        <input
                                            type="datetime-local"
                                            value={eventForm.startsAt}
                                            onChange={(e) => setEventForm({ ...eventForm, startsAt: e.target.value })}
                                            className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2"
                                            required
                                        />
                                    </label>
                                    <label className="text-xs font-semibold text-slate-500">
                                        Ends at
                                        <input
                                            type="datetime-local"
                                            value={eventForm.endsAt}
                                            onChange={(e) => setEventForm({ ...eventForm, endsAt: e.target.value })}
                                            className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2"
                                            required
                                        />
                                    </label>
                                </div>
                                <input
                                    type="number"
                                    min="0"
                                    placeholder="Capacity"
                                    value={eventForm.capacity}
                                    onChange={(e) => setEventForm({ ...eventForm, capacity: e.target.value })}
                                    className="w-full rounded-2xl border border-slate-200 px-4 py-2"
                                />
                                <textarea
                                    placeholder="Description"
                                    value={eventForm.description}
                                    onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                                    className="w-full rounded-2xl border border-slate-200 px-4 py-2"
                                    rows={3}
                                />
                                <button
                                    type="submit"
                                    disabled={saving.event}
                                    className="w-full rounded-full bg-[#63C0B9] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                                >
                                    {saving.event ? "Saving..." : "Publish event"}
                                </button>
                            </form>
                        </AdminCard>

                        <AdminCard title="Add resource" icon={<BookMarked className="h-5 w-5" />}>
                            <form onSubmit={handleCreateResource} className="space-y-3 text-sm">
                                <input
                                    type="text"
                                    placeholder="Title"
                                    value={resourceForm.title}
                                    onChange={(e) => setResourceForm({ ...resourceForm, title: e.target.value })}
                                    className="w-full rounded-2xl border border-slate-200 px-4 py-2"
                                    required
                                />
                                <input
                                    type="text"
                                    placeholder="Kind (e.g. Article, Video)"
                                    value={resourceForm.kind}
                                    onChange={(e) => setResourceForm({ ...resourceForm, kind: e.target.value })}
                                    className="w-full rounded-2xl border border-slate-200 px-4 py-2"
                                    required
                                />
                                <input
                                    type="url"
                                    placeholder="URL"
                                    value={resourceForm.url}
                                    onChange={(e) => setResourceForm({ ...resourceForm, url: e.target.value })}
                                    className="w-full rounded-2xl border border-slate-200 px-4 py-2"
                                    required
                                />
                                <textarea
                                    placeholder="Summary"
                                    value={resourceForm.summary}
                                    onChange={(e) => setResourceForm({ ...resourceForm, summary: e.target.value })}
                                    className="w-full rounded-2xl border border-slate-200 px-4 py-2"
                                    rows={3}
                                />
                                <button
                                    type="submit"
                                    disabled={saving.resource}
                                    className="w-full rounded-full bg-[#63C0B9] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                                >
                                    {saving.resource ? "Saving..." : "Publish resource"}
                                </button>
                            </form>
                        </AdminCard>

                        <AdminCard title="Post opportunity" icon={<Briefcase className="h-5 w-5" />}>
                            <form onSubmit={handleCreateJob} className="space-y-3 text-sm">
                                <input
                                    type="text"
                                    placeholder="Title"
                                    value={jobForm.title}
                                    onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
                                    className="w-full rounded-2xl border border-slate-200 px-4 py-2"
                                    required
                                />
                                <textarea
                                    placeholder="Description"
                                    value={jobForm.description}
                                    onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
                                    className="w-full rounded-2xl border border-slate-200 px-4 py-2"
                                    rows={3}
                                    required
                                />
                                <input
                                    type="text"
                                    placeholder="Skills (comma separated)"
                                    value={jobForm.skills}
                                    onChange={(e) => setJobForm({ ...jobForm, skills: e.target.value })}
                                    className="w-full rounded-2xl border border-slate-200 px-4 py-2"
                                />
                                <input
                                    type="text"
                                    placeholder="Contact"
                                    value={jobForm.contact}
                                    onChange={(e) => setJobForm({ ...jobForm, contact: e.target.value })}
                                    className="w-full rounded-2xl border border-slate-200 px-4 py-2"
                                    required
                                />
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <label className="text-xs font-semibold text-slate-500">
                                        Start date
                                        <input
                                            type="datetime-local"
                                            value={jobForm.startTime}
                                            onChange={(e) => setJobForm({ ...jobForm, startTime: e.target.value })}
                                            className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2"
                                        />
                                    </label>
                                    <label className="text-xs font-semibold text-slate-500">
                                        End date
                                        <input
                                            type="datetime-local"
                                            value={jobForm.endTime}
                                            onChange={(e) => setJobForm({ ...jobForm, endTime: e.target.value })}
                                            className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2"
                                        />
                                    </label>
                                </div>
                                <button
                                    type="submit"
                                    disabled={saving.job}
                                    className="w-full rounded-full bg-[#63C0B9] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                                >
                                    {saving.job ? "Saving..." : "Publish opportunity"}
                                </button>
                            </form>
                        </AdminCard>
                    </div>

                    <div className="mt-10 grid gap-6 md:grid-cols-2">
                        <SummaryCard title="Events" items={events.map((e) => `${e.title} · ${formatShort(e.startsAt)}`)} />
                        <SummaryCard title="Resources" items={resources.map((r) => `${r.title} · ${r.kind}`)} />
                        <SummaryCard title="Opportunities" items={jobs.map((j) => `${j.title} · ${j.contact}`)} className="md:col-span-2" />
                    </div>
                </motion.section>
            </main>
        </div>
    );
}

function SummaryCard({ title, items, className = "" }: { title: string; items: string[]; className?: string }) {
    return (
        <div className={`rounded-3xl border border-slate-100 bg-[#F9FBFF] p-5 shadow-inner ${className}`}>
            <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
            {items.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">No data yet.</p>
            ) : (
                <ul className="mt-3 space-y-2 text-sm text-slate-700">
                    {items.slice(0, 5).map((item) => (
                        <li key={item} className="rounded-2xl bg-white px-4 py-2 shadow-sm">
                            {item}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function getErrorMessage(err: unknown) {
    if (err instanceof Error && err.message) return err.message;
    if (typeof err === "string") return err;
    return null;
}

function AdminCard({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
    return (
        <div className="rounded-3xl border border-slate-100 bg-white/90 p-6 shadow-xl">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <div className="rounded-full bg-[#E7F6F3] p-2 text-[#2D8F80]">{icon}</div>
                <span>{title}</span>
            </div>
            <div className="mt-4">{children}</div>
        </div>
    );
}

async function safeJson(res: Response) {
    try {
        return await res.json();
    } catch {
        return null;
    }
}

function formatShort(iso?: string | null) {
    if (!iso) return "Date TBD";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "Date TBD";
    return date.toLocaleDateString();
}
