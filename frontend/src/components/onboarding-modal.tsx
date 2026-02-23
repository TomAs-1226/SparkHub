"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    Zap,
    BookOpen,
    Users,
    Calendar,
    Briefcase,
    Sparkles,
    Library,
    MessageCircle,
    BarChart2,
    ArrowRight,
    ArrowLeft,
    GraduationCap,
    LayoutDashboard,
    Palette,
    Shield,
    X,
} from "lucide-react";

interface OnboardingModalProps {
    user: { name?: string; role: string } | null;
    open?: boolean;
    onDismiss: () => void;
}

interface FeatureTile {
    icon: React.ReactNode;
    label: string;
}

interface StartOption {
    icon: React.ReactNode;
    label: string;
    description: string;
    href: string;
}

const FEATURES: FeatureTile[] = [
    { icon: <BookOpen className="h-5 w-5" />, label: "Courses" },
    { icon: <Users className="h-5 w-5" />, label: "Tutoring" },
    { icon: <Calendar className="h-5 w-5" />, label: "Events" },
    { icon: <Briefcase className="h-5 w-5" />, label: "Opportunities" },
    { icon: <Sparkles className="h-5 w-5" />, label: "AI Assistant" },
    { icon: <Library className="h-5 w-5" />, label: "Resources" },
    { icon: <MessageCircle className="h-5 w-5" />, label: "Discussions" },
    { icon: <BarChart2 className="h-5 w-5" />, label: "Progress Tracking" },
];

function getRoleStartOptions(role: string): StartOption[] {
    const normalised = role.toUpperCase();
    switch (normalised) {
        case "CREATOR":
            return [
                {
                    icon: <Palette className="h-6 w-6" />,
                    label: "Open Studio",
                    description: "Create and publish your courses.",
                    href: "/courses/studio",
                },
                {
                    icon: <BookOpen className="h-6 w-6" />,
                    label: "Browse Courses",
                    description: "See what other creators have built.",
                    href: "/courses",
                },
            ];
        case "TUTOR":
            return [
                {
                    icon: <LayoutDashboard className="h-6 w-6" />,
                    label: "Set Up Profile",
                    description: "Configure your tutoring profile.",
                    href: "/tutors/dashboard",
                },
                {
                    icon: <BookOpen className="h-6 w-6" />,
                    label: "Browse Courses",
                    description: "Explore courses on the platform.",
                    href: "/courses",
                },
            ];
        case "ADMIN":
            return [
                {
                    icon: <Shield className="h-6 w-6" />,
                    label: "Admin Panel",
                    description: "Manage users and platform content.",
                    href: "/admin",
                },
                {
                    icon: <Palette className="h-6 w-6" />,
                    label: "Course Studio",
                    description: "Create and manage courses.",
                    href: "/courses/studio",
                },
            ];
        default: // STUDENT / LEARNER
            return [
                {
                    icon: <BookOpen className="h-6 w-6" />,
                    label: "Browse Courses",
                    description: "Discover courses tailored for you.",
                    href: "/courses",
                },
                {
                    icon: <Users className="h-6 w-6" />,
                    label: "Find a Tutor",
                    description: "Connect with expert tutors.",
                    href: "/tutors",
                },
                {
                    icon: <Library className="h-6 w-6" />,
                    label: "Explore Resources",
                    description: "Access study materials and guides.",
                    href: "/resources",
                },
            ];
    }
}

function getRoleStartHref(role: string): string {
    const normalised = role.toUpperCase();
    switch (normalised) {
        case "CREATOR": return "/courses/studio";
        case "TUTOR": return "/tutors/dashboard";
        case "ADMIN": return "/admin";
        default: return "/courses";
    }
}

function getRoleBadgeLabel(role: string): string {
    const map: Record<string, string> = {
        STUDENT: "Student",
        LEARNER: "Student",
        CREATOR: "Creator",
        TUTOR: "Tutor",
        ADMIN: "Admin",
    };
    return map[role.toUpperCase()] ?? role;
}

const TOTAL_STEPS = 4;

const slideVariants = {
    enter: (direction: number) => ({
        x: direction > 0 ? 60 : -60,
        opacity: 0,
    }),
    center: { x: 0, opacity: 1 },
    exit: (direction: number) => ({
        x: direction < 0 ? 60 : -60,
        opacity: 0,
    }),
};

const slideTransition = { duration: 0.28, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] };

export default function OnboardingModal({ user, open = true, onDismiss }: OnboardingModalProps) {
    const router = useRouter();
    const [step, setStep] = useState(0); // 0-indexed
    const [direction, setDirection] = useState(1);

    const startOptions = getRoleStartOptions(user?.role ?? "STUDENT");

    if (!open || !user) return null;

    function goNext() {
        if (step < TOTAL_STEPS - 1) {
            setDirection(1);
            setStep((s) => s + 1);
        } else {
            handleDone();
        }
    }

    function goBack() {
        if (step > 0) {
            setDirection(-1);
            setStep((s) => s - 1);
        }
    }

    function handleDone() {
        onDismiss();
        router.push(getRoleStartHref(user.role));
    }

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-4">
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onDismiss}
            />

            {/* Modal card */}
            <motion.div
                initial={{ opacity: 0, scale: 0.94, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 16 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="relative z-10 w-full max-w-lg rounded-[32px] bg-white dark:bg-slate-800 border border-white/60 dark:border-slate-700/60 shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Skip button */}
                <button
                    onClick={onDismiss}
                    className="absolute top-4 right-4 z-10 flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-medium text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    aria-label="Skip onboarding"
                >
                    <X className="h-3.5 w-3.5" />
                    Skip
                </button>

                {/* Step content */}
                <div className="overflow-hidden min-h-[420px]">
                    <AnimatePresence custom={direction} mode="wait">
                        <motion.div
                            key={step}
                            custom={direction}
                            variants={slideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={slideTransition}
                        >
                            {step === 0 && <StepWelcome user={user} />}
                            {step === 1 && <StepFeatures />}
                            {step === 2 && <StepGetStarted startOptions={startOptions} onSelect={(href) => { onDismiss(); router.push(href); }} />}
                            {step === 3 && <StepDone />}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Footer controls */}
                <div className="px-8 pb-8 flex flex-col items-center gap-4">
                    {/* Progress dots */}
                    <div className="flex items-center gap-2">
                        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                            <button
                                key={i}
                                onClick={() => { setDirection(i > step ? 1 : -1); setStep(i); }}
                                className={`rounded-full transition-all ${
                                    i === step
                                        ? "h-2.5 w-6 bg-[#63C0B9]"
                                        : "h-2.5 w-2.5 bg-slate-200 dark:bg-slate-600 hover:bg-[#63C0B9]/50"
                                }`}
                                aria-label={`Go to step ${i + 1}`}
                            />
                        ))}
                    </div>

                    {/* Navigation buttons */}
                    <div className="flex w-full items-center justify-between gap-3">
                        {step > 0 ? (
                            <button
                                onClick={goBack}
                                className="flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-600 px-5 py-2.5 text-[14px] font-semibold text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Back
                            </button>
                        ) : (
                            <div />
                        )}

                        <motion.button
                            whileTap={{ scale: 0.97 }}
                            whileHover={{ scale: 1.02 }}
                            onClick={goNext}
                            className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[#63C0B9] to-[#2D8F80] px-6 py-2.5 text-[14px] font-semibold text-white shadow-lg shadow-[#63C0B9]/25 hover:opacity-90 transition-opacity"
                        >
                            {step === TOTAL_STEPS - 1 ? (
                                <>Start Exploring <Sparkles className="h-4 w-4" /></>
                            ) : (
                                <>Next <ArrowRight className="h-4 w-4" /></>
                            )}
                        </motion.button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

/* ── Step 1: Welcome ── */
function StepWelcome({ user }: { user: { name?: string; role: string } }) {
    return (
        <div className="flex flex-col items-center px-8 pt-12 pb-6 text-center">
            <motion.div
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.05, type: "spring", stiffness: 260, damping: 20 }}
                className="mb-6 flex h-20 w-20 items-center justify-center rounded-[28px] bg-gradient-to-br from-[#63C0B9] to-[#2D8F80] shadow-xl shadow-[#63C0B9]/30"
            >
                <motion.div
                    animate={{ rotate: [0, 8, -8, 0] }}
                    transition={{ repeat: Infinity, repeatDelay: 3, duration: 0.6 }}
                >
                    <Zap className="h-10 w-10 text-white" fill="white" />
                </motion.div>
            </motion.div>

            <h1 className="mb-3 text-2xl font-extrabold text-slate-800 dark:text-slate-100">
                Welcome to SparkHub{user.name ? `, ${user.name.split(" ")[0]}` : ""}!
            </h1>

            <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-[#E9F7F5] dark:bg-teal-900/30 px-3 py-1 text-[13px] font-semibold text-[#2D8F80] dark:text-teal-300">
                <GraduationCap className="h-3.5 w-3.5" />
                {getRoleBadgeLabel(user.role)}
            </span>

            <p className="text-[15px] text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm">
                Your learning journey starts here. Let us show you around.
            </p>
        </div>
    );
}

/* ── Step 2: Features ── */
function StepFeatures() {
    return (
        <div className="px-8 pt-10 pb-6">
            <h2 className="mb-6 text-center text-xl font-extrabold text-slate-800 dark:text-slate-100">
                What you can do on SparkHub
            </h2>
            <div className="grid grid-cols-4 gap-3">
                {FEATURES.map(({ icon, label }) => (
                    <motion.div
                        key={label}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: FEATURES.indexOf({ icon, label } as FeatureTile) * 0.05 }}
                        className="flex flex-col items-center gap-2 rounded-2xl border border-slate-100 dark:border-slate-700 bg-[#F4F7FB] dark:bg-slate-700/40 px-2 py-3 text-center"
                    >
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E9F7F5] dark:bg-teal-900/30 text-[#63C0B9]">
                            {icon}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 leading-tight">
                            {label}
                        </span>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

/* ── Step 3: Get Started ── */
function StepGetStarted({
    startOptions,
    onSelect,
}: {
    startOptions: StartOption[];
    onSelect: (href: string) => void;
}) {
    return (
        <div className="px-8 pt-10 pb-6">
            <h2 className="mb-6 text-center text-xl font-extrabold text-slate-800 dark:text-slate-100">
                Where would you like to start?
            </h2>
            <div className="flex flex-col gap-3">
                {startOptions.map(({ icon, label, description, href }) => (
                    <motion.button
                        key={href}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: startOptions.indexOf({ icon, label, description, href } as StartOption) * 0.07 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onSelect(href)}
                        className="flex items-center gap-4 rounded-2xl border border-slate-100 dark:border-slate-700 bg-[#F4F7FB] dark:bg-slate-700/40 px-5 py-4 text-left hover:border-[#63C0B9]/40 hover:bg-[#E9F7F5] dark:hover:bg-teal-900/20 transition-all group"
                    >
                        <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[#E9F7F5] dark:bg-teal-900/30 text-[#63C0B9] group-hover:bg-[#63C0B9] group-hover:text-white transition-colors">
                            {icon}
                        </span>
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-[14px] text-slate-800 dark:text-slate-100">{label}</p>
                            <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-slate-300 dark:text-slate-600 group-hover:text-[#63C0B9] transition-colors" />
                    </motion.button>
                ))}
            </div>
        </div>
    );
}

/* ── Step 4: Done ── */
function StepDone() {
    return (
        <div className="flex flex-col items-center px-8 pt-12 pb-6 text-center">
            <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 220, damping: 16 }}
                className="mb-6 flex h-20 w-20 items-center justify-center rounded-[28px] bg-gradient-to-br from-[#63C0B9] to-[#2D8F80] shadow-xl shadow-[#63C0B9]/30"
            >
                <Sparkles className="h-10 w-10 text-white" />
            </motion.div>

            <motion.h2
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mb-3 text-2xl font-extrabold text-slate-800 dark:text-slate-100"
            >
                You&apos;re all set! 🎉
            </motion.h2>

            <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18 }}
                className="text-[15px] text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm"
            >
                Everything is ready for you. Click below to jump in and start your SparkHub experience.
            </motion.p>
        </div>
    );
}
