"use client";

import { type ChangeEvent, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
    ArrowUpRight,
    CalendarDays,
    ClipboardList,
    Clock,
    Download,
    File as FileIcon,
    FileText,
    Link2,
    Lock,
    MessageSquare,
    Paperclip,
    Send,
    Shield,
    Sparkles,
    UsersRound,
    Video,
} from "lucide-react";

import SiteNav from "@/components/site-nav";
import { useCurrentUser } from "@/hooks/use-current-user";
import { api } from "@/lib/api";
import { copyToClipboard } from "@/lib/copy-to-clipboard";
import { EASE, FADES, STAGGER, SURFACES } from "@/lib/motion-presets";
import { uploadAsset } from "@/lib/upload";
import { fetchCourseWorkspace } from "./load-course";
import {
    type AssignmentReminder,
    type CourseAssignment,
    type CourseAttachment,
    type CourseDetail,
    type CourseLesson,
    type CourseMessage,
    type CourseSession,
    type CourseTag,
    type EnrollmentListItem,
    type EnrollmentRecord,
    type LiveCourse,
    type ViewerState,
} from "./types";
import { formatDate, formatTimeRange, groupSessionsByDay } from "./utils";

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

export default function CoursesPage() {
    const router = useRouter();
    const { user } = useCurrentUser();
    const [mounted, setMounted] = useState(false);
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
    const [interestTags, setInterestTags] = useState<CourseTag[]>([]);
    const [activeInterest, setActiveInterest] = useState<string | null>(null);

    useEffect(() => { setMounted(true); }, []);

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
        let active = true;
        (async () => {
            try {
                const res = await fetch("/api/courses/tags", { cache: "no-store" });
                const json = await res.json();
                if (!active) return;
                setInterestTags(Array.isArray(json?.tags) ? (json.tags as CourseTag[]) : []);
            } catch {
                if (active) setInterestTags([]);
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
    const displayedCatalog = useMemo(() => {
        if (!activeInterest) return catalog;
        return catalog.filter((course) => course.tags?.some((tag) => tag.slug === activeInterest));
    }, [catalog, activeInterest]);
    const interestOptions: CourseTag[] = useMemo(() => {
        if (interestTags.length > 0) return interestTags;
        return categories.map((category) => ({
            label: category.title,
            slug: category.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
            description: category.description,
            count: undefined,
        }));
    }, [interestTags]);

    useEffect(() => {
        if (!detail || !viewer) return;
        if (viewer.isEnrolled) {
            setEnrolledIds((prev) => (prev.includes(detail.id) ? prev : [...prev, detail.id]));
        }
        if (viewer.enrollmentStatus) {
            setMyEnrollments((prev) =>
                prev.map((row) => (row.courseId === detail.id ? { ...row, status: viewer.enrollmentStatus! } : row)),
            );
        }
    }, [detail, viewer]);

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

    useEffect(() => {
        if (!detail) return;
        const record = myEnrollments.find((row) => row.courseId === detail.id);
        if (!record || !record.status) return;
        setViewer((prev) => {
            if (!prev) return prev;
            const approved = record.status === "APPROVED";
            if (prev.enrollmentStatus === record.status && prev.isEnrolled === approved) {
                return prev;
            }
            return { ...prev, enrollmentStatus: record.status, isEnrolled: approved };
        });
    }, [detail, myEnrollments]);

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

    async function loadCourseDetail(courseId: string) {
        const payload = await fetchCourseWorkspace(courseId);
        setDetail(payload.detail);
        setViewer(payload.viewer);
        setManagerEnrollments(payload.enrollments);
        hydrateAssignmentDrafts(payload.detail?.assignments || []);
    }

    async function openCourseDrawer(courseId: string) {
        setSelectedId(courseId);
        setDrawerOpen(true);
        setDrawerBusy(true);
        setStatus(null);
        try {
            await loadCourseDetail(courseId);
        } catch (err) {
            setStatus(err instanceof Error ? err.message : "Unable to load course");
        } finally {
            setDrawerBusy(false);
        }
    }

    async function refreshDetail() {
        if (!selectedId) return;
        try {
            setDrawerBusy(true);
            await loadCourseDetail(selectedId);
        } catch (err) {
            setStatus(err instanceof Error ? err.message : "Unable to refresh course");
        } finally {
            setDrawerBusy(false);
        }
    }

    async function handleEnrollAction(enrollmentId: string, status: "APPROVED" | "REJECTED") {
        if (!detail) return;
        try {
            const res = await api(`/courses/${detail.id}/enrollments/${enrollmentId}`, {
                method: "PATCH",
                body: JSON.stringify({ status }),
            });
            const json = await res.json();
            if (!res.ok || json?.ok === false) throw new Error(json?.msg || "Unable to update enrollment");
            if (Array.isArray(json?.enrollments)) {
                setManagerEnrollments(json.enrollments as EnrollmentRecord[]);
            } else {
                setManagerEnrollments((prev) =>
                    prev.map((e) => (e.id === enrollmentId ? { ...e, status } : e)),
                );
            }
            setStatus(status === "APPROVED" ? "Student approved — they now have full course access." : "Enrollment rejected.");
        } catch (err) {
            setStatus(err instanceof Error ? err.message : "Unable to update enrollment");
        }
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
        <div className="min-h-dvh bg-[#F6F8FC] dark:bg-slate-900 text-slate-800 dark:text-slate-100">
            <SiteNav />
            <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-10">
                <motion.div {...FADES.gentleUp} className="flex items-center gap-2 text-sm font-semibold text-[#2D8F80]">
                    <Sparkles className="h-5 w-5" /> Course suite
                </motion.div>

                <motion.section
                    {...FADES.floatUp}
                    className="mt-6 rounded-[36px] bg-white p-6 shadow-2xl shadow-slate-200/70 sm:p-10"
                    transition={{ duration: 0.7, ease: EASE.drift }}
                >
                    <motion.div
                        className="flex flex-col gap-8 md:flex-row md:items-center"
                        initial="initial"
                        animate="animate"
                        variants={{
                            initial: {},
                            animate: { transition: STAGGER.slow },
                        }}
                    >
                        <motion.div variants={FADES.gentleUp} className="flex-1">
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
                                {mounted && canCreateCourses && (
                                    <Link
                                        href="/courses/studio"
                                        className="rounded-full bg-[#2B2E83] px-5 py-2 text-sm font-semibold text-white hover:brightness-110"
                                    >
                                        Launch Course Studio
                                    </Link>
                                )}
                            </div>
                        </motion.div>
                        <motion.div
                            variants={{ animate: { transition: STAGGER.brisk } }}
                            className="flex flex-col gap-4 md:w-[320px]"
                        >
                            {heroCourses.map((course, idx) => (
                                <motion.div
                                    key={course.title}
                                    initial={SURFACES.lift.initial}
                                    animate={SURFACES.lift.animate(idx * 0.08)}
                                    whileHover={SURFACES.lift.whileHover}
                                    className="rounded-3xl border border-slate-100 bg-[#F9FBFF] p-4"
                                >
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
                        </motion.div>
                    </motion.div>
                    <motion.div
                        className="mt-6 grid gap-4 rounded-3xl bg-slate-50 p-4 sm:grid-cols-2"
                        initial="initial"
                        animate="animate"
                        variants={{
                            initial: {},
                            animate: { transition: STAGGER.brisk },
                        }}
                    >
                        <motion.div variants={FADES.gentleUp}>
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
                        </motion.div>
                        <motion.div variants={FADES.gentleUp} className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-600">
                            <p className="text-sm font-semibold text-slate-800">Need help?</p>
                            <p>Share codes with teammates, review contact submissions in the admin inbox, or hop into the tutor dashboard to stage lessons.</p>
                            <Link href="/contact" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#2D8F80]">
                                Contact the SparkHub team <ArrowUpRight className="h-4 w-4" />
                            </Link>
                        </motion.div>
                    </motion.div>
                </motion.section>

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
                                                    onClick={() => router.push(`/courses/${enrollment.courseId}`)}
                                                    className="rounded-full border border-slate-200 px-4 py-1.5 font-semibold text-slate-800 hover:border-slate-300"
                                                >
                                                    Open workspace
                                                </button>
                                                {!approved ? (
                                                    <span className="rounded-full bg-amber-50 px-3 py-1 font-semibold text-amber-700">Waiting for instructor</span>
                                                ) : (
                                                    <span className="rounded-full bg-[#E8F7F4] px-3 py-1 font-semibold text-[#1F6C62]">Approved</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                )}

                {mounted && canCreateCourses && <CourseBuilderCard onCreated={(course) => setCatalog((prev) => [course, ...prev])} />}

                <section className="mt-12" id="catalog">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <h2 className="text-2xl font-semibold text-slate-900">Live catalog</h2>
                            <p className="text-sm text-slate-600">Always up to date with the live SparkHub course catalog.</p>
                        </div>
                        {status && <p className="text-sm text-[#2D8F80]">{status}</p>}
                    </div>
                    <div className="mt-6 grid gap-5 md:grid-cols-2">
                        {loadingCatalog && <p className="text-sm text-slate-500">Loading courses…</p>}
                        {!loadingCatalog && catalog.length === 0 && <p className="text-sm text-slate-500">No published courses yet.</p>}
                        {!loadingCatalog && catalog.length > 0 && displayedCatalog.length === 0 && (
                            <p className="text-sm text-slate-500">No courses match this interest yet.</p>
                        )}
                        {displayedCatalog.map((course) => (
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
                                    {course.tags && course.tags.length > 0 && (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-[#EEF0FF] px-3 py-1 text-[#2B2E83]">
                                            <Link2 className="h-3 w-3" /> {course.tags[0]?.label}
                                        </span>
                                    )}
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

                <section className="mt-16" id="interests">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h2 className="text-2xl font-semibold text-slate-900">Browse by interest</h2>
                            <p className="text-sm text-slate-500">Tap a tag to filter the live catalog.</p>
                        </div>
                        {activeInterest && (
                            <button
                                type="button"
                                onClick={() => setActiveInterest(null)}
                                className="rounded-full border border-slate-200 px-4 py-1 text-xs font-semibold text-slate-600"
                            >
                                Clear filter
                            </button>
                        )}
                    </div>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {interestOptions.map((tag) => (
                            <button
                                key={tag.slug}
                                type="button"
                                onClick={() => setActiveInterest(tag.slug)}
                                className={`rounded-3xl border p-4 text-left shadow-sm transition ${
                                    activeInterest === tag.slug
                                        ? "border-[#2B2E83] bg-[#EEF0FF] text-[#2B2E83]"
                                        : "border-slate-100 bg-white text-slate-700 hover:border-[#2B2E83]"
                                }`}
                            >
                                <p className="text-base font-semibold">{tag.label}</p>
                                <p className="mt-1 text-xs text-slate-500">
                                    {tag.count ? `${tag.count} course${tag.count > 1 ? "s" : ""}` : tag.description || "See matching cohorts"}
                                </p>
                            </button>
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
                        className="fixed inset-0 z-[80] bg-slate-900/40 backdrop-blur-sm"
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
                                    onEnrollAction={handleEnrollAction}
                                    assignmentDrafts={assignmentDrafts}
                                    onAssignmentDraftChange={handleAssignmentDraftChange}
                                    onAssignmentSubmit={handleAssignmentSubmit}
                                    assignmentBusy={assignmentBusy}
                                    onOpenFullPage={(courseId) => {
                                        setDrawerOpen(false);
                                        router.push(`/courses/${courseId}`);
                                    }}
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

export function CourseDetailPanel({
                                      detail,
                                      viewer,
                                      userRole,
                                      isBusy,
                                      onClose,
                                      onEnroll,
                                      managerEnrollments,
                                      onEnrollAction,
                                      assignmentDrafts,
                                      onAssignmentDraftChange,
                                      onAssignmentSubmit,
                                      assignmentBusy,
                                      onOpenFullPage,
                                      showCloseButton = true,
                                  }: {
    detail: CourseDetail;
    viewer: ViewerState | null;
    userRole?: string;
    isBusy: boolean;
    onClose: () => void;
    onEnroll: (payload: { answers: Record<string, string>; joinCode?: string }) => Promise<void>;
    managerEnrollments: EnrollmentRecord[];
    onEnrollAction?: (enrollmentId: string, status: "APPROVED" | "REJECTED") => Promise<void>;
    assignmentDrafts: Record<string, { note: string; attachmentUrl?: string }>;
    onAssignmentDraftChange: (assignmentId: string, patch: Partial<{ note: string; attachmentUrl?: string }>) => void;
    onAssignmentSubmit: (assignmentId: string) => Promise<void>;
    assignmentBusy: string | null;
    onOpenFullPage?: (courseId: string) => void;
    showCloseButton?: boolean;
}) {
    const [answers, setAnswers] = useState<Record<string, string>>(viewer?.formAnswers || {});
    const [joinCodeInput, setJoinCodeInput] = useState("");
    const [copyStatus, setCopyStatus] = useState<string | null>(null);
    const [lessonPreview, setLessonPreview] = useState<CourseLesson | null>(null);
    const [enrollActionBusy, setEnrollActionBusy] = useState<string | null>(null);

    useEffect(() => {
        setAnswers(viewer?.formAnswers || {});
        setJoinCodeInput("");
        setCopyStatus(null);
    }, [detail.id, viewer?.formAnswers]);

    const canManage = viewer?.canManage;
    const isStudent = userRole === "STUDENT";
    const pendingEnrollments = useMemo(
        () => managerEnrollments.filter((row) => row.status === "PENDING"),
        [managerEnrollments],
    );
    const pendingCount = pendingEnrollments.length;
    const pastDueAssignments = useMemo(() => {
        if (viewer?.canManage) return detail.assignmentSummary?.pastDueCourse ?? [];
        return detail.assignmentSummary?.pastDueViewer ?? [];
    }, [detail.assignmentSummary, viewer?.canManage]);
    const approved = viewer?.enrollmentStatus === "APPROVED";
    const enrollmentLabel = useMemo(() => {
        if (!viewer?.enrollmentStatus) return null;
        if (viewer.enrollmentStatus === "APPROVED") return "Enrolled";
        if (viewer.enrollmentStatus === "PENDING") return "Pending approval";
        if (viewer.enrollmentStatus === "REJECTED") return "Needs revision";
        return viewer.enrollmentStatus;
    }, [viewer?.enrollmentStatus]);
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
        const copied = await copyToClipboard(detail.joinCode);
        setCopyStatus(copied ? "Join code copied" : "Unable to copy code");
        if (copied) {
            window.setTimeout(() => setCopyStatus(null), 2200);
        }
    }

    return (
        <div className="space-y-8">
            <section id="overview" className="space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-[#5C9E95]">Course workspace</p>
                        <h2 className="text-3xl font-semibold text-slate-900">{detail.title}</h2>
                        <p className="mt-2 text-sm text-slate-600">{detail.summary}</p>
                        {detail.tags && detail.tags.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                                {detail.tags.map((tag) => (
                                    <span
                                        key={tag.slug}
                                        className="rounded-full bg-[#EEF2FF] px-3 py-1 text-[11px] font-semibold text-[#2B2E83]"
                                    >
                                        {tag.label}
                                    </span>
                                ))}
                            </div>
                        )}
                        {enrollmentLabel && (
                            <span
                                className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                                    approved ? "bg-[#E8F7F4] text-[#1F6C62]" : "bg-[#FFF4E5] text-[#9C6200]"
                                }`}
                            >
                                Status: {enrollmentLabel}
                            </span>
                        )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {onOpenFullPage && (
                            <button
                                type="button"
                                onClick={() => onOpenFullPage(detail.id)}
                                className="rounded-full border border-slate-200 px-4 py-1 text-xs font-semibold text-slate-700 hover:border-slate-300"
                            >
                                Launch full page
                            </button>
                        )}
                        {showCloseButton && (
                            <button
                                onClick={onClose}
                                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500"
                            >
                                Close
                            </button>
                        )}
                    </div>
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
            </section>

            <section id="meetings" className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900">Meeting links</h3>
                    {viewer?.calendarUnlocked && detail.calendarDownloadUrl && (
                        <Link
                            href={detail.calendarDownloadUrl}
                            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
                        >
                            Download calendar <Download className="h-3.5 w-3.5" />
                        </Link>
                    )}
                </div>
                {detail.meetingLinks.length === 0 ? (
                    <p className="text-sm text-slate-500">Instructors will drop live meeting links here once the cohort starts.</p>
                ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                        {detail.meetingLinks.map((link) => (
                            <div key={link.id} className="rounded-2xl border border-slate-100 bg-white p-4 text-sm shadow-sm">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="font-semibold text-slate-900">{link.title}</p>
                                        <p className="text-xs text-slate-500">{formatDate(link.createdAt)}</p>
                                    </div>
                                    <Link
                                        href={link.url}
                                        target="_blank"
                                        className="inline-flex items-center gap-1 rounded-full bg-[#2B2E83] px-3 py-1 text-xs font-semibold text-white"
                                    >
                                        Join call <Video className="h-3 w-3" />
                                    </Link>
                                </div>
                                {link.note && <p className="mt-2 text-slate-600">{link.note}</p>}
                            </div>
                        ))}
                    </div>
                )}
            </section>

            <CourseTeamChannel
                detail={detail}
                viewer={viewer}
                pendingEnrollments={pendingEnrollments}
            />

            <CourseChatBoard detail={detail} viewer={viewer} />

            <section id="schedule" className="space-y-3">
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

            {canManage && pendingEnrollments.length > 0 && (
                <section className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-slate-900">Enrollment queue</h3>
                        <span className="text-xs text-slate-500">{pendingCount} pending</span>
                    </div>
                    <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                        {pendingEnrollments.map((record) => (
                            <div
                                key={record.id}
                                className="rounded-2xl border border-slate-100 bg-white p-3 text-sm shadow-sm space-y-2"
                            >
                                <div className="flex items-center justify-between gap-3">
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
                                    <span className="rounded-full bg-[#FFF4E5] px-3 py-1 text-xs font-semibold text-[#9C6200]">
                                        {record.status}
                                    </span>
                                </div>
                                {record.formAnswers?.intent && (
                                    <p className="text-xs text-slate-500 italic pl-1 line-clamp-2">&ldquo;{record.formAnswers.intent}&rdquo;</p>
                                )}
                                {onEnrollAction && (
                                    <div className="flex gap-2 pt-1">
                                        <button
                                            type="button"
                                            disabled={enrollActionBusy === record.id}
                                            onClick={async () => {
                                                setEnrollActionBusy(record.id);
                                                try { await onEnrollAction(record.id, "APPROVED"); } finally { setEnrollActionBusy(null); }
                                            }}
                                            className="flex-1 rounded-full bg-[#E8F7F4] px-3 py-1.5 text-xs font-semibold text-[#1F6C62] hover:bg-[#C5EDEA] disabled:opacity-50 transition-colors"
                                        >
                                            {enrollActionBusy === record.id ? "…" : "✓ Approve"}
                                        </button>
                                        <button
                                            type="button"
                                            disabled={enrollActionBusy === record.id}
                                            onClick={async () => {
                                                setEnrollActionBusy(record.id);
                                                try { await onEnrollAction(record.id, "REJECTED"); } finally { setEnrollActionBusy(null); }
                                            }}
                                            className="flex-1 rounded-full bg-[#FDECEC] px-3 py-1.5 text-xs font-semibold text-[#B6483D] hover:bg-[#FAD5D5] disabled:opacity-50 transition-colors"
                                        >
                                            {enrollActionBusy === record.id ? "…" : "✕ Reject"}
                                        </button>
                                    </div>
                                )}
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
                            {(lesson.contentUrl || lesson.attachmentUrl) && (
                                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                                    <button
                                        type="button"
                                        onClick={() => setLessonPreview(lesson)}
                                        className="inline-flex items-center gap-2 rounded-full bg-[#2B2E83] px-3 py-1.5 font-semibold text-white"
                                    >
                                        View lesson
                                    </button>
                                    <Link
                                        href={lesson.contentUrl || lesson.attachmentUrl || "#"}
                                        target="_blank"
                                        className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 font-semibold text-slate-700"
                                    >
                                        Download deck
                                    </Link>
                                </div>
                            )}
                            {lesson.videoUrl && (
                                <Link href={lesson.videoUrl} className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-[#2B2E83]">
                                    Watch lesson <ArrowUpRight className="h-3 w-3" />
                                </Link>
                            )}
                        </div>
                    ))}
                </div>
            </section>

            <section className="space-y-3" id="materials">
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
                                <>
                                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                                        {material.attachmentUrl && (
                                            <Link
                                                href={material.attachmentUrl}
                                                target="_blank"
                                                className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-[#2D8F80]"
                                            >
                                                <FileText className="h-3.5 w-3.5" /> Download
                                            </Link>
                                        )}
                                        {material.contentUrl && (
                                            <Link
                                                href={material.contentUrl}
                                                target="_blank"
                                                className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-[#2D8F80]"
                                            >
                                                <ArrowUpRight className="h-3.5 w-3.5" /> Open link
                                            </Link>
                                        )}
                                    </div>
                                    {!material.locked && material.inlineViewer && (material.contentUrl || material.attachmentUrl) ? (
                                        <InlineDeckViewer
                                            url={material.contentUrl || material.attachmentUrl}
                                            contentType={material.contentType}
                                            title={material.title}
                                        />
                                    ) : null}
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </section>

            {lessonPreview && (
                <LessonPreviewDialog lesson={lessonPreview} onClose={() => setLessonPreview(null)} />
            )}

            {pastDueAssignments.length > 0 && (
                <PastDueAssignmentsPanel
                    assignments={pastDueAssignments}
                    viewerIsManager={Boolean(viewer?.canManage)}
                />
            )}

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

            {isStudent && (submittedAnswers.length > 0 || !approved) && (
                <section id="enrollment" className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <ClipboardList className="h-4 w-4 text-[#2D8F80]" /> Enrollment center
                    </div>
                    {submittedAnswers.length > 0 && (
                        <div className="space-y-2 text-sm">
                            {submittedAnswers.map((answer) => (
                                <div key={answer.id} className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{answer.label}</p>
                                    <p className="mt-1 whitespace-pre-wrap text-slate-700">{answer.value}</p>
                                </div>
                            ))}
                        </div>
                    )}
                    {!approved && (
                        <div className="space-y-4">
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
                                className="w-full rounded-2xl border border-dashed border-slate-300 px-3 py-2 text-sm focus:border-[#2D8F80] focus:outline-none"
                            />
                            <p className="text-xs text-slate-500">Have a fast-track code? Enter it to skip the approval queue.</p>
                            <div className="flex flex-wrap items-center gap-3">
                                <button
                                    onClick={() => {
                                        const sanitized = Object.fromEntries(
                                            Object.entries(answers)
                                                .map(([key, value]) => [key, value?.trim?.() || ""] as const)
                                                .filter(([, value]) => Boolean(value))
                                        ) as Record<string, string>;
                                        onEnroll({ answers: sanitized });
                                    }}
                                    disabled={isBusy}
                                    className="rounded-full bg-[#2D8F80] px-4 py-2 text-xs font-semibold text-white hover:brightness-110 disabled:opacity-60"
                                >
                                    {isBusy ? "Submitting…" : "Apply"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const sanitized = Object.fromEntries(
                                            Object.entries(answers)
                                                .map(([key, value]) => [key, value?.trim?.() || ""] as const)
                                                .filter(([, value]) => Boolean(value))
                                        ) as Record<string, string>;
                                        onEnroll({ answers: sanitized, joinCode: joinCodeInput || undefined });
                                    }}
                                    disabled={isBusy || !joinCodeInput.trim()}
                                    className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 disabled:opacity-60"
                                >
                                    {isBusy ? "Checking code…" : "Apply with code"}
                                </button>
                            </div>
                        </div>
                    )}
                </section>
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

function CourseTeamChannel({
                               detail,
                               viewer,
                               pendingEnrollments,
                           }: {
    detail: CourseDetail;
    viewer: ViewerState | null;
    pendingEnrollments: EnrollmentRecord[];
}) {
    const storageKey = `sparkhub-course-dismissed-${detail.id}`;
    const [noteDraft, setNoteDraft] = useState("");
    const [channelMessages, setChannelMessages] = useState<CourseMessage[]>(detail.channelMessages ?? []);
    const [channelStatus, setChannelStatus] = useState<string | null>(null);
    const [channelBusy, setChannelBusy] = useState(false);
    const [staffOnly, setStaffOnly] = useState(false);
    const [dismissedIds, setDismissedIds] = useState<string[]>([]);
    const canViewChannel = Boolean(viewer?.isEnrolled || viewer?.canManage);
    const canPost = canViewChannel;
    const canRestrict = Boolean(viewer?.canManage);

    useEffect(() => {
        if (typeof window === "undefined") return;
        try {
            const stored = window.localStorage.getItem(storageKey);
            setDismissedIds(stored ? (JSON.parse(stored) as string[]) : []);
        } catch {
            setDismissedIds([]);
        }
    }, [storageKey]);

    useEffect(() => {
        setChannelMessages(detail.channelMessages ?? []);
    }, [detail.channelMessages, detail.id]);

    const refreshChannel = useCallback(async () => {
        if (!canViewChannel) return;
        try {
            const res = await api(`/courses/${detail.id}/messages`, { method: "GET" });
            const json = await res.json();
            if (!res.ok || json?.ok === false) throw new Error(json?.msg || "Unable to load channel");
            setChannelMessages(Array.isArray(json?.list) ? (json.list as CourseMessage[]) : []);
        } catch (err) {
            if (canRestrict) setChannelStatus(err instanceof Error ? err.message : "Unable to load channel");
        }
    }, [canViewChannel, detail.id, canRestrict]);

    useEffect(() => {
        if (!canViewChannel || typeof window === "undefined") return;
        const timer = window.setInterval(() => {
            refreshChannel();
        }, 45000);
        return () => window.clearInterval(timer);
    }, [canViewChannel, refreshChannel]);

    const pending = useMemo(() => pendingEnrollments.filter((row) => row.status === "PENDING"), [pendingEnrollments]);

    function persistDismissed(next: string[]) {
        if (typeof window === "undefined") return;
        window.localStorage.setItem(storageKey, JSON.stringify(next));
    }

    function dismissEvent(eventId: string) {
        setDismissedIds((prev) => {
            if (prev.includes(eventId)) return prev;
            const next = [...prev, eventId];
            persistDismissed(next);
            return next;
        });
    }

    type TimelineEvent = {
        id: string;
        title: string;
        description?: string | null;
        timestamp?: string | null;
        badge: string;
        accent: string;
        href?: string | null;
        canDismiss: boolean;
    };

    const events = useMemo(() => {
        const updates: TimelineEvent[] = [];
        detail.assignments.forEach((assignment) => {
            const viewerSubmitted = Boolean(assignment.viewerSubmission);
            if (!viewer?.canManage && viewerSubmitted) return;
            let accent = "bg-[#EEF2FF] text-[#2B2E83]";
            if (assignment.dueStatus === "PAST_DUE") {
                accent = "bg-[#FDECEC] text-[#B6483D]";
            } else if (assignment.dueStatus === "DUE_SOON") {
                accent = "bg-[#FFF4E5] text-[#9C6200]";
            }
            updates.push({
                id: `assignment-${assignment.id}`,
                title: `Assignment • ${assignment.title}`,
                description:
                    assignment.description || (assignment.dueAt ? `Due ${formatDate(assignment.dueAt)}` : "No due date yet"),
                timestamp: assignment.dueAt || assignment.id,
                badge: assignment.dueStatus || "Assignment",
                accent,
                href: undefined,
                canDismiss: Boolean(viewer?.isEnrolled),
            });
        });

        detail.materials.forEach((material) => {
            if (material.locked) return;
            updates.push({
                id: `material-${material.id}`,
                title: `Material • ${material.title}`,
                description: material.description || material.visibility,
                timestamp: material.createdAt,
                badge: material.visibility,
                accent: material.visibility === "PUBLIC" ? "bg-[#E8F7F4] text-[#1F6C62]" : "bg-[#FDF2FA] text-[#A21CAF]",
                href: material.attachmentUrl || material.contentUrl || undefined,
                canDismiss: Boolean(viewer?.isEnrolled),
            });
        });

        detail.sessions.forEach((session) => {
            updates.push({
                id: `session-${session.id}`,
                title: `Session • ${formatDate(session.startsAt)}`,
                description: session.location || session.mode || "Virtual",
                timestamp: session.startsAt,
                badge: "Session",
                accent: "bg-[#FFF4E5] text-[#9C6200]",
                canDismiss: false,
            });
        });

        detail.meetingLinks.forEach((link) => {
            updates.push({
                id: `meeting-${link.id}`,
                title: `Meeting • ${link.title}`,
                description: link.note || link.url,
                timestamp: link.createdAt,
                badge: "Meeting",
                accent: "bg-[#E8F7F4] text-[#1F6C62]",
                href: link.url,
                canDismiss: Boolean(viewer?.isEnrolled),
            });
        });

        if (viewer?.canManage) {
            pending.forEach((record) => {
                updates.push({
                    id: `enrollment-${record.id}`,
                    title: `Request • ${record.user?.name || "New learner"}`,
                    description: record.formAnswers?.intent || record.user?.email,
                    timestamp: record.createdAt,
                    badge: record.status,
                    accent: "bg-[#FFF4E5] text-[#9C6200]",
                    canDismiss: true,
                });
            });
        }

        return updates
            .map((event) => ({ ...event, timestampMs: event.timestamp ? new Date(event.timestamp).getTime() : 0 }))
            .sort((a, b) => b.timestampMs - a.timestampMs)
            .slice(0, 24);
    }, [detail.assignments, detail.materials, detail.sessions, detail.meetingLinks, viewer?.canManage, viewer?.isEnrolled, pending]);

    const visibleEvents = useMemo(() => events.filter((event) => !dismissedIds.includes(event.id)), [events, dismissedIds]);
    const orderedMessages = useMemo(
        () => [...channelMessages].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
        [channelMessages],
    );

    async function handleAddNote() {
        if (!noteDraft.trim() || !canPost) return;
        try {
            setChannelBusy(true);
            setChannelStatus(null);
            const res = await api(`/courses/${detail.id}/messages`, {
                method: "POST",
                body: JSON.stringify({
                    content: noteDraft.trim(),
                    visibility: staffOnly ? "STAFF" : "ENROLLED",
                    kind: "CHANNEL",
                }),
            });
            const json = await res.json();
            if (!res.ok || json?.ok === false) throw new Error(json?.msg || "Unable to post");
            setNoteDraft("");
            setChannelStatus("Posted to channel");
            setTimeout(() => setChannelStatus(null), 2000);
            await refreshChannel();
        } catch (err) {
            setChannelStatus(err instanceof Error ? err.message : "Unable to post to channel");
        } finally {
            setChannelBusy(false);
        }
    }

    return (
        <section id="channel" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-slate-900">Team channel</h3>
                <span className="text-xs text-slate-500">Activity feed + staff updates</span>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-2">
                    {visibleEvents.length === 0 ? (
                        <p className="text-sm text-slate-500">No updates yet. Assignments, resources, and sessions will appear here automatically.</p>
                    ) : (
                        visibleEvents.map((event) => (
                            <div key={event.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="font-semibold text-slate-900">{event.title}</p>
                                        <p className="text-xs text-slate-500">{event.timestamp ? formatDate(event.timestamp) : ""}</p>
                                    </div>
                                    <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${event.accent}`}>{event.badge}</span>
                                </div>
                                {event.description && <p className="mt-2 text-sm text-slate-600">{event.description}</p>}
                                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                                    {event.href && (
                                        <Link href={event.href} target="_blank" className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-[#2B2E83]">
                                            Open <ArrowUpRight className="h-3 w-3" />
                                        </Link>
                                    )}
                                    {event.canDismiss && (
                                        <button
                                            type="button"
                                            onClick={() => dismissEvent(event.id)}
                                            className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 font-semibold text-slate-600 hover:border-slate-300"
                                        >
                                            Mark done
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
                <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-semibold text-slate-900">Post to channel</p>
                            <p className="text-xs text-slate-500">Share reminders, meeting recaps, or action items.</p>
                        </div>
                        {canRestrict && (
                            <label className="inline-flex items-center gap-2 text-[11px] text-slate-500">
                                <input
                                    type="checkbox"
                                    checked={staffOnly}
                                    onChange={(event) => setStaffOnly(event.target.checked)}
                                />
                                Staff only
                            </label>
                        )}
                    </div>
                    {canPost ? (
                        <>
                            <textarea
                                value={noteDraft}
                                onChange={(e) => setNoteDraft(e.target.value)}
                                placeholder="Share a reminder or lesson note"
                                className="mt-3 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                                rows={3}
                            />
                            <button
                                type="button"
                                onClick={handleAddNote}
                                disabled={!noteDraft.trim() || channelBusy}
                                className="mt-3 w-full rounded-full bg-[#2B2E83] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                            >
                                {channelBusy ? "Posting…" : "Post to channel"}
                            </button>
                        </>
                    ) : (
                        <p className="mt-3 text-sm text-slate-500">Enroll in this course to see instructor notes.</p>
                    )}
                    {channelStatus && <p className="mt-2 text-xs text-[#2D8F80]">{channelStatus}</p>}
                    <div className="mt-4 space-y-2">
                        {orderedMessages.length === 0 ? (
                            <p className="text-xs text-slate-500">No instructor notes yet.</p>
                        ) : (
                            orderedMessages.slice(0, 5).map((message) => (
                                <div key={message.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600">
                                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                                        <span className="font-semibold text-slate-800">{message.author?.name || "Instructor"}</span>
                                        <span>•</span>
                                        <span>{formatDate(message.createdAt)}</span>
                                        {message.visibility === "STAFF" && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[10px] font-semibold text-[#2B2E83]">
                                                <Shield className="h-3 w-3" /> Staff
                                            </span>
                                        )}
                                    </div>
                                    <p className="mt-1 text-sm text-slate-800">{message.content}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}

function CourseChatBoard({
                             detail,
                             viewer,
                         }: {
    detail: CourseDetail;
    viewer: ViewerState | null;
}) {
    const [messages, setMessages] = useState<CourseMessage[]>(detail.chatMessages ?? []);
    const [draft, setDraft] = useState("");
    const [attachments, setAttachments] = useState<CourseAttachment[]>([]);
    const [chatBusy, setChatBusy] = useState(false);
    const [status, setStatus] = useState<string | null>(null);
    const [pickerKey, setPickerKey] = useState(0);
    const listRef = useRef<HTMLDivElement | null>(null);
    const canChat = Boolean(viewer?.isEnrolled || viewer?.canManage);

    useEffect(() => {
        setMessages(detail.chatMessages ?? []);
    }, [detail.chatMessages, detail.id]);

    const orderedMessages = useMemo(
        () => [...messages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
        [messages],
    );

    useEffect(() => {
        if (!listRef.current) return;
        listRef.current.scrollTop = listRef.current.scrollHeight;
    }, [orderedMessages]);

    const refreshChat = useCallback(async () => {
        if (!canChat) return;
        try {
            const res = await api(`/courses/${detail.id}/chat`, { method: "GET" });
            const json = await res.json();
            if (!res.ok || json?.ok === false) throw new Error(json?.msg || "Unable to load chat");
            setMessages(Array.isArray(json?.list) ? (json.list as CourseMessage[]) : []);
        } catch (err) {
            setStatus(err instanceof Error ? err.message : "Unable to load chat");
        }
    }, [canChat, detail.id]);

    useEffect(() => {
        if (!canChat || typeof window === "undefined") return;
        const timer = window.setInterval(() => {
            refreshChat();
        }, 15000);
        return () => window.clearInterval(timer);
    }, [canChat, refreshChat]);

    async function handleAttachmentPick(event: ChangeEvent<HTMLInputElement>) {
        if (!event.target.files || event.target.files.length === 0) return;
        const remaining = Math.max(0, 3 - attachments.length);
        if (remaining === 0) {
            setStatus("You can attach up to 3 files per message.");
            return;
        }
        const files = Array.from(event.target.files).slice(0, remaining);
        for (const file of files) {
            try {
                setChatBusy(true);
                const url = await uploadAsset(file);
                setAttachments((prev) => [...prev, { url, name: file.name, type: file.type }]);
            } catch (err) {
                setStatus(err instanceof Error ? err.message : "Upload failed");
            } finally {
                setChatBusy(false);
            }
        }
        setPickerKey((prev) => prev + 1);
    }

    function removeAttachment(url: string) {
        setAttachments((prev) => prev.filter((item) => item.url !== url));
    }

    async function handleSend() {
        if (!draft.trim() && attachments.length === 0) {
            setStatus("Add a question or attach a file first.");
            return;
        }
        try {
            setChatBusy(true);
            setStatus(null);
            const res = await api(`/courses/${detail.id}/chat`, {
                method: "POST",
                body: JSON.stringify({ content: draft.trim(), attachments }),
            });
            const json = await res.json();
            if (!res.ok || json?.ok === false) throw new Error(json?.msg || "Unable to send message");
            setDraft("");
            setAttachments([]);
            setPickerKey((prev) => prev + 1);
            await refreshChat();
        } catch (err) {
            setStatus(err instanceof Error ? err.message : "Unable to send message");
        } finally {
            setChatBusy(false);
        }
    }

    return (
        <section className="space-y-3" id="course-chat">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-slate-900">Class chat</h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#EEF2FF] px-3 py-1 text-[11px] font-semibold text-[#2B2E83]">
                    <MessageSquare className="h-3.5 w-3.5" /> Peer Q&A
                </span>
            </div>
            <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
                {canChat ? (
                    <>
                        <div ref={listRef} className="max-h-80 space-y-3 overflow-y-auto pr-1">
                            {orderedMessages.length === 0 ? (
                                <p className="text-sm text-slate-500">Be the first to ask a question or share a resource.</p>
                            ) : (
                                orderedMessages.map((message) => (
                                    <div key={message.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-700">
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            <span className="font-semibold text-slate-800">{message.author?.name || "Learner"}</span>
                                            <span>•</span>
                                            <span>{formatDate(message.createdAt)}</span>
                                        </div>
                                        <p className="mt-1 whitespace-pre-wrap text-slate-800">{message.content}</p>
                                        {message.attachments && message.attachments.length > 0 && (
                                            <div className="mt-2 flex flex-wrap gap-2 text-xs">
                                                {message.attachments.map((file) => (
                                                    <Link
                                                        key={`${message.id}-${file.url}`}
                                                        href={file.url}
                                                        target="_blank"
                                                        className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-[#2D8F80]"
                                                    >
                                                        <FileIcon className="h-3.5 w-3.5" /> {file.name || "Attachment"}
                                                    </Link>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                        {attachments.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2 text-xs">
                                {attachments.map((file) => (
                                    <span
                                        key={file.url}
                                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-slate-600"
                                    >
                                        {file.name || "Attachment"}
                                        <button type="button" onClick={() => removeAttachment(file.url)} className="text-slate-400">
                                            ×
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                        <textarea
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            placeholder="Ask for help, share progress, or drop meeting links"
                            className="mt-3 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                            rows={3}
                        />
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-dashed border-slate-300 px-3 py-1 font-semibold text-slate-600">
                                <Paperclip className="h-3.5 w-3.5" /> Attach file
                                <input key={pickerKey} type="file" multiple className="hidden" onChange={handleAttachmentPick} />
                            </label>
                            <button
                                type="button"
                                onClick={handleSend}
                                disabled={chatBusy}
                                className="inline-flex items-center gap-2 rounded-full bg-[#2B2E83] px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                            >
                                {chatBusy ? "Sending…" : "Send"} <Send className="h-3.5 w-3.5" />
                            </button>
                        </div>
                        {status && <p className="mt-2 text-xs text-[#2D8F80]">{status}</p>}
                    </>
                ) : (
                    <p className="text-sm text-slate-500">Enroll in this course to unlock the chat and collaborate with classmates.</p>
                )}
            </div>
        </section>
    );
}

function PastDueAssignmentsPanel({ assignments, viewerIsManager }: { assignments: AssignmentReminder[]; viewerIsManager: boolean }) {
    return (
        <section className="rounded-3xl border border-[#FECACA] bg-[#FFF5F5] p-4 text-sm text-[#9C1C1C]">
            <div className="flex items-center gap-2 text-[#B6483D]">
                <Clock className="h-4 w-4" />
                <p className="font-semibold">
                    {viewerIsManager ? "Past due assignments" : "You have past due work"}
                </p>
            </div>
            <p className="mt-1 text-xs text-[#B6483D]/80">
                {viewerIsManager
                    ? "Learners are waiting on your review. Use the course workspace to nudge or grade submissions."
                    : "Submit these assignments or ping your instructor if you need an extension."}
            </p>
            <div className="mt-3 space-y-2">
                {assignments.map((assignment) => (
                    <div key={assignment.id} className="rounded-2xl border border-[#FECACA] bg-white px-3 py-2">
                        <p className="font-semibold text-[#9C1C1C]">{assignment.title}</p>
                        <p className="text-xs text-[#B6483D]">{assignment.dueAt ? `Due ${formatDate(assignment.dueAt)}` : "Due date not set"}</p>
                        {viewerIsManager && typeof assignment.outstanding === "number" && (
                            <p className="text-xs text-[#B6483D]/80">{assignment.outstanding} submission(s) pending review</p>
                        )}
                    </div>
                ))}
            </div>
        </section>
    );
}

const OFFICE_EXTENSIONS = new Set(["ppt", "pptx", "pps", "ppsx", "doc", "docx", "xls", "xlsx"]);
const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp", "svg"]);

function useAssetHost() {
    const [host, setHost] = useState(
        () => (typeof window === "undefined" ? process.env.NEXT_PUBLIC_SITE_URL || "" : window.location.origin),
    );
    useEffect(() => {
        if (typeof window === "undefined") return;
        setHost(window.location.origin);
    }, []);
    return host;
}

function resolveAssetUrl(url?: string | null, assetHost?: string) {
    if (!url) return "";
    if (/^https?:\/\//i.test(url)) return url;
    const prefix = assetHost || "";
    if (!prefix) return url;
    if (url.startsWith("/")) return `${prefix}${url}`;
    return `${prefix}/${url}`;
}

function InlineDeckViewer({
                              url,
                              contentType,
                              title,
                              height = 400,
                          }: {
    url?: string | null;
    contentType?: string | null;
    title: string;
    height?: number;
}) {
    const assetHost = useAssetHost();
    const resolved = useMemo(() => resolveAssetUrl(url, assetHost), [url, assetHost]);
    const [officeError, setOfficeError] = useState(false);

    if (!url || !resolved) return null;

    // Detect extension from MIME hint or URL
    const rawExt = (contentType?.includes("pdf") ? "pdf"
        : contentType?.includes("presentationml") || contentType?.includes("powerpoint") ? "pptx"
        : contentType?.includes("wordprocessing") || contentType?.includes("msword") ? "docx"
        : resolved.split("?")[0]?.split(".").pop() || "").toLowerCase();

    const extension = rawExt;

    // Images
    if (IMAGE_EXTENSIONS.has(extension)) {
        return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
                src={resolved}
                alt={`${title} preview`}
                className="mt-3 w-full rounded-2xl border border-slate-100 bg-white object-contain"
                style={{ maxHeight: height }}
            />
        );
    }

    // PDF — native browser rendering; works for any accessible URL
    if (extension === "pdf") {
        return (
            <iframe
                src={resolved}
                title={`${title} document`}
                className="mt-3 w-full rounded-2xl border border-slate-100 bg-white"
                style={{ height }}
            />
        );
    }

    // Office files — use Office Online viewer; requires a publicly reachable URL.
    // Localhost URLs are shown as a download fallback instead.
    const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)/i.test(resolved);
    if (OFFICE_EXTENSIONS.has(extension)) {
        if (isLocalhost || officeError) {
            // Can't embed localhost in Office Online — show download fallback
            return (
                <div className="mt-3 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-8 text-center">
                    <p className="text-xs text-slate-500 max-w-xs">
                        Slide preview requires a publicly accessible URL. Download to view in your browser or office app.
                    </p>
                    <a
                        href={resolved}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        className="inline-flex items-center gap-2 rounded-full bg-[#63C0B9] px-4 py-2 text-xs font-semibold text-white hover:bg-[#2D8F80] transition-colors"
                    >
                        Download {title}
                    </a>
                    <a
                        href={`https://docs.google.com/viewer?url=${encodeURIComponent(resolved)}&embedded=true`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[#2D8F80] underline"
                    >
                        Try Google Docs Viewer ↗
                    </a>
                </div>
            );
        }
        const officeEmbed = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(resolved)}`;
        return (
            <iframe
                src={officeEmbed}
                title={`${title} slides`}
                className="mt-3 w-full rounded-2xl border border-slate-100 bg-white"
                style={{ height }}
                onError={() => setOfficeError(true)}
            />
        );
    }

    return null;
}

function LessonPreviewDialog({ lesson, onClose }: { lesson: CourseLesson; onClose: () => void }) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const handleKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };
        document.addEventListener("keydown", handleKey);
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", handleKey);
            document.body.style.overflow = originalOverflow;
        };
    }, [onClose]);

    if (typeof document === "undefined" || !mounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 px-4 py-10 backdrop-blur-sm">
            <div className="relative flex h-full max-h-[720px] w-full max-w-4xl flex-col rounded-3xl bg-white p-6 shadow-2xl">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#5C9E95]">Lesson preview</p>
                        <p className="text-xl font-semibold text-slate-900">{lesson.title}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full border border-slate-200 px-4 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                        Close
                    </button>
                </div>
                <div className="mt-4 flex-1 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 p-2">
                    {lesson.contentUrl || lesson.attachmentUrl ? (
                        <InlineDeckViewer
                            url={lesson.contentUrl || lesson.attachmentUrl}
                            contentType={lesson.contentType}
                            title={lesson.title}
                            height={520}
                        />
                    ) : (
                        <p className="text-sm text-slate-500">This lesson does not have slides attached yet.</p>
                    )}
                </div>
            </div>
        </div>,
        document.body,
    );
}