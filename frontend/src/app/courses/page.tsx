"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowUpRight, Sparkles } from "lucide-react";

import SiteNav from "@/components/site-nav";
import { useCurrentUser } from "@/hooks/use-current-user";
import { api } from "@/lib/api";

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

const recommended = [
    {
        title: "AWS Certified Solutions Architect",
        mentor: "Lina",
        tag: "Live",
        image: "/landing/creator.jpg",
    },
    {
        title: "Social Science Research Lab",
        mentor: "Iris",
        tag: "Project",
        image: "/landing/hero-student.png",
    },
    {
        title: "Creative Writing Community",
        mentor: "Miles",
        tag: "Live",
        image: "/landing/learner.jpg",
    },
];

const mentors = [
    { name: "Jane Cooper", focus: "Product Design", avatar: "/landing/creator.jpg" },
    { name: "Adam", focus: "Entrepreneurship", avatar: "/landing/learner.jpg" },
    { name: "Tamara", focus: "Leadership", avatar: "/landing/creator.jpg" },
    { name: "Jane Cooper", focus: "STEM Coach", avatar: "/landing/learner.jpg" },
    { name: "Adam", focus: "Creative Tech", avatar: "/landing/creator.jpg" },
    { name: "Tamara", focus: "Media Mentor", avatar: "/landing/learner.jpg" },
];

interface LiveCourse {
    id: string;
    title: string;
    summary?: string | null;
    coverUrl?: string | null;
}

export default function CoursesPage() {
    const router = useRouter();
    const { user } = useCurrentUser();
    const [catalog, setCatalog] = useState<LiveCourse[]>([]);
    const [loadingCatalog, setLoadingCatalog] = useState(true);
    const [status, setStatus] = useState<string | null>(null);
    const [enrollingId, setEnrollingId] = useState<string | null>(null);
    const [enrolledIds, setEnrolledIds] = useState<string[]>([]);

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

    async function handleEnroll(courseId: string, courseTitle: string) {
        if (!user) {
            router.push("/login?from=/courses#catalog");
            return;
        }
        if (user.role !== "STUDENT") {
            setStatus("Only student accounts can enroll directly. Switch to a learner profile to join.");
            return;
        }
        setEnrollingId(courseId);
        setStatus(null);
        try {
            const res = await api(`/courses/${courseId}/enroll`, { method: "POST" });
            const json = await res.json();
            if (!res.ok || json?.ok === false) throw new Error(json?.msg || "Unable to enroll.");
            setEnrolledIds((prev) => (prev.includes(courseId) ? prev : [...prev, courseId]));
            setStatus(`You're enrolled in ${courseTitle}.`);
        } catch (err) {
            setStatus(err instanceof Error ? err.message : "Unable to enroll.");
        } finally {
            setEnrollingId(null);
        }
    }

    return (
        <div className="min-h-dvh bg-[#F6F8FC] text-slate-800">
            <SiteNav />
            <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-10">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#2D8F80]">
                    <Sparkles className="h-5 w-5" /> Course
                </div>

                <section className="mt-6 rounded-[36px] bg-white p-6 shadow-2xl shadow-slate-200/70 sm:p-10">
                    <div className="flex flex-col gap-8 md:flex-row md:items-center">
                        <div className="flex-1">
                            <p className="text-sm font-semibold text-[#5C9E95]">Welcome back! Ready for your next lesson?</p>
                            <h1 className="mt-3 text-4xl font-bold text-slate-900">Explore curated courses built for curious minds.</h1>
                            <p className="mt-4 text-base text-slate-600">
                                Join structured cohorts, earn digital badges, and learn with mentors who understand student-led ambitions.
                            </p>
                        </div>
                        <div className="flex flex-col gap-4 md:w-[300px]">
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
                    <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-6 text-sm text-slate-600">
                        <p>View history to revisit your saved lessons.</p>
                        <Link href="#history" className="inline-flex items-center gap-1 font-semibold text-[#2D8F80]">
                            View history <ArrowUpRight className="h-4 w-4" />
                        </Link>
                    </div>
                </section>

                <section id="catalog" className="mt-10">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <h2 className="text-2xl font-semibold text-slate-900">Live catalog</h2>
                        <p className="text-sm text-slate-600">Pulled directly from the SparkHub courses API.</p>
                    </div>
                    {status && (
                        <div className="mt-3 rounded-2xl border border-[#CFE3E0] bg-[#E9F7F5] px-4 py-3 text-sm text-slate-700">{status}</div>
                    )}
                    <div className="mt-6 grid gap-5 lg:grid-cols-3">
                        {loadingCatalog ? (
                            Array.from({ length: 3 }).map((_, idx) => <div key={idx} className="h-64 animate-pulse rounded-[28px] bg-slate-100" />)
                        ) : catalog.length === 0 ? (
                            <div className="rounded-[28px] border border-dashed border-slate-200 bg-white/80 p-6 text-sm text-slate-600">No published courses right now.</div>
                        ) : (
                            catalog.map((course) => {
                                const isEnrolled = enrolledSet.has(course.id);
                                const cover = course.coverUrl || "/landing/hero-student.png";
                                return (
                                    <motion.article key={course.id} whileHover={{ y: -4 }} className="flex h-full flex-col rounded-[28px] border border-slate-100 bg-white/95 p-5 shadow">
                                        <div className="relative h-44 w-full overflow-hidden rounded-2xl bg-slate-100">
                                            <Image src={cover} alt={course.title} fill className="object-cover" />
                                        </div>
                                        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-[#63C0B9]">Live course</p>
                                        <h3 className="mt-1 text-xl font-semibold text-slate-900">{course.title}</h3>
                                        <p className="mt-2 flex-1 text-sm text-slate-600">{course.summary || "No summary has been provided."}</p>
                                        <button
                                            type="button"
                                            onClick={() => handleEnroll(course.id, course.title)}
                                            disabled={isEnrolled || enrollingId === course.id}
                                            className={`mt-4 inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold shadow-sm transition ${
                                                isEnrolled ? "border border-[#CFE3E0] bg-white text-[#2B2B2B]" : "bg-[#63C0B9] text-white"
                                            } ${enrollingId === course.id ? "opacity-70" : ""}`}
                                        >
                                            {isEnrolled ? "Enrolled" : enrollingId === course.id ? "Enrolling..." : "Enroll"}
                                        </button>
                                    </motion.article>
                                );
                            })
                        )}
                    </div>
                </section>

                <section className="mt-10">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-semibold text-slate-900">Choose by interest</h2>
                        <span className="text-sm text-slate-600">Fields, curricula, and formats</span>
                    </div>
                    <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
                        {categories.map((category) => (
                            <motion.div key={category.title} whileHover={{ y: -4 }} className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
                                <h3 className="text-lg font-semibold text-slate-900">{category.title}</h3>
                                <p className="mt-2 text-sm text-slate-600">{category.description}</p>
                            </motion.div>
                        ))}
                    </div>
                </section>

                <section id="history" className="mt-12">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-semibold text-slate-900">Recommended for you</h2>
                        <Link href="/dashboard" className="text-sm font-semibold text-[#2D8F80]">
                            See all
                        </Link>
                    </div>
                    <div className="mt-6 grid gap-5 lg:grid-cols-3">
                        {recommended.map((course) => (
                            <motion.article key={course.title} whileHover={{ y: -4 }} className="rounded-[28px] border border-slate-100 bg-white/90 p-5 shadow">
                                <div className="relative h-44 w-full overflow-hidden rounded-2xl bg-slate-100">
                                    <Image src={course.image} alt={course.title} fill className="object-cover" />
                                </div>
                                <div className="mt-4 flex items-center justify-between text-xs font-semibold uppercase text-slate-500">
                                    <span>{course.tag}</span>
                                    <span>with {course.mentor}</span>
                                </div>
                                <h3 className="mt-2 text-xl font-semibold text-slate-900">{course.title}</h3>
                                <p className="mt-2 text-sm text-slate-600">Deep-dive labs, accountability check-ins, and downloadable toolkits.</p>
                            </motion.article>
                        ))}
                    </div>
                </section>

                <section className="mt-16 rounded-[36px] bg-white p-8 shadow-2xl">
                    <div className="flex flex-col gap-6 text-center">
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#5C9E95]">1-on-1 coaching</p>
                        <h2 className="text-3xl font-bold text-slate-900">Lessons tailored for your goals.</h2>
                        <p className="text-base text-slate-600">Match with mentors who answer specific questions, review portfolios, and guide you through next steps.</p>
                    </div>
                    <div className="mt-10 grid gap-6 lg:grid-cols-3">
                        {mentors.map((mentor) => (
                            <motion.div key={`${mentor.name}-${mentor.focus}`} whileHover={{ scale: 1.01 }} className="rounded-[28px] border border-slate-100 bg-[#F8FBFF] p-6 text-center">
                                <div className="mx-auto h-20 w-20 overflow-hidden rounded-full bg-slate-200">
                                    <Image src={mentor.avatar} alt={mentor.name} width={80} height={80} className="h-full w-full object-cover" />
                                </div>
                                <h3 className="mt-4 text-lg font-semibold text-slate-900">{mentor.name}</h3>
                                <p className="text-sm text-slate-600">{mentor.focus}</p>
                                <button className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-[#63C0B9] px-4 py-2 text-sm font-semibold text-white shadow-sm">
                                    Meet mentor <ArrowUpRight className="h-4 w-4" />
                                </button>
                            </motion.div>
                        ))}
                    </div>
                </section>

                <footer className="mt-16 rounded-[36px] bg-[#0F1B36] p-8 text-white">
                    <div className="grid gap-6 text-center md:grid-cols-3 md:text-left">
                        <div>
                            <h3 className="text-2xl font-semibold">SparkHub</h3>
                            <p className="mt-2 text-sm text-white/80">Online learners’ community. Subscribe for updates and community events.</p>
                        </div>
                        <div>
                            <p className="text-sm font-semibold uppercase tracking-wide text-white/70">Subscribe</p>
                            <p className="mt-2 text-sm text-white/70">Be the first to know when we drop new cohorts.</p>
                        </div>
                        <div>
                            <p className="text-sm font-semibold uppercase tracking-wide text-white/70">Contact</p>
                            <p className="mt-2 text-sm text-white/70">support@sparkhub.com</p>
                        </div>
                    </div>
                </footer>
            </main>
        </div>
    );
}
