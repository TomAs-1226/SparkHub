"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";

import SiteNav from "@/components/site-nav";
import { useCurrentUser } from "@/hooks/use-current-user";
import { api } from "@/lib/api";
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

    const sectionItems = useMemo(
        () => [
            { id: "overview", label: "Overview" },
            { id: "meetings", label: "Meetings" },
            { id: "channel", label: "Channel" },
            { id: "schedule", label: "Schedule" },
            { id: "materials", label: "Materials" },
            { id: "assignments", label: "Assignments" },
            { id: "enrollment", label: viewer?.isEnrolled ? "Responses" : "Apply" },
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
        return () => {
            active = false;
        };
    }, [loadWorkspace]);

    useEffect(() => {
        function handleScroll() {
            if (typeof window === "undefined") return;
            const fromTop = window.scrollY + 160;
            let current = sectionItems[0]?.id;
            sectionItems.forEach((section) => {
                const el = document.getElementById(section.id);
                if (!el) return;
                if (fromTop >= el.offsetTop) {
                    current = section.id;
                }
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
            await loadWorkspace();
            setStatus("Submission uploaded!");
        } catch (err) {
            setStatus(err instanceof Error ? err.message : "Unable to submit assignment");
        } finally {
            setAssignmentBusy(null);
        }
    }

    async function handleEnrollSubmit(payload: { answers: Record<string, string>; joinCode?: string }) {
        if (!detail) return;
        if (!user) {
            router.push(`/login?from=/courses/${detail.id}`);
            return;
        }
        if (user.role !== "STUDENT") {
            setStatus("Switch to a student account to enroll.");
            return;
        }
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
                setStatus("That code didn’t match, so we queued your application for instructor review.");
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

    return (
        <div className="min-h-dvh bg-[#F6F8FC] dark:bg-slate-900 text-slate-800 dark:text-slate-100">
            <SiteNav />
            <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-24 pt-10 lg:flex-row">
                <aside className="lg:w-64">
                    <Link href="/courses" className="inline-flex items-center gap-2 text-xs font-semibold text-[#2B2E83] dark:text-[#63C0B9]">
                        <Sparkles className="h-4 w-4" /> Back to catalog
                    </Link>
                    <div className="mt-6 rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Workspace navigation</p>
                        <div className="mt-4 space-y-1 text-sm">
                            {sectionItems.map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => {
                                        const el = document.getElementById(item.id);
                                        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                                    }}
                                    className={`w-full rounded-2xl px-3 py-2 text-left font-semibold ${
                                        activeSection === item.id
                                            ? "bg-[#EEF2FF] dark:bg-slate-700 text-[#2B2E83] dark:text-[#63C0B9]"
                                            : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                                    }`}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </aside>
                <section className="flex-1">
                    {status && <p className="mb-4 text-sm text-[#2D8F80]">{status}</p>}
                    {initializing ? (
                        <div className="flex min-h-[420px] items-center justify-center rounded-3xl border border-dashed border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70">
                            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                        </div>
                    ) : detail ? (
                        <CourseDetailPanel
                            detail={detail}
                            viewer={viewer}
                            userRole={user?.role}
                            isBusy={workspaceBusy}
                            onClose={() => router.push("/courses")}
                            onEnroll={handleEnrollSubmit}
                            managerEnrollments={managerEnrollments}
                            assignmentDrafts={assignmentDrafts}
                            onAssignmentDraftChange={handleAssignmentDraftChange}
                            onAssignmentSubmit={handleAssignmentSubmit}
                            assignmentBusy={assignmentBusy}
                            showCloseButton={false}
                        />
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