"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { BookMarked, Briefcase, CalendarDays, MessageSquare, Trash2, UsersRound } from "lucide-react";

import SiteNav from "@/components/site-nav";
import { api } from "@/lib/api";
import { uploadAsset } from "@/lib/upload";
import { useCurrentUser } from "@/hooks/use-current-user";

interface EventRow {
    id: string;
    title: string;
    startsAt?: string | null;
    endsAt?: string | null;
    location?: string | null;
    description?: string | null;
    coverUrl?: string | null;
    attachments?: string[];
}

interface ResourceRow {
    id: string;
    title: string;
    kind: string;
    summary?: string | null;
    details?: string | null;
    imageUrl?: string | null;
    attachmentUrl?: string | null;
}

interface JobRow {
    id: string;
    title: string;
    description: string;
    skills?: string[];
    photos?: string[];
    files?: string[];
    contact: string;
}

interface AdminUser {
    id: string;
    name?: string | null;
    email: string;
    role: string;
    avatarUrl?: string | null;
    createdAt?: string;
}

interface FeedbackRow {
    id: string;
    topic: string;
    content: string;
    createdAt?: string;
    userId?: string | null;
}

const EVENT_DEFAULT = {
    title: "",
    location: "",
    startsAt: "",
    endsAt: "",
    capacity: "",
    description: "",
    coverUrl: "",
    attachments: [] as string[],
};

const RESOURCE_DEFAULT = {
    title: "",
    kind: "",
    url: "",
    summary: "",
    details: "",
    imageUrl: "",
    attachmentUrl: "",
};

const JOB_DEFAULT = {
    title: "",
    description: "",
    skills: "",
    contact: "",
    startTime: "",
    endTime: "",
    duration: "",
    benefits: "",
    photos: [] as string[],
    files: [] as string[],
};

export default function AdminPage() {
    const router = useRouter();
    const { user, loading: userLoading } = useCurrentUser();

    const [denied, setDenied] = useState(false);
    const [bootstrap, setBootstrap] = useState(true);
    const [statusMsg, setStatusMsg] = useState<string | null>(null);

    const [events, setEvents] = useState<EventRow[]>([]);
    const [resources, setResources] = useState<ResourceRow[]>([]);
    const [jobs, setJobs] = useState<JobRow[]>([]);
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [feedback, setFeedback] = useState<FeedbackRow[]>([]);

    const [eventForm, setEventForm] = useState(EVENT_DEFAULT);
    const [resourceForm, setResourceForm] = useState(RESOURCE_DEFAULT);
    const [jobForm, setJobForm] = useState(JOB_DEFAULT);

    const [saving, setSaving] = useState({ event: false, resource: false, job: false });

    const loadAll = useCallback(async () => {
        const [eventRes, resourceRes, jobRes, usersRes, feedbackRes] = await Promise.all([
            api("/events", { method: "GET" }),
            api("/resources", { method: "GET" }),
            api("/jobs", { method: "GET" }),
            api("/admin/users", { method: "GET" }),
            api("/feedback", { method: "GET" }),
        ]);
        const [eventJson, resourceJson, jobJson, usersJson, feedbackJson] = await Promise.all([
            safeJson(eventRes),
            safeJson(resourceRes),
            safeJson(jobRes),
            safeJson(usersRes),
            safeJson(feedbackRes),
        ]);
        return {
            events: Array.isArray(eventJson?.list) ? eventJson.list : [],
            resources: Array.isArray(resourceJson?.list) ? resourceJson.list : [],
            jobs: Array.isArray(jobJson?.list) ? jobJson.list : [],
            users: Array.isArray(usersJson?.list) ? usersJson.list : [],
            feedback: Array.isArray(feedbackJson?.list) ? feedbackJson.list : [],
        } as {
            events: EventRow[];
            resources: ResourceRow[];
            jobs: JobRow[];
            users: AdminUser[];
            feedback: FeedbackRow[];
        };
    }, []);

    useEffect(() => {
        if (userLoading) return;
        if (!user) {
            router.push("/login?from=/admin");
            return;
        }
        if (user.role !== "ADMIN") {
            setDenied(true);
            setBootstrap(false);
            return;
        }
        let active = true;
        (async () => {
            const data = await loadAll();
            if (!active) return;
            setEvents(data.events);
            setResources(data.resources);
            setJobs(data.jobs);
            setUsers(data.users);
            setFeedback(data.feedback);
            setBootstrap(false);
        })();
        return () => {
            active = false;
        };
    }, [user, userLoading, router, loadAll]);

    const dashboardStats = useMemo(
        () => [
            { label: "Events", value: events.length },
            { label: "Resources", value: resources.length },
            { label: "Opportunities", value: jobs.length },
            { label: "Users", value: users.length },
            { label: "Contacts", value: feedback.length },
        ],
        [events.length, resources.length, jobs.length, users.length, feedback.length],
    );

    const refreshAll = useCallback(async () => {
        const data = await loadAll();
        setEvents(data.events);
        setResources(data.resources);
        setJobs(data.jobs);
        setUsers(data.users);
        setFeedback(data.feedback);
    }, [loadAll]);

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
                    coverUrl: eventForm.coverUrl || undefined,
                    attachments: eventForm.attachments,
                }),
            });
            const json = await safeJson(res);
            if (!res.ok || json?.ok === false) throw new Error(json?.msg || "Unable to create event");
            setEventForm(EVENT_DEFAULT);
            await refreshAll();
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
            if (!res.ok || json?.ok === false) throw new Error(json?.msg || "Unable to create resource");
            setResourceForm(RESOURCE_DEFAULT);
            await refreshAll();
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
                    duration: jobForm.duration || undefined,
                    benefits: jobForm.benefits || undefined,
                    photos: jobForm.photos,
                    files: jobForm.files,
                }),
            });
            const json = await safeJson(res);
            if (!res.ok || json?.ok === false) throw new Error(json?.msg || "Unable to create opportunity");
            setJobForm(JOB_DEFAULT);
            await refreshAll();
            setStatusMsg("Opportunity posted.");
        } catch (err) {
            setStatusMsg(getErrorMessage(err) || "Failed to create opportunity.");
        } finally {
            setSaving((s) => ({ ...s, job: false }));
        }
    }

    async function handleDelete(path: string) {
        const res = await api(path, { method: "DELETE" });
        if (!res.ok) {
            const json = await safeJson(res);
            throw new Error(json?.msg || "Unable to delete item");
        }
        await refreshAll();
    }

    async function handleRoleChange(id: string, role: string) {
        const res = await api(`/admin/users/${id}`, {
            method: "PATCH",
            body: JSON.stringify({ role }),
        });
        if (!res.ok) {
            const json = await safeJson(res);
            throw new Error(json?.msg || "Unable to update role");
        }
        await refreshAll();
    }

    async function handleDeleteUser(id: string) {
        const res = await api(`/admin/users/${id}`, { method: "DELETE" });
        if (!res.ok) {
            const json = await safeJson(res);
            throw new Error(json?.msg || "Unable to delete user");
        }
        await refreshAll();
    }

    async function uploadFiles(fileList: FileList | null) {
        if (!fileList || fileList.length === 0) return [] as string[];
        const uploads = await Promise.all(Array.from(fileList).map((file) => uploadAsset(file)));
        return uploads;
    }

    if (bootstrap) {
        return (
            <div className="min-h-dvh bg-[#F4F7FB] text-slate-800">
                <SiteNav />
                <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-10">
                    <div className="h-[420px] animate-pulse rounded-[32px] bg-white" />
                </main>
            </div>
        );
    }

    if (denied || !user || user.role !== "ADMIN") {
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
                            <h1 className="mt-2 text-2xl font-semibold">Manage the entire SparkHub network</h1>
                            <p className="mt-1 text-sm text-slate-500">Signed in as {user?.name || "Admin"}</p>
                        </div>
                        <Link
                            href="/dashboard"
                            className="rounded-full border border-[#CFE3E0] px-4 py-2 text-sm font-semibold text-[#2B2B2B] hover:bg-slate-50"
                        >
                            Back to dashboard
                        </Link>
                    </div>

                    <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {dashboardStats.map((item) => (
                            <div key={item.label} className="rounded-3xl border border-slate-100 bg-[#F9FBFF] p-4 text-center shadow-inner">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</p>
                                <p className="mt-2 text-3xl font-bold text-[#2B2E83]">{item.value}</p>
                            </div>
                        ))}
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
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <label className="text-xs font-semibold text-slate-500">
                                        Cover photo
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="mt-1 w-full text-xs"
                                            onChange={async (e) => {
                                                const [url] = await uploadFiles(e.target.files);
                                                setEventForm((prev) => ({ ...prev, coverUrl: url || prev.coverUrl }));
                                                e.target.value = "";
                                            }}
                                        />
                                        {eventForm.coverUrl && (
                                            <span className="mt-1 block text-[11px] text-slate-500">{eventForm.coverUrl}</span>
                                        )}
                                    </label>
                                    <label className="text-xs font-semibold text-slate-500">
                                        Attach files
                                        <input
                                            type="file"
                                            multiple
                                            className="mt-1 w-full text-xs"
                                            onChange={async (e) => {
                                                const uploads = await uploadFiles(e.target.files);
                                                setEventForm((prev) => ({ ...prev, attachments: [...prev.attachments, ...uploads] }));
                                                e.target.value = "";
                                            }}
                                        />
                                        {eventForm.attachments.length > 0 && (
                                            <span className="mt-1 block text-[11px] text-slate-500">{eventForm.attachments.length} file(s) selected</span>
                                        )}
                                    </label>
                                </div>
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
                                    rows={2}
                                />
                                <textarea
                                    placeholder="Longer description"
                                    value={resourceForm.details}
                                    onChange={(e) => setResourceForm({ ...resourceForm, details: e.target.value })}
                                    className="w-full rounded-2xl border border-slate-200 px-4 py-2"
                                    rows={3}
                                />
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <label className="text-xs font-semibold text-slate-500">
                                        Preview image
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="mt-1 w-full text-xs"
                                            onChange={async (e) => {
                                                const [url] = await uploadFiles(e.target.files);
                                                setResourceForm((prev) => ({ ...prev, imageUrl: url || prev.imageUrl }));
                                                e.target.value = "";
                                            }}
                                        />
                                        {resourceForm.imageUrl && (
                                            <span className="mt-1 block text-[11px] text-slate-500">{resourceForm.imageUrl}</span>
                                        )}
                                    </label>
                                    <label className="text-xs font-semibold text-slate-500">
                                        Attachment (PDF)
                                        <input
                                            type="file"
                                            className="mt-1 w-full text-xs"
                                            onChange={async (e) => {
                                                const [url] = await uploadFiles(e.target.files);
                                                setResourceForm((prev) => ({ ...prev, attachmentUrl: url || prev.attachmentUrl }));
                                                e.target.value = "";
                                            }}
                                        />
                                        {resourceForm.attachmentUrl && (
                                            <span className="mt-1 block text-[11px] text-slate-500">{resourceForm.attachmentUrl}</span>
                                        )}
                                    </label>
                                </div>
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
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <label className="text-xs font-semibold text-slate-500">
                                        Duration
                                        <input
                                            type="text"
                                            value={jobForm.duration}
                                            onChange={(e) => setJobForm({ ...jobForm, duration: e.target.value })}
                                            className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2"
                                        />
                                    </label>
                                    <label className="text-xs font-semibold text-slate-500">
                                        Benefits
                                        <input
                                            type="text"
                                            value={jobForm.benefits}
                                            onChange={(e) => setJobForm({ ...jobForm, benefits: e.target.value })}
                                            className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2"
                                        />
                                    </label>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <label className="text-xs font-semibold text-slate-500">
                                        Photos
                                        <input
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            className="mt-1 w-full text-xs"
                                            onChange={async (e) => {
                                                const uploads = await uploadFiles(e.target.files);
                                                setJobForm((prev) => ({ ...prev, photos: [...prev.photos, ...uploads] }));
                                                e.target.value = "";
                                            }}
                                        />
                                        {jobForm.photos.length > 0 && (
                                            <span className="mt-1 block text-[11px] text-slate-500">{jobForm.photos.length} photo(s)</span>
                                        )}
                                    </label>
                                    <label className="text-xs font-semibold text-slate-500">
                                        Files
                                        <input
                                            type="file"
                                            multiple
                                            className="mt-1 w-full text-xs"
                                            onChange={async (e) => {
                                                const uploads = await uploadFiles(e.target.files);
                                                setJobForm((prev) => ({ ...prev, files: [...prev.files, ...uploads] }));
                                                e.target.value = "";
                                            }}
                                        />
                                        {jobForm.files.length > 0 && (
                                            <span className="mt-1 block text-[11px] text-slate-500">{jobForm.files.length} file(s)</span>
                                        )}
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

                    <div className="mt-10">
                        <AdminCard title="Contact inbox" icon={<MessageSquare className="h-5 w-5" />}>
                            <div className="space-y-3">
                                {feedback.length === 0 ? (
                                    <p className="text-sm text-slate-500">No messages yet. Reach out from the contact page to populate this inbox.</p>
                                ) : (
                                    feedback.slice(0, 5).map((entry) => (
                                        <div key={entry.id} className="rounded-2xl border border-slate-100 bg-[#F9FBFF] p-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-900">{entry.topic || "General"}</p>
                                                    <p className="text-xs text-slate-500">{formatTimestamp(entry.createdAt)}</p>
                                                </div>
                                                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${entry.userId ? "bg-[#E7F6F3] text-[#2D8F80]" : "bg-slate-100 text-slate-600"}`}>
                                                    {entry.userId ? "Member" : "Guest"}
                                                </span>
                                            </div>
                                            <p className="mt-2 text-sm text-slate-600 whitespace-pre-line">{entry.content}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                                <p>Every submission is stored via the /feedback API.</p>
                                <Link href="/contact" className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 font-semibold text-slate-700 hover:bg-white">
                                    Contact page
                                </Link>
                            </div>
                        </AdminCard>
                    </div>

                    <div className="mt-10 space-y-6">
                        <DataCard
                            title="Live events"
                            icon={<CalendarDays className="h-5 w-5" />}
                            rows={events.map((event) => ({
                                id: event.id,
                                title: event.title,
                                subtitle: `${formatShort(event.startsAt)} · ${event.location || "Location TBD"}`,
                                attachments: event.attachments || [],
                                link: `/events/${event.id}`,
                            }))}
                            onDelete={async (id) => {
                                try {
                                    await handleDelete(`/events/${id}`);
                                    setStatusMsg("Event removed.");
                                } catch (err) {
                                    setStatusMsg(getErrorMessage(err));
                                }
                            }}
                        />
                        <DataCard
                            title="Published resources"
                            icon={<BookMarked className="h-5 w-5" />}
                            rows={resources.map((resource) => ({
                                id: resource.id,
                                title: resource.title,
                                subtitle: resource.kind,
                                attachments: [resource.attachmentUrl].filter(Boolean) as string[],
                                link: `/resources/${resource.id}`,
                            }))}
                            onDelete={async (id) => {
                                try {
                                    await handleDelete(`/resources/${id}`);
                                    setStatusMsg("Resource removed.");
                                } catch (err) {
                                    setStatusMsg(getErrorMessage(err));
                                }
                            }}
                        />
                        <DataCard
                            title="Opportunities"
                            icon={<Briefcase className="h-5 w-5" />}
                            rows={jobs.map((job) => ({
                                id: job.id,
                                title: job.title,
                                subtitle: job.contact,
                                attachments: job.files || [],
                                link: `/opportunities/${job.id}`,
                            }))}
                            onDelete={async (id) => {
                                try {
                                    await handleDelete(`/jobs/${id}`);
                                    setStatusMsg("Opportunity removed.");
                                } catch (err) {
                                    setStatusMsg(getErrorMessage(err));
                                }
                            }}
                        />
                    </div>

                    <div className="mt-10 rounded-3xl border border-slate-100 bg-[#F9FBFF] p-6 shadow-inner">
                        <div className="flex items-center gap-3">
                            <div className="rounded-full bg-[#E7F6F3] p-3 text-[#2D8F80]">
                                <UsersRound className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold uppercase tracking-wide text-[#2D8F80]">User management</p>
                                <p className="text-sm text-slate-500">Promote admins, tutors, and remove inactive accounts.</p>
                            </div>
                        </div>
                        <div className="mt-4 overflow-x-auto">
                            <table className="w-full min-w-[480px] text-left text-sm">
                                <thead>
                                    <tr className="text-xs uppercase tracking-wide text-slate-500">
                                        <th className="px-3 py-2">Name</th>
                                        <th className="px-3 py-2">Email</th>
                                        <th className="px-3 py-2">Role</th>
                                        <th className="px-3 py-2 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.length === 0 ? (
                                        <tr>
                                            <td className="px-3 py-4 text-sm text-slate-500" colSpan={4}>
                                                No users found.
                                            </td>
                                        </tr>
                                    ) : (
                                        users.map((account) => (
                                            <tr key={account.id} className="border-t border-slate-100">
                                                <td className="px-3 py-3 font-semibold text-slate-800">{account.name || "Unknown"}</td>
                                                <td className="px-3 py-3 text-slate-500">{account.email}</td>
                                                <td className="px-3 py-3">
                                                    <select
                                                        className="rounded-full border border-slate-200 px-3 py-1 text-sm"
                                                        value={account.role}
                                                        onChange={async (e) => {
                                                            try {
                                                                await handleRoleChange(account.id, e.target.value);
                                                            } catch (err) {
                                                                setStatusMsg(getErrorMessage(err));
                                                            }
                                                        }}
                                                    >
                                                        {roleOptions.map((option) => (
                                                            <option key={option} value={option}>
                                                                {option}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="px-3 py-3 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={async () => {
                                                            try {
                                                                await handleDeleteUser(account.id);
                                                            } catch (err) {
                                                                setStatusMsg(getErrorMessage(err));
                                                            }
                                                        }}
                                                        className="inline-flex items-center gap-1 rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" /> Remove
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </motion.section>
            </main>
        </div>
    );
}

const roleOptions = ["ADMIN", "STUDENT", "CREATOR", "TUTOR", "RECRUITER"];

function DataCard({
    title,
    icon,
    rows,
    onDelete,
}: {
    title: string;
    icon: ReactNode;
    rows: { id: string; title: string; subtitle?: string; attachments?: string[]; link?: string }[];
    onDelete: (id: string) => Promise<void>;
}) {
    return (
        <div className="rounded-3xl border border-slate-100 bg-white/90 p-5 shadow-xl">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <div className="rounded-full bg-[#E7F6F3] p-2 text-[#2D8F80]">{icon}</div>
                <span>{title}</span>
            </div>
            <div className="mt-4 space-y-3">
                {rows.length === 0 ? (
                    <p className="text-sm text-slate-500">No data yet.</p>
                ) : (
                    rows.map((row) => (
                        <div key={row.id} className="rounded-2xl border border-slate-100 bg-[#F9FBFF] p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-sm font-semibold text-slate-900">{row.title}</p>
                                    {row.subtitle && <p className="text-xs text-slate-500">{row.subtitle}</p>}
                                    {row.attachments && row.attachments.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-[#2B2B2B]">
                                            {row.attachments.map((file) => (
                                                <a
                                                    key={file}
                                                    href={file}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="rounded-full bg-white px-2 py-1 font-semibold"
                                                >
                                                    Attachment
                                                </a>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    {row.link && (
                                        <Link
                                            href={row.link}
                                            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-white"
                                        >
                                            View
                                        </Link>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => onDelete(row.id).catch(() => {})}
                                        className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

function getErrorMessage(err: unknown) {
    if (err instanceof Error && err.message) return err.message;
    if (typeof err === "string") return err;
    return "Something went wrong.";
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

function formatTimestamp(iso?: string | null) {
    if (!iso) return "Just now";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "Just now";
    return date.toLocaleString();
}
