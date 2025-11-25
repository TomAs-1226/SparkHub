"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, KeyRound, NotebookPen } from "lucide-react";

import SiteNav from "@/components/site-nav";
import { api } from "@/lib/api";

export default function JoinCoursePage() {
    const [code, setCode] = useState("");
    const [story, setStory] = useState("");
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);

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
        <div className="min-h-dvh bg-[#F6F8FC] text-slate-800">
            <SiteNav />
            <main className="mx-auto w-full max-w-4xl px-4 py-12">
                <div className="rounded-[36px] bg-white p-8 shadow-2xl">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5C9E95]">Course suite</p>
                    <h1 className="mt-2 text-4xl font-semibold text-slate-900">Join a course with a code</h1>
                    <p className="mt-3 text-sm text-slate-600">
                        Facilitators can share invite codes for private cohorts. Paste the code below, add a short introduction, and your
                        enrollment will sync instantly with the dashboard.
                    </p>
                    <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                        <label className="block text-sm font-semibold text-slate-700">
                            Course code
                            <input
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                placeholder="E.g. HX92QL"
                                className="mt-2 w-full rounded-3xl border border-slate-200 px-4 py-3 text-base focus:border-[#2D8F80] focus:outline-none"
                            />
                        </label>
                        <label className="block text-sm font-semibold text-slate-700">
                            Tell us about your goals
                            <textarea
                                value={story}
                                onChange={(e) => setStory(e.target.value)}
                                rows={4}
                                placeholder="Share context for the mentor"
                                className="mt-2 w-full rounded-3xl border border-slate-200 px-4 py-3 text-base focus:border-[#2D8F80] focus:outline-none"
                            />
                        </label>
                        <button
                            type="submit"
                            disabled={busy}
                            className="w-full rounded-full bg-[#2D8F80] px-6 py-3 text-base font-semibold text-white hover:brightness-110 disabled:opacity-60"
                        >
                            {busy ? "Submitting…" : "Join course"}
                        </button>
                        {msg && <p className="text-center text-sm text-[#2D8F80]">{msg}</p>}
                    </form>
                </div>

                <section className="mt-10 grid gap-4 md:grid-cols-2">
                    {[{ icon: <KeyRound className="h-5 w-5" />, title: "Unique codes", body: "Every course publishes a random six-character code." }, { icon: <NotebookPen className="h-5 w-5" />, title: "Enrollment log", body: "Submissions sync to the admin and tutor dashboards instantly." }].map((card) => (
                        <motion.div key={card.title} whileHover={{ y: -4 }} className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                                {card.icon}
                                {card.title}
                            </div>
                            <p className="mt-2 text-sm text-slate-600">{card.body}</p>
                        </motion.div>
                    ))}
                    <Link href="/courses" className="inline-flex items-center justify-center rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm font-semibold text-[#2D8F80]">
                        Browse catalog <ArrowUpRight className="ml-2 h-4 w-4" />
                    </Link>
                </section>
            </main>
        </div>
    );
}
