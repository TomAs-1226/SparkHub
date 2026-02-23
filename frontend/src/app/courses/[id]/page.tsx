"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Loader2, Sparkles, Megaphone, MessageCircle, BarChart2, Star, BookOpen, StickyNote } from "lucide-react";

import SiteNav from "@/components/site-nav";
import { useCurrentUser } from "@/hooks/use-current-user";
import { api } from "@/lib/api";
import CourseAnnouncements from "@/components/course-announcements";
import CourseDiscussions from "@/components/course-discussions";
import CourseProgress from "@/components/course-progress";
import CourseRatings from "@/components/course-ratings";
import { CourseDetailPanel } from "../page";
import { fetchCourseWorkspace } from "../load-course";
import type { CourseAssignment, CourseDetail, EnrollmentRecord, ViewerState } from "../types";

export default function CourseWorkspacePage() {
    const params = useParams<{ id: string }>();
    const courseId = params?.id;
    const router = useRouter();
    const { user } = useCurrentUser();
    const [detail, setDetail] = useState<CourseDetail | null>(null);
    const [viewer, setViewer] = useState<ViewerState | null>(null);
    const [managerEnrollments, setManagerEnrollments] = useState<EnrollmentRecord[]>([]);
    const [assignmentDrafts, setAssignmentDrafts] = useState<Record<string, { note: string; attachmentUrl?: string }>>({});
    const [assignmentBusy, setAssignmentBusy] = useState<string | null>(null);
    const [workspaceBusy, setWorkspaceBusy] = useState(false);
    const [initializing, setInitializing] = useState(true);
    const [status, setStatus] = useState<string | null>(null);

    const canManage = viewer?.canManage ?? false;
    const isEnrolled = viewer?.enrollmentStatus === "APPROVED";

    const sectionItems = useMemo(
        () => [
            { id: "overview", label: "Overview", icon: <BookOpen className="h-3.5 w-3.5" /> },
            { id: "meetings", label: "Meetings", icon: null },
            { id: "channel", label: "Channel", icon: null },
            { id: "schedule", label: "Schedule", icon: null },
            { id: "materials", label: "Materials", icon: null },
            { id: "assignments", label: "Assignments", icon: null },
            { id: "progress", label: "Progress", icon: <BarChart2 className="h-3.5 w-3.5" /> },
            { id: "announcements", label: "Announcements", icon: <Megaphone className="h-3.5 w-3.5" /> },
            { id: "discussions", label: "Discussions", icon: <MessageCircle className="h-3.5 w-3.5" /> },
            { id: "ratings", label: "Ratings", icon: <Star className="h-3.5 w-3.5" /> },
            { id: "enrollment", label: viewer?.isEnrolled ? "Responses" : "Apply", icon: null },
        ],
        [viewer?.isEnrolled],
    );
    const [activeSection, setActiveSection] = useState(sectionItems[0]?.id ?? "overview");

    const hydrateAssignmentDrafts = useCallback((assignments: CourseAssignment[] = []) => {
        const next: Record<string, { note: string; attachmentUrl?: string }> = {};
        assignments.forEach((assignment) => {
            next[assignment.id] = {
                note: assignment.viewerSubmission?.content || "",
                attachmentUrl: assignment.viewerSubmission?.attachmentUrl || undefined,
            };
        });
        setAssignmentDrafts(next);
    }, []);

    const loadWorkspace = useCallback(async () => {
        if (!courseId) return;
        const payload = await fetchCourseWorkspace(courseId);
        setDetail(payload.detail);
        setViewer(payload.viewer);
        setManagerEnrollments(payload.enrollments);
        hydrateAssignmentDrafts(payload.detail?.assignments || []);
    }, [courseId, hydrateAssignmentDrafts]);

    useEffect(() => {
        let active = true;
        (async () => {
            try {
                setInitializing(true);
                await loadWorkspace();
                if (!active) return;
                setStatus(null);
            } catch (err) {
                if (active) setStatus(err instanceof Error ? err.message : "Unable to load course");
            } finally {
                if (active) setInitializing(false);
            }
        })();
        return () => { active = false; };
    }, [loadWorkspace]);

    useEffect(() => {
        function handleScroll() {
            if (typeof window === "undefined") return;
            const fromTop = window.scrollY + 160;
            let current = sectionItems[0]?.id;
            sectionItems.forEach((section) => {
                const el = document.getElementById(section.id);
                if (!el) return;
                if (fromTop >= el.offsetTop) current = section.id;
            });
            setActiveSection(current || "overview");
        }
        handleScroll();
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, [sectionItems]);

    function handleAssignmentDraftChange(
        assignmentId: string,
        patch: Partial<{ note: string; attachmentUrl?: string }>,
    ) {
        setAssignmentDrafts((prev) => ({
            ...prev,
            [assignmentId]: {
                note: patch.note ?? prev[assignmentId]?.note ?? "",
                attachmentUrl: patch.attachmentUrl ?? prev[assignmentId]?.attachmentUrl,
            },
        }));
    }

    async function handleAssignmentSubmit(assignmentId: string) {
        if (!detail || !user) return;
        if (user.role !== "STUDENT") { setStatus("Switch to a student account to submit work."); return; }
        if (viewer?.enrollmentStatus !== "APPROVED") { setStatus("Wait for approval before turning in assignments."); return; }
        const draft = assignmentDrafts[assignmentId] || { note: "", attachmentUrl: undefined };
        if (!draft.note && !draft.attachmentUrl) { setStatus("Add a reflection or upload a file before submitting."); return; }
        try {
            setAssignmentBusy(assignmentId);
            const res = await api(`/courses/${detail.id}/assignments/${assignmentId}/submissions`, {
                method: "POST",
                body: JSON.stringify({ content: draft.note, attachmentUrl: draft.attachmentUrl }),
            });
            const json = await res.json();
            if (!res.ok || json?.ok === false) throw new Error(json?.msg || "Unable to submit assignment");
            await loadWorkspace();
            setStatus("Submission uploaded!");
        } catch (err) {
            setStatus(err instanceof Error ? err.message : "Unable to submit assignment");
        } finally {
            setAssignmentBusy(null);
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
            // Refresh roster from returned payload
            if (Array.isArray(json?.enrollments)) {
                setManagerEnrollments(json.enrollments as EnrollmentRecord[]);
            } else {
                // Locally update if payload not returned
                setManagerEnrollments((prev) =>
                    prev.map((e) => (e.id === enrollmentId ? { ...e, status } : e)),
                );
            }
            setStatus(status === "APPROVED" ? "Enrollment approved — student now has full access." : "Enrollment rejected.");
        } catch (err) {
            setStatus(err instanceof Error ? err.message : "Unable to update enrollment");
        }
    }

    async function handleEnrollSubmit(payload: { answers: Record<string, string>; joinCode?: string }) {
        if (!detail) return;
        if (!user) { router.push(`/login?from=/courses/${detail.id}`); return; }
        if (user.role !== "STUDENT") { setStatus("Switch to a student account to enroll."); return; }
        try {
            setWorkspaceBusy(true);
            setStatus(null);
            const res = await api(`/courses/${detail.id}/enroll`, { method: "POST", body: JSON.stringify(payload) });
            const json = await res.json();
            if (!res.ok || json?.ok === false) throw new Error(json?.msg || "Unable to enroll");
            setDetail(json.course);
            setViewer(json.viewer);
            setManagerEnrollments(Array.isArray(json?.enrollments) ? (json.enrollments as EnrollmentRecord[]) : []);
            hydrateAssignmentDrafts(json.course?.assignments || []);
            if (json.codeStatus === "INVALID") {
                setStatus("That code didn't match, so we queued your application for instructor review.");
            } else if (json.codeStatus === "APPROVED" || json.viewer?.isEnrolled) {
                setStatus("You're in! Resources have been unlocked.");
            } else if (json.viewer?.enrollmentStatus === "PENDING") {
                setStatus("Thanks! Your application is pending admin approval.");
            } else {
                setStatus("Enrollment submitted. Watch your inbox for confirmation!");
            }
        } catch (err) {
            setStatus(err instanceof Error ? err.message : "Unable to submit enrollment");
        } finally {
            setWorkspaceBusy(false);
        }
    }

    // Progress bar widget shown in sidebar
    const SidebarProgressMini = () => {
        if (!isEnrolled || !detail) return null;
        return (
            <div className="mt-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Your progress</p>
                <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                    <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                            width: "0%",
                            background: "linear-gradient(90deg, #63C0B9, #2D8F80)",
                        }}
                        id="sidebar-progress-bar"
                    />
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-dvh bg-[#F6F8FC] dark:bg-slate-900 text-slate-800 dark:text-slate-100">
            <SiteNav />
            <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-24 pt-10 lg:flex-row">
                {/* Sidebar nav */}
                <aside className="lg:w-64 flex-shrink-0">
                    <Link href="/courses" className="inline-flex items-center gap-2 text-xs font-semibold text-[#2B2E83] dark:text-[#63C0B9]">
                        <Sparkles className="h-4 w-4" /> Back to catalog
                    </Link>
                    <div className="mt-6 rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Workspace navigation</p>
                        <div className="mt-4 space-y-0.5 text-sm">
                            {sectionItems.map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => {
                                        const el = document.getElementById(item.id);
                                        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                                    }}
                                    className={`w-full flex items-center gap-2 rounded-2xl px-3 py-2 text-left font-semibold transition-colors ${
                                        activeSection === item.id
                                            ? "bg-[#EEF2FF] dark:bg-slate-700 text-[#2B2E83] dark:text-[#63C0B9]"
                                            : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                                    }`}
                                >
                                    {item.icon && <span className="opacity-70">{item.icon}</span>}
                                    {item.label}
                                </button>
                            ))}
                        </div>
                        <SidebarProgressMini />
                    </div>

                    {/* Quick notes panel in sidebar for enrolled users */}
                    {isEnrolled && detail && (
                        <div className="mt-4 rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm">
                            <div className="flex items-center gap-2 mb-3">
                                <StickyNote className="h-4 w-4 text-amber-500" />
                                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Quick note</p>
                            </div>
                            <NoteWidget courseId={detail.id} />
                        </div>
                    )}
                </aside>

                {/* Main content */}
                <section className="flex-1 min-w-0 space-y-8">
                    {status && (
                        <p className="rounded-2xl border border-[#CFE3E0] dark:border-slate-600 bg-[#E9F7F5] dark:bg-slate-800 px-4 py-3 text-sm text-[#2D8F80] dark:text-[#63C0B9]">
                            {status}
                        </p>
                    )}
                    {initializing ? (
                        <div className="flex min-h-[420px] items-center justify-center rounded-3xl border border-dashed border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70">
                            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                        </div>
                    ) : detail ? (
                        <>
                            <CourseDetailPanel
                                detail={detail}
                                viewer={viewer}
                                userRole={user?.role}
                                isBusy={workspaceBusy}
                                onClose={() => router.push("/courses")}
                                onEnroll={handleEnrollSubmit}
                                managerEnrollments={managerEnrollments}
                                onEnrollAction={handleEnrollAction}
                                assignmentDrafts={assignmentDrafts}
                                onAssignmentDraftChange={handleAssignmentDraftChange}
                                onAssignmentSubmit={handleAssignmentSubmit}
                                assignmentBusy={assignmentBusy}
                                showCloseButton={false}
                            />

                            {/* ── LMS v2 Sections ─────────────────────────────── */}
                            <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 space-y-2">
                                <CourseProgress
                                    courseId={detail.id}
                                    isEnrolled={isEnrolled}
                                />
                            </div>

                            <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
                                <CourseAnnouncements
                                    courseId={detail.id}
                                    canManage={canManage}
                                />
                            </div>

                            <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
                                <CourseDiscussions
                                    courseId={detail.id}
                                    canManage={canManage}
                                    userId={user?.id}
                                    lessons={(detail.lessons || []).map((l) => ({
                                        id: l.id,
                                        title: l.title,
                                        order: l.order ?? 1,
                                    }))}
                                />
                            </div>

                            <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
                                <CourseRatings
                                    courseId={detail.id}
                                    isEnrolled={isEnrolled}
                                    userId={user?.id}
                                />
                            </div>
                        </>
                    ) : (
                        <div className="rounded-3xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6 text-sm text-red-700 dark:text-red-400">
                            Unable to load the course workspace.
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}

// ─── Inline quick note widget ────────────────────────────────────────────────
function NoteWidget({ courseId }: { courseId: string }) {
    const STORAGE_KEY = `sparkhub_quicknote_${courseId}`;
    const [note, setNote] = useState(() => {
        if (typeof window === "undefined") return "";
        return localStorage.getItem(STORAGE_KEY) || "";
    });

    useEffect(() => {
        const id = setTimeout(() => {
            if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, note);
        }, 500);
        return () => clearTimeout(id);
    }, [note, STORAGE_KEY]);

    return (
        <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Jot down notes for this course…"
            rows={4}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-3 py-2 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-amber-300 resize-none"
        />
    );
}
