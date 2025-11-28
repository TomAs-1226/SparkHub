"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Clock3, Mail, MapPin, MessageSquare, Phone } from "lucide-react";

import SiteNav from "@/components/site-nav";
import { api } from "@/lib/api";
import { useCurrentUser } from "@/hooks/use-current-user";
import { EASE, STAGGER, SURFACES } from "@/lib/motion-presets";

const SUPPORT_PILLARS = [
    {
        title: "Community inbox",
        icon: <Mail className="h-5 w-5" />,
        body: "hello@sparkhub.io",
        detail: "We reply within one business day",
    },
    {
        title: "Live phone",
        icon: <Phone className="h-5 w-5" />,
        body: "+1 (312) 555-0117",
        detail: "Weekdays 9am – 6pm CT",
    },
    {
        title: "Studio",
        icon: <MapPin className="h-5 w-5" />,
        body: "433 Maker Lane, Chicago",
        detail: "Visitors welcome by appointment",
    },
];

const TIMELINE = [
    {
        title: "Send a note",
        detail: "Share as much context as you have so we can route the request to the right mentor or admin.",
    },
    {
        title: "We triage",
        detail: "An admin follows up inside 12 working hours and, if needed, schedules a live call.",
    },
    {
        title: "You get answers",
        detail: "Track the ticket from your inbox and see the final action reflected immediately in the dashboard.",
    },
];

export default function ContactPage() {
    const { user } = useCurrentUser();
    const [topic, setTopic] = useState("General");
    const [message, setMessage] = useState("");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [status, setStatus] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        setStatus(null);
        try {
            const payload = {
                userId: user?.id,
                topic,
                content: `${message}\n\nFrom: ${name || "Guest"} (${email || "no email provided"})`,
            };
            const res = await api("/feedback", {
                method: "POST",
                body: JSON.stringify(payload),
            });
            const json = await safeJson(res);
            if (!res.ok || json?.ok === false) throw new Error(json?.msg || "Unable to send message");
            setMessage("");
            setName("");
            setEmail("");
            setStatus("Thanks! The team has your request.");
        } catch (err) {
            setStatus(err instanceof Error ? err.message : "Unable to send message.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-dvh bg-[#F4F7FB] text-slate-800">
            <SiteNav />
            <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-10">
                <motion.section
                    initial={{ opacity: 0, y: 18, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.6, ease: EASE.emphasized }}
                    className="rounded-[36px] border border-white/60 bg-white/95 p-6 shadow-2xl md:p-12"
                >
                    <motion.div
                        className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]"
                        variants={staggeredContainer}
                        initial="hidden"
                        animate="visible"
                        viewport={{ once: true, margin: "-120px" }}
                    >
                        <motion.div variants={fadeLiftVariants}>
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2D8F80]">Contact SparkHub</p>
                            <h1 className="mt-3 text-3xl font-semibold leading-tight text-slate-900 md:text-4xl">
                                Talk with admins, mentors, and the partner success crew
                            </h1>
                            <p className="mt-4 text-base text-slate-600">
                                Need help enrolling students, launching a new cohort, or wiring up the tutor dashboard? Our team is
                                online daily with live chat, callbacks, and async updates that land directly inside your dashboard
                                notifications.
                            </p>
                            <motion.div className="mt-6 grid gap-4 sm:grid-cols-3" variants={staggeredBrisk}>
                                {SUPPORT_PILLARS.map((card, idx) => (
                                    <motion.div
                                        key={card.title}
                                        className="rounded-3xl border border-slate-100 bg-[#F9FBFF] p-4 text-sm shadow-sm"
                                        initial={SURFACES.lift.initial}
                                        whileInView={SURFACES.lift.animate(idx * 0.05)}
                                        whileHover={SURFACES.lift.whileHover}
                                        viewport={{ once: true, amount: 0.6 }}
                                        whileTap={{ scale: 0.99 }}
                                        transition={{ duration: 0.35, ease: EASE.swift }}
                                    >
                                        <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#E7F6F3] text-[#2D8F80]">
                                            {card.icon}
                                        </div>
                                        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-[#2D8F80]">{card.title}</p>
                                        <p className="text-base font-semibold text-slate-900">{card.body}</p>
                                        <p className="text-xs text-slate-500">{card.detail}</p>
                                    </motion.div>
                                ))}
                            </motion.div>
                            <motion.div
                                className="mt-8 rounded-3xl border border-dashed border-slate-200 bg-[#FDF7EC] p-4 text-sm"
                                initial={SURFACES.floatIn.initial}
                                whileInView={SURFACES.floatIn.animate(0.05)}
                                viewport={{ once: true, amount: 0.5 }}
                            >
                                <div className="flex items-center gap-3 text-[#B35C00]">
                                    <Clock3 className="h-5 w-5" />
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wide">Response promise</p>
                                        <p>Average turnaround: 3h 12m on school days.</p>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                        <motion.form
                            onSubmit={handleSubmit}
                            className="rounded-[30px] border border-slate-100 bg-[#F9FBFF] p-6 text-sm"
                            initial={SURFACES.lift.initial}
                            whileInView={SURFACES.lift.animate(0.08)}
                            viewport={{ once: true, amount: 0.45 }}
                        >
                            <div className="rounded-2xl border border-[#DCE7F2] bg-white/90 p-4 text-xs font-semibold uppercase tracking-wide text-[#2D8F80]">
                                Send a message
                            </div>
                            <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Topic
                                <select
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                    className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm"
                                >
                                    <option value="General">General question</option>
                                    <option value="Admin support">Admin support</option>
                                    <option value="Tutor onboarding">Tutor onboarding</option>
                                    <option value="Partnerships">Partnerships</option>
                                </select>
                            </label>
                            <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Message
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Let us know how we can help"
                                    rows={5}
                                    required
                                    className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                                />
                            </label>
                            <div className="mt-4 grid gap-4 sm:grid-cols-2">
                                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Your name
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Optional"
                                        className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2"
                                    />
                                </label>
                                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Email
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="Optional"
                                        className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2"
                                    />
                                </label>
                            </div>
                            {status && (
                                <p className="mt-4 rounded-2xl border border-[#CFE3E0] bg-[#E9F7F5] px-4 py-3 text-sm text-slate-700">
                                    {status}
                                </p>
                            )}
                            <motion.button
                                type="submit"
                                disabled={loading}
                                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#63C0B9] px-4 py-3 text-base font-semibold text-white disabled:opacity-60"
                                whileHover={{ y: -1, scale: 1.01 }}
                                whileTap={{ scale: 0.98 }}
                                transition={{ duration: 0.28, ease: EASE.swift }}
                            >
                                {loading ? "Sending…" : "Send message"}
                                <ArrowRight className="h-4 w-4" />
                            </motion.button>
                        </motion.form>
                    </motion.div>

                    <motion.div
                        className="mt-12 grid gap-4 md:grid-cols-3"
                        variants={staggeredContainer}
                        initial="hidden"
                        animate="visible"
                        viewport={{ once: true, amount: 0.4 }}
                    >
                        {TIMELINE.map((step, idx) => (
                            <motion.div
                                key={step.title}
                                className="rounded-3xl border border-slate-100 bg-white/90 p-4 text-sm shadow-sm"
                                initial={SURFACES.floatIn.initial}
                                whileInView={SURFACES.floatIn.animate(idx * 0.05)}
                                viewport={{ once: true, amount: 0.5 }}
                                whileHover={{ y: -2, scale: 1.01 }}
                                transition={{ duration: 0.32, ease: EASE.emphasized }}
                            >
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E7F6F3] text-sm font-semibold text-[#2D8F80]">
                                    {String(idx + 1).padStart(2, "0")}
                                </div>
                                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-[#2D8F80]">{step.title}</p>
                                <p className="text-slate-600">{step.detail}</p>
                            </motion.div>
                        ))}
                    </motion.div>

                    <motion.div
                        className="mt-10 rounded-[32px] border border-dashed border-slate-200 bg-[#1F2A44] p-6 text-white"
                        initial={SURFACES.lift.initial}
                        whileInView={SURFACES.lift.animate(0.12)}
                        viewport={{ once: true, amount: 0.5 }}
                    >
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Need a live walkthrough?</p>
                                <p className="text-lg font-semibold">Book a 20‑minute product tour with an admin coach.</p>
                            </div>
                            <motion.a
                                href="mailto:hello@sparkhub.io?subject=Book%20a%20SparkHub%20tour"
                                className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#1F2A44]"
                                whileHover={{ y: -1, scale: 1.01 }}
                                whileTap={{ scale: 0.99 }}
                                transition={{ duration: 0.24, ease: EASE.swift }}
                            >
                                Email our team <MessageSquare className="h-4 w-4" />
                            </motion.a>
                        </div>
                    </motion.div>
                </motion.section>
            </main>
        </div>
    );
}

const fadeLiftVariants = {
    hidden: { opacity: 0, y: 14 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE.drift } },
};

const staggeredContainer = {
    hidden: {},
    visible: { transition: STAGGER.slow },
};

const staggeredBrisk = {
    hidden: {},
    visible: { transition: STAGGER.brisk },
};

async function safeJson(res: Response) {
    try {
        return await res.json();
    } catch {
        return null;
    }
}
