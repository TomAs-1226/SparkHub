"use client";

import Image from "next/image";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { CalendarDays, CheckCircle2, Clock4, Globe, MapPin, Users } from "lucide-react";
import SiteNav from "@/components/site-nav";

type EventContent = {
    title: string;
    duration: string;
    track: string;
    about: string;
    when: string;
    why: string;
    how: string;
    host: {
        name: string;
        title: string;
        email: string;
    };
};

const EVENT_LIBRARY: Record<string, EventContent> = {
    "learn-adobe": {
        title: "Learn about Adobe XD & Prototyping",
        duration: "Duration · 1 hour",
        track: "Introduction about XD",
        about: "Learn about UI/UX best practices, rapid prototyping tips, and tools to streamline collaboration between designers and developers.",
        when: "Wednesday, September 25 · 4:00 PM PST",
        why: "Discover how to go from idea to high-fidelity prototype faster. We'll walk through instructor-led demos, share repeatable workflows, and guide you through hands-on activities.",
        how: "You'll work alongside other students, share feedback in real time, and leave with a clickable prototype you can showcase in your portfolio.",
        host: {
            name: "Event Host",
            title: "Creative Coach",
            email: "learn@sparkhubmentors.com",
        },
    },
    "student-led": {
        title: "Student-Led Design Sprint",
        duration: "Duration · 90 minutes",
        track: "Immersive teamwork lab",
        about: "A collaborative design sprint focused on solving real campus challenges using prototyping tools.",
        when: "Thursday, October 3 · 2:30 PM PST",
        why: "Small teams rapidly explore a prompt, test sketches, and iterate through user flows together.",
        how: "Mentors circulate with critique, while participants build low-to-hi fidelity screens in each round.",
        host: {
            name: "SparkHub Mentors",
            title: "Program Hosts",
            email: "designsprint@sparkhub.com",
        },
    },
};

const SIGNED_UP = [
    { title: "AWS Certified Solutions Architect", type: "Live", time: "30 mins ago" },
    { title: "Language & Literature", type: "Live", time: "32 mins ago" },
    { title: "Media", type: "Soon", time: "Next hour" },
    { title: "Art & Design", type: "Live", time: "Today" },
];

const FILTER_SETS = [
    { label: "Fields", items: ["Design", "Product", "STEM", "Leadership"] },
    { label: "Duration", items: ["30 mins", "45 mins", "1 hour"] },
    { label: "Location", items: ["Virtual", "Hybrid", "In-person"] },
    { label: "Language", items: ["English", "Spanish", "Mandarin"] },
];

export default function EventDetailPage({ params }: { params: { slug: string } }) {
    const slug = params.slug;
    const event = useMemo(() => EVENT_LIBRARY[slug] ?? EVENT_LIBRARY["learn-adobe"], [slug]);

    return (
        <div className="min-h-dvh bg-[#F4F7FB] text-slate-800">
            <SiteNav />
            <div className="mx-auto flex w-full max-w-6xl items-center gap-2 px-4 pb-8 pt-10 text-sm font-semibold text-[#2D8F80]">
                <CheckCircle2 className="h-5 w-5" /> Event: Detail Page
            </div>
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 pb-16 lg:flex-row">
                <motion.aside
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4 }}
                    className="w-full lg:w-[320px]"
                >
                    <div className="rounded-3xl border border-white/60 bg-white/90 p-6 shadow-xl shadow-slate-200/50">
                        <h3 className="text-lg font-semibold text-slate-900">Signed-up Events</h3>
                        <div className="mt-4 space-y-4">
                            {SIGNED_UP.map((item) => (
                                <div
                                    key={item.title}
                                    className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 text-sm"
                                >
                                    <div className="flex items-center justify-between text-xs uppercase tracking-wide text-[#5FA09A]">
                                        <span>{item.type}</span>
                                        <span>{item.time}</span>
                                    </div>
                                    <p className="mt-2 text-base font-semibold text-slate-800">{item.title}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mt-6 rounded-3xl border border-white/60 bg-white/90 p-6 shadow-xl shadow-slate-200/50">
                        <h3 className="text-lg font-semibold text-slate-900">Explore Events</h3>
                        <div className="mt-5 space-y-5">
                            {FILTER_SETS.map((set) => (
                                <div key={set.label}>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        {set.label}
                                    </p>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {set.items.map((item) => (
                                            <button
                                                key={item}
                                                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-[#63C0B9] hover:text-[#2D8F80]"
                                                type="button"
                                            >
                                                {item}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.aside>

                <motion.section
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45 }}
                    className="flex-1"
                >
                    <div className="rounded-[36px] border border-white/70 bg-white/95 p-6 shadow-2xl shadow-slate-200/70 md:p-10">
                        <div className="flex flex-col gap-6 md:flex-row md:items-center">
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-[#4C9F9A]">{event.track}</p>
                                <h1 className="mt-2 text-3xl font-bold text-slate-900 md:text-4xl">{event.title}</h1>
                                <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-600">
                                    <span className="inline-flex items-center gap-1 rounded-full bg-[#EAF5F3] px-3 py-1 font-semibold text-[#2E8C7C]">
                                        <Clock4 className="h-4 w-4" />
                                        {event.duration}
                                    </span>
                                    <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF4E7] px-3 py-1 font-semibold text-[#C77B33]">
                                        <Users className="h-4 w-4" />
                                        Up to 40 seats
                                    </span>
                                </div>
                            </div>
                            <div className="relative h-48 w-full overflow-hidden rounded-[28px] bg-[#E6EEF6] md:w-[360px]">
                                <Image src="/landing/creator.jpg" alt="Workshop preview" fill className="object-cover" priority />
                            </div>
                        </div>

                        <div className="mt-8 grid gap-6 rounded-[28px] bg-[#F7FAFF] p-6 text-sm text-slate-700 md:grid-cols-3">
                            <div className="flex items-center gap-3">
                                <CalendarDays className="h-10 w-10 rounded-2xl bg-white p-2 text-[#2D8F80]" />
                                <div>
                                    <p className="text-xs uppercase text-slate-500">When</p>
                                    <p className="font-semibold text-slate-900">{event.when}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <MapPin className="h-10 w-10 rounded-2xl bg-white p-2 text-[#2D8F80]" />
                                <div>
                                    <p className="text-xs uppercase text-slate-500">Where</p>
                                    <p className="font-semibold text-slate-900">Virtual classroom</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Globe className="h-10 w-10 rounded-2xl bg-white p-2 text-[#2D8F80]" />
                                <div>
                                    <p className="text-xs uppercase text-slate-500">Language</p>
                                    <p className="font-semibold text-slate-900">English & captions</p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-10 space-y-8 text-lg leading-relaxed text-slate-700">
                            <section>
                                <h2 className="text-xl font-semibold text-slate-900">When and why is this happening?</h2>
                                <p className="mt-3 text-base text-slate-600">{event.about}</p>
                                <p className="mt-3 text-base text-slate-600">{event.why}</p>
                            </section>
                            <section>
                                <h2 className="text-xl font-semibold text-slate-900">How can you participate?</h2>
                                <p className="mt-3 text-base text-slate-600">{event.how}</p>
                            </section>
                        </div>

                        <div className="mt-10 flex flex-col gap-4 rounded-3xl border border-slate-100 bg-slate-50/80 p-5 sm:flex-row sm:items-center">
                            <div className="flex flex-1 items-center gap-4">
                                <div className="h-16 w-16 rounded-2xl bg-[#E6F3F0]" />
                                <div>
                                    <p className="text-xs uppercase text-slate-500">Host</p>
                                    <p className="text-lg font-semibold text-slate-900">{event.host.name}</p>
                                    <p className="text-sm text-slate-600">{event.host.title}</p>
                                </div>
                            </div>
                            <div className="text-sm text-slate-600">
                                <p>Contact</p>
                                <p className="font-semibold text-[#2D8F80]">{event.host.email}</p>
                            </div>
                        </div>
                    </div>
                </motion.section>
            </div>
        </div>
    );
}
