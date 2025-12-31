"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { BookMarked, Briefcase, CalendarDays } from "lucide-react";

import SiteNav from "@/components/site-nav";
import { useCurrentUser } from "@/hooks/use-current-user";
import { api } from "@/lib/api";
import { uploadAsset } from "@/lib/upload";
import { parseSkillsInput } from "@/lib/skills";

const createJobFormState = () => ({
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
});

async function safeJson(res: Response) {
    try {
        return await res.json();
    } catch {
        return null;
    }
}

export default function TutorWorkspacePage() {
    const router = useRouter();
    const { user, loading } = useCurrentUser();
    const [denied, setDenied] = useState(false);
    const [status, setStatus] = useState<string | null>(null);

    const [events, setEvents] = useState<OwnedRow[]>([]);
    const [resources, setResources] = useState<OwnedRow[]>([]);
    const [jobs, setJobs] = useState<OwnedRow[]>([]);

    const [eventForm, setEventForm] = useState({ title: "", location: "", startsAt: "", endsAt: "", description: "", coverUrl: "", attachments: [] as string[] });
    const [resourceForm, setResourceForm] = useState({ title: "", kind: "", url: "", summary: "", details: "", imageUrl: "", attachmentUrl: "", primaryFileName: "" });
    const [jobForm, setJobForm] = useState(createJobFormState);

    const [saving, setSaving] = useState({ event: false, resource: false, job: false });

    useEffect(() => {
        if (loading) return;
        if (!user) {
            router.push("/login?from=/tutors/dashboard");
            return;
        }
        if (!["TUTOR", "ADMIN", "CREATOR"].includes(user.role)) {
            setDenied(true);
            return;
        }
        let active = true;
        (async () => {
            const [eventRes, resourceRes, jobRes] = await Promise.all([
                api("/events/mine", { method: "GET" }),
                api("/resources/mine", { method: "GET" }),
                api("/jobs/mine", { method: "GET" }),
            ]);
            const [eventJson, resourceJson, jobJson] = await Promise.all([
                safeJson(eventRes),
                safeJson(resourceRes),
                safeJson(jobRes),
            ]);
            if (!active) return;
            setEvents(Array.isArray(eventJson?.list) ? (eventJson.list as OwnedRow[]) : []);
            setResources(Array.isArray(resourceJson?.list) ? (resourceJson.list as OwnedRow[]) : []);
            setJobs(Array.isArray(jobJson?.list) ? (jobJson.list as OwnedRow[]) : []);
        })();
        return () => {
            active = false;
        };
    }, [user, loading, router]);

    async function handleCreateEvent(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setSaving((s) => ({ ...s, event: true }));
        setStatus(null);
        try {
            const res = await api("/events", {
                method: "POST",
                body: JSON.stringify(eventForm),
            });
            const json = await safeJson(res);
            if (!res.ok || json?.ok === false) throw new Error(json?.msg || "Unable to create event");
            setEventForm({ title: "", location: "", startsAt: "", endsAt: "", description: "", coverUrl: "", attachments: [] });
            const refresh = await api("/events/mine", { method: "GET" });
            const data = await safeJson(refresh);
            setEvents(Array.isArray(data?.list) ? (data.list as OwnedRow[]) : []);
            setStatus("Event published to the public feed.");
        } catch (err) {
            setStatus(err instanceof Error ? err.message : "Unable to create event");
        } finally {
            setSaving((s) => ({ ...s, event: false }));
        }
    }

    const removeUpload = (field: "photos" | "files", idx: number) => {
        setJobForm((prev) => {
            const next = [...prev[field]];
            next.splice(idx, 1);
            return { ...prev, [field]: next };
        });
    };

    async function handleUpload(file: File, onSuccess: (url: string) => void) {
        try {
            const url = await uploadAsset(file);
            onSuccess(url);
        } catch (err) {
            setStatus(err instanceof Error ? err.message : "Upload failed. Please try again.");
        }
    }

    async function handleCreateResource(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setSaving((s) => ({ ...s, resource: true }));
        setStatus(null);
        try {
            if (!resourceForm.url && !resourceForm.attachmentUrl) {
                throw new Error("Upload a file or paste the resource URL before publishing.");
            }
            const { primaryFileName, ...payload } = resourceForm;
            void primaryFileName;
            const res = await api("/resources", {
                method: "POST",
                body: JSON.stringify(payload),
            });
            const json = await safeJson(res);
            if (!res.ok || json?.ok === false) throw new Error(json?.msg || "Unable to create resource");
            setResourceForm({ title: "", kind: "", url: "", summary: "", details: "", imageUrl: "", attachmentUrl: "", primaryFileName: "" });
            const refresh = await api("/resources/mine", { method: "GET" });
            const data = await safeJson(refresh);
            setResources(Array.isArray(data?.list) ? (data.list as OwnedRow[]) : []);
            setStatus("Resource submitted.");
        } catch (err) {
            setStatus(err instanceof Error ? err.message : "Unable to create resource");
        } finally {
            setSaving((s) => ({ ...s, resource: false }));
        }
    }

    async function handleCreateJob(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setSaving((s) => ({ ...s, job: true }));
        setStatus(null);
        try {
            if (jobForm.title.trim().length < 2 || jobForm.description.trim().length < 10) {
                throw new Error("Add a short title and at least two sentences of description before publishing.");
            }
            const res = await api("/jobs", {
                method: "POST",
                body: JSON.stringify({
                    title: jobForm.title,
                    description: jobForm.description,
                    skills: parseSkillsInput(jobForm.skills),
                    contact: jobForm.contact,
                    startTime: jobForm.startTime,
                    endTime: jobForm.endTime,
                    duration: jobForm.duration,
                    benefits: jobForm.benefits,
                    photos: jobForm.photos,
                    files: jobForm.files,
                }),
            });
            const json = await safeJson(res);
            if (!res.ok || json?.ok === false) throw new Error(json?.msg || "Unable to post opportunity");
            setJobForm(createJobFormState());
            const refresh = await api("/jobs/mine", { method: "GET" });
            const data = await safeJson(refresh);
            setJobs(Array.isArray(data?.list) ? (data.list as OwnedRow[]) : []);
            setStatus("Opportunity submitted.");
        } catch (err) {
            setStatus(err instanceof Error ? err.message : "Unable to post opportunity");
        } finally {
            setSaving((s) => ({ ...s, job: false }));
        }
    }

    if (denied) {
        return (
            <div className="min-h-dvh bg-[#F5F7FB] dark:bg-slate-900 text-slate-800 dark:text-slate-100">
                <SiteNav />
                <main className="mx-auto w-full max-w-3xl px-4 pb-16 pt-10">
                    <div className="rounded-[32px] border border-white/60 dark:border-slate-700 bg-white/95 dark:bg-slate-800/95 p-8 text-center shadow-2xl">
                        <p className="text-sm text-slate-600 dark:text-slate-400">Only tutors, creators, or admins can access this workspace.</p>
                        <Link href="/mentors" className="mt-4 inline-flex items-center justify-center rounded-full bg-[#63C0B9] px-5 py-2 text-sm font-semibold text-white">
                            Become a tutor
                        </Link>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-dvh bg-[#F5F7FB] dark:bg-slate-900 text-slate-800 dark:text-slate-100">
            <SiteNav />
            <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-10">
                <motion.section
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45 }}
                    className="rounded-[36px] border border-white/60 bg-white/95 p-6 shadow-2xl md:p-10"
                >
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <p className="text-sm font-semibold uppercase tracking-wide text-[#2D8F80]">Tutor workspace</p>
                            <h1 className="mt-2 text-2xl font-semibold">Add your own events and resources</h1>
                            <p className="mt-1 text-sm text-slate-500">Everything you create appears instantly on the public site.</p>
                        </div>
                        <Link href="/admin" className="rounded-full border border-[#CFE3E0] px-4 py-2 text-sm font-semibold text-[#2B2B2B] hover:bg-slate-50">
                            Need full admin?
                        </Link>
                    </div>

                    {status && (
                        <motion.div
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-4 rounded-2xl border border-[#CFE3E0] bg-[#E9F7F5] px-4 py-3 text-sm text-slate-700"
                        >
                            {status}
                        </motion.div>
                    )}

                    <div className="mt-8 grid gap-6 md:grid-cols-2">
                        <TutorCard title="Quick event" icon={<CalendarDays className="h-5 w-5" />}>
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
                                    <input
                                        type="datetime-local"
                                        value={eventForm.startsAt}
                                        onChange={(e) => setEventForm({ ...eventForm, startsAt: e.target.value })}
                                        className="w-full rounded-2xl border border-slate-200 px-3 py-2"
                                        required
                                    />
                                    <input
                                        type="datetime-local"
                                        value={eventForm.endsAt}
                                        onChange={(e) => setEventForm({ ...eventForm, endsAt: e.target.value })}
                                        className="w-full rounded-2xl border border-slate-200 px-3 py-2"
                                        required
                                    />
                                </div>
                                <textarea
                                    placeholder="Description"
                                    value={eventForm.description}
                                    onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                                    className="w-full rounded-2xl border border-slate-200 px-4 py-2"
                                    rows={2}
                                />
                                <label className="text-xs font-semibold text-slate-500">
                                    Cover photo
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="mt-1 w-full text-xs"
                                        onChange={async (e) => {
                                            if (e.target.files && e.target.files[0]) {
                                                await handleUpload(e.target.files[0], (url) => setEventForm((prev) => ({ ...prev, coverUrl: url })));
                                                e.target.value = "";
                                            }
                                        }}
                                    />
                                </label>
                                <label className="text-xs font-semibold text-slate-500">
                                    Attachments
                                    <input
                                        type="file"
                                        multiple
                                        className="mt-1 w-full text-xs"
                                        onChange={async (e) => {
                                            if (e.target.files && e.target.files.length > 0) {
                                                const uploads: string[] = [];
                                                for (const file of Array.from(e.target.files)) {
                                                    await handleUpload(file, (url) => uploads.push(url));
                                                }
                                                if (uploads.length > 0) {
                                                    setEventForm((prev) => ({ ...prev, attachments: [...prev.attachments, ...uploads] }));
                                                }
                                                e.target.value = "";
                                            }
                                        }}
                                    />
                                </label>
                                <button
                                    type="submit"
                                    disabled={saving.event}
                                    className="w-full rounded-full bg-[#63C0B9] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                                >
                                    {saving.event ? "Saving..." : "Publish event"}
                                </button>
                            </form>
                        </TutorCard>

                        <TutorCard title="Resource" icon={<BookMarked className="h-5 w-5" />}>
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
                                    placeholder="Kind"
                                    value={resourceForm.kind}
                                    onChange={(e) => setResourceForm({ ...resourceForm, kind: e.target.value })}
                                    className="w-full rounded-2xl border border-slate-200 px-4 py-2"
                                    required
                                />
                                <input
                                    type="url"
                                    placeholder="External URL (optional if uploading)"
                                    value={resourceForm.url}
                                    onChange={(e) => setResourceForm({ ...resourceForm, url: e.target.value })}
                                    className="w-full rounded-2xl border border-slate-200 px-4 py-2"
                                />
                                <label className="text-xs font-semibold text-slate-500">
                                    Upload main resource
                                    <input
                                        type="file"
                                        className="mt-1 w-full text-xs"
                                        onChange={async (e) => {
                                            if (e.target.files && e.target.files[0]) {
                                                const file = e.target.files[0];
                                                await handleUpload(file, (url) =>
                                                    setResourceForm((prev) => ({ ...prev, url, primaryFileName: file.name || prev.primaryFileName }))
                                                );
                                                e.target.value = "";
                                            }
                                        }}
                                    />
                                    <span className="mt-1 block text-[11px] text-slate-500">This becomes the primary link when no external URL is provided.</span>
                                    {resourceForm.primaryFileName && (
                                        <span className="mt-1 block text-[11px] text-slate-600">{resourceForm.primaryFileName}</span>
                                    )}
                                </label>
                                <textarea
                                    placeholder="Summary"
                                    value={resourceForm.summary}
                                    onChange={(e) => setResourceForm({ ...resourceForm, summary: e.target.value })}
                                    className="w-full rounded-2xl border border-slate-200 px-4 py-2"
                                    rows={2}
                                />
                                <textarea
                                    placeholder="Details"
                                    value={resourceForm.details}
                                    onChange={(e) => setResourceForm({ ...resourceForm, details: e.target.value })}
                                    className="w-full rounded-2xl border border-slate-200 px-4 py-2"
                                    rows={2}
                                />
                                <label className="text-xs font-semibold text-slate-500">
                                    Cover photo
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="mt-1 w-full text-xs"
                                        onChange={async (e) => {
                                            if (e.target.files && e.target.files[0]) {
                                                await handleUpload(e.target.files[0], (url) => setResourceForm((prev) => ({ ...prev, imageUrl: url })));
                                                e.target.value = "";
                                            }
                                        }}
                                    />
                                </label>
                                <label className="text-xs font-semibold text-slate-500">
                                    Attachment
                                    <input
                                        type="file"
                                        className="mt-1 w-full text-xs"
                                        onChange={async (e) => {
                                            if (e.target.files && e.target.files[0]) {
                                                await handleUpload(e.target.files[0], (url) => setResourceForm((prev) => ({ ...prev, attachmentUrl: url })));
                                                e.target.value = "";
                                            }
                                        }}
                                    />
                                </label>
                                <button
                                    type="submit"
                                    disabled={saving.resource}
                                    className="w-full rounded-full bg-[#63C0B9] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                                >
                                    {saving.resource ? "Saving..." : "Publish resource"}
                                </button>
                            </form>
                        </TutorCard>

                        <TutorCard title="Opportunity" icon={<Briefcase className="h-5 w-5" />}>
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
                                    rows={2}
                                    required
                                />
                                <div className="grid gap-3 md:grid-cols-2">
                                    <label className="text-xs font-semibold text-slate-500">
                                        Starts
                                        <input
                                            type="date"
                                            value={jobForm.startTime}
                                            onChange={(e) => setJobForm({ ...jobForm, startTime: e.target.value })}
                                            className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2"
                                        />
                                    </label>
                                    <label className="text-xs font-semibold text-slate-500">
                                        Ends
                                        <input
                                            type="date"
                                            value={jobForm.endTime}
                                            onChange={(e) => setJobForm({ ...jobForm, endTime: e.target.value })}
                                            className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2"
                                        />
                                    </label>
                                </div>
                                <div className="grid gap-3 md:grid-cols-2">
                                    <input
                                        type="text"
                                        placeholder="Duration (e.g., 10 weeks, 3 months)"
                                        value={jobForm.duration}
                                        onChange={(e) => setJobForm({ ...jobForm, duration: e.target.value })}
                                        className="w-full rounded-2xl border border-slate-200 px-4 py-2"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Perks or benefits (optional)"
                                        value={jobForm.benefits}
                                        onChange={(e) => setJobForm({ ...jobForm, benefits: e.target.value })}
                                        className="w-full rounded-2xl border border-slate-200 px-4 py-2"
                                    />
                                </div>
                                <label className="text-xs font-semibold text-slate-500">
                                    Skills
                                    <input
                                        type="text"
                                        placeholder="Python, Robotics, Mentorship"
                                        value={jobForm.skills}
                                        onChange={(e) => setJobForm({ ...jobForm, skills: e.target.value })}
                                        className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2"
                                    />
                                    <span className="mt-1 block text-[11px] font-normal text-slate-400">
                                        Separate each skill with a comma.
                                    </span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="Contact"
                                    value={jobForm.contact}
                                    onChange={(e) => setJobForm({ ...jobForm, contact: e.target.value })}
                                    className="w-full rounded-2xl border border-slate-200 px-4 py-2"
                                    required
                                />
                                <label className="text-xs font-semibold text-slate-500">
                                    Photos
                                    <input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        className="mt-1 w-full text-xs"
                                        onChange={async (e) => {
                                            if (e.target.files) {
                                                const uploads: string[] = [];
                                                for (const file of Array.from(e.target.files)) {
                                                    await handleUpload(file, (url) => uploads.push(url));
                                                }
                                                if (uploads.length > 0) {
                                                    setJobForm((prev) => ({ ...prev, photos: [...prev.photos, ...uploads] }));
                                                }
                                                e.target.value = "";
                                            }
                                        }}
                                    />
                                    {jobForm.photos.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {jobForm.photos.map((photo, idx) => (
                                                <span
                                                    key={`${photo}-${idx}`}
                                                    className="inline-flex items-center gap-2 rounded-full border border-[#CFE3E0] px-3 py-1 text-xs font-semibold text-[#2B2B2B]"
                                                >
                                                    {attachmentLabel(photo)}
                                                    <button
                                                        type="button"
                                                        onClick={() => removeUpload("photos", idx)}
                                                        className="text-slate-400 hover:text-[#2D8F80]"
                                                    >
                                                        ×
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </label>
                                <label className="text-xs font-semibold text-slate-500">
                                    Files
                                    <input
                                        type="file"
                                        multiple
                                        className="mt-1 w-full text-xs"
                                        onChange={async (e) => {
                                            if (e.target.files) {
                                                const uploads: string[] = [];
                                                for (const file of Array.from(e.target.files)) {
                                                    await handleUpload(file, (url) => uploads.push(url));
                                                }
                                                if (uploads.length > 0) {
                                                    setJobForm((prev) => ({ ...prev, files: [...prev.files, ...uploads] }));
                                                }
                                                e.target.value = "";
                                            }
                                        }}
                                    />
                                    {jobForm.files.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {jobForm.files.map((file, idx) => (
                                                <span
                                                    key={`${file}-${idx}`}
                                                    className="inline-flex items-center gap-2 rounded-full border border-[#CFE3E0] px-3 py-1 text-xs font-semibold text-[#2B2B2B]"
                                                >
                                                    {attachmentLabel(file)}
                                                    <button
                                                        type="button"
                                                        onClick={() => removeUpload("files", idx)}
                                                        className="text-slate-400 hover:text-[#2D8F80]"
                                                    >
                                                        ×
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </label>
                                <button
                                    type="submit"
                                    disabled={saving.job}
                                    className="w-full rounded-full bg-[#63C0B9] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                                >
                                    {saving.job ? "Saving..." : "Publish opportunity"}
                                </button>
                            </form>
                        </TutorCard>
                    </div>

                    <div className="mt-10 grid gap-6 md:grid-cols-2">
                        <SummaryCard title="Your events" items={events} linkPrefix="/events/" />
                        <SummaryCard title="Your resources" items={resources} linkPrefix="/resources/" />
                        <SummaryCard title="Your opportunities" items={jobs} linkPrefix="/opportunities/" className="md:col-span-2" />
                    </div>
                </motion.section>
            </main>
        </div>
    );
}

type OwnedRow = {
    id: string;
    title?: string;
};

function attachmentLabel(path?: string | null, fallback = "Attachment") {
    if (!path) return fallback;
    try {
        const url = new URL(path, typeof window === "undefined" ? "http://localhost" : window.location.origin);
        const parts = url.pathname.split("/").filter(Boolean);
        return parts.pop() || fallback;
    } catch {
        const pieces = path.split("/").filter(Boolean);
        return pieces.pop() || fallback;
    }
}

function TutorCard({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
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

function SummaryCard({ title, items, linkPrefix, className = "" }: { title: string; items: OwnedRow[]; linkPrefix: string; className?: string }) {
    return (
        <div className={`rounded-3xl border border-slate-100 bg-[#F9FBFF] p-5 shadow-inner ${className}`}>
            <p className="text-sm font-semibold text-slate-700">{title}</p>
            {items.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">No entries yet.</p>
            ) : (
                <ul className="mt-3 space-y-2 text-sm text-slate-700">
                    {items.map((item) => (
                        <li key={item.id} className="rounded-2xl bg-white px-4 py-2 shadow-sm">
                            <Link href={`${linkPrefix}${item.id}`} className="font-semibold text-[#2B2E83] hover:underline">
                                {item.title || "Untitled"}
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
