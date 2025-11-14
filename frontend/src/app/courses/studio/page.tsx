"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { BookOpenCheck, CalendarDays, ClipboardList, Copy, ShieldCheck, UploadCloud, UsersRound } from "lucide-react";

import SiteNav from "@/components/site-nav";
import { useCurrentUser } from "@/hooks/use-current-user";
import { api } from "@/lib/api";
import { uploadAsset } from "@/lib/upload";

const MANAGER_ROLES = new Set(["ADMIN", "TUTOR", "CREATOR"]);

interface CourseSummary {
    id: string;
    title: string;
    summary?: string | null;
    coverUrl?: string | null;
    isPublished?: boolean;
}

interface CourseSession {
    id: string;
    startsAt: string;
    endsAt?: string | null;
    location?: string | null;
    mode?: string | null;
    note?: string | null;
}

interface CourseMaterial {
    id: string;
    title: string;
    description?: string | null;
    attachmentUrl?: string | null;
    coverUrl?: string | null;
    visibility: string;
    createdAt: string;
}

interface AssignmentSubmission {
    id: string;
    status: string;
    grade?: string | null;
    feedback?: string | null;
    submittedAt: string;
    student?: { id: string; name?: string | null; email?: string | null; avatarUrl?: string | null } | null;
}

interface CourseAssignment {
    id: string;
    title: string;
    description?: string | null;
    dueAt?: string | null;
    resources?: string[];
    attachments?: string[];
    stats?: { submissions: number };
    submissions?: AssignmentSubmission[];
}

interface CourseDetail extends CourseSummary {
    sessions: CourseSession[];
    materials: CourseMaterial[];
    assignments: CourseAssignment[];
    joinCode?: string;
}

interface EnrollmentRecord {
    id: string;
    status: string;
    createdAt: string;
    joinedViaCode: boolean;
    adminNote?: string | null;
    formAnswers: Record<string, string>;
    user?: { id: string; name?: string | null; email?: string | null; role?: string | null; avatarUrl?: string | null } | null;
}

export default function CourseStudioPage() {
    const router = useRouter();
    const { user, loading } = useCurrentUser();
    const canManage = !!user && MANAGER_ROLES.has(user.role);

    const [courses, setCourses] = useState<CourseSummary[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [detail, setDetail] = useState<CourseDetail | null>(null);
    const [enrollments, setEnrollments] = useState<EnrollmentRecord[]>([]);
    const [status, setStatus] = useState<string | null>(null);
    const [busy, setBusy] = useState({ course: false, session: false, assignment: false, material: false, roster: false });

    const [courseForm, setCourseForm] = useState({ title: "", summary: "", coverUrl: "", isPublished: true });
    const [sessionForm, setSessionForm] = useState({ startsAt: "", endsAt: "", location: "", mode: "Virtual", note: "" });
    const [assignmentForm, setAssignmentForm] = useState({ title: "", description: "", dueAt: "", resources: "", attachments: [] as string[] });
    const [materialForm, setMaterialForm] = useState({ title: "", description: "", coverUrl: "", attachmentUrl: "", visibleTo: "ENROLLED" });

    useEffect(() => {
        if (!loading && !user) {
            router.replace("/login?from=/courses/studio");
        }
    }, [loading, user, router]);

    useEffect(() => {
        if (!canManage) return;
        let active = true;
        (async () => {
            const res = await api("/courses/mine", { method: "GET" });
            const json = await res.json();
            if (!active) return;
            const list = Array.isArray(json?.list) ? json.list : [];
            setCourses(list);
            if (!selectedId && list.length > 0) {
                const firstId = list[0].id;
                setSelectedId(firstId);
                await loadDetail(firstId);
            }
        })().catch((err) => setStatus(err instanceof Error ? err.message : "Unable to load courses."));
        return () => {
            active = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canManage]);

    async function loadDetail(courseId: string) {
        try {
            const res = await api(`/courses/${courseId}`, { method: "GET" });
            const json = await res.json();
            if (!res.ok || json?.ok === false) throw new Error(json?.msg || "Unable to load course");
            setDetail(json.course as CourseDetail);
            setEnrollments(Array.isArray(json.enrollments) ? (json.enrollments as EnrollmentRecord[]) : []);
        } catch (err) {
            setDetail(null);
            setStatus(err instanceof Error ? err.message : "Unable to load course detail");
        }
    }

    async function handleCreateCourse(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setBusy((prev) => ({ ...prev, course: true }));
        try {
            const res = await api("/courses", { method: "POST", body: JSON.stringify(courseForm) });
            const json = await res.json();
            if (!res.ok || json?.ok === false) throw new Error(json?.msg || "Unable to create course");
            setStatus("Course created");
            setCourseForm({ title: "", summary: "", coverUrl: "", isPublished: true });
            await refreshCourses(json.course.id);
        } catch (err) {
            setStatus(err instanceof Error ? err.message : "Unable to create course");
        } finally {
            setBusy((prev) => ({ ...prev, course: false }));
        }
    }

    async function refreshCourses(focusId?: string) {
        const res = await api("/courses/mine", { method: "GET" });
        const json = await res.json();
        const list = Array.isArray(json?.list) ? json.list : [];
        setCourses(list);
        const nextId = focusId || list[0]?.id || null;
        if (nextId) {
            setSelectedId(nextId);
            await loadDetail(nextId);
        }
    }

    async function handleAddSession(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!detail) return;
        setBusy((prev) => ({ ...prev, session: true }));
        try {
            const res = await api(`/courses/${detail.id}/sessions`, { method: "POST", body: JSON.stringify(sessionForm) });
            const json = await res.json();
            if (!res.ok || json?.ok === false) throw new Error(json?.msg || "Unable to add session");
            setSessionForm({ startsAt: "", endsAt: "", location: "", mode: "Virtual", note: "" });
            await loadDetail(detail.id);
        } catch (err) {
            setStatus(err instanceof Error ? err.message : "Unable to add session");
        } finally {
            setBusy((prev) => ({ ...prev, session: false }));
        }
    }

    async function handleAddAssignment(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!detail) return;
        setBusy((prev) => ({ ...prev, assignment: true }));
        try {
            const payload = {
                title: assignmentForm.title,
                description: assignmentForm.description,
                dueAt: assignmentForm.dueAt || undefined,
                resources: assignmentForm.resources
                    ? assignmentForm.resources.split(",").map((item) => item.trim()).filter(Boolean)
                    : [],
                attachments: assignmentForm.attachments,
            };
            const res = await api(`/courses/${detail.id}/assignments`, { method: "POST", body: JSON.stringify(payload) });
            const json = await res.json();
            if (!res.ok || json?.ok === false) throw new Error(json?.msg || "Unable to add assignment");
            setAssignmentForm({ title: "", description: "", dueAt: "", resources: "", attachments: [] });
            await loadDetail(detail.id);
        } catch (err) {
            setStatus(err instanceof Error ? err.message : "Unable to add assignment");
        } finally {
            setBusy((prev) => ({ ...prev, assignment: false }));
        }
    }

    async function handleAddMaterial(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!detail) return;
        setBusy((prev) => ({ ...prev, material: true }));
        try {
            const res = await api(`/courses/${detail.id}/materials`, {
                method: "POST",
                body: JSON.stringify(materialForm),
            });
            const json = await res.json();
            if (!res.ok || json?.ok === false) throw new Error(json?.msg || "Unable to add material");
            setMaterialForm({ title: "", description: "", coverUrl: "", attachmentUrl: "", visibleTo: "ENROLLED" });
            await loadDetail(detail.id);
        } catch (err) {
            setStatus(err instanceof Error ? err.message : "Unable to add material");
        } finally {
            setBusy((prev) => ({ ...prev, material: false }));
        }
    }

    async function handleEnrollmentDecision(enrollmentId: string, nextStatus: "APPROVED" | "REJECTED") {
        if (!detail) return;
        setBusy((prev) => ({ ...prev, roster: true }));
        try {
            const res = await api(`/courses/${detail.id}/enrollments/${enrollmentId}`, {
                method: "PATCH",
                body: JSON.stringify({ status: nextStatus }),
            });
            const json = await res.json();
            if (!res.ok || json?.ok === false) throw new Error(json?.msg || "Unable to update enrollment");
            setEnrollments(Array.isArray(json.enrollments) ? (json.enrollments as EnrollmentRecord[]) : []);
            setDetail(json.course as CourseDetail);
        } catch (err) {
            setStatus(err instanceof Error ? err.message : "Unable to update enrollment");
        } finally {
            setBusy((prev) => ({ ...prev, roster: false }));
        }
    }

    async function handleRegenerateJoinCode() {
        if (!detail) return;
        try {
            const res = await api(`/courses/${detail.id}`, {
                method: "PATCH",
                body: JSON.stringify({ regenerateJoinCode: true }),
            });
            const json = await res.json();
            if (!res.ok || json?.ok === false) throw new Error(json?.msg || "Unable to refresh code");
            await loadDetail(detail.id);
            setStatus("Join code refreshed");
        } catch (err) {
            setStatus(err instanceof Error ? err.message : "Unable to refresh join code");
        }
    }

    async function copyJoinCode() {
        if (!detail?.joinCode) return;
        try {
            await navigator.clipboard.writeText(detail.joinCode);
            setStatus("Join code copied to clipboard");
        } catch {
            setStatus("Unable to copy join code");
        }
    }

    async function handleAttachmentUpload(files: FileList | null, setter: (urls: string[]) => void) {
        if (!files || files.length === 0) return;
        const uploads: string[] = [];
        for (const file of Array.from(files)) {
            const url = await uploadAsset(file);
            uploads.push(url);
        }
        setter(uploads);
    }

    if (!canManage) {
        return (
            <div className="min-h-dvh bg-[#F4F7FB] text-slate-800">
                <SiteNav />
                <main className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 py-16 text-center">
                    <ShieldCheck className="h-12 w-12 text-[#2B2E83]" />
                    <h1 className="text-2xl font-semibold">Course studio</h1>
                    <p className="text-sm text-slate-600">
                        {loading
                            ? "Checking your permissions..."
                            : "Only admins, tutors, and creators can access the course studio."}
                    </p>
                    {!loading && (
                        <Link
                            href="/courses"
                            className="rounded-full bg-[#2B2E83] px-6 py-2 text-sm font-semibold text-white"
                        >
                            Back to courses
                        </Link>
                    )}
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-dvh bg-[#F4F7FB] text-slate-800">
            <SiteNav />
            <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-10">
                <motion.section
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="rounded-[32px] border border-white/70 bg-white/95 p-6 shadow-2xl md:p-10"
                >
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-[#2D8F80]">Course studio</p>
                            <h1 className="mt-2 text-3xl font-semibold">Build and run your lessons</h1>
                            <p className="mt-1 text-sm text-slate-500">
                                Create courses, manage join codes, approve enrollments, and drop assignments from one workspace.
                            </p>
                        </div>
                        <Link
                            href="/courses"
                            className="inline-flex items-center gap-2 rounded-full border border-[#CFE3E0] px-5 py-2 text-sm font-semibold text-[#2B2B2B]"
                        >
                            View public catalog
                            <BookOpenCheck className="h-4 w-4" />
                        </Link>
                    </div>

                    {status && (
                        <div className="mt-6 rounded-2xl border border-[#E2D9FF] bg-[#F7F3FF] px-4 py-3 text-sm text-[#4B2E83]">
                            {status}
                        </div>
                    )}

                    <div className="mt-10 grid gap-6 lg:grid-cols-[280px,1fr]">
                        <aside className="space-y-6 rounded-3xl border border-slate-100 bg-[#F9FBFF] p-4">
                            <div>
                                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    <span>Your courses</span>
                                    <span>{courses.length}</span>
                                </div>
                                <div className="mt-3 space-y-2">
                                    {courses.length === 0 ? (
                                        <p className="text-sm text-slate-500">No courses yet.</p>
                                    ) : (
                                        courses.map((course) => (
                                            <button
                                                key={course.id}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedId(course.id);
                                                    loadDetail(course.id);
                                                }}
                                                className={`w-full rounded-2xl border px-3 py-2 text-left text-sm font-semibold transition ${
                                                    selectedId === course.id
                                                        ? "border-[#2B2E83] bg-[#EEF0FF] text-[#2B2E83]"
                                                        : "border-transparent bg-white text-slate-600 shadow-sm"
                                                }`}
                                            >
                                                {course.title}
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>

                            <form onSubmit={handleCreateCourse} className="space-y-3 rounded-2xl border border-dashed border-slate-200 bg-white/80 p-3 text-sm">
                                <h2 className="text-base font-semibold text-slate-800">Launch a new course</h2>
                                <input
                                    type="text"
                                    placeholder="Course title"
                                    value={courseForm.title}
                                    onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                                    className="w-full rounded-2xl border border-slate-200 px-3 py-2"
                                    required
                                />
                                <textarea
                                    placeholder="One-line summary"
                                    value={courseForm.summary}
                                    onChange={(e) => setCourseForm({ ...courseForm, summary: e.target.value })}
                                    className="w-full rounded-2xl border border-slate-200 px-3 py-2"
                                    rows={2}
                                />
                                <label className="text-xs font-semibold text-slate-500">
                                    Cover image
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="mt-1 w-full text-xs"
                                        onChange={async (event) => {
                                            const file = event.target.files?.[0];
                                            if (!file) return;
                                            const url = await uploadAsset(file);
                                            setCourseForm((prev) => ({ ...prev, coverUrl: url }));
                                            event.target.value = "";
                                        }}
                                    />
                                </label>
                                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                                    <input
                                        type="checkbox"
                                        checked={courseForm.isPublished}
                                        onChange={(e) => setCourseForm({ ...courseForm, isPublished: e.target.checked })}
                                        className="h-4 w-4 rounded border-slate-300"
                                    />
                                    Publish immediately
                                </label>
                                <button
                                    type="submit"
                                    disabled={busy.course}
                                    className="w-full rounded-full bg-[#2B2E83] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                                >
                                    {busy.course ? "Saving..." : "Create course"}
                                </button>
                            </form>
                        </aside>

                        <div className="space-y-8" id="builder">
                            {detail ? (
                                <>
                                    <div className="rounded-3xl border border-slate-100 bg-white p-5">
                                        <div className="flex flex-wrap items-center justify-between gap-4">
                                            <div>
                                                <p className="text-xs font-semibold uppercase tracking-wide text-[#2D8F80]">{detail.isPublished ? "Published" : "Draft"}</p>
                                                <h2 className="text-2xl font-semibold text-slate-900">{detail.title}</h2>
                                                <p className="mt-1 text-sm text-slate-600">{detail.summary || "No summary provided yet."}</p>
                                            </div>
                                            <div className="rounded-2xl border border-slate-100 bg-[#F8FAFF] px-4 py-3 text-sm">
                                                <p className="text-xs font-semibold text-slate-500">Join code</p>
                                                <div className="mt-1 flex items-center gap-3 text-lg font-bold tracking-widest text-[#2B2E83]">
                                                    <span>{detail.joinCode || "------"}</span>
                                                    <button
                                                        type="button"
                                                        onClick={copyJoinCode}
                                                        className="rounded-full border border-slate-200 p-1 text-slate-500 hover:text-slate-900"
                                                    >
                                                        <Copy className="h-4 w-4" />
                                                    </button>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={handleRegenerateJoinCode}
                                                    className="mt-2 text-xs font-semibold text-[#2B2E83]"
                                                >
                                                    Regenerate code
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid gap-6 lg:grid-cols-2" id="assignments">
                                        <div className="rounded-3xl border border-slate-100 bg-white p-5">
                                            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                                <CalendarDays className="h-5 w-5 text-[#2D8F80]" />
                                                Schedule sessions
                                            </div>
                                            <form onSubmit={handleAddSession} className="mt-4 space-y-3 text-sm">
                                                <label className="block text-xs font-semibold text-slate-500">
                                                    Starts at
                                                    <input
                                                        type="datetime-local"
                                                        value={sessionForm.startsAt}
                                                        onChange={(e) => setSessionForm({ ...sessionForm, startsAt: e.target.value })}
                                                        className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2"
                                                        required
                                                    />
                                                </label>
                                                <label className="block text-xs font-semibold text-slate-500">
                                                    Ends at
                                                    <input
                                                        type="datetime-local"
                                                        value={sessionForm.endsAt}
                                                        onChange={(e) => setSessionForm({ ...sessionForm, endsAt: e.target.value })}
                                                        className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2"
                                                    />
                                                </label>
                                                <div className="grid gap-3 sm:grid-cols-2">
                                                    <input
                                                        type="text"
                                                        placeholder="Location or link"
                                                        value={sessionForm.location}
                                                        onChange={(e) => setSessionForm({ ...sessionForm, location: e.target.value })}
                                                        className="w-full rounded-2xl border border-slate-200 px-3 py-2"
                                                    />
                                                    <input
                                                        type="text"
                                                        placeholder="Mode"
                                                        value={sessionForm.mode}
                                                        onChange={(e) => setSessionForm({ ...sessionForm, mode: e.target.value })}
                                                        className="w-full rounded-2xl border border-slate-200 px-3 py-2"
                                                    />
                                                </div>
                                                <textarea
                                                    placeholder="Notes"
                                                    value={sessionForm.note}
                                                    onChange={(e) => setSessionForm({ ...sessionForm, note: e.target.value })}
                                                    className="w-full rounded-2xl border border-slate-200 px-3 py-2"
                                                    rows={2}
                                                />
                                                <button
                                                    type="submit"
                                                    disabled={busy.session}
                                                    className="w-full rounded-full bg-[#2D8F80] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                                                >
                                                    {busy.session ? "Saving..." : "Add session"}
                                                </button>
                                            </form>
                                            <div className="mt-4 space-y-3">
                                                {detail.sessions.length === 0 ? (
                                                    <p className="text-xs text-slate-500">No sessions yet.</p>
                                                ) : (
                                                    detail.sessions.map((session) => (
                                                        <div key={session.id} className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs">
                                                            <p className="font-semibold text-slate-700">{formatDate(session.startsAt)}</p>
                                                            <p className="text-slate-500">
                                                                {session.location || "Virtual"} · {session.mode || "Live"}
                                                            </p>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>

                                        <div className="rounded-3xl border border-slate-100 bg-white p-5">
                                            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                                <ClipboardList className="h-5 w-5 text-[#2B2E83]" />
                                                Assign work
                                            </div>
                                            <form onSubmit={handleAddAssignment} className="mt-4 space-y-3 text-sm">
                                                <input
                                                    type="text"
                                                    placeholder="Assignment title"
                                                    value={assignmentForm.title}
                                                    onChange={(e) => setAssignmentForm({ ...assignmentForm, title: e.target.value })}
                                                    className="w-full rounded-2xl border border-slate-200 px-3 py-2"
                                                    required
                                                />
                                                <textarea
                                                    placeholder="Instructions"
                                                    value={assignmentForm.description}
                                                    onChange={(e) => setAssignmentForm({ ...assignmentForm, description: e.target.value })}
                                                    className="w-full rounded-2xl border border-slate-200 px-3 py-2"
                                                    rows={3}
                                                />
                                                <label className="block text-xs font-semibold text-slate-500">
                                                    Due date
                                                    <input
                                                        type="datetime-local"
                                                        value={assignmentForm.dueAt}
                                                        onChange={(e) => setAssignmentForm({ ...assignmentForm, dueAt: e.target.value })}
                                                        className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2"
                                                    />
                                                </label>
                                                <label className="block text-xs font-semibold text-slate-500">
                                                    Resource links (comma separated)
                                                    <input
                                                        type="text"
                                                        value={assignmentForm.resources}
                                                        onChange={(e) => setAssignmentForm({ ...assignmentForm, resources: e.target.value })}
                                                        className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2"
                                                    />
                                                </label>
                                                <label className="block text-xs font-semibold text-slate-500">
                                                    Upload handout
                                                    <input
                                                        type="file"
                                                        className="mt-1 w-full text-xs"
                                                        onChange={async (event) => {
                                                            await handleAttachmentUpload(event.target.files, (urls) =>
                                                                setAssignmentForm((prev) => ({ ...prev, attachments: [...prev.attachments, ...urls] }))
                                                            );
                                                            if (event.target) event.target.value = "";
                                                        }}
                                                    />
                                                </label>
                                                {assignmentForm.attachments.length > 0 && (
                                                    <ul className="text-xs text-slate-500">
                                                        {assignmentForm.attachments.map((url) => (
                                                            <li key={url} className="truncate">{url}</li>
                                                        ))}
                                                    </ul>
                                                )}
                                                <button
                                                    type="submit"
                                                    disabled={busy.assignment}
                                                    className="w-full rounded-full bg-[#2B2E83] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                                                >
                                                    {busy.assignment ? "Posting..." : "Add assignment"}
                                                </button>
                                            </form>
                                            <div className="mt-4 space-y-3">
                                                {detail.assignments.length === 0 ? (
                                                    <p className="text-xs text-slate-500">No assignments yet.</p>
                                                ) : (
                                                    detail.assignments.map((assignment) => (
                                                        <div key={assignment.id} className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs">
                                                            <p className="font-semibold text-slate-700">{assignment.title}</p>
                                                            <p className="text-slate-500">
                                                                Due {assignment.dueAt ? formatDate(assignment.dueAt) : "TBA"} · {assignment.stats?.submissions || 0} submissions
                                                            </p>
                                                            {assignment.submissions && assignment.submissions.length > 0 && (
                                                                <div className="mt-2 space-y-1">
                                                                    {assignment.submissions.slice(0, 2).map((submission) => (
                                                                        <div key={submission.id} className="rounded-xl bg-white px-2 py-1">
                                                                            <p className="font-semibold text-slate-700">
                                                                                {submission.student?.name || submission.student?.email || "Student"}
                                                                            </p>
                                                                            <p className="text-[11px] text-slate-500">
                                                                                {submission.status} · {submission.grade || "Ungraded"}
                                                                            </p>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid gap-6 lg:grid-cols-2" id="catalog">
                                        <div className="rounded-3xl border border-slate-100 bg-white p-5">
                                            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                                <UploadCloud className="h-5 w-5 text-[#2D8F80]" />
                                                Course materials
                                            </div>
                                            <form onSubmit={handleAddMaterial} className="mt-4 space-y-3 text-sm">
                                                <input
                                                    type="text"
                                                    placeholder="Title"
                                                    value={materialForm.title}
                                                    onChange={(e) => setMaterialForm({ ...materialForm, title: e.target.value })}
                                                    className="w-full rounded-2xl border border-slate-200 px-3 py-2"
                                                    required
                                                />
                                                <textarea
                                                    placeholder="Description"
                                                    value={materialForm.description}
                                                    onChange={(e) => setMaterialForm({ ...materialForm, description: e.target.value })}
                                                    className="w-full rounded-2xl border border-slate-200 px-3 py-2"
                                                    rows={2}
                                                />
                                                <div className="grid gap-3 sm:grid-cols-2">
                                                    <label className="text-xs font-semibold text-slate-500">
                                                        Cover image
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            className="mt-1 w-full text-xs"
                                                            onChange={async (event) => {
                                                                const file = event.target.files?.[0];
                                                                if (!file) return;
                                                                const url = await uploadAsset(file);
                                                                setMaterialForm((prev) => ({ ...prev, coverUrl: url }));
                                                                event.target.value = "";
                                                            }}
                                                        />
                                                    </label>
                                                    <label className="text-xs font-semibold text-slate-500">
                                                        Attachment
                                                        <input
                                                            type="file"
                                                            className="mt-1 w-full text-xs"
                                                            onChange={async (event) => {
                                                                const file = event.target.files?.[0];
                                                                if (!file) return;
                                                                const url = await uploadAsset(file);
                                                                setMaterialForm((prev) => ({ ...prev, attachmentUrl: url }));
                                                                event.target.value = "";
                                                            }}
                                                        />
                                                    </label>
                                                </div>
                                                <label className="text-xs font-semibold text-slate-500">
                                                    Visibility
                                                    <select
                                                        value={materialForm.visibleTo}
                                                        onChange={(e) => setMaterialForm({ ...materialForm, visibleTo: e.target.value })}
                                                        className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2"
                                                    >
                                                        <option value="PUBLIC">Public</option>
                                                        <option value="ENROLLED">Enrolled only</option>
                                                        <option value="STAFF">Staff only</option>
                                                    </select>
                                                </label>
                                                <button
                                                    type="submit"
                                                    disabled={busy.material}
                                                    className="w-full rounded-full bg-[#2D8F80] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                                                >
                                                    {busy.material ? "Saving..." : "Add material"}
                                                </button>
                                            </form>
                                            <div className="mt-4 space-y-3">
                                                {detail.materials.length === 0 ? (
                                                    <p className="text-xs text-slate-500">No materials yet.</p>
                                                ) : (
                                                    detail.materials.map((material) => (
                                                        <div key={material.id} className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs">
                                                            <p className="font-semibold text-slate-700">{material.title}</p>
                                                            <p className="text-slate-500">Visible to {material.visibility}</p>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>

                                        <div className="rounded-3xl border border-slate-100 bg-white p-5" id="roster">
                                            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                                <UsersRound className="h-5 w-5 text-[#2B2E83]" />
                                                Enrollment requests
                                            </div>
                                            <p className="mt-2 text-xs text-slate-500">
                                                Students without a join code remain pending until you approve them.
                                            </p>
                                            <div className="mt-4 space-y-3">
                                                {enrollments.length === 0 ? (
                                                    <p className="text-xs text-slate-500">No enrollment activity yet.</p>
                                                ) : (
                                                    enrollments.map((enrollment) => (
                                                        <div key={enrollment.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-xs">
                                                            <div className="flex items-center justify-between">
                                                                <div>
                                                                    <p className="font-semibold text-slate-700">{enrollment.user?.name || enrollment.user?.email || "Student"}</p>
                                                                    <p className="text-slate-500">{enrollment.status}</p>
                                                                </div>
                                                                <div className="flex gap-2">
                                                                    <button
                                                                        type="button"
                                                                        disabled={busy.roster}
                                                                        onClick={() => handleEnrollmentDecision(enrollment.id, "APPROVED")}
                                                                        className="rounded-full border border-[#2D8F80] px-3 py-1 text-[11px] font-semibold text-[#2D8F80] disabled:opacity-60"
                                                                    >
                                                                        Approve
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        disabled={busy.roster}
                                                                        onClick={() => handleEnrollmentDecision(enrollment.id, "REJECTED")}
                                                                        className="rounded-full border border-[#E29578] px-3 py-1 text-[11px] font-semibold text-[#B9502A] disabled:opacity-60"
                                                                    >
                                                                        Reject
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            {Object.keys(enrollment.formAnswers || {}).length > 0 && (
                                                                <div className="mt-2 space-y-1">
                                                                    {Object.entries(enrollment.formAnswers).map(([key, value]) => (
                                                                        <p key={key} className="text-[11px] text-slate-500">
                                                                            <span className="font-semibold text-slate-700">{key}:</span> {value}
                                                                        </p>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="rounded-3xl border border-dashed border-slate-200 bg-white/70 p-5 text-sm text-slate-500">
                                    Select or create a course to begin.
                                </div>
                            )}
                        </div>
                    </div>
                </motion.section>
            </main>
        </div>
    );
}

function formatDate(iso?: string | null) {
    if (!iso) return "TBA";
    const date = new Date(iso);
    return date.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}
