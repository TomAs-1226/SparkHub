"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, CalendarDays, ClipboardList, FileText, Lock, Sparkles, UsersRound } from "lucide-react";

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
    enrollQuestions: EnrollQuestion[];
    joinCode?: string;
}

interface ViewerState {
    canManage: boolean;
    isEnrolled: boolean;
}

export default function CoursesPage() {
    const router = useRouter();
    const { user } = useCurrentUser();
    const [catalog, setCatalog] = useState<LiveCourse[]>([]);
    const [loadingCatalog, setLoadingCatalog] = useState(true);
    const [enrolledIds, setEnrolledIds] = useState<string[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [detail, setDetail] = useState<CourseDetail | null>(null);
    const [viewer, setViewer] = useState<ViewerState | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [drawerBusy, setDrawerBusy] = useState(false);
    const [status, setStatus] = useState<string | null>(null);
    const [codeForm, setCodeForm] = useState({ code: "", note: "", busy: false, msg: "" });

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
            return;
        }
        let active = true;
        (async () => {
            try {
                const res = await api("/courses/enrollments/mine", { method: "GET" });
                const json = await res.json();
                if (!active) return;
                const ids = Array.isArray(json?.list) ? json.list.map((row: { courseId: string }) => row.courseId) : [];
                setEnrolledIds(ids);
            } catch {
                if (active) setEnrolledIds([]);
            }
        })();
        return () => {
            active = false;
        };
    }, [user]);

    const enrolledSet = useMemo(() => new Set(enrolledIds), [enrolledIds]);

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
            setEnrolledIds((prev) => (prev.includes(detail.id) ? prev : [...prev, detail.id]));
            setStatus("Enrollment submitted. Watch your inbox for confirmation!");
        } catch (err) {
            setStatus(err instanceof Error ? err.message : "Unable to submit enrollment");
        } finally {
            setDrawerBusy(false);
        }
    }

    async function handleSessionCreate(data: { startsAt: string; endsAt?: string; location?: string; mode?: string; note?: string }) {
        if (!detail) return;
        try {
            setDrawerBusy(true);
            const res = await api(`/courses/${detail.id}/sessions`, {
                method: "POST",
                body: JSON.stringify(data),
            });
            const json = await res.json();
            if (!res.ok || json?.ok === false) throw new Error(json?.msg || "Unable to save session");
            await refreshDetail();
        } catch (err) {
            setStatus(err instanceof Error ? err.message : "Unable to save session");
        } finally {
            setDrawerBusy(false);
        }
    }

    async function handleLessonCreate(data: { title: string; type: string; body?: string; videoUrl?: string }) {
        if (!detail) return;
        try {
            setDrawerBusy(true);
            const res = await api(`/courses/${detail.id}/lessons`, {
                method: "POST",
                body: JSON.stringify({ ...data, order: detail.lessons.length + 1 }),
            });
            const json = await res.json();
            if (!res.ok || json?.ok === false) throw new Error(json?.msg || "Unable to save lesson");
            await refreshDetail();
        } catch (err) {
            setStatus(err instanceof Error ? err.message : "Unable to save lesson");
        } finally {
            setDrawerBusy(false);
        }
    }

    async function handleMaterialCreate(data: {
        title: string;
        description?: string;
        visibleTo: string;
        attachmentFile?: File | null;
        coverFile?: File | null;
    }) {
        if (!detail) return;
        try {
            setDrawerBusy(true);
            const body: Record<string, string> = {
                title: data.title,
                visibleTo: data.visibleTo,
            };
            if (data.description) body.description = data.description;
            if (data.attachmentFile) {
                body.attachmentUrl = await uploadAsset(data.attachmentFile);
            }
            if (data.coverFile) {
                body.coverUrl = await uploadAsset(data.coverFile);
            }
            const res = await api(`/courses/${detail.id}/materials`, { method: "POST", body: JSON.stringify(body) });
            const json = await res.json();
            if (!res.ok || json?.ok === false) throw new Error(json?.msg || "Unable to upload material");
            await refreshDetail();
        } catch (err) {
            setStatus(err instanceof Error ? err.message : "Unable to upload material");
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
        } catch (err) {
            setCodeForm((prev) => ({ ...prev, busy: false, msg: err instanceof Error ? err.message : "Unable to join" }));
        }
    }

    const canCreateCourses = !!user && ["ADMIN", "CREATOR", "TUTOR"].includes(user.role);

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
                                    onSessionCreate={handleSessionCreate}
                                    onLessonCreate={handleLessonCreate}
                                    onMaterialCreate={handleMaterialCreate}
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
    onSessionCreate,
    onLessonCreate,
    onMaterialCreate,
}: {
    detail: CourseDetail;
    viewer: ViewerState | null;
    userRole?: string;
    isBusy: boolean;
    onClose: () => void;
    onEnroll: (payload: { answers: Record<string, string>; joinCode?: string }) => Promise<void>;
    onSessionCreate: (data: { startsAt: string; endsAt?: string; location?: string; mode?: string; note?: string }) => Promise<void>;
    onLessonCreate: (data: { title: string; type: string; body?: string; videoUrl?: string }) => Promise<void>;
    onMaterialCreate: (data: { title: string; description?: string; visibleTo: string; attachmentFile?: File | null; coverFile?: File | null }) => Promise<void>;
}) {
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [joinCodeInput, setJoinCodeInput] = useState("");
    const [sessionDraft, setSessionDraft] = useState({ startsAt: "", endsAt: "", location: "", mode: "Live", note: "" });
    const [lessonDraft, setLessonDraft] = useState({ title: "", type: "TEXT", body: "", videoUrl: "" });
    const [materialDraft, setMaterialDraft] = useState<{ title: string; description: string; visibleTo: string; file: File | null; cover: File | null }>({
        title: "",
        description: "",
        visibleTo: "ENROLLED",
        file: null,
        cover: null,
    });

    useEffect(() => {
        setAnswers({});
        setJoinCodeInput("");
        setSessionDraft({ startsAt: "", endsAt: "", location: "", mode: "Live", note: "" });
        setLessonDraft({ title: "", type: "TEXT", body: "", videoUrl: "" });
        setMaterialDraft({ title: "", description: "", visibleTo: "ENROLLED", file: null, cover: null });
    }, [detail.id]);

    const canManage = viewer?.canManage;
    const isStudent = userRole === "STUDENT";

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#5C9E95]">Course workspace</p>
                    <h2 className="text-3xl font-semibold text-slate-900">{detail.title}</h2>
                    <p className="mt-2 text-sm text-slate-600">{detail.summary}</p>
                </div>
                <button onClick={onClose} className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500">
                    Close
                </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
                <StatPill icon={<UsersRound className="h-4 w-4" />} label="Lessons" value={detail.lessons.length.toString()} />
                <StatPill icon={<CalendarDays className="h-4 w-4" />} label="Sessions" value={detail.sessions.length.toString()} />
                <StatPill icon={<FileText className="h-4 w-4" />} label="Materials" value={detail.materials.length.toString()} />
            </div>
            {canManage && detail.joinCode && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Shareable join code</p>
                    <p className="mt-1 text-2xl font-semibold text-slate-900">{detail.joinCode}</p>
                    <p className="text-xs text-slate-500">Learners can enroll instantly from the courses hub or /courses/join.</p>
                </div>
            )}

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900">Live schedule</h3>
                    {canManage && (
                        <button
                            type="button"
                            disabled={isBusy || !sessionDraft.startsAt}
                            onClick={async () => {
                                await onSessionCreate({
                                    startsAt: sessionDraft.startsAt,
                                    endsAt: sessionDraft.endsAt,
                                    location: sessionDraft.location,
                                    mode: sessionDraft.mode,
                                    note: sessionDraft.note,
                                });
                                setSessionDraft({ startsAt: "", endsAt: "", location: "", mode: "Live", note: "" });
                            }}
                            className="text-sm font-semibold text-[#2D8F80] disabled:opacity-60"
                        >
                            + Add session
                        </button>
                    )}
                </div>
                <div className="space-y-2">
                    {detail.sessions.length === 0 && <p className="text-sm text-slate-500">No sessions scheduled yet.</p>}
                    {detail.sessions.map((session) => (
                        <div key={session.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm">
                            <p className="font-semibold text-slate-800">
                                {new Date(session.startsAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </p>
                            <p className="text-slate-500">{session.location || session.mode || "Virtual"}</p>
                            {session.note && <p className="text-xs text-slate-400">{session.note}</p>}
                        </div>
                    ))}
                </div>
                {canManage && (
                    <div className="grid gap-2 rounded-2xl border border-slate-200 p-4 text-xs text-slate-600 sm:grid-cols-2">
                        <input
                            type="datetime-local"
                            value={sessionDraft.startsAt}
                            onChange={(e) => setSessionDraft((prev) => ({ ...prev, startsAt: e.target.value }))}
                            className="rounded-xl border border-slate-200 px-3 py-2"
                        />
                        <input
                            type="datetime-local"
                            value={sessionDraft.endsAt}
                            onChange={(e) => setSessionDraft((prev) => ({ ...prev, endsAt: e.target.value }))}
                            className="rounded-xl border border-slate-200 px-3 py-2"
                        />
                        <input
                            placeholder="Location"
                            value={sessionDraft.location}
                            onChange={(e) => setSessionDraft((prev) => ({ ...prev, location: e.target.value }))}
                            className="rounded-xl border border-slate-200 px-3 py-2"
                        />
                        <input
                            placeholder="Mode"
                            value={sessionDraft.mode}
                            onChange={(e) => setSessionDraft((prev) => ({ ...prev, mode: e.target.value }))}
                            className="rounded-xl border border-slate-200 px-3 py-2"
                        />
                        <input
                            placeholder="Notes"
                            value={sessionDraft.note}
                            onChange={(e) => setSessionDraft((prev) => ({ ...prev, note: e.target.value }))}
                            className="rounded-xl border border-slate-200 px-3 py-2 sm:col-span-2"
                        />
                    </div>
                )}
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900">Lessons</h3>
                    {canManage && (
                        <button
                            type="button"
                            disabled={isBusy || !lessonDraft.title}
                            onClick={async () => {
                                await onLessonCreate(lessonDraft);
                                setLessonDraft({ title: "", type: "TEXT", body: "", videoUrl: "" });
                            }}
                            className="text-sm font-semibold text-[#2D8F80] disabled:opacity-60"
                        >
                            + Add lesson
                        </button>
                    )}
                </div>
                <div className="space-y-2">
                    {detail.lessons.length === 0 && <p className="text-sm text-slate-500">No lessons published yet.</p>}
                    {detail.lessons.map((lesson) => (
                        <div key={lesson.id} className="rounded-2xl border border-slate-100 bg-white p-4 text-sm shadow-sm">
                            <p className="font-semibold text-slate-900">{lesson.title}</p>
                            <p className="text-xs text-slate-500">{lesson.type}</p>
                            {lesson.body && <p className="mt-2 text-slate-600">{lesson.body}</p>}
                        </div>
                    ))}
                </div>
                {canManage && (
                    <div className="grid gap-2 rounded-2xl border border-slate-200 p-4 text-xs text-slate-600">
                        <input
                            placeholder="Lesson title"
                            value={lessonDraft.title}
                            onChange={(e) => setLessonDraft((prev) => ({ ...prev, title: e.target.value }))}
                            className="rounded-xl border border-slate-200 px-3 py-2"
                        />
                        <input
                            placeholder="Lesson type"
                            value={lessonDraft.type}
                            onChange={(e) => setLessonDraft((prev) => ({ ...prev, type: e.target.value }))}
                            className="rounded-xl border border-slate-200 px-3 py-2"
                        />
                        <textarea
                            placeholder="Lesson summary"
                            value={lessonDraft.body}
                            onChange={(e) => setLessonDraft((prev) => ({ ...prev, body: e.target.value }))}
                            className="rounded-xl border border-slate-200 px-3 py-2"
                        />
                    </div>
                )}
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900">Course materials</h3>
                    {canManage && (
                        <button
                            type="button"
                            disabled={isBusy || !materialDraft.title}
                            onClick={async () => {
                                await onMaterialCreate({
                                    title: materialDraft.title,
                                    description: materialDraft.description,
                                    visibleTo: materialDraft.visibleTo,
                                    attachmentFile: materialDraft.file,
                                    coverFile: materialDraft.cover,
                                });
                                setMaterialDraft({ title: "", description: "", visibleTo: "ENROLLED", file: null, cover: null });
                            }}
                            className="text-sm font-semibold text-[#2D8F80] disabled:opacity-60"
                        >
                            + Upload
                        </button>
                    )}
                </div>
                <div className="space-y-3">
                    {detail.materials.length === 0 && <p className="text-sm text-slate-500">Materials stay hidden until you upload them.</p>}
                    {detail.materials.map((material) => (
                        <div key={material.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm">
                            <p className="font-semibold text-slate-900">{material.title}</p>
                            <p className="text-xs text-slate-500">Visibility: {material.visibility}</p>
                            {material.description && <p className="mt-1 text-slate-600">{material.description}</p>}
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
                {canManage && (
                    <div className="grid gap-2 rounded-2xl border border-slate-200 p-4 text-xs text-slate-600">
                        <input
                            placeholder="Material title"
                            value={materialDraft.title}
                            onChange={(e) => setMaterialDraft((prev) => ({ ...prev, title: e.target.value }))}
                            className="rounded-xl border border-slate-200 px-3 py-2"
                        />
                        <textarea
                            placeholder="Description"
                            value={materialDraft.description}
                            onChange={(e) => setMaterialDraft((prev) => ({ ...prev, description: e.target.value }))}
                            className="rounded-xl border border-slate-200 px-3 py-2"
                        />
                        <select
                            value={materialDraft.visibleTo}
                            onChange={(e) => setMaterialDraft((prev) => ({ ...prev, visibleTo: e.target.value }))}
                            className="rounded-xl border border-slate-200 px-3 py-2"
                        >
                            <option value="ENROLLED">Enrolled learners</option>
                            <option value="PUBLIC">Public</option>
                            <option value="STAFF">Staff only</option>
                        </select>
                        <label className="text-xs">
                            Upload file
                            <input type="file" onChange={(e) => setMaterialDraft((prev) => ({ ...prev, file: e.target.files?.[0] || null }))} />
                        </label>
                        <label className="text-xs">
                            Upload cover
                            <input type="file" onChange={(e) => setMaterialDraft((prev) => ({ ...prev, cover: e.target.files?.[0] || null }))} />
                        </label>
                    </div>
                )}
            </div>

            {isStudent && !viewer?.isEnrolled && (
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

            {viewer?.isEnrolled && (
                <div className="rounded-3xl border border-[#2D8F80]/30 bg-[#E8F7F4] p-5 text-sm text-slate-700">
                    <p className="font-semibold text-[#1F6C62]">You&rsquo;re enrolled!</p>
                    <p>Check course materials for the latest files, add dates to your calendar, and reach out in the mentor dashboard.</p>
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
