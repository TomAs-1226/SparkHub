"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Circle, BarChart2, Loader2, BookOpen, Clock } from "lucide-react";
import { api } from "@/lib/api";

interface LessonProg {
    id: string;
    title: string;
    order: number;
    type: string;
    completed: boolean;
    completedAt?: string | null;
    timeSpentSec?: number;
}

interface ProgressData {
    courseId: string;
    totalLessons: number;
    completedLessons: number;
    percentage: number;
    lessons: LessonProg[];
}

interface Props {
    courseId: string;
    isEnrolled: boolean;
    onMarkComplete?: (lessonId: string, completed: boolean) => void;
}

function formatTime(sec?: number) {
    if (!sec || sec < 60) return null;
    const m = Math.floor(sec / 60);
    if (m < 60) return `${m}m`;
    return `${Math.floor(m / 60)}h ${m % 60}m`;
}

export default function CourseProgress({ courseId, isEnrolled, onMarkComplete }: Props) {
    const [data, setData] = useState<ProgressData | null>(null);
    const [loading, setLoading] = useState(true);
    const [markingId, setMarkingId] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!isEnrolled) { setLoading(false); return; }
        try {
            const res = await api(`/progress/${courseId}`);
            const json = await res.json().catch(() => null);
            if (json?.ok) setData(json);
        } catch {
            // keep previous state
        } finally {
            setLoading(false);
        }
    }, [courseId, isEnrolled]);

    useEffect(() => { load(); }, [load]);

    async function toggleLesson(lessonId: string, completed: boolean) {
        setMarkingId(lessonId);
        try {
            await api(`/progress/${courseId}/lessons/${lessonId}`, {
                method: "POST",
                body: JSON.stringify({ completed: !completed }),
            });
            setData((prev) => {
                if (!prev) return prev;
                const updatedLessons = prev.lessons.map((l) =>
                    l.id === lessonId ? { ...l, completed: !completed, completedAt: !completed ? new Date().toISOString() : null } : l,
                );
                const done = updatedLessons.filter((l) => l.completed).length;
                return {
                    ...prev,
                    lessons: updatedLessons,
                    completedLessons: done,
                    percentage: prev.totalLessons > 0 ? Math.round((done / prev.totalLessons) * 100) : 0,
                };
            });
            onMarkComplete?.(lessonId, !completed);
        } catch {
            // ignore
        } finally {
            setMarkingId(null);
        }
    }

    if (!isEnrolled) {
        return (
            <section id="progress" className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-600 p-6 text-center">
                <BarChart2 className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-500 dark:text-slate-400">Enroll in this course to track your progress.</p>
            </section>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-slate-500 py-6">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading progress…
            </div>
        );
    }

    if (!data) return null;

    return (
        <section id="progress" className="space-y-4">
            <div className="flex items-center gap-2">
                <BarChart2 className="h-5 w-5 text-[#2D8F80]" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Your Progress</h3>
            </div>

            {/* Summary card */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
                <div className="flex items-end justify-between gap-3 mb-3">
                    <div>
                        <p className="text-3xl font-bold text-[#2D8F80]">{data.percentage}%</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                            {data.completedLessons} of {data.totalLessons} lesson{data.totalLessons !== 1 ? "s" : ""} completed
                        </p>
                    </div>
                    {data.percentage === 100 && (
                        <div className="flex items-center gap-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                            <CheckCircle2 className="h-4 w-4" /> Complete!
                        </div>
                    )}
                </div>

                {/* Progress bar */}
                <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                    <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{
                            width: `${data.percentage}%`,
                            background: data.percentage === 100
                                ? "linear-gradient(90deg, #10b981, #059669)"
                                : "linear-gradient(90deg, #63C0B9, #2D8F80)",
                        }}
                    />
                </div>
            </div>

            {/* Lesson checklist */}
            {data.lessons.length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Lessons</p>
                    {data.lessons.map((lesson) => (
                        <div
                            key={lesson.id}
                            className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${
                                lesson.completed
                                    ? "border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/50 dark:bg-emerald-900/10"
                                    : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                            }`}
                        >
                            <button
                                onClick={() => toggleLesson(lesson.id, lesson.completed)}
                                disabled={markingId === lesson.id}
                                className="flex-shrink-0 text-slate-400 hover:text-[#2D8F80] transition-colors"
                                title={lesson.completed ? "Mark incomplete" : "Mark complete"}
                            >
                                {markingId === lesson.id ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : lesson.completed ? (
                                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                ) : (
                                    <Circle className="h-5 w-5" />
                                )}
                            </button>
                            <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium leading-snug ${
                                    lesson.completed ? "line-through text-slate-400 dark:text-slate-500" : "text-slate-800 dark:text-slate-200"
                                }`}>
                                    {lesson.order}. {lesson.title}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-xs text-slate-400 dark:text-slate-500 capitalize">{lesson.type.toLowerCase()}</span>
                                    {formatTime(lesson.timeSpentSec) && (
                                        <span className="flex items-center gap-0.5 text-xs text-slate-400 dark:text-slate-500">
                                            <Clock className="h-3 w-3" />
                                            {formatTime(lesson.timeSpentSec)} spent
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}
