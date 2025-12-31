"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    GraduationCap,
    Users,
    Calendar,
    CheckCircle2,
    Clock,
    MessageCircle,
    ChevronLeft,
    ChevronRight,
    Sparkles,
    UserCheck,
    BookOpen,
} from "lucide-react";

import SiteNav from "@/components/site-nav";
import { useCurrentUser } from "@/hooks/use-current-user";
import { api } from "@/lib/api";
import { FADES } from "@/lib/motion-presets";

type UserRole = "TUTOR" | "STUDENT";

interface Match {
    userId: string;
    user: { id: string; name: string; email: string; avatarUrl?: string };
    role: string;
    subjects: string;
    bio: string;
    matchingDates: string[];
    score: number;
    subjectMatch: boolean;
}

interface MatchRequest {
    id: string;
    date: string;
    message: string;
    status: string;
    fromUser?: { id: string; name: string; email: string };
    toUser?: { id: string; name: string; email: string };
    createdAt: string;
}

function generateCalendarDays(year: number, month: number): (number | null)[][] {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const weeks: (number | null)[][] = [];
    let week: (number | null)[] = Array(firstDay).fill(null);

    for (let day = 1; day <= daysInMonth; day++) {
        week.push(day);
        if (week.length === 7) {
            weeks.push(week);
            week = [];
        }
    }
    if (week.length > 0) {
        while (week.length < 7) week.push(null);
        weeks.push(week);
    }
    return weeks;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function TutoringPage() {
    const { user } = useCurrentUser();
    const [activeTab, setActiveTab] = useState<"find" | "signup" | "matches" | "requests">("find");
    const [role, setRole] = useState<UserRole>("STUDENT");
    const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
    const [subjects, setSubjects] = useState("");
    const [bio, setBio] = useState("");
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState<string | null>(null);
    const [matches, setMatches] = useState<Match[]>([]);
    const [matchLoading, setMatchLoading] = useState(false);
    const [myRole, setMyRole] = useState<string | null>(null);
    const [incoming, setIncoming] = useState<MatchRequest[]>([]);
    const [outgoing, setOutgoing] = useState<MatchRequest[]>([]);

    // Calendar state
    const today = new Date();
    const [calMonth, setCalMonth] = useState(today.getMonth());
    const [calYear, setCalYear] = useState(today.getFullYear());
    const calendarWeeks = useMemo(() => generateCalendarDays(calYear, calMonth), [calYear, calMonth]);

    function toggleDate(day: number) {
        const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        setSelectedDates((prev) => {
            const next = new Set(prev);
            if (next.has(dateStr)) {
                next.delete(dateStr);
            } else {
                next.add(dateStr);
            }
            return next;
        });
    }

    function isSelected(day: number): boolean {
        const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        return selectedDates.has(dateStr);
    }

    function prevMonth() {
        if (calMonth === 0) {
            setCalMonth(11);
            setCalYear((y) => y - 1);
        } else {
            setCalMonth((m) => m - 1);
        }
    }

    function nextMonth() {
        if (calMonth === 11) {
            setCalMonth(0);
            setCalYear((y) => y + 1);
        } else {
            setCalMonth((m) => m + 1);
        }
    }

    async function handleSubmitAvailability() {
        if (selectedDates.size === 0) {
            setStatus("Please select at least one available date.");
            return;
        }
        setSaving(true);
        setStatus(null);
        try {
            const res = await api("/matching/availability", {
                method: "POST",
                body: JSON.stringify({
                    dates: Array.from(selectedDates),
                    role,
                    subjects,
                    bio,
                }),
            });
            const json = await res.json().catch(() => null);
            if (!res.ok || json?.ok === false) {
                throw new Error(json?.msg || "Unable to save availability");
            }
            setStatus(`Availability saved! ${json?.count || selectedDates.size} dates registered as ${role.toLowerCase()}.`);
            setActiveTab("matches");
            loadMatches();
        } catch (err) {
            setStatus(err instanceof Error ? err.message : "Unable to save availability");
        } finally {
            setSaving(false);
        }
    }

    async function loadMatches() {
        setMatchLoading(true);
        try {
            const res = await api("/matching/find-matches");
            const json = await res.json().catch(() => null);
            if (json?.ok) {
                setMatches(json.matches || []);
                setMyRole(json.myRole || null);
            }
        } catch {
            // ignore
        } finally {
            setMatchLoading(false);
        }
    }

    async function loadRequests() {
        try {
            const res = await api("/matching/requests");
            const json = await res.json().catch(() => null);
            if (json?.ok) {
                setIncoming(json.incoming || []);
                setOutgoing(json.outgoing || []);
            }
        } catch {
            // ignore
        }
    }

    async function sendMatchRequest(targetUserId: string, date: string) {
        try {
            const res = await api("/matching/request", {
                method: "POST",
                body: JSON.stringify({ targetUserId, date, message: "" }),
            });
            const json = await res.json().catch(() => null);
            if (json?.ok) {
                setStatus("Match request sent!");
                loadRequests();
            } else {
                setStatus(json?.msg || "Unable to send request");
            }
        } catch {
            setStatus("Unable to send request");
        }
    }

    async function respondToRequest(requestId: string, newStatus: "ACCEPTED" | "DECLINED") {
        try {
            const res = await api(`/matching/requests/${requestId}`, {
                method: "PATCH",
                body: JSON.stringify({ status: newStatus }),
            });
            const json = await res.json().catch(() => null);
            if (json?.ok) {
                setStatus(json.msg || "Updated!");
                loadRequests();
            }
        } catch {
            setStatus("Unable to update request");
        }
    }

    useEffect(() => {
        if (user) {
            loadMatches();
            loadRequests();
        }
    }, [user]);

    return (
        <div className="min-h-dvh bg-[#F5F7FB] dark:bg-slate-900 text-slate-800 dark:text-slate-100">
            <SiteNav />
            <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-10">
                <motion.section
                    variants={FADES.gentleUp}
                    initial="initial"
                    animate="animate"
                    className="rounded-[36px] bg-white/95 p-6 shadow-2xl md:p-10"
                >
                    {/* Header */}
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-[#2D8F80]">
                                <GraduationCap className="h-5 w-5" /> Tutoring & Mentoring
                            </div>
                            <h1 className="mt-2 text-2xl font-semibold">Find your perfect learning match</h1>
                            <p className="mt-1 text-sm text-slate-500">
                                Connect as a tutor to share knowledge, or as a student to get personalized help.
                            </p>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="mt-6 flex flex-wrap gap-2 rounded-2xl bg-[#F4F7FB] p-1.5">
                        {[
                            { key: "find" as const, label: "Browse Tutors", icon: <Users className="h-4 w-4" /> },
                            { key: "signup" as const, label: "Set Availability", icon: <Calendar className="h-4 w-4" /> },
                            { key: "matches" as const, label: "My Matches", icon: <Sparkles className="h-4 w-4" /> },
                            { key: "requests" as const, label: "Requests", icon: <MessageCircle className="h-4 w-4" /> },
                        ].map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                                    activeTab === tab.key
                                        ? "bg-white text-[#2D8F80] shadow-sm"
                                        : "text-slate-600 hover:bg-white/60"
                                }`}
                            >
                                {tab.icon} {tab.label}
                            </button>
                        ))}
                    </div>

                    {status && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-4 rounded-2xl border border-[#CFE3E0] bg-[#E9F7F5] px-4 py-3 text-sm text-slate-700"
                        >
                            {status}
                        </motion.div>
                    )}

                    {/* Tab Content */}
                    <div className="mt-6">
                        <AnimatePresence mode="wait">
                            {activeTab === "find" && (
                                <motion.div
                                    key="find"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <TutorList />
                                </motion.div>
                            )}

                            {activeTab === "signup" && (
                                <motion.div
                                    key="signup"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.2 }}
                                    className="grid gap-8 lg:grid-cols-2"
                                >
                                    {/* Role Selection */}
                                    <div>
                                        <h3 className="text-lg font-semibold text-slate-800">I want to...</h3>
                                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                            <button
                                                onClick={() => setRole("TUTOR")}
                                                className={`flex flex-col items-center gap-3 rounded-2xl border-2 p-5 text-center transition ${
                                                    role === "TUTOR"
                                                        ? "border-[#63C0B9] bg-[#E9F7F5]"
                                                        : "border-slate-200 bg-white hover:border-[#CFE3E0]"
                                                }`}
                                            >
                                                <div className={`rounded-full p-3 ${role === "TUTOR" ? "bg-[#63C0B9] text-white" : "bg-slate-100 text-slate-600"}`}>
                                                    <UserCheck className="h-6 w-6" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-800">Be a Tutor</p>
                                                    <p className="mt-1 text-xs text-slate-500">Share your knowledge and help others learn</p>
                                                </div>
                                            </button>
                                            <button
                                                onClick={() => setRole("STUDENT")}
                                                className={`flex flex-col items-center gap-3 rounded-2xl border-2 p-5 text-center transition ${
                                                    role === "STUDENT"
                                                        ? "border-[#63C0B9] bg-[#E9F7F5]"
                                                        : "border-slate-200 bg-white hover:border-[#CFE3E0]"
                                                }`}
                                            >
                                                <div className={`rounded-full p-3 ${role === "STUDENT" ? "bg-[#63C0B9] text-white" : "bg-slate-100 text-slate-600"}`}>
                                                    <BookOpen className="h-6 w-6" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-800">Get Tutored</p>
                                                    <p className="mt-1 text-xs text-slate-500">Find a tutor to help you succeed</p>
                                                </div>
                                            </button>
                                        </div>

                                        <div className="mt-6 space-y-4">
                                            <label className="block">
                                                <span className="text-sm font-semibold text-slate-700">
                                                    {role === "TUTOR" ? "Subjects you can teach" : "Subjects you need help with"}
                                                </span>
                                                <input
                                                    type="text"
                                                    value={subjects}
                                                    onChange={(e) => setSubjects(e.target.value)}
                                                    placeholder="e.g., Math, Physics, Python, UX Design"
                                                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-[#63C0B9] focus:outline-none"
                                                />
                                            </label>
                                            <label className="block">
                                                <span className="text-sm font-semibold text-slate-700">
                                                    {role === "TUTOR" ? "About your experience" : "What you want to learn"}
                                                </span>
                                                <textarea
                                                    value={bio}
                                                    onChange={(e) => setBio(e.target.value)}
                                                    placeholder={role === "TUTOR" ? "Describe your teaching experience and approach..." : "Describe your learning goals..."}
                                                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-[#63C0B9] focus:outline-none"
                                                    rows={3}
                                                />
                                            </label>
                                        </div>
                                    </div>

                                    {/* Calendar */}
                                    <div className="rounded-3xl border border-slate-100 bg-[#F9FBFF] p-5">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-lg font-semibold text-slate-800">Select Available Dates</h3>
                                            <div className="flex items-center gap-2">
                                                <button onClick={prevMonth} className="rounded-full p-2 hover:bg-white">
                                                    <ChevronLeft className="h-4 w-4" />
                                                </button>
                                                <span className="min-w-[140px] text-center text-sm font-semibold">
                                                    {MONTHS[calMonth]} {calYear}
                                                </span>
                                                <button onClick={nextMonth} className="rounded-full p-2 hover:bg-white">
                                                    <ChevronRight className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                        <p className="mt-1 text-xs text-slate-500">Click dates to toggle selection. Select multiple dates.</p>

                                        <div className="mt-4 overflow-hidden rounded-2xl border border-white/60 bg-white">
                                            <table className="w-full text-center text-sm">
                                                <thead className="bg-[#F4F7FB] text-xs uppercase text-slate-500">
                                                    <tr>
                                                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                                                            <th key={d} className="px-1 py-2 font-semibold">{d}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {calendarWeeks.map((week, wi) => (
                                                        <tr key={wi}>
                                                            {week.map((day, di) => (
                                                                <td key={di} className="h-12 p-1">
                                                                    {day && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => toggleDate(day)}
                                                                            className={`mx-auto flex h-9 w-9 items-center justify-center rounded-xl text-sm font-semibold transition ${
                                                                                isSelected(day)
                                                                                    ? "bg-[#2D8F80] text-white shadow-md"
                                                                                    : "bg-[#E6F5F3] text-[#2D8F80] hover:bg-[#CFE3E0]"
                                                                            }`}
                                                                        >
                                                                            {day}
                                                                        </button>
                                                                    )}
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        <div className="mt-4 flex items-center justify-between">
                                            <p className="text-sm text-slate-600">
                                                <span className="font-semibold text-[#2D8F80]">{selectedDates.size}</span> date{selectedDates.size !== 1 ? "s" : ""} selected
                                            </p>
                                            {selectedDates.size > 0 && (
                                                <button
                                                    onClick={() => setSelectedDates(new Set())}
                                                    className="text-xs text-slate-500 hover:text-slate-700"
                                                >
                                                    Clear all
                                                </button>
                                            )}
                                        </div>

                                        {!user ? (
                                            <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-white/80 p-4 text-center text-sm text-slate-600">
                                                <p>Please <a href="/login" className="font-semibold text-[#2D8F80]">log in</a> to save your availability.</p>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={handleSubmitAvailability}
                                                disabled={saving || selectedDates.size === 0}
                                                className="mt-4 w-full rounded-full bg-[#63C0B9] px-5 py-3 text-sm font-semibold text-white shadow-md disabled:opacity-60"
                                            >
                                                {saving ? "Saving..." : `Save as ${role === "TUTOR" ? "Tutor" : "Student"}`}
                                            </button>
                                        )}
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === "matches" && (
                                <motion.div
                                    key="matches"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    {!user ? (
                                        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-6 text-center">
                                            <p className="text-sm text-slate-600">Please log in to see your matches.</p>
                                        </div>
                                    ) : matchLoading ? (
                                        <div className="grid gap-4 md:grid-cols-2">
                                            {[1, 2, 3, 4].map((i) => (
                                                <div key={i} className="h-48 animate-pulse rounded-2xl bg-slate-100" />
                                            ))}
                                        </div>
                                    ) : matches.length === 0 ? (
                                        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-6 text-center">
                                            <Sparkles className="mx-auto h-8 w-8 text-slate-400" />
                                            <p className="mt-3 text-sm font-semibold text-slate-700">No matches found yet</p>
                                            <p className="mt-1 text-xs text-slate-500">Set your availability first, then we&apos;ll find matching {myRole === "TUTOR" ? "students" : "tutors"} for you.</p>
                                            <button onClick={() => setActiveTab("signup")} className="mt-4 rounded-full bg-[#63C0B9] px-4 py-2 text-sm font-semibold text-white">
                                                Set Availability
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="grid gap-4 md:grid-cols-2">
                                            {matches.map((match) => (
                                                <div key={match.userId} className="rounded-2xl border border-slate-100 bg-gradient-to-br from-white to-[#F9FBFF] p-5 shadow-md">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-12 w-12 rounded-full bg-[#E7F6F3] flex items-center justify-center text-[#2D8F80]">
                                                                {match.role === "TUTOR" ? <UserCheck className="h-6 w-6" /> : <BookOpen className="h-6 w-6" />}
                                                            </div>
                                                            <div>
                                                                <p className="font-semibold text-slate-800">{match.user.name}</p>
                                                                <p className="text-xs text-slate-500">{match.role === "TUTOR" ? "Tutor" : "Student"}</p>
                                                            </div>
                                                        </div>
                                                        {match.subjectMatch && (
                                                            <span className="rounded-full bg-[#E9F7F5] px-2 py-1 text-[10px] font-semibold text-[#2D8F80]">
                                                                Subject Match
                                                            </span>
                                                        )}
                                                    </div>
                                                    {match.subjects && (
                                                        <p className="mt-3 text-xs text-slate-600">
                                                            <span className="font-semibold">Subjects:</span> {match.subjects}
                                                        </p>
                                                    )}
                                                    {match.bio && (
                                                        <p className="mt-2 text-sm text-slate-600">{match.bio.slice(0, 100)}{match.bio.length > 100 ? "..." : ""}</p>
                                                    )}
                                                    <div className="mt-3 flex flex-wrap gap-1">
                                                        {match.matchingDates.slice(0, 3).map((date) => (
                                                            <span key={date} className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">
                                                                {new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                                            </span>
                                                        ))}
                                                        {match.matchingDates.length > 3 && (
                                                            <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] text-slate-500">
                                                                +{match.matchingDates.length - 3} more
                                                            </span>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={() => sendMatchRequest(match.userId, match.matchingDates[0])}
                                                        className="mt-4 w-full rounded-full bg-[#63C0B9] px-4 py-2 text-sm font-semibold text-white"
                                                    >
                                                        Request Session
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {activeTab === "requests" && (
                                <motion.div
                                    key="requests"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.2 }}
                                    className="space-y-6"
                                >
                                    {!user ? (
                                        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-6 text-center">
                                            <p className="text-sm text-slate-600">Please log in to see your requests.</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div>
                                                <h3 className="text-lg font-semibold text-slate-800">Incoming Requests</h3>
                                                {incoming.length === 0 ? (
                                                    <p className="mt-2 text-sm text-slate-500">No incoming requests.</p>
                                                ) : (
                                                    <div className="mt-3 space-y-3">
                                                        {incoming.map((req) => (
                                                            <div key={req.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-4">
                                                                <div>
                                                                    <p className="font-semibold text-slate-800">{req.fromUser?.name}</p>
                                                                    <p className="text-xs text-slate-500">
                                                                        {new Date(req.date).toLocaleDateString()} · {req.status}
                                                                    </p>
                                                                </div>
                                                                {req.status === "PENDING" && (
                                                                    <div className="flex gap-2">
                                                                        <button
                                                                            onClick={() => respondToRequest(req.id, "ACCEPTED")}
                                                                            className="rounded-full bg-[#63C0B9] px-3 py-1.5 text-xs font-semibold text-white"
                                                                        >
                                                                            Accept
                                                                        </button>
                                                                        <button
                                                                            onClick={() => respondToRequest(req.id, "DECLINED")}
                                                                            className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600"
                                                                        >
                                                                            Decline
                                                                        </button>
                                                                    </div>
                                                                )}
                                                                {req.status === "ACCEPTED" && (
                                                                    <span className="flex items-center gap-1 text-xs font-semibold text-green-600">
                                                                        <CheckCircle2 className="h-4 w-4" /> Accepted
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            <div>
                                                <h3 className="text-lg font-semibold text-slate-800">Outgoing Requests</h3>
                                                {outgoing.length === 0 ? (
                                                    <p className="mt-2 text-sm text-slate-500">No outgoing requests.</p>
                                                ) : (
                                                    <div className="mt-3 space-y-3">
                                                        {outgoing.map((req) => (
                                                            <div key={req.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-4">
                                                                <div>
                                                                    <p className="font-semibold text-slate-800">To: {req.toUser?.name}</p>
                                                                    <p className="text-xs text-slate-500">
                                                                        {new Date(req.date).toLocaleDateString()} · {req.status}
                                                                    </p>
                                                                </div>
                                                                <span className={`flex items-center gap-1 text-xs font-semibold ${
                                                                    req.status === "ACCEPTED" ? "text-green-600" :
                                                                    req.status === "DECLINED" ? "text-red-500" : "text-amber-600"
                                                                }`}>
                                                                    {req.status === "PENDING" && <Clock className="h-4 w-4" />}
                                                                    {req.status === "ACCEPTED" && <CheckCircle2 className="h-4 w-4" />}
                                                                    {req.status}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.section>
            </main>
        </div>
    );
}

function TutorList() {
    const [tutors, setTutors] = useState<Array<{
        id: string;
        bio: string;
        subjectsCsv?: string | null;
        user?: { name?: string | null; email: string } | null;
    }>>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch("/api/tutors", { cache: "no-store" });
                const json = await res.json();
                setTutors(Array.isArray(json?.list) ? json.list : []);
            } catch {
                setTutors([]);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    if (loading) {
        return (
            <div className="grid gap-4 md:grid-cols-2">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-48 animate-pulse rounded-2xl bg-slate-100" />
                ))}
            </div>
        );
    }

    if (tutors.length === 0) {
        return (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-6 text-center">
                <GraduationCap className="mx-auto h-8 w-8 text-slate-400" />
                <p className="mt-3 text-sm font-semibold text-slate-700">No tutors available yet</p>
                <p className="mt-1 text-xs text-slate-500">Be the first to sign up as a tutor!</p>
            </div>
        );
    }

    return (
        <div className="grid gap-4 md:grid-cols-2">
            {tutors.map((tutor) => {
                const subjects = tutor.subjectsCsv?.split(",").map((s) => s.trim()).filter(Boolean) || [];
                return (
                    <div key={tutor.id} className="rounded-2xl border border-slate-100 bg-gradient-to-br from-white to-[#F9FBFF] p-5 shadow-md">
                        <div className="flex items-center gap-3">
                            <div className="rounded-full bg-[#E7F6F3] p-3 text-[#2D8F80]">
                                <GraduationCap className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="font-semibold text-slate-800">{tutor.user?.name || "Unnamed tutor"}</p>
                                <p className="text-xs text-slate-500">{tutor.user?.email}</p>
                            </div>
                        </div>
                        <p className="mt-3 text-sm text-slate-600">{tutor.bio}</p>
                        {subjects.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1">
                                {subjects.map((s) => (
                                    <span key={s} className="rounded-full bg-[#E9F7F5] px-2 py-1 text-[10px] font-semibold text-[#2D8F80]">
                                        {s}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
