"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, KeyRound, NotebookPen } from "lucide-react";

import SiteNav from "@/components/site-nav";
import { api } from "@/lib/api";
import { EASE, FADES, STAGGER, SURFACES } from "@/lib/motion-presets";

export default function JoinCoursePage() {
    const [code, setCode] = useState("");
    const [story, setStory] = useState("");
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);

    const featureCards = [
        { icon: <KeyRound className="h-5 w-5" />, title: "Unique codes", body: "Every course publishes a random six-character code." },
        {
            icon: <NotebookPen className="h-5 w-5" />,
            title: "Enrollment log",
            body: "Submissions sync to the admin and tutor dashboards instantly.",
        },
        {
            icon: <ArrowUpRight className="h-5 w-5" />,
            title: "Instant routing",
            body: "Students jump straight into the catalog after a successful join with smooth, non-linear motion cues.",
        },
    ];

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();
        if (!code.trim()) {
            setMsg("Enter a valid course code to continue.");
            return;
        }
        try {
            setBusy(true);
            setMsg(null);
            const res = await api("/courses/join-code", {
                method: "POST",
                body: JSON.stringify({ code: code.trim(), answers: { intent: story } }),
            });
            const json = await res.json();
            if (!res.ok || json?.ok === false) throw new Error(json?.msg || "Unable to join course");
            setMsg(`You're enrolled in ${json.course?.title || "the course"}!`);
            setCode("");
            setStory("");
        } catch (err) {
            setMsg(err instanceof Error ? err.message : "Unable to join course");
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="min-h-dvh bg-[#F6F8FC] dark:bg-slate-900 text-slate-800 dark:text-slate-100">
            <SiteNav />
            <main className="mx-auto w-full max-w-4xl px-4 py-12">
                <motion.div {...FADES.gentleUp} className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#5C9E95]">
                    Course suite
                </motion.div>
                <motion.section
                    {...FADES.floatUp}
                    transition={{ duration: 0.7, ease: EASE.drift }}
                    className="mt-3 rounded-[36px] bg-white p-8 shadow-2xl"
                >
                    <motion.h1 variants={FADES.gentleUp} className="text-4xl font-semibold text-slate-900">
                        Join a course with a code
                    </motion.h1>
                    <motion.p variants={FADES.gentleUp} className="mt-3 text-sm text-slate-600">
                        Facilitators can share invite codes for private cohorts. Paste the code below, add a short introduction, and your
                        enrollment will sync instantly with the dashboard.
                    </motion.p>
                    <motion.form
                        onSubmit={handleSubmit}
                        className="mt-8 space-y-4"
                        initial="initial"
                        animate="animate"
                        variants={{
                            initial: {},
                            animate: { transition: STAGGER.slow },
                        }}
                    >
                        <motion.label variants={FADES.gentleUp} className="block text-sm font-semibold text-slate-700">
                            Course code
                            <input
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                placeholder="E.g. HX92QL"
                                className="mt-2 w-full rounded-3xl border border-slate-200 px-4 py-3 text-base focus:border-[#2D8F80] focus:outline-none"
                            />
                        </motion.label>
                        <motion.label variants={FADES.gentleUp} className="block text-sm font-semibold text-slate-700">
                            Tell us about your goals
                            <textarea
                                value={story}
                                onChange={(e) => setStory(e.target.value)}
                                rows={4}
                                placeholder="Share context for the mentor"
                                className="mt-2 w-full rounded-3xl border border-slate-200 px-4 py-3 text-base focus:border-[#2D8F80] focus:outline-none"
                            />
                        </motion.label>
                        <motion.button
                            type="submit"
                            disabled={busy}
                            className="w-full rounded-full bg-[#2D8F80] px-6 py-3 text-base font-semibold text-white shadow-[var(--sh-card-glow)] transition hover:brightness-110 disabled:opacity-60"
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            transition={{ duration: 0.28, ease: EASE.swift }}
                        >
                            {busy ? "Submitting…" : "Join course"}
                        </motion.button>
                        {msg && (
                            <motion.p variants={FADES.gentleUp} className="text-center text-sm text-[#2D8F80]">
                                {msg}
                            </motion.p>
                        )}
                    </motion.form>
                </motion.section>

                <motion.section
                    className="mt-10 grid gap-4 md:grid-cols-2"
                    initial="initial"
                    animate="animate"
                    variants={{ initial: {}, animate: { transition: STAGGER.brisk } }}
                >
                    {featureCards.map((card, idx) => (
                        <motion.div
                            key={card.title}
                            initial={SURFACES.lift.initial}
                            animate={SURFACES.lift.animate(idx * 0.05)}
                            whileHover={SURFACES.lift.whileHover}
                            className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm"
                        >
                            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                                {card.icon}
                                {card.title}
                            </div>
                            <p className="mt-2 text-sm text-slate-600">{card.body}</p>
                        </motion.div>
                    ))}
                    <motion.div
                        initial={SURFACES.floatIn.initial}
                        animate={SURFACES.floatIn.animate(0.1)}
                        className="inline-flex items-center justify-center rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm font-semibold text-[#2D8F80]"
                        whileHover={{ y: -2, scale: 1.01, transition: { duration: 0.25, ease: EASE.swift } }}
                    >
                        <Link href="/courses" className="inline-flex items-center gap-2">
                            Browse catalog <ArrowUpRight className="h-4 w-4" />
                        </Link>
                    </motion.div>
                </motion.section>
            </main>
        </div>
    );
}