"use client";

import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, CalendarDays, ClipboardList, Download, FileText, Lock, Sparkles, UsersRound } from "lucide-react";

import SiteNav from "@/components/site-nav";
import { useCurrentUser } from "@/hooks/use-current-user";
import { api } from "@/lib/api";
import { uploadAsset } from "@/lib/upload";

const heroCourses = [
    {
        title: "AWS Certified Solutions Architect",
        badge: "Live",
        image: "/landing/creator.jpg",
        description: "Cloud fundamentals, architecture decisions, and deployment labs.",
    },
    {
        title: "Language & Literature",
        badge: "Live",
        image: "/landing/learner.jpg",
        description: "Creative writing, storytelling, and critique circles every week.",
    },
];

const categories = [
    { title: "STEM", description: "Physics, AI, robotics, and lab challenges." },
    { title: "Social Sciences", description: "Global studies, civics, sociology, and economics." },
    { title: "Language & Literature", description: "Writing labs, AP prep, and book clubs." },
    { title: "Media", description: "Film, podcasting, and journalism projects." },
    { title: "Art & Design", description: "Illustration, UX, and motion graphics." },
    { title: "IBDP", description: "Extended essay support and HL subject circles." },
    { title: "Leadership", description: "Strategy sprints, DEI, and service projects." },
    { title: "Others", description: "Career readiness, wellness, and life skills." },
];

interface CourseSession {
    id: string;
    startsAt: string;
    endsAt?: string | null;
    location?: string | null;
    mode?: string | null;
    note?: string | null;
}

interface LiveCourse {
    id: string;
    title: string;
    summary?: string | null;
    coverUrl?: string | null;
    upcomingSessions?: CourseSession[];
}

interface CourseLesson {
    id: string;
    title: string;
    type: string;
    body?: string | null;
    videoUrl?: string | null;
}

interface CourseMaterial {
    id: string;
    title: string;
    description?: string | null;
    coverUrl?: string | null;
    attachmentUrl?: string | null;
    contentUrl?: string | null;
    contentType?: string | null;
    locked: boolean;
    visibility: string;
    createdAt: string;
    uploader?: { id: string; name?: string | null; avatarUrl?: string | null } | null;
}

interface AssignmentSubmission {
    id: string;
    status: string;
    grade?: string | null;
    feedback?: string | null;
    attachmentUrl?: string | null;
    content?: string | null;
    submittedAt?: string | null;
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
    viewerSubmission?: AssignmentSubmission;
}

interface EnrollQuestion {
    id: string;
    label: string;
    placeholder?: string;
    type?: string;
}

interface CourseDetail extends LiveCourse {
    lessons: CourseLesson[];
    sessions: CourseSession[];
    materials: CourseMaterial[];
    assignments: CourseAssignment[];
    enrollQuestions: EnrollQuestion[];
    joinCode?: string;
    calendarDownloadUrl?: string | null;
}

interface ViewerState {
    canManage: boolean;
    isEnrolled: boolean;
    enrollmentStatus?: string | null;
    formAnswers?: Record<string, string> | null;
    calendarUnlocked?: boolean;
}

interface EnrollmentRecord {
    id: string;
    status: string;
    joinedViaCode: boolean;
    createdAt: string;
    adminNote?: string | null;
    formAnswers: Record<string, string>;
    user?: { id: string; name?: string | null; email?: string | null; role?: string | null; avatarUrl?: string | null } | null;
}

interface EnrollmentListItem {
    id: string;
    courseId: string;
    status: string;
    createdAt: string;
    course?: LiveCourse;
}

export default function CoursesPage() {
    const router = useRouter();
    const { user } = useCurrentUser();
    const [catalog, setCatalog] = useState<LiveCourse[]>([]);
    const [loadingCatalog, setLoadingCatalog] = useState(true);
    const [enrolledIds, setEnrolledIds] = useState<string[]>([]);
    const [myEnrollments, setMyEnrollments] = useState<EnrollmentListItem[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [detail, setDetail] = useState<CourseDetail | null>(null);
    const [viewer, setViewer] = useState<ViewerState | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [drawerBusy, setDrawerBusy] = useState(false);
    const [status, setStatus] = useState<string | null>(null);
    const [codeForm, setCodeForm] = useState({ code: "", note: "", busy: false, msg: "" });
    const [managerEnrollments, setManagerEnrollments] = useState<EnrollmentRecord[]>([]);
    const [assignmentDrafts, setAssignmentDrafts] = useState<Record<string, { note: string; attachmentUrl?: string }>>({});
    const [assignmentBusy, setAssignmentBusy] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const res = await fetch("/api/courses", { cache: "no-store" });
                const json = await res.json();
                if (!active) return;
                setCatalog(Array.isArray(json?.list) ? json.list : []);
            } catch {
                if (active) setCatalog([]);
            } finally {
                if (active) setLoadingCatalog(false);
            }
        })();
        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        if (!user) {
            setEnrolledIds([]);
            setMyEnrollments([]);
            return;
        }
        let active = true;
        (async () => {
            try {
                const res = await api("/courses/enrollments/mine", { method: "GET" });
                const json = await res.json();
                if (!active) return;
                const rows = Array.isArray(json?.list) ? (json.list as EnrollmentListItem[]) : [];
                setEnrolledIds(rows.map((row) => row.courseId));
                setMyEnrollments(rows);
            } catch {
                if (active) {
                    setEnrolledIds([]);
                    setMyEnrollments([]);
                }
            }
        })();
        return () => {
            active = false;
        };
    }, [user]);

    const enrolledSet = useMemo(() => new Set(enrolledIds), [enrolledIds]);

    const refreshMyEnrollments = useCallback(async () => {
        if (!user) return;
        try {
            const res = await api("/courses/enrollments/mine", { method: "GET" });
            const json = await res.json();
            const rows = Array.isArray(json?.list) ? (json.list as EnrollmentListItem[]) : [];
            setEnrolledIds(rows.map((row) => row.courseId));
            setMyEnrollments(rows);
        } catch {
            // keep the previous optimistic state; dashboard will retry on navigation
        }
    }, [user]);

    function hydrateAssignmentDrafts(assignments: CourseAssignment[] = []) {
        const next: Record<string, { note: string; attachmentUrl?: string }> = {};
        assignments.forEach((assignment) => {
            next[assignment.id] = {
                note: assignment.viewerSubmission?.content || "",
                attachmentUrl: assignment.viewerSubmission?.attachmentUrl || undefined,
            };
        });
        setAssignmentDrafts(next);
    }

    function handleAssignmentDraftChange(
        assignmentId: string,
        patch: Partial<{ note: string; attachmentUrl?: string }>,
    ) {
        setAssignmentDrafts((prev) => ({
            ...prev,
            [assignmentId]: {
                note: prev[assignmentId]?.note || "",
                attachmentUrl: prev[assignmentId]?.attachmentUrl || undefined,
                ...patch,
            },
        }));
    }

    async function handleAssignmentSubmit(assignmentId: string) {
        if (!detail || !user) return;
        if (user.role !== "STUDENT") {
            setStatus("Switch to a student account to submit work.");
            return;
        }
        if (viewer?.enrollmentStatus !== "APPROVED") {
            setStatus("Wait for approval before turning in assignments.");
            return;
        }
        const draft = assignmentDrafts[assignmentId] || { note: "", attachmentUrl: undefined };
        if (!draft.note && !draft.attachmentUrl) {
            setStatus("Add a reflection or upload a file before submitting.");
            return;
        }
        try {
            setAssignmentBusy(assignmentId);
            const res = await api(`/courses/${detail.id}/assignments/${assignmentId}/submissions`, {
                method: "POST",
                body: JSON.stringify({ content: draft.note, attachmentUrl: draft.attachmentUrl }),
            });
            const json = await res.json();
            if (!res.ok || json?.ok === false) throw new Error(json?.msg || "Unable to submit assignment");
            await refreshDetail();
            setStatus("Submission uploaded!");
        } catch (err) {
            setStatus(err instanceof Error ? err.message : "Unable to submit assignment");
        } finally {
            setAssignmentBusy(null);
        }
    }

    async function openCourseDrawer(courseId: string) {
        setSelectedId(courseId);
        setDrawerOpen(true);
        setDrawerBusy(true);
        setStatus(null);
        try {
            const res = await api(`/courses/${courseId}`, { method: "GET" });
            const json = await res.json();
            if (!res.ok || json?.ok === false) throw new Error(json?.msg || "Unable to load course.");
            setDetail(json.course);
            setViewer(json.viewer);
            setManagerEnrollments(Array.isArray(json?.enrollments) ? (json.enrollments as EnrollmentRecord[]) : []);
            hydrateAssignmentDrafts(Array.isArray(json.course?.assignments) ? (json.course.assignments as CourseAssignment[]) : []);
        } catch (err) {
            setStatus(err instanceof Error ? err.message : "Unable to load course");
        } finally {
            setDrawerBusy(false);
        }
    }

    async function refreshDetail() {
        if (!selectedId) return;
        await openCourseDrawer(selectedId);
    }

    async function handleEnrollSubmit(payload: { answers: Record<string, string>; joinCode?: string }) {
        if (!detail) return;
        if (!user) {
            router.push(`/login?from=/courses#${detail.id}`);
            return;
        }
        if (user.role !== "STUDENT") {
            setStatus("Switch to a student account to enroll.");
            return;
        }
        try {
            setStatus(null);
            setDrawerBusy(true);
            const res = await api(`/courses/${detail.id}/enroll`, {
                method: "POST",
                body: JSON.stringify(payload),
            });
            const json = await res.json();
            if (!res.ok || json?.ok === false) throw new Error(json?.msg || "Unable to enroll");
            setDetail(json.course);
            setViewer(json.viewer);
            setManagerEnrollments(Array.isArray(json?.enrollments) ? (json.enrollments as EnrollmentRecord[]) : []);
            hydrateAssignmentDrafts(Array.isArray(json.course?.assignments) ? (json.course.assignments as CourseAssignment[]) : []);
            setEnrolledIds((prev) => (prev.includes(detail.id) ? prev : [...prev, detail.id]));
            await refreshMyEnrollments();
            const enrollmentStatus = json.viewer?.enrollmentStatus;
            if (json.codeStatus === "INVALID") {
                setStatus("That code didn’t match, so we queued your application for instructor review.");
            } else if (json.codeStatus === "APPROVED" || json.viewer?.isEnrolled) {
                setStatus("You're in! Resources have been unlocked.");
            } else if (enrollmentStatus === "PENDING") {
                setStatus("Thanks! Your application is pending admin approval.");
            } else {
                setStatus("Enrollment submitted. Watch your inbox for confirmation!");
            }
        } catch (err) {
            setStatus(err instanceof Error ? err.message : "Unable to submit enrollment");
        } finally {
            setDrawerBusy(false);
        }
    }

    async function handleCodeJoin() {
        if (!codeForm.code.trim()) {
            setCodeForm((prev) => ({ ...prev, msg: "Enter a code to continue." }));
            return;
        }
        try {
            setCodeForm((prev) => ({ ...prev, busy: true, msg: "" }));
            const res = await api("/courses/join-code", {
                method: "POST",
                body: JSON.stringify({ code: codeForm.code.trim(), answers: { intent: codeForm.note } }),
            });
            const json = await res.json();
            if (!res.ok || json?.ok === false) throw new Error(json?.msg || "Unable to join course");
            setCodeForm({ code: "", note: "", busy: false, msg: "You're enrolled!" });
            if (json.course?.id) {
                setEnrolledIds((prev) => (prev.includes(json.course.id) ? prev : [...prev, json.course.id]));
            }
            await refreshMyEnrollments();
        } catch (err) {
            setCodeForm((prev) => ({ ...prev, busy: false, msg: err instanceof Error ? err.message : "Unable to join" }));
        }
    }

    const canCreateCourses = !!user && ["ADMIN", "CREATOR", "TUTOR"].includes(user.role);
    const isStudent = user?.role === "STUDENT";

    return (
        <div className="min-h-dvh bg-[#F6F8FC] text-slate-800">
            <SiteNav />
            <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-10">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#2D8F80]">
                    <Sparkles className="h-5 w-5" /> Course suite
                </div>

                <section className="mt-6 rounded-[36px] bg-white p-6 shadow-2xl shadow-slate-200/70 sm:p-10">
                    <div className="flex flex-col gap-8 md:flex-row md:items-center">
                        <div className="flex-1">
                            <p className="text-sm font-semibold text-[#5C9E95]">Welcome back! Ready for your next lesson?</p>
                            <h1 className="mt-3 text-4xl font-bold text-slate-900">Run live cohorts, release lessons, and learn with peers.</h1>
                            <p className="mt-4 text-base text-slate-600">
                                The SparkHub lesson suite lets tutors publish full courses, attach private materials, and manage meeting dates
                                while students submit enrollment forms or join via a shareable code.
                            </p>
                            <div className="mt-6 flex flex-wrap gap-3">
                                <Link
                                    href="#catalog"
                                    className="rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                                >
                                    Browse catalog
                                </Link>
                                {canCreateCourses && (
                                    <Link
                                        href="/courses/studio"
                                        className="rounded-full bg-[#2B2E83] px-5 py-2 text-sm font-semibold text-white hover:brightness-110"
                                    >
                                        Launch Course Studio
                                    </Link>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-col gap-4 md:w-[320px]">
                            {heroCourses.map((course) => (
                                <motion.div key={course.title} whileHover={{ y: -4 }} className="rounded-3xl border border-slate-100 bg-[#F9FBFF] p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="relative h-14 w-14 overflow-hidden rounded-2xl bg-slate-200">
                                            <Image src={course.image} alt={course.title} fill className="object-cover" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wide text-[#63C0B9]">{course.badge}</p>
                                            <p className="text-sm font-semibold text-slate-900">{course.title}</p>
                                        </div>
                                    </div>
                                    <p className="mt-3 text-sm text-slate-600">{course.description}</p>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                    <div className="mt-6 grid gap-4 rounded-3xl bg-slate-50 p-4 sm:grid-cols-2">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-[#5C9E95]">Have a code?</p>
                            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                                <input
                                    value={codeForm.code}
                                    onChange={(e) => setCodeForm((prev) => ({ ...prev, code: e.target.value }))}
                                    placeholder="Enter course code"
                                    className="flex-1 rounded-full border border-slate-200 px-4 py-2 text-sm focus:border-[#2D8F80] focus:outline-none"
                                />
                                <button
                                    onClick={handleCodeJoin}
                                    disabled={codeForm.busy}
                                    className="rounded-full bg-[#2D8F80] px-4 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60"
                                >
                                    {codeForm.busy ? "Joining…" : "Join"}
                                </button>
                            </div>
                            <textarea
                                value={codeForm.note}
                                onChange={(e) => setCodeForm((prev) => ({ ...prev, note: e.target.value }))}
                                placeholder="Share context for the facilitator (optional)"
                                className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-[#2D8F80] focus:outline-none"
                            />
                            {codeForm.msg && <p className="mt-1 text-xs text-[#2D8F80]">{codeForm.msg}</p>}
                        </div>
                        <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-600">
                            <p className="text-sm font-semibold text-slate-800">Need help?</p>
                            <p>Share codes with teammates, review contact submissions in the admin inbox, or hop into the tutor dashboard to stage lessons.</p>
                            <Link href="/contact" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#2D8F80]">
                                Contact the SparkHub team <ArrowUpRight className="h-4 w-4" />
                            </Link>
                        </div>
                    </div>
                </section>

                {isStudent && (
                    <section className="mt-10 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm" id="my-enrollments">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h2 className="text-2xl font-semibold text-slate-900">My enrollments</h2>
                                <p className="text-sm text-slate-600">Courses awaiting approval or already unlocked for your account.</p>
                            </div>
                            <span className="rounded-full bg-slate-50 px-4 py-1 text-xs font-semibold text-slate-600">
                                {myEnrollments.length} active
                            </span>
                        </div>
                        {myEnrollments.length === 0 ? (
                            <p className="mt-4 text-sm text-slate-500">Submit an enrollment form or join with a code to see your roster populate.</p>
                        ) : (
                            <div className="mt-6 grid gap-4 md:grid-cols-2">
                                {myEnrollments.map((enrollment) => {
                                    const approved = enrollment.status === "APPROVED";
                                    return (
                                        <div key={enrollment.id} className="rounded-2xl border border-slate-100 p-4 text-sm shadow-sm">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <p className="text-base font-semibold text-slate-900">{enrollment.course?.title || "Course"}</p>
                                                    <p className="text-xs text-slate-500">
                                                        Applied {new Date(enrollment.createdAt).toLocaleDateString()} · {enrollment.status}
                                                    </p>
                                                </div>
                                                <span
                                                    className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                                                        approved ? "bg-[#E8F7F4] text-[#1F6C62]" : "bg-[#FFF4E5] text-[#9C6200]"
                                                    }`}
                                                >
                                                    {approved ? "Approved" : "Pending"}
                                                </span>
                                            </div>
                                            <p className="mt-2 line-clamp-2 text-slate-600">{enrollment.course?.summary || "Stay tuned for your facilitator's updates."}</p>
                                            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                                                <button
                                                    type="button"
                                                    onClick={() => openCourseDrawer(enrollment.courseId)}
                                                    className="rounded-full border border-slate-200 px-4 py-1.5 font-semibold text-slate-800 hover:border-slate-300"
                                                >
                                                    Open workspace
                                                </button>
                                                {!approved && (
                                                    <span className="rounded-full bg-amber-50 px-3 py-1 font-semibold text-amber-700">Waiting for instructor</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                )}

                {canCreateCourses && <CourseBuilderCard onCreated={(course) => setCatalog((prev) => [course, ...prev])} />}

                <section className="mt-12" id="catalog">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <h2 className="text-2xl font-semibold text-slate-900">Live catalog</h2>
                            <p className="text-sm text-slate-600">Pulled directly from the SparkHub courses API.</p>
                        </div>
                        {status && <p className="text-sm text-[#2D8F80]">{status}</p>}
                    </div>
                    <div className="mt-6 grid gap-5 md:grid-cols-2">
                        {loadingCatalog && <p className="text-sm text-slate-500">Loading courses…</p>}
                        {!loadingCatalog && catalog.length === 0 && <p className="text-sm text-slate-500">No published courses yet.</p>}
                        {catalog.map((course) => (
                            <button
                                key={course.id}
                                onClick={() => openCourseDrawer(course.id)}
                                className="group flex flex-col rounded-3xl border border-slate-100 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-semibold text-[#2D8F80]">Live course</p>
                                        <h3 className="text-xl font-semibold text-slate-900">{course.title}</h3>
                                    </div>
                                    <span className="rounded-full bg-[#E8F7F4] px-3 py-1 text-xs font-semibold text-[#2D8F80]">
                                        {enrolledSet.has(course.id) ? "Enrolled" : "Explore"}
                                    </span>
                                </div>
                                <p className="mt-2 line-clamp-2 text-sm text-slate-600">{course.summary}</p>
                                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                                    {(course.upcomingSessions || []).slice(0, 2).map((session) => (
                                        <span key={session.id} className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1">
                                            <CalendarDays className="h-3.5 w-3.5" />
                                            {new Date(session.startsAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                                        </span>
                                    ))}
                                    <span className="inline-flex items-center gap-1 text-[#2D8F80]">
                                        Open workspace <ArrowUpRight className="h-3.5 w-3.5" />
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                </section>

                <section className="mt-16">
                    <h2 className="text-2xl font-semibold text-slate-900">Browse by interest</h2>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {categories.map((category) => (
                            <div key={category.title} className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
                                <p className="text-sm font-semibold text-slate-900">{category.title}</p>
                                <p className="mt-1 text-xs text-slate-500">{category.description}</p>
                            </div>
                        ))}
                    </div>
                </section>
            </main>

            <AnimatePresence>
                {drawerOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm"
                        onClick={() => setDrawerOpen(false)}
                    >
                        <motion.div
                            initial={{ x: "100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "100%" }}
                            transition={{ type: "spring", stiffness: 200, damping: 30 }}
                            onClick={(e) => e.stopPropagation()}
                            className="ml-auto flex h-full w-full max-w-3xl flex-col gap-4 overflow-y-auto bg-white p-8 shadow-2xl"
                        >
                            {drawerBusy && !detail ? (
                                <p className="text-sm text-slate-500">Loading course…</p>
                            ) : detail ? (
                                <CourseDetailPanel
                                    detail={detail}
                                    viewer={viewer}
                                    userRole={user?.role}
                                    isBusy={drawerBusy}
                                    onClose={() => setDrawerOpen(false)}
                                    onEnroll={handleEnrollSubmit}
                                    managerEnrollments={managerEnrollments}
                                    assignmentDrafts={assignmentDrafts}
                                    onAssignmentDraftChange={handleAssignmentDraftChange}
                                    onAssignmentSubmit={handleAssignmentSubmit}
                                    assignmentBusy={assignmentBusy}
                                />
                            ) : (
                                <p className="text-sm text-red-500">{status || "Unable to load course"}</p>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function CourseBuilderCard({ onCreated }: { onCreated: (course: LiveCourse) => void }) {
    const { user } = useCurrentUser();
    const [title, setTitle] = useState("");
    const [summary, setSummary] = useState("");
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [questions, setQuestions] = useState<string[]>([
        "Why do students want to take this course?",
        "What experience should they share?",
    ]);
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);

    async function handleCreate() {
        if (!title.trim() || !summary.trim()) {
            setMsg("Add a title and summary.");
            return;
        }
        try {
            setBusy(true);
            setMsg(null);
            let coverUrl: string | undefined;
            if (coverFile) {
                coverUrl = await uploadAsset(coverFile);
            }
            const res = await api("/courses", {
                method: "POST",
                body: JSON.stringify({
                    title: title.trim(),
                    summary: summary.trim(),
                    coverUrl,
                    isPublished: true,
                    enrollQuestions: questions.map((q, index) => ({ id: `builder-${index}`, label: q })),
                }),
            });
            const json = await res.json();
            if (!res.ok || json?.ok === false) throw new Error(json?.msg || "Unable to create course");
            onCreated(json.course);
            setTitle("");
            setSummary("");
            setCoverFile(null);
            setMsg("Course published!");
        } catch (err) {
            setMsg(err instanceof Error ? err.message : "Unable to create course");
        } finally {
            setBusy(false);
        }
    }

    return (
        <section className="mt-12 rounded-[32px] bg-white p-6 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5C9E95]">Creators & mentors</p>
                    <h2 className="mt-1 text-2xl font-semibold text-slate-900">Launch a new course</h2>
                    <p className="text-sm text-slate-600">Stage lessons, define enrollment questions, and share the unique join code.</p>
                </div>
                <div className="text-xs font-semibold text-slate-500">Signed in as {user?.name || user?.role}</div>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                    <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Course title"
                        className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm focus:border-[#2D8F80] focus:outline-none"
                    />
                    <textarea
                        value={summary}
                        onChange={(e) => setSummary(e.target.value)}
                        placeholder="Course summary"
                        className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm focus:border-[#2D8F80] focus:outline-none"
                    />
                    <label className="flex cursor-pointer flex-col gap-1 text-sm">
                        <span className="text-slate-600">Upload cover</span>
                        <input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] || null)} />
                    </label>
                </div>
                <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Enrollment form</p>
                    {questions.map((question, index) => (
                        <input
                            key={index}
                            value={question}
                            onChange={(e) => {
                                const copy = [...questions];
                                copy[index] = e.target.value;
                                setQuestions(copy);
                            }}
                            className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-xs focus:border-[#2D8F80] focus:outline-none"
                        />
                    ))}
                    <button
                        type="button"
                        onClick={() => setQuestions((prev) => [...prev, "Add another prompt"])}
                        className="text-xs font-semibold text-[#2D8F80]"
                    >
                        + Add question
                    </button>
                </div>
            </div>
            <div className="mt-4 flex items-center gap-4">
                <button
                    onClick={handleCreate}
                    disabled={busy}
                    className="rounded-full bg-[#2D8F80] px-5 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60"
                >
                    {busy ? "Publishing…" : "Publish course"}
                </button>
                {msg && <p className="text-sm text-[#2D8F80]">{msg}</p>}
            </div>
        </section>
    );
}

function CourseDetailPanel({
    detail,
    viewer,
    userRole,
    isBusy,
    onClose,
    onEnroll,
    managerEnrollments,
    assignmentDrafts,
    onAssignmentDraftChange,
    onAssignmentSubmit,
    assignmentBusy,
}: {
    detail: CourseDetail;
    viewer: ViewerState | null;
    userRole?: string;
    isBusy: boolean;
    onClose: () => void;
    onEnroll: (payload: { answers: Record<string, string>; joinCode?: string }) => Promise<void>;
    managerEnrollments: EnrollmentRecord[];
    assignmentDrafts: Record<string, { note: string; attachmentUrl?: string }>;
    onAssignmentDraftChange: (assignmentId: string, patch: Partial<{ note: string; attachmentUrl?: string }>) => void;
    onAssignmentSubmit: (assignmentId: string) => Promise<void>;
    assignmentBusy: string | null;
}) {
    const [answers, setAnswers] = useState<Record<string, string>>(viewer?.formAnswers || {});
    const [joinCodeInput, setJoinCodeInput] = useState("");
    const [copyStatus, setCopyStatus] = useState<string | null>(null);

    useEffect(() => {
        setAnswers(viewer?.formAnswers || {});
        setJoinCodeInput("");
        setCopyStatus(null);
    }, [detail.id, viewer?.formAnswers]);

    const canManage = viewer?.canManage;
    const isStudent = userRole === "STUDENT";
    const pendingCount = managerEnrollments.filter((row) => row.status === "PENDING").length;
    const approved = viewer?.enrollmentStatus === "APPROVED";
    const questionMap = useMemo(() => {
        const map = new Map<string, string>();
        detail.enrollQuestions.forEach((question) => {
            map.set(question.id, question.label);
        });
        return map;
    }, [detail.enrollQuestions]);
    const submittedAnswers = useMemo(() => {
        if (!viewer?.formAnswers) return [] as { id: string; label: string; value: string }[];
        return Object.entries(viewer.formAnswers)
            .filter(([, value]) => Boolean(value))
            .map(([key, value]) => ({
                id: key,
                label: questionMap.get(key) || key,
                value: typeof value === "string" ? value : String(value ?? ""),
            }));
    }, [viewer?.formAnswers, questionMap]);

    async function handleCopyJoinCode() {
        if (!detail.joinCode) return;
        try {
            await navigator.clipboard.writeText(detail.joinCode);
            setCopyStatus("Join code copied");
            window.setTimeout(() => setCopyStatus(null), 2200);
        } catch {
            setCopyStatus("Unable to copy code");
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#5C9E95]">Course workspace</p>
                    <h2 className="text-3xl font-semibold text-slate-900">{detail.title}</h2>
                    <p className="mt-2 text-sm text-slate-600">{detail.summary}</p>
                    {viewer?.enrollmentStatus && (
                        <span
                            className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                                approved ? "bg-[#E8F7F4] text-[#1F6C62]" : "bg-[#FFF4E5] text-[#9C6200]"
                            }`}
                        >
                            Status: {viewer.enrollmentStatus}
                        </span>
                    )}
                </div>
                <button onClick={onClose} className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500">
                    Close
                </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
                <StatPill icon={<UsersRound className="h-4 w-4" />} label="Lessons" value={detail.lessons.length.toString()} />
                <StatPill icon={<CalendarDays className="h-4 w-4" />} label="Sessions" value={detail.sessions.length.toString()} />
                <StatPill icon={<FileText className="h-4 w-4" />} label="Materials" value={detail.materials.length.toString()} />
                <StatPill icon={<ClipboardList className="h-4 w-4" />} label="Assignments" value={detail.assignments.length.toString()} />
            </div>
            {isStudent && <CourseApplicationTimeline status={viewer?.enrollmentStatus} />}
            {canManage && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Instructor shortcuts</p>
                    <p className="mt-1 text-slate-900">
                        {pendingCount === 0 ? "No pending requests." : `${pendingCount} enrollment${pendingCount > 1 ? "s" : ""} awaiting review.`}
                    </p>
                    <Link
                        href="/courses/studio"
                        className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#2B2E83] px-4 py-1.5 text-xs font-semibold text-white"
                    >
                        Open course studio <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                </div>
            )}
            {canManage && detail.joinCode && (
                <div className="rounded-2xl border border-[#2B2E83]/20 bg-[#F5F7FF] p-4 text-sm text-slate-700">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#2B2E83]">Shareable join code</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                        <span className="font-mono text-2xl tracking-[0.3em] text-[#2B2E83]">{detail.joinCode}</span>
                        <button
                            type="button"
                            onClick={handleCopyJoinCode}
                            className="rounded-full border border-[#2B2E83] px-3 py-1 text-xs font-semibold text-[#2B2E83]"
                        >
                            Copy
                        </button>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">Learners with this code skip the approval queue; others remain pending until you review them.</p>
                    {copyStatus && <p className="mt-1 text-xs text-[#2D8F80]">{copyStatus}</p>}
                </div>
            )}

            <section className="space-y-3">
                <h3 className="text-lg font-semibold text-slate-900">Live schedule</h3>
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
                    <div className="space-y-2">
                        {detail.sessions.length === 0 && <p className="text-sm text-slate-500">No sessions scheduled yet.</p>}
                        {detail.sessions.map((session) => (
                            <div key={session.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm">
                                <p className="font-semibold text-slate-800">{formatDate(session.startsAt)}</p>
                                <p className="text-slate-500">{session.location || session.mode || "Virtual"}</p>
                                {session.note && <p className="text-xs text-slate-400">{session.note}</p>}
                            </div>
                        ))}
                    </div>
                    <CourseCalendar sessions={detail.sessions} calendarUrl={detail.calendarDownloadUrl} />
                </div>
            </section>

            {canManage && managerEnrollments.length > 0 && (
                <section className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-slate-900">Enrollment queue</h3>
                        <span className="text-xs text-slate-500">{pendingCount} pending</span>
                    </div>
                    <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                        {managerEnrollments.map((record) => (
                            <div
                                key={record.id}
                                className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-3 text-sm shadow-sm"
                            >
                                <div className="flex items-center gap-3">
                                    {record.user?.avatarUrl ? (
                                        <Image
                                            src={record.user.avatarUrl}
                                            alt={record.user?.name || "Student avatar"}
                                            width={40}
                                            height={40}
                                            className="h-10 w-10 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-500">
                                            {record.user?.name?.charAt(0) || "?"}
                                        </div>
                                    )}
                                    <div>
                                        <p className="font-semibold text-slate-900">{record.user?.name || "Awaiting profile"}</p>
                                        <p className="text-xs text-slate-500">{record.user?.email || "No email"}</p>
                                        <p className="text-xs text-slate-400">{formatDate(record.createdAt)}</p>
                                    </div>
                                </div>
                                <span
                                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                        record.status === "APPROVED"
                                            ? "bg-[#E8F7F4] text-[#1F6C62]"
                                            : record.status === "REJECTED"
                                            ? "bg-[#FDECEC] text-[#B6483D]"
                                            : "bg-[#FFF4E5] text-[#9C6200]"
                                    }`}
                                >
                                    {record.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            <section className="space-y-3">
                <h3 className="text-lg font-semibold text-slate-900">Lessons</h3>
                {detail.lessons.length === 0 && <p className="text-sm text-slate-500">No lessons yet.</p>}
                <div className="space-y-2">
                    {detail.lessons.map((lesson) => (
                        <div key={lesson.id} className="rounded-2xl border border-slate-100 bg-gradient-to-br from-white to-[#F7FBFF] p-4">
                            <p className="font-semibold text-slate-900">{lesson.title}</p>
                            <p className="text-xs uppercase tracking-wide text-slate-500">{lesson.type}</p>
                            {lesson.body && <p className="mt-2 text-sm text-slate-600">{lesson.body}</p>}
                            {lesson.videoUrl && (
                                <Link href={lesson.videoUrl} className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-[#2B2E83]">
                                    Watch lesson <ArrowUpRight className="h-3 w-3" />
                                </Link>
                            )}
                        </div>
                    ))}
                </div>
            </section>

            <section className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900">Materials</h3>
                </div>
                {detail.materials.length === 0 && <p className="text-sm text-slate-500">No materials uploaded yet.</p>}
                <div className="space-y-3">
                    {detail.materials.map((material) => (
                        <div key={material.id} className="rounded-2xl border border-slate-100 bg-white p-4 text-sm shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-semibold text-slate-900">{material.title}</p>
                                    <p className="text-xs text-slate-500">{material.visibility}</p>
                                </div>
                                <span
                                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                        material.locked ? "bg-slate-100 text-slate-500" : "bg-[#E8F7F4] text-[#1F6C62]"
                                    }`}
                                >
                                    {material.locked ? "Locked" : "Ready"}
                                </span>
                            </div>
                            <p className="mt-2 text-slate-600">{material.description || "No description"}</p>
                            {material.locked ? (
                                <div className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
                                    <Lock className="h-3.5 w-3.5" /> Enrolled learners only
                                </div>
                            ) : (
                                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                                    {material.attachmentUrl && (
                                        <Link href={material.attachmentUrl} target="_blank" className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-[#2D8F80]">
                                            <FileText className="h-3.5 w-3.5" /> Download
                                        </Link>
                                    )}
                                    {material.contentUrl && (
                                        <Link href={material.contentUrl} target="_blank" className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-[#2D8F80]">
                                            <ArrowUpRight className="h-3.5 w-3.5" /> Open link
                                        </Link>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </section>

            <section className="space-y-3" id="assignments">
                <h3 className="text-lg font-semibold text-slate-900">Assignments</h3>
                {detail.assignments.length === 0 && <p className="text-sm text-slate-500">No assignments posted yet.</p>}
                <div className="space-y-3">
                    {detail.assignments.map((assignment) => {
                        const draft = assignmentDrafts[assignment.id] || { note: "", attachmentUrl: undefined };
                        return (
                            <div key={assignment.id} className="rounded-2xl border border-slate-100 bg-white p-4 text-sm shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-semibold text-slate-900">{assignment.title}</p>
                                        <p className="text-xs text-slate-500">Due {assignment.dueAt ? formatDate(assignment.dueAt) : "TBA"}</p>
                                    </div>
                                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                                        {assignment.stats?.submissions || 0} submissions
                                    </span>
                                </div>
                                {assignment.description && <p className="mt-2 text-slate-600">{assignment.description}</p>}
                                <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                                    {(assignment.resources || []).map((url) => (
                                        <Link key={url} href={url} target="_blank" className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1">
                                            <ArrowUpRight className="h-3 w-3" /> Resource
                                        </Link>
                                    ))}
                                    {(assignment.attachments || []).map((url) => (
                                        <Link key={url} href={url} target="_blank" className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1">
                                            <FileText className="h-3 w-3" /> Attachment
                                        </Link>
                                    ))}
                                </div>
                                {isStudent ? (
                                    approved ? (
                                        <div className="mt-3 space-y-2">
                                            {assignment.viewerSubmission ? (
                                                <p className="text-xs text-slate-500">
                                                    Submitted {assignment.viewerSubmission.submittedAt ? formatDate(assignment.viewerSubmission.submittedAt) : ""} · {assignment.viewerSubmission.status}
                                                </p>
                                            ) : (
                                                <p className="text-xs text-slate-500">Upload your response below.</p>
                                            )}
                                            <textarea
                                                value={draft.note}
                                                onChange={(e) => onAssignmentDraftChange(assignment.id, { note: e.target.value })}
                                                placeholder="Share your reflection or link"
                                                className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                                            />
                                            <label className="inline-flex items-center gap-2 text-xs text-slate-500">
                                                <input
                                                    type="file"
                                                    className="text-xs"
                                                    onChange={async (event) => {
                                                        const file = event.target.files?.[0];
                                                        if (!file) return;
                                                        const url = await uploadAsset(file);
                                                        onAssignmentDraftChange(assignment.id, { attachmentUrl: url });
                                                        event.target.value = "";
                                                    }}
                                                />
                                                {draft.attachmentUrl ? "File attached" : "Attach file"}
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => onAssignmentSubmit(assignment.id)}
                                                disabled={isBusy || assignmentBusy === assignment.id}
                                                className="rounded-full bg-[#2B2E83] px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
                                            >
                                                {assignmentBusy === assignment.id ? "Submitting…" : assignment.viewerSubmission ? "Resubmit" : "Submit assignment"}
                                            </button>
                                        </div>
                                    ) : (
                                        <p className="mt-2 text-xs text-slate-500">Assignments unlock once your enrollment is approved.</p>
                                    )
                                ) : canManage ? (
                                    <Link href="/courses/studio" className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-[#2B2E83]">
                                        Review submissions in Course Studio <ArrowUpRight className="h-3 w-3" />
                                    </Link>
                                ) : null}
                            </div>
                        );
                    })}
                </div>
            </section>

            {isStudent && submittedAnswers.length > 0 && (
                <section className="space-y-3">
                    <h3 className="text-lg font-semibold text-slate-900">Your submitted answers</h3>
                    <div className="space-y-2 text-sm">
                        {submittedAnswers.map((answer) => (
                            <div key={answer.id} className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{answer.label}</p>
                                <p className="mt-1 whitespace-pre-wrap text-slate-700">{answer.value}</p>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {isStudent && !approved && (
                <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <ClipboardList className="h-4 w-4 text-[#2D8F80]" /> Enrollment form
                    </div>
                    {detail.enrollQuestions.map((question) => (
                        <label key={question.id} className="block text-sm">
                            <span className="text-slate-600">{question.label}</span>
                            <textarea
                                value={answers[question.id] || ""}
                                onChange={(e) => setAnswers((prev) => ({ ...prev, [question.id]: e.target.value }))}
                                placeholder={question.placeholder}
                                className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-[#2D8F80] focus:outline-none"
                            />
                        </label>
                    ))}
                    <input
                        value={joinCodeInput}
                        onChange={(e) => setJoinCodeInput(e.target.value)}
                        placeholder="Course code (optional)"
                        className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-[#2D8F80] focus:outline-none"
                    />
                    <p className="text-xs text-slate-500">Have a fast-track code? Enter it to skip the approval queue.</p>
                    <button
                        onClick={() => {
                            const sanitized = Object.fromEntries(
                                Object.entries(answers)
                                    .map(([key, value]) => [key, value?.trim?.() || ""] as const)
                                    .filter(([, value]) => Boolean(value))
                            ) as Record<string, string>;
                            onEnroll({ answers: sanitized, joinCode: joinCodeInput || undefined });
                        }}
                        disabled={isBusy}
                        className="w-full rounded-full bg-[#2D8F80] px-4 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60"
                    >
                        {isBusy ? "Submitting…" : "Submit enrollment"}
                    </button>
                </div>
            )}

            {approved && (
                <div className="rounded-3xl border border-[#2D8F80]/30 bg-[#E8F7F4] p-5 text-sm text-slate-700">
                    <p className="font-semibold text-[#1F6C62]">You&rsquo;re enrolled!</p>
                    <p>Materials and assignments are unlocked. Add sessions to your calendar and stay tuned for announcements.</p>
                </div>
            )}
        </div>
    );
}

function StatPill({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
    return (
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {icon}
                {label}
            </div>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
        </div>
    );
}

function CourseCalendar({ sessions, calendarUrl }: { sessions: CourseSession[]; calendarUrl?: string | null }) {
    const unlocked = Boolean(calendarUrl);
    const groups = groupSessionsByDay(sessions);
    return (
        <div className="rounded-3xl border border-slate-100 bg-[#F8FAFF] p-4 text-sm shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#2B2E83]">Calendar sync</p>
                    <p className="text-slate-600">Download the .ics feed to drop every session into your calendar.</p>
                </div>
                {unlocked ? (
                    <a
                        href={calendarUrl ? `/api${calendarUrl}` : "#"}
                        className="inline-flex items-center gap-2 rounded-full border border-[#2B2E83] px-3 py-1 text-xs font-semibold text-[#2B2E83]"
                        download
                    >
                        <Download className="h-3.5 w-3.5" /> Download
                    </a>
                ) : (
                    <span className="text-xs text-slate-500">Apply or get approved to unlock the download.</span>
                )}
            </div>
            <div className="mt-4 space-y-3">
                {groups.length === 0 ? (
                    <p className="text-xs text-slate-500">No sessions scheduled yet.</p>
                ) : (
                    groups.map((group) => (
                        <div key={group.key} className="rounded-2xl border border-white/60 bg-white p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-[#2B2E83]">{group.label}</p>
                            <ul className="mt-1 space-y-1 text-xs text-slate-600">
                                {group.sessions.map((session) => (
                                    <li key={session.id} className="flex items-center justify-between gap-2">
                                        <span>{session.mode || session.location || "Session"}</span>
                                        <span className="font-mono text-[11px] text-slate-500">{formatTimeRange(session)}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

function CourseApplicationTimeline({ status }: { status?: string | null }) {
    const normalized = status ? status.toUpperCase() : null;
    const steps = [
        { id: "APPLY", title: "Apply", description: "Complete the enrollment form" },
        { id: "REVIEW", title: "Review", description: "Instructor reviews your answers" },
        { id: "ENROLLED", title: "Enrolled", description: "Unlock materials & sessions" },
    ];
    const currentIndex = normalized === "APPROVED" ? 2 : normalized === "PENDING" ? 1 : normalized === "REJECTED" ? 1 : 0;
    return (
        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#2B2E83]">Enrollment journey</p>
            <div className="mt-3 space-y-3">
                {steps.map((step, index) => {
                    const complete = index < currentIndex;
                    const active = index === currentIndex;
                    return (
                        <div key={step.id} className="flex items-start gap-3 text-sm">
                            <span
                                className={`mt-1 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full ${
                                    complete
                                        ? "bg-[#2D8F80]"
                                        : active
                                        ? "border-2 border-[#2D8F80]"
                                        : "border-2 border-slate-200"
                                }`}
                            />
                            <div>
                                <p className={`font-semibold ${complete || active ? "text-slate-900" : "text-slate-500"}`}>
                                    {step.title}
                                </p>
                                <p className="text-xs text-slate-500">{step.description}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
            {normalized === "REJECTED" && (
                <p className="mt-3 text-xs text-[#B6483D]">Need to make changes? Update your answers and resubmit.</p>
            )}
            {normalized === "APPROVED" && <p className="mt-3 text-xs text-[#2D8F80]">You&rsquo;re all set! Check the schedule above.</p>}
        </div>
    );
}

function formatDate(iso?: string | null, options?: Intl.DateTimeFormatOptions) {
    if (!iso) return "TBA";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "TBA";
    return date.toLocaleDateString(undefined, options ?? { month: "short", day: "numeric", year: "numeric" });
}

function formatTimeRange(session: CourseSession) {
    if (!session.startsAt) return "TBA";
    const start = new Date(session.startsAt);
    if (Number.isNaN(start.getTime())) return "TBA";
    const end = session.endsAt ? new Date(session.endsAt) : null;
    const formatter = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
    const startLabel = formatter.format(start);
    const endLabel = end && !Number.isNaN(end.getTime()) ? formatter.format(end) : null;
    return endLabel ? `${startLabel} – ${endLabel}` : startLabel;
}

function groupSessionsByDay(sessions: CourseSession[]) {
    const buckets = new Map<string, CourseSession[]>();
    sessions.forEach((session) => {
        if (!session.startsAt) return;
        const date = new Date(session.startsAt);
        if (Number.isNaN(date.getTime())) return;
        const key = date.toISOString().split("T")[0];
        const bucket = buckets.get(key) || [];
        bucket.push(session);
        buckets.set(key, bucket);
    });
    return Array.from(buckets.entries())
        .map(([key, rows]) => ({
            key,
            label: formatDate(rows[0]?.startsAt, { weekday: "short", month: "short", day: "numeric" }),
            sessions: rows.sort((a, b) => {
                const aTime = a.startsAt ? new Date(a.startsAt).getTime() : 0;
                const bTime = b.startsAt ? new Date(b.startsAt).getTime() : 0;
                return aTime - bTime;
            }),
        }))
        .sort((a, b) => {
            const aTime = a.sessions[0]?.startsAt ? new Date(a.sessions[0].startsAt).getTime() : 0;
            const bTime = b.sessions[0]?.startsAt ? new Date(b.sessions[0].startsAt).getTime() : 0;
            return aTime - bTime;
        })
        .slice(0, 6);
}
