"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { GraduationCap, Mail } from "lucide-react";

import SiteNav from "@/components/site-nav";

interface TutorProfile {
    id: string;
    bio: string;
    subjectsCsv?: string | null;
    user?: {
        name?: string | null;
        email: string;
    } | null;
}

export default function TutorsPage() {
    const [tutors, setTutors] = useState<TutorProfile[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const res = await fetch("/api/tutors", { cache: "no-store" });
                const json = await res.json();
                if (!active) return;
                setTutors(Array.isArray(json?.list) ? json.list : []);
            } catch {
                if (active) setTutors([]);
            } finally {
                if (active) setLoading(false);
            }
        })();
        return () => {
            active = false;
        };
    }, []);

    return (
        <div className="min-h-dvh bg-[#F5F7FB] text-slate-800">
            <SiteNav />
            <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-10">
                <motion.section
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45 }}
                    className="rounded-[36px] bg-white/95 p-6 shadow-2xl md:p-10"
                >
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <p className="text-sm font-semibold uppercase tracking-wide text-[#2D8F80]">Find a tutor</p>
                        <h1 className="mt-2 text-2xl font-semibold">Profiles refreshed from our mentor network</h1>
                            <p className="mt-1 text-sm text-slate-500">
                                If no tutor profiles have been created yet, you will see a notice instead of placeholder cards.
                            </p>
                        </div>
                        <a
                            href="/mentors"
                            className="rounded-full border border-[#CFE3E0] px-4 py-2 text-sm font-semibold text-[#2B2B2B] hover:bg-slate-50"
                        >
                            Become a mentor
                        </a>
                    </div>

                    <div className="mt-8 grid gap-6 md:grid-cols-2">
                        {loading ? (
                            Array.from({ length: 4 }).map((_, idx) => (
                                <div key={idx} className="h-[220px] animate-pulse rounded-3xl bg-slate-100" />
                            ))
                        ) : tutors.length === 0 ? (
                            <div className="md:col-span-2 rounded-3xl border border-dashed border-slate-200 bg-slate-50/80 p-6 text-sm text-slate-600">
                                There is currently no data in this section. Once a tutor creates a profile it will appear here.
                            </div>
                        ) : (
                            tutors.map((tutor) => {
                                const subjects = tutor.subjectsCsv
                                    ? tutor.subjectsCsv.split(",").map((s) => s.trim()).filter(Boolean)
                                    : [];
                                return (
                                    <article
                                        key={tutor.id}
                                        className="rounded-3xl border border-slate-100 bg-gradient-to-br from-white to-[#F7FBFF] p-6 shadow-xl"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="rounded-full bg-[#E7F6F3] p-3 text-[#2D8F80]">
                                                <GraduationCap className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <h2 className="text-lg font-semibold text-slate-900">{tutor.user?.name || "Unnamed tutor"}</h2>
                                                <p className="text-xs text-slate-500">{tutor.user?.email}</p>
                                            </div>
                                        </div>
                                        <p className="mt-4 text-sm text-slate-600">{tutor.bio}</p>
                                        {subjects.length > 0 ? (
                                            <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#2B2B2B]">
                                                {subjects.map((subject) => (
                                                    <span key={subject} className="rounded-full bg-[#E9F7F5] px-3 py-1 font-semibold">
                                                        {subject}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="mt-3 text-xs text-slate-500">No subjects listed yet.</p>
                                        )}
                                        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#63C0B9] px-4 py-2 text-sm font-semibold text-white">
                                            <Mail className="h-4 w-4" /> Contact via email
                                        </div>
                                    </article>
                                );
                            })
                        )}
                    </div>
                </motion.section>
            </main>
        </div>
    );
}
