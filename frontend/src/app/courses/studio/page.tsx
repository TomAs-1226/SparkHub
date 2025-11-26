"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { BookOpenCheck, CalendarDays, ClipboardList, Copy, Link2, ShieldCheck, UploadCloud, UsersRound, Video } from "lucide-react";

import SiteNav from "@/components/site-nav";
import { useCurrentUser } from "@/hooks/use-current-user";
import { api } from "@/lib/api";
import { copyToClipboard } from "@/lib/copy-to-clipboard";
import { uploadAsset } from "@/lib/upload";

const MANAGER_ROLES = new Set(["ADMIN", "TUTOR", "CREATOR"]);

interface CourseSummary {
    id: string;
    title: string;
    summary?: string | null;
    coverUrl?: string | null;
    isPublished?: boolean;
    tags?: CourseTag[];
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

interface CourseLesson {
    id: string;
    title: string;
    type: string;
    body?: string | null;
    attachmentUrl?: string | null;
    contentType?: string | null;
}

interface CourseMeetingLink {
    id: string;
    title: string;
    url: string;
    note?: string | null;
}

interface CourseTag {
    label: string;
    slug: string;
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
    lessons: CourseLesson[];
    meetingLinks: CourseMeetingLink[];
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
    const [busy, setBusy] = useState({
        course: false,
        session: false,
        assignment: false,
        material: false,
        roster: false,
        lesson: false,
        meeting: false,
        tags: false,
    });

    const [courseForm, setCourseForm] = useState({ title: "", summary: "", coverUrl: "", isPublished: true, tags: "" });
    const [sessionForm, setSessionForm] = useState({ startsAt: "", endsAt: "", location: "", mode: "Virtual", note: "" });
    const [assignmentForm, setAssignmentForm] = useState({ title: "", description: "", dueAt: "", resources: "", attachments: [] as string[] });
    const [materialForm, setMaterialForm] = useState({
        title: "",
        description: "",
        coverUrl: "",
        attachmentUrl: "",
        visibleTo: "ENROLLED",
        inlineViewer: false,
    });
    const [lessonForm, setLessonForm] = useState({ title: "", type: "DECK", body: "", videoUrl: "", attachmentUrl: "", contentType: "" });
    const [meetingForm, setMeetingForm] = useState({ title: "", url: "", note: "" });
    const [tagDraft, setTagDraft] = useState("");
    const [tagList, setTagList] = useState<CourseTag[]>([]);

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
            setTagList(Array.isArray(json.course?.tags) ? (json.course.tags as CourseTag[]) : []);
        } catch (err) {
            setDetail(null);
            setStatus(err instanceof Error ? err.message : "Unable to load course detail");
        }
    }

    async function handleCreateCourse(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setBusy((prev) => ({ ...prev, course: true }));
        try {
            const tags = courseForm.tags
                ? courseForm.tags
                      .split(",")
                      .map((tag) => tag.trim())
                      .filter(Boolean)
                : [];
            const res = await api("/courses", { method: "POST", body: JSON.stringify({ ...courseForm, tags }) });
            const json = await res.json();
            if (!res.ok || json?.ok === false) throw new Error(json?.msg || "Unable to create course");
            setStatus("Course created");
            setCourseForm({ title: "", summary: "", coverUrl: "", isPublished: true, tags: "" });
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

    function slugifyLabel(label: string) {
        return label
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
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
            setMaterialForm({ title: "", description: "", coverUrl: "", attachmentUrl: "", visibleTo: "ENROLLED", inlineViewer: false });
            await loadDetail(detail.id);
        } catch (err) {
            setStatus(err instanceof Error ? err.message : "Unable to add material");
        } finally {
            setBusy((prev) => ({ ...prev, material: false }));
        }
    }

    async function handleAddLesson(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!detail) return;
        if (!lessonForm.attachmentUrl && !lessonForm.videoUrl && !lessonForm.body) {
            setStatus("Upload slides, add a video link, or include notes before saving.");
            return;
        }
        setBusy((prev) => ({ ...prev, lesson: true }));
        try {
            const payload = {
                title: lessonForm.title,
                type: lessonForm.type || "DECK",
                body: lessonForm.body,
                videoUrl: lessonForm.videoUrl,
                attachmentUrl: lessonForm.attachmentUrl || undefined,
                contentUrl: lessonForm.attachmentUrl || undefined,
                contentType: lessonForm.contentType || undefined,
            };
            const res = await api(`/courses/${detail.id}/lessons`, { method: "POST", body: JSON.stringify(payload) });
            const json = await res.json();
            if (!res.ok || json?.ok === false) throw new Error(json?.msg || "Unable to add lesson");
            setLessonForm({ title: "", type: "DECK", body: "", videoUrl: "", attachmentUrl: "", contentType: "" });
            await loadDetail(detail.id);
        } catch (err) {
            setStatus(err instanceof Error ? err.message : "Unable to add lesson");
        } finally {
            setBusy((prev) => ({ ...prev, lesson: false }));
        }
    }

    function detectLessonMime(file: File) {
        if (file.type) return file.type;
        const ext = file.name?.split('.').pop()?.toLowerCase();
        if (!ext) return "";
        if (ext === "ppt" || ext === "pps") return "application/vnd.ms-powerpoint";
        if (ext === "pptx" || ext === "ppsx") return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
        if (ext === "pdf") return "application/pdf";
        return "";
    }

    async function handleLessonFileUpload(fileList: FileList | null) {
        if (!fileList || fileList.length === 0) return;
        const file = fileList[0];
        try {
            const url = await uploadAsset(file);
            const detectedType = detectLessonMime(file);
            setLessonForm((prev) => ({ ...prev, attachmentUrl: url, contentType: detectedType || file.type }));
            setStatus("Slides uploaded. Don’t forget to save the lesson.");
        } catch (err) {
            setStatus(err instanceof Error ? err.message : "Unable to upload slides");
        }
    }

    async function handleAddMeetingLink(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!detail) return;
        setBusy((prev) => ({ ...prev, meeting: true }));
        try {
            const res = await api(`/courses/${detail.id}/meeting-links`, { method: "POST", body: JSON.stringify(meetingForm) });
            const json = await res.json();
            if (!res.ok || json?.ok === false) throw new Error(json?.msg || "Unable to add meeting link");
            setMeetingForm({ title: "", url: "", note: "" });
            await loadDetail(detail.id);
        } catch (err) {
            setStatus(err instanceof Error ? err.message : "Unable to add meeting link");
        } finally {
            setBusy((prev) => ({ ...prev, meeting: false }));
        }
    }

    async function handleRemoveMeetingLink(linkId: string) {
        if (!detail) return;
        setBusy((prev) => ({ ...prev, meeting: true }));
        try {
            const res = await api(`/courses/${detail.id}/meeting-links/${linkId}`, { method: "DELETE" });
            const json = await res.json();
            if (!res.ok || json?.ok === false) throw new Error(json?.msg || "Unable to remove meeting link");
            await loadDetail(detail.id);
        } catch (err) {
            setStatus(err instanceof Error ? err.message : "Unable to remove meeting link");
        } finally {
            setBusy((prev) => ({ ...prev, meeting: false }));
        }
    }

    function handleAddTag() {
        if (!tagDraft.trim()) return;
        const label = tagDraft.trim();
        const slug = slugifyLabel(label);
        if (tagList.some((tag) => tag.slug === slug)) {
            setTagDraft("");
            return;
        }
        setTagList((prev) => [...prev, { label, slug }]);
        setTagDraft("");
    }

    function handleRemoveTag(slug: string) {
        setTagList((prev) => prev.filter((tag) => tag.slug !== slug));
    }

    async function handleSaveTags() {
        if (!detail) return;
        setBusy((prev) => ({ ...prev, tags: true }));
        try {
            const res = await api(`/courses/${detail.id}`, {
                method: "PATCH",
                body: JSON.stringify({ tags: tagList.map((tag) => tag.label) }),
            });
            const json = await res.json();
            if (!res.ok || json?.ok === false) throw new Error(json?.msg || "Unable to update tags");
            await loadDetail(detail.id);
            setStatus("Tags saved");
        } catch (err) {
            setStatus(err instanceof Error ? err.message : "Unable to update tags");
        } finally {
            setBusy((prev) => ({ ...prev, tags: false }));
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
        const copied = await copyToClipboard(detail.joinCode);
        setStatus(copied ? "Join code copied to clipboard" : "Unable to copy join code");
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
                                <input
                                    type="text"
                                    placeholder="Tags (comma separated)"
                                    value={courseForm.tags}
                                    onChange={(e) => setCourseForm({ ...courseForm, tags: e.target.value })}
                                    className="w-full rounded-2xl border border-slate-200 px-3 py-2"
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
                                                <label className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                                                    <input
                                                        type="checkbox"
                                                        checked={materialForm.inlineViewer}
                                                        onChange={(e) => setMaterialForm({ ...materialForm, inlineViewer: e.target.checked })}
                                                        className="h-4 w-4 rounded border-slate-300"
                                                    />
                                                    Display inline
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

                                    <div className="grid gap-6 lg:grid-cols-2">
                                        <div className="space-y-6">
                                            <div className="rounded-3xl border border-slate-100 bg-white p-5">
                                                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                                    <BookOpenCheck className="h-5 w-5 text-[#2B2E83]" /> Lesson decks
                                                </div>
                                                <form onSubmit={handleAddLesson} className="mt-4 space-y-3 text-sm">
                                                    <input
                                                        type="text"
                                                        placeholder="Lesson title"
                                                        value={lessonForm.title}
                                                        onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                                                        className="w-full rounded-2xl border border-slate-200 px-3 py-2"
                                                        required
                                                    />
                                                    <textarea
                                                        placeholder="Notes or summary"
                                                        value={lessonForm.body}
                                                        onChange={(e) => setLessonForm({ ...lessonForm, body: e.target.value })}
                                                        className="w-full rounded-2xl border border-slate-200 px-3 py-2"
                                                        rows={2}
                                                    />
                                                    <input
                                                        type="url"
                                                        placeholder="Video link (optional)"
                                                        value={lessonForm.videoUrl}
                                                        onChange={(e) => setLessonForm({ ...lessonForm, videoUrl: e.target.value })}
                                                        className="w-full rounded-2xl border border-slate-200 px-3 py-2"
                                                    />
                                                    <label className="text-xs font-semibold text-slate-500">
                                                        Upload slides (PDF/PPT)
                                                        <input
                                                            type="file"
                                                            accept=".pdf,.ppt,.pptx,.pps,.ppsx"
                                                            className="mt-1 w-full text-xs"
                                                            onChange={(event) => {
                                                                handleLessonFileUpload(event.target.files);
                                                                if (event.target) event.target.value = "";
                                                            }}
                                                        />
                                                    </label>
                                                    <button
                                                        type="submit"
                                                        disabled={busy.lesson || !lessonForm.title}
                                                        className="w-full rounded-full bg-[#2B2E83] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                                                    >
                                                        {busy.lesson ? "Uploading…" : "Add lesson"}
                                                    </button>
                                                </form>
                                                <div className="mt-4 space-y-2">
                                                    {detail.lessons.length === 0 ? (
                                                        <p className="text-xs text-slate-500">No lessons yet.</p>
                                                    ) : (
                                                        detail.lessons.map((lesson) => (
                                                            <div key={lesson.id} className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs">
                                                                <p className="font-semibold text-slate-700">{lesson.title}</p>
                                                                {lesson.attachmentUrl && <p className="text-slate-500">Slides uploaded</p>}
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </div>

                                            <div className="rounded-3xl border border-slate-100 bg-white p-5">
                                                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                                    <Video className="h-5 w-5 text-[#2D8F80]" /> Meeting links
                                                </div>
                                                <form onSubmit={handleAddMeetingLink} className="mt-4 space-y-3 text-sm">
                                                    <input
                                                        type="text"
                                                        placeholder="Session title"
                                                        value={meetingForm.title}
                                                        onChange={(e) => setMeetingForm({ ...meetingForm, title: e.target.value })}
                                                        className="w-full rounded-2xl border border-slate-200 px-3 py-2"
                                                        required
                                                    />
                                                    <input
                                                        type="url"
                                                        placeholder="https://"
                                                        value={meetingForm.url}
                                                        onChange={(e) => setMeetingForm({ ...meetingForm, url: e.target.value })}
                                                        className="w-full rounded-2xl border border-slate-200 px-3 py-2"
                                                        required
                                                    />
                                                    <textarea
                                                        placeholder="Notes"
                                                        value={meetingForm.note}
                                                        onChange={(e) => setMeetingForm({ ...meetingForm, note: e.target.value })}
                                                        className="w-full rounded-2xl border border-slate-200 px-3 py-2"
                                                        rows={2}
                                                    />
                                                    <button
                                                        type="submit"
                                                        disabled={busy.meeting}
                                                        className="w-full rounded-full bg-[#2D8F80] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                                                    >
                                                        {busy.meeting ? "Saving…" : "Post link"}
                                                    </button>
                                                </form>
                                                <div className="mt-4 space-y-2">
                                                    {detail.meetingLinks.length === 0 ? (
                                                        <p className="text-xs text-slate-500">No links yet.</p>
                                                    ) : (
                                                        detail.meetingLinks.map((link) => (
                                                            <div key={link.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs">
                                                                <div>
                                                                    <p className="font-semibold text-slate-700">{link.title}</p>
                                                                    <p className="text-slate-500">{link.note || link.url}</p>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRemoveMeetingLink(link.id)}
                                                                    className="rounded-full border border-slate-200 px-3 py-1 font-semibold text-slate-500"
                                                                >
                                                                    Remove
                                                                </button>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="rounded-3xl border border-slate-100 bg-white p-5">
                                            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                                <Link2 className="h-5 w-5 text-[#2B2E83]" /> Interest tags
                                            </div>
                                            <p className="mt-2 text-xs text-slate-500">Tags power the public “Browse by interest” rail.</p>
                                            <div className="mt-4 flex flex-wrap gap-2">
                                                {tagList.length === 0 && <span className="text-xs text-slate-500">No tags yet.</span>}
                                                {tagList.map((tag) => (
                                                    <span key={tag.slug} className="inline-flex items-center gap-1 rounded-full bg-[#EEF0FF] px-3 py-1 text-xs font-semibold text-[#2B2E83]">
                                                        {tag.label}
                                                        <button type="button" onClick={() => handleRemoveTag(tag.slug)} className="text-[#2B2E83]">
                                                            ×
                                                        </button>
                                                    </span>
                                                ))}
                                            </div>
                                            <div className="mt-4 flex flex-col gap-2 text-sm">
                                                <input
                                                    type="text"
                                                    placeholder="Add a tag"
                                                    value={tagDraft}
                                                    onChange={(e) => setTagDraft(e.target.value)}
                                                    className="w-full rounded-2xl border border-slate-200 px-3 py-2"
                                                />
                                                <div className="flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={handleAddTag}
                                                        className="flex-1 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
                                                    >
                                                        Add tag
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={handleSaveTags}
                                                        disabled={busy.tags}
                                                        className="flex-1 rounded-full bg-[#2B2E83] px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
                                                    >
                                                        {busy.tags ? "Saving…" : "Save tags"}
                                                    </button>
                                                </div>
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
